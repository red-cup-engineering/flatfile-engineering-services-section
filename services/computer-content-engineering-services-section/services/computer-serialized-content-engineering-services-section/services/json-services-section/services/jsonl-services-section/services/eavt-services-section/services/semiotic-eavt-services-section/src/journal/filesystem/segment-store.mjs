/**
 * @packageDocumentation
 *
 * The journal's compact store: the log plate as append-only canonical JSONL.
 *
 * Each feed's admitted witnesses are one line each, in RFC 8785 canonical JSON:
 * `{id, observation}`, in `<feed>.jsonl.witnesses` beside the feed's logical handle.
 * Derived fields are reconstructed and address-verified; full records remain readable.
 *
 * Where everything lives is computed from an address, never looked up. A feed's address is its proof
 * path (`<kind>-logs/<date>-admit-<kind>.jsonl`, store-root.mjs). A witness's admission facts live in the
 * bucket its NI address names (`ni-path-v1`, see "the located index" below), and a feed's ledger
 * `<feed>.jsonl.admitted` records how far its segment had grown at each admission. No table from
 * witness id to feed is held in memory or on disk: a process's memory does not grow with the store.
 *
 * Admission is the same causal law as before (`evaluateWitnessDependencies`); only where its facts
 * are kept changed. Segments are the source: the index is rebuilt from them when absent, readers
 * deduplicate by witness id (two writers may race to the same line), and every question reads the
 * bucket it names afresh (from where this process left it), so a fact another process wrote is seen.
 * A witness reaches its segment before its ledger and bucket record it, so a segment never holds less
 * than its ledger says; a read that finds less has found loss, and throws rather than forget.
 *
 * Verifying a witness re-derives its content addresses, milliseconds each, so a process that starts
 * cold would spend its first read re-verifying every segment. `index/segment-verified/v1.jsonl`
 * records, per segment, a verified byte offset and the SHA-256 of the bytes before it; a later
 * process whose segment's checkpoint digest still matches takes its witnesses as verified and
 * verifies only what follows. A segment larger than `segmentLimits.streamedBytes` is verified by
 * streaming (`streamVerifySegment`): one witness in memory at a time, a checkpoint every
 * `segmentLimits.checkpointBytes`, so a cold start's heap does not depend on the segment's size and a
 * process killed mid-verification resumes from its last checkpoint. `segmentStatements` refuses a
 * segment too large to hold decoded (`JOURNAL_SEGMENT_TOO_LARGE`); fold or project it. An in-process reading relies on the append-only writer contract;
 * its file identity and boundary fingerprint are a change detector, not proof against arbitrary
 * middle-of-file rewrites.
 *
 * A root written by the earlier one-file-per-fact store is still read through the `legacy` view the
 * caller supplies, and `compactLegacyStore` carries it into this form.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { keyBucketPath } from "@red-cup-engineering/computer-content-address-engineering-services-section/ni-path";
import { StringDecoder } from "node:string_decoder";
import { canonicalJson, parse } from "@red-cup-engineering/json-services-section";
import { verifyArtifact } from "../../identity/index.mjs";
import { parseJournalWitness, verifiedJournalWitness } from "../event.mjs";
import { isCausalWitness } from "../judgment.mjs";
import { evaluateWitnessDependencies } from "../substrate.mjs";
import { validateAddressedWitnessCore } from "../witness.mjs";
import { dataArtifactFiles, clearDataArtifactListings } from "@red-cup-engineering/eavt-services-section/data-artifact-listing";
import { artifactStoreRoot, isJournalStoreDirectory, isStoreArea, journalIndexDirectory, journalObjectDirectory, settlementRootOfStore } from "../store-root.mjs";
import { appendDurably, openSegmentReader, syncFile } from "./segment-bytes.mjs";

/** The suffix of a feed's witness segment, appended to its logical `.jsonl` handle. */
export const SEGMENT_SUFFIX = ".witnesses";
export const segmentPath = (logPath) => `${logPath}${SEGMENT_SUFFIX}`;
/** A feed's logical handle from its segment path, or undefined. */
export const logPathOfSegment = (file) => (file.endsWith(`.jsonl${SEGMENT_SUFFIX}`) ? file.slice(0, -SEGMENT_SUFFIX.length) : undefined);

/** The v2 causal-admission index, read only to carry it into the located index. */
export const indexDirectory = (storeRoot) => path.join(journalIndexDirectory(storeRoot), "causal-admission", "v2");

/**
 * Append one canonical JSON line as the file's writer: a crash tail is truncated first, and the line is
 * on disk before this returns, unless `deferred` (a Set) is given, in which case the file joins it and
 * the caller makes the set durable with `syncDeferred` before acknowledging.
 */
function appendLine(file, value, deferred) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  appendDurably(file, `${canonicalJson(value)}\n`, { sync: deferred === undefined });
  deferred?.add(file);
}

function syncDeferred(deferred) {
  for (const file of deferred) syncFile(file);
  deferred.clear();
}

/** Read the complete lines appended to `file` since byte `offset`: returns them and the new offset. */
function readTail(file, offset, visit) {
  let size;
  try { size = fs.statSync(file).size; }
  catch (error) {
    if (error.code === "ENOENT") return { lines: [], offset: 0, reset: offset > 0 };
    throw error;
  }
  if (size < offset) return { ...readTail(file, 0, visit), reset: true };
  // A file no longer than what was read holds nothing new: its size is the tail's revision.
  if (size === offset) return { lines: [], offset, reset: false };
  const lines = [], iterator = segmentLines(file, offset, size - offset);
  let next, position = offset;
  try {
    while (!(next = iterator.next()).done) {
      const length = Buffer.byteLength(next.value, "utf8");
      if (visit) visit(next.value, { file, offset: position, length });
      else lines.push(next.value);
      position += length + 1;
    }
    return { lines, offset: next.value, reset: false };
  } finally { iterator.return(); }
}

function parseLine(line) {
  try {
    const value = parse(line);
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

// ── the located index: where an admission fact lives is computed from its address ──
//
// Every admission fact is a line in a bucket file whose path is computed from the address the fact
// is about (`ni-path-v1`, computed by `@red-cup-engineering/computer-content-address-engineering-services-section/ni-path`):
//
//   <store>/index/causal-admission/v3/<kind>/sha-256/<d0 d1>.jsonl,  d the key's NI digest
//
// - `admitted`: `{id, log}` per witness admitted into a feed, in the bucket of `id`;
// - `blocked`:  `{id, obstruction}`, in the bucket of `id`;
// - `pending`:  `{id, log, statement, missing}`, a witness received before its causes, in the bucket of `id`;
// - `waiting`:  `{dependency, id, log}`, the reverse edge a pending witness waits on, in the bucket of `dependency`;
// - `artifacts`: `{ref, canonicalText}`, an artifact referenced beyond a witness's own sources, in the bucket of `ref`;
// - `sources`:  `{ref, id, log}`, a source a pending witness carries, in the bucket of `ref`.
//
// A key that is not an NI address is located by the NI of its UTF-8 bytes. Beside each feed, its
// ledger `<feed>.jsonl.admitted` holds `{id, end}` per admission: the segment's size once the
// witness's line was on disk. A reader asks one bucket or one ledger and opens nothing else; no
// table from address to location is held in memory or on disk. A process keeps only a small cache
// of recently read buckets (`LOCATED_CACHE_BYTES`), each re-read from where it left off when the
// file has grown, so a fact another process wrote is seen at the next question.
//
// A root written by the v2 store (`index/causal-admission/v2/*.jsonl`, read whole into memory) is
// carried into buckets once, streaming, and any lines a v2 writer appends later are carried at the
// next question (`carryV2`). A root with neither is rebuilt from its segments.

export const LOCATED_FORMULA = "ni-path-v1";
export const locatedIndexDirectory = (storeRoot) => path.join(journalIndexDirectory(storeRoot), "causal-admission", "v3");
const LOCATED_KINDS = Object.freeze(["admitted", "blocked", "pending", "waiting", "artifacts", "sources"]);
const LOCATED_CACHE_BYTES = 4 * 1024 * 1024;
const LOCATED_CACHE_ENTRIES = 256;
const CARRY_BUFFER_BYTES = 4 * 1024 * 1024;

/** The bucket file holding a key's `kind` facts in a store. */
export function locatedBucketFile(storeRoot, kind, key) {
  if (!LOCATED_KINDS.includes(kind)) throw new TypeError(`unknown located index kind: ${kind}`);
  return path.join(locatedIndexDirectory(storeRoot), kind, ...keyBucketPath(key, LOCATED_FORMULA).split("/"));
}

/** A feed's admission ledger, beside its segment. */
export const ledgerPath = (logPath) => `${logPath}.admitted`;

const bucketCache = readingCache(LOCATED_CACHE_BYTES, LOCATED_CACHE_ENTRIES);

function applyBucketLine(kind, entries, record, location) {
  const list = (key) => { let held = entries.get(key); if (held === undefined) { held = []; entries.set(key, held); } return held; };
  if (kind === "admitted" && typeof record.id === "string" && typeof record.log === "string") {
    const logs = entries.get(record.id) ?? new Set();
    logs.add(record.log);
    entries.set(record.id, logs);
  } else if (kind === "blocked" && typeof record.id === "string") {
    if (!entries.has(record.id)) entries.set(record.id, record.obstruction ?? null);
  } else if (kind === "pending" && typeof record.id === "string" && typeof record.log === "string" && record.statement) {
    const held = list(record.id);
    // Pending bodies stay on disk; a reader decodes one only when admission needs it.
    if (!held.some((entry) => entry.log === record.log)) held.push(deferredPendingEntry(record.id, record.log, (record.statement.sources ?? []).map((source) => source.ref), location));
  } else if (kind === "waiting" && typeof record.dependency === "string" && typeof record.id === "string" && typeof record.log === "string") {
    const held = list(record.dependency);
    if (!held.some((entry) => entry.id === record.id && entry.log === record.log)) held.push(Object.freeze({ id: record.id, log: record.log }));
  } else if (kind === "artifacts" && typeof record.ref === "string" && typeof record.canonicalText === "string") {
    if (!entries.has(record.ref)) entries.set(record.ref, record.canonicalText);
  } else if (kind === "sources" && typeof record.ref === "string" && typeof record.id === "string" && typeof record.log === "string") {
    const held = list(record.ref);
    if (!held.some((entry) => entry.id === record.id && entry.log === record.log)) held.push(Object.freeze({ id: record.id, log: record.log }));
  }
}

/** One bucket's facts, read from where this process last left it when the file has grown. */
function readBucket(storeRoot, kind, key) {
  const file = locatedBucketFile(storeRoot, kind, key);
  let stat;
  try { stat = fs.statSync(file); }
  catch (error) {
    if (error.code === "ENOENT") { bucketCache.delete(file); return EMPTY_BUCKET; }
    throw error;
  }
  let held = bucketCache.get(file);
  if (held !== undefined && (held.ino !== stat.ino || stat.size < held.offset)) held = undefined;
  if (held === undefined) held = { offset: 0, ino: stat.ino, entries: new Map() };
  if (stat.size > held.offset) {
    const tail = readTail(file, held.offset, (line, location) => {
      const record = parseLine(line);
      if (record !== undefined) applyBucketLine(kind, held.entries, record, location);
    });
    held.offset = tail.offset;
  }
  // A decoded bucket line costs about three times its bytes.
  bucketCache.keep(file, held, held.offset * 3);
  return held.entries;
}
const EMPTY_BUCKET = new Map();

/** The last complete `{end}` line of a feed's ledger, or undefined when the feed has none. */
export function feedLedgerEnd(logPath) {
  const file = ledgerPath(logPath);
  let fd;
  try { fd = fs.openSync(file, "r"); }
  catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
  try {
    const size = fs.fstatSync(fd).size;
    const chunk = Buffer.alloc(Math.min(size, 64 * 1024));
    let at = size, text = "";
    while (at > 0) {
      const from = Math.max(0, at - chunk.length);
      const count = fs.readSync(fd, chunk, 0, at - from, from);
      text = chunk.subarray(0, count).toString("utf8") + text;
      at = from;
      const lines = text.split("\n");
      // The last element follows the last newline: a torn or NUL-padded tail, never a complete line.
      for (let i = lines.length - 2; i >= (at === 0 ? 0 : 1); i -= 1) {
        const record = parseLine(lines[i]);
        if (Number.isSafeInteger(record?.end)) return record.end;
      }
    }
    return undefined;
  } finally { fs.closeSync(fd); }
}

/** A feed whose ledger says more was admitted into it than its segment holds has lost witnesses. */
function checkLedger(logPath, size) {
  const end = feedLedgerEnd(logPath);
  if (end !== undefined && size < end) {
    // A concurrent writer appends the segment before advancing its ledger. The
    // reading's earlier stat can predate that append; compare the retained ledger
    // with current physical custody, not the stale size of this query's snapshot.
    let currentSize;
    try { currentSize = fs.statSync(segmentPath(logPath)).size; }
    catch (error) { if (error.code !== "ENOENT") throw error; currentSize = 0; }
    if (currentSize < end) throw new TypeError(`journal segment ${segmentPath(logPath)} lacks witnesses admitted into it: it holds ${currentSize} of the ${end} bytes its ledger records`);
  }
}

// ── carrying a v2 root, or rebuilding a root from its segments ──

const carried = new Map();
const markerFile = (storeRoot) => path.join(locatedIndexDirectory(storeRoot), "formula.json");
const v2File = (storeRoot, name) => path.join(indexDirectory(storeRoot), `${name}.jsonl`);

function readMarker(storeRoot) {
  try { return JSON.parse(fs.readFileSync(markerFile(storeRoot), "utf8")); }
  catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
}

function writeMarker(storeRoot, marker) {
  const file = markerFile(storeRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${canonicalJson(marker)}\n`);
  syncFile(temporary);
  fs.renameSync(temporary, file);
}

/** Appends grouped by file, flushed when they reach `CARRY_BUFFER_BYTES`: a carry holds no more. */
function carryWriter() {
  const pending = new Map(), touched = new Set();
  let bytes = 0;
  const flush = () => {
    for (const [file, lines] of pending) {
      // The first write of a carry passes through the writer's crash-tail repair; later ones append.
      if (!touched.has(file)) { fs.mkdirSync(path.dirname(file), { recursive: true }); appendDurably(file, lines.join(""), { sync: false }); }
      else fs.appendFileSync(file, lines.join(""));
      touched.add(file);
    }
    pending.clear();
    bytes = 0;
  };
  return {
    line(file, value) {
      const text = `${canonicalJson(value)}\n`;
      const lines = pending.get(file) ?? [];
      lines.push(text);
      pending.set(file, lines);
      bytes += text.length;
      if (bytes >= CARRY_BUFFER_BYTES) flush();
    },
    close() { flush(); for (const file of touched) syncFile(file); },
  };
}

function writePendingFacts(storeRoot, write, record) {
  write(locatedBucketFile(storeRoot, "pending", record.id), record);
  for (const dependency of record.missing ?? []) write(locatedBucketFile(storeRoot, "waiting", dependency), { dependency, id: record.id, log: record.log });
  for (const source of record.statement.sources ?? []) {
    if (typeof source?.ref === "string") write(locatedBucketFile(storeRoot, "sources", source.ref), { ref: source.ref, id: record.id, log: record.log });
  }
}

const V2_NAMES = Object.freeze(["artifacts", "admitted", "blocked", "pending"]);

/** How much a carry does at a time: each step carries at most `chunkBytes` of v2 lines, then records where it
 *  stopped and yields, so no step holds the event loop or the carry lock for long. */
export const carryLimits = { chunkBytes: 8 * 1024 * 1024 };

/** The v2 lines after `offset`, up to about `budget` bytes and ending at a line boundary (a line longer than the
 *  budget is read whole, so every step makes progress). */
function readBoundedTail(file, offset, budget, visit, { progressed = false } = {}) {
  let size;
  try { size = fs.statSync(file).size; } catch (error) { if (error.code === "ENOENT") return { offset: 0, size: -1 }; throw error; }
  if (size <= offset) return { offset, size, atEnd: true };
  if (budget <= 0) return { offset, size, atEnd: false };
  const read = (length, lines = Infinity) => {
    const iterator = segmentLines(file, offset, length);
    let next, position = offset, taken = 0;
    try {
      while (taken < lines && !(next = iterator.next()).done) {
        const bytes = Buffer.byteLength(next.value, "utf8");
        visit(next.value, { file, offset: position, length: bytes });
        position += bytes + 1;
        taken += 1;
      }
      return next?.done ? next.value : position;
    } finally { iterator.return(); }
  };
  let length = Math.min(size - offset, budget), end = read(length), lines = Infinity;
  // A line longer than the whole budget is still carried, but only by a step that has carried nothing else,
  // and only as far as that line's end: the window doubles until it holds one whole line.
  while (!progressed && end === offset && length < size - offset) {
    length = Math.min(size - offset, length * 2);
    end = read(length, lines = 1);
  }
  // At its end when every whole line was read: what follows `end` then is a final line still being written
  // (or left by a writer that stopped mid-append), which belongs to whichever read sees it complete.
  const atEnd = end === size || (length === size - offset && (lines === Infinity || end === offset));
  return { offset: end, size, atEnd };
}

/** Carry at most `budget` bytes of the v2 index lines after `offsets` into buckets and ledgers. Returns the new
 *  offsets and whether every v2 file has been carried to its end. Re-carrying a line is harmless: every bucket
 *  reader folds repeated facts by key. */
function carryV2Lines(storeRoot, offsets, budget = Infinity) {
  const writer = carryWriter();
  const next = { ...offsets };
  const feeds = new Set();
  const through = {};
  let left = budget, done = true;
  for (const name of V2_NAMES) {
    const from = offsets[name] ?? 0;
    // A spent budget ends the step; a file it did not reach is carried by the next step.
    if (left <= 0) {
      let size = -1;
      try { size = fs.statSync(v2File(storeRoot, name)).size; } catch (error) { if (error.code !== "ENOENT") throw error; }
      if (size > from) { done = false; break; }
      continue;
    }
    const tail = readBoundedTail(v2File(storeRoot, name), from, left, (line) => {
      const record = parseLine(line);
      if (record === undefined) return;
      if (name === "admitted" && typeof record.id === "string" && typeof record.log === "string") {
        writer.line(locatedBucketFile(storeRoot, "admitted", record.id), { id: record.id, log: record.log });
        feeds.add(record.log);
      } else if (name === "blocked" && typeof record.id === "string") {
        writer.line(locatedBucketFile(storeRoot, "blocked", record.id), { id: record.id, obstruction: record.obstruction ?? null });
      } else if (name === "pending" && typeof record.id === "string" && typeof record.log === "string" && record.statement) {
        writePendingFacts(storeRoot, (file, value) => writer.line(file, value), record);
      } else if (name === "artifacts" && typeof record.ref === "string" && typeof record.canonicalText === "string") {
        writer.line(locatedBucketFile(storeRoot, "artifacts", record.ref), { ref: record.ref, canonicalText: record.canonicalText });
      }
    }, { progressed: left < budget });
    next[name] = tail.offset;
    if (tail.atEnd && tail.offset < tail.size) through[name] = tail.size;
    left -= tail.offset - from;
    if (tail.size >= 0 && !tail.atEnd) { done = false; break; }
  }
  // Each carried feed's ledger records what its segment holds now; a missing segment records a byte
  // it lacks, so its next read fails closed as the v2 index made it.
  for (const log of feeds) {
    let size = 0;
    try { size = fs.statSync(segmentPath(path.resolve(storeRoot, log))).size; } catch { size = 0; }
    writer.line(ledgerPath(path.resolve(storeRoot, log)), { carried: "v2", end: Math.max(size, 1) });
  }
  writer.close();
  return { offsets: next, done, through };
}

// The segments of a root being rebuilt, listed once per process (relative, in the order a rebuild takes them):
// a feed created later is admitted into its buckets directly, so the list need not grow.
const rebuildLists = new Map();
function rebuildList(storeRoot) {
  let list = rebuildLists.get(storeRoot);
  if (list === undefined) rebuildLists.set(storeRoot, list = segmentFilesUnder(storeRoot).map((segment) => path.relative(storeRoot, segment)));
  return list;
}
const rebuildIndex = (list, after) => { const at = after === undefined ? 0 : list.findIndex((relative) => relative > after); return at < 0 ? list.length : at; };

/** One step of rebuilding a root that has no index at all from its segments: whole segments, in order, after
 *  `after`, until `budget` bytes of them are rebuilt (a segment larger than the budget takes a step of its own).
 *  Returns the last segment rebuilt and whether none is left. */
function rebuildFromSegments(storeRoot, after, budget = Infinity) {
  const writer = carryWriter();
  const list = rebuildList(storeRoot);
  let at = rebuildIndex(list, after), left = budget, through = after;
  for (; at < list.length; at += 1) {
    const segment = path.join(storeRoot, list[at]);
    let size;
    try { size = fs.statSync(segment).size; } catch (error) { if (error.code !== "ENOENT") throw error; through = list[at]; continue; }
    if (left < budget && size > left) break;
    const logPath = logPathOfSegment(segment);
    const log = path.relative(storeRoot, logPath);
    for (const statement of readSegmentFile(segment, { keep: false }).statements) writer.line(locatedBucketFile(storeRoot, "admitted", statement.id), { id: statement.id, log });
    writer.line(ledgerPath(logPath), { end: size, rebuilt: true });
    left -= size;
    through = list[at];
  }
  writer.close();
  return { through, done: at >= list.length };
}

/** The witnesses of the segments a rebuild has not reached, read into a root's remainder (read only). */
function segmentFacts(storeRoot, remainder, after) {
  const list = rebuildList(storeRoot);
  for (let at = rebuildIndex(list, after); at < list.length; at += 1) {
    const segment = path.join(storeRoot, list[at]);
    let statements;
    try { ({ statements } = readSegmentFile(segment, { keep: false })); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
    const log = path.relative(storeRoot, logPathOfSegment(segment));
    for (const statement of statements) {
      const held = remainder.admitted.get(statement.id);
      if (held === undefined) remainder.admitted.set(statement.id, log);
      else if (typeof held === "string") { if (held !== log) remainder.admitted.set(statement.id, new Set([held, log])); }
      else held.add(log);
    }
  }
}

/** A root with no v2 index that is still to be rebuilt from its segments (no marker yet, or one mid-rebuild). */
const rebuilding = (marker, sizes) => !hasV2(sizes) && (marker === undefined || marker.rebuilt !== undefined);

const v2Sizes = (storeRoot) => Object.fromEntries(V2_NAMES.map((name) => {
  try { return [name, fs.statSync(v2File(storeRoot, name)).size]; } catch { return [name, -1]; }
}));
const hasV2 = (sizes) => V2_NAMES.some((name) => sizes[name] >= 0);
/** A marker written by an earlier carry is complete unless it says otherwise and covers every v2 byte, or every
 *  byte but a partial final line the file still ends in. */
const carriedThrough = (marker, sizes) => marker !== undefined && marker.complete !== false
  && V2_NAMES.every((name) => sizes[name] <= (marker.carried?.[name] ?? -1) || marker.through?.[name] === sizes[name]);

/**
 * One step of carrying a root's earlier layouts into its located index: at most `budget` bytes of v2 lines
 * (or, for a root with no index at all, a rebuild from its segments). The marker records where the step
 * stopped (`complete: false` until the last byte), so a carry interrupted at any point resumes from its last
 * step instead of from the start. A step another process holds is left to it; a lock older than ten minutes is
 * taken over. Returns "located" when nothing is left, "progress", "stalled" (nothing could be carried yet), or "held".
 */
function carryStep(storeRoot, budget) {
  const sizes = v2Sizes(storeRoot);
  const marker = readMarker(storeRoot);
  if (carriedThrough(marker, sizes)) return "located";
  if (marker === undefined && !hasV2(sizes) && segmentFilesUnder(storeRoot).length === 0) return "located";
  const lock = path.join(locatedIndexDirectory(storeRoot), "carrying.lock");
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  try { if (Date.now() - fs.statSync(lock).mtimeMs > 600_000) fs.rmSync(lock, { force: true }); } catch { /* none */ }
  let handle;
  try { handle = fs.openSync(lock, "wx"); }
  catch (error) { if (error.code === "EEXIST") return "held"; throw error; }
  try {
    const current = readMarker(storeRoot);
    if (carriedThrough(current, sizes)) return "located";
    if (rebuilding(current, sizes)) {
      // `rebuilt` names the last segment rebuilt while the rebuild is unfinished; the next step resumes after it.
      const { through, done } = rebuildFromSegments(storeRoot, current?.rebuilt, budget);
      writeMarker(storeRoot, { formula: LOCATED_FORMULA, carried: {}, ...(done ? {} : { rebuilt: through ?? "", complete: false }) });
      if (done) { rebuildLists.delete(storeRoot); return "located"; }
      return through === current?.rebuilt ? "stalled" : "progress";
    }
    const { offsets, done, through } = carryV2Lines(storeRoot, current?.carried ?? {}, budget);
    // `through` names a file carried to a partial final line, at the size it had: the root is located until
    // that file grows, and the next carry starts at that line.
    writeMarker(storeRoot, { formula: LOCATED_FORMULA, carried: offsets, ...(Object.keys(through).length ? { through } : {}), ...(done ? {} : { complete: false }) });
    if (done) return "located";
    // A step that moved no offset (nothing it can carry yet) is not progress: the caller waits instead of spinning.
    return V2_NAMES.every((name) => (offsets[name] ?? 0) === (current?.carried?.[name] ?? 0)) ? "stalled" : "progress";
  } finally {
    fs.closeSync(handle);
    fs.rmSync(lock, { force: true });
  }
}

/** Carry a root's earlier layouts into its located index now, to the end (the offline carry ahead of a release).
 *  Returns "located", or "held" when another process holds the carry. */
export function carryLocatedIndex(storeRoot, { steps = Infinity } = {}) {
  for (let taken = 0; ; taken += 1) {
    // A bounded number of steps leaves the carry where it stopped, as an interrupted process would.
    if (taken >= steps) return "progress";
    const step = carryStep(storeRoot, carryLimits.chunkBytes);
    if (step === "stalled") return "progress";
    if (step !== "progress") {
      if (step === "located") { carried.set(storeRoot, { sizes: v2Sizes(storeRoot), located: true, marked: true }); remainders.delete(storeRoot); }
      return step;
    }
  }
}

// While a carry is unfinished, a root's questions are answered from its buckets and from the v2 lines not yet
// carried, read once into memory (read only: the v2 store's own cost, without the bucket writes) and re-read
// from where they stopped when a v2 writer appends. The carry itself runs in steps off the question path.
const remainders = new Map();
const scheduled = new Set();
const carryErrors = new Map();

function v2Facts(storeRoot, remainder) {
  for (const name of V2_NAMES) {
    const tail = readTail(v2File(storeRoot, name), remainder.offsets[name] ?? 0, (line, location) => {
      const record = parseLine(line);
      if (record === undefined) return;
      const apply = (kind, value) => applyBucketLine(kind, remainder.kinds.get(kind), value, location);
      if (name === "admitted" && typeof record.id === "string" && typeof record.log === "string") {
        // The most numerous facts, held compactly: one interned feed per witness, a set only for several.
        let log = remainder.logs.get(record.log);
        if (log === undefined) { log = record.log; remainder.logs.set(log, log); }
        const held = remainder.admitted.get(record.id);
        if (held === undefined) remainder.admitted.set(record.id, log);
        else if (typeof held === "string") { if (held !== log) remainder.admitted.set(record.id, new Set([held, log])); }
        else held.add(log);
      }
      else if (name === "blocked" && typeof record.id === "string") apply("blocked", { id: record.id, obstruction: record.obstruction ?? null });
      else if (name === "artifacts" && typeof record.ref === "string" && typeof record.canonicalText === "string") apply("artifacts", record);
      else if (name === "pending" && typeof record.id === "string" && typeof record.log === "string" && record.statement) {
        // The pending body stays in the v2 file: its line has the bucket line's own shape.
        apply("pending", record);
        for (const dependency of record.missing ?? []) apply("waiting", { dependency, id: record.id, log: record.log });
        for (const source of record.statement.sources ?? []) {
          if (typeof source?.ref === "string") apply("sources", { ref: source.ref, id: record.id, log: record.log });
        }
      }
    });
    remainder.offsets[name] = tail.offset;
  }
}

function scheduleCarry(storeRoot) {
  if (scheduled.has(storeRoot)) return;
  scheduled.add(storeRoot);
  let failures = 0;
  const step = () => {
    let next;
    try { next = carryStep(storeRoot, carryLimits.chunkBytes); carryErrors.delete(storeRoot); failures = 0; }
    catch (error) {
      // A failed step is recorded for readiness to report, and retried later and later (to a minute).
      next = "failed";
      failures += 1;
      carryErrors.set(storeRoot, Object.freeze({ message: error instanceof Error ? error.message : String(error), at: new Date().toISOString(), failures }));
    }
    if (next === "located") {
      scheduled.delete(storeRoot);
      carried.set(storeRoot, { sizes: v2Sizes(storeRoot), located: true, marked: true });
      remainders.delete(storeRoot);
      return;
    }
    // Each step yields the event loop; a carry another process holds is looked at again shortly.
    const delay = next === "failed" ? Math.min(60_000, 1000 * 2 ** (failures - 1)) : next === "held" || next === "stalled" ? 1000 : 0;
    setTimeout(step, delay).unref();
  };
  setTimeout(step, 0).unref();
}

/**
 * Make a root's located index answer for what earlier layouts hold, without carrying on the question path:
 * a located root answers from its buckets; an unfinished carry answers from its buckets and the uncarried v2
 * remainder, while the carry continues in bounded steps. A root with no index at all is rebuilt from its
 * segments in bounded steps the same way, answering meanwhile from the segments not yet rebuilt.
 */
function carryV2(storeRoot) {
  const sizes = v2Sizes(storeRoot), state = carried.get(storeRoot);
  if (state?.located && V2_NAMES.every((name) => state.sizes[name] === sizes[name])) return;
  const marker = readMarker(storeRoot);
  if (carriedThrough(marker, sizes) || (marker === undefined && !hasV2(sizes) && segmentFilesUnder(storeRoot).length === 0)) {
    carried.set(storeRoot, { sizes, located: true, marked: marker !== undefined || state?.marked === true });
    remainders.delete(storeRoot);
    return;
  }
  if (rebuilding(marker, sizes)) {
    // Answered from the buckets and the segments the rebuild has not reached, read once; the rebuild runs in
    // steps off the question path. Marked, so a writer does not mark the root located before it is rebuilt.
    if (!remainders.has(storeRoot)) {
      const remainder = { offsets: {}, kinds: new Map(LOCATED_KINDS.map((kind) => [kind, new Map()])), admitted: new Map(), logs: new Map() };
      segmentFacts(storeRoot, remainder, marker?.rebuilt);
      remainders.set(storeRoot, remainder);
    }
    carried.set(storeRoot, { sizes, located: false, marked: true });
    scheduleCarry(storeRoot);
    return;
  }
  let remainder = remainders.get(storeRoot);
  if (remainder === undefined) {
    remainder = { offsets: { ...(marker?.carried ?? {}) }, kinds: new Map(LOCATED_KINDS.map((kind) => [kind, new Map()])), admitted: new Map(), logs: new Map() };
    remainders.set(storeRoot, remainder);
  }
  v2Facts(storeRoot, remainder);
  carried.set(storeRoot, { sizes, located: false, marked: marker !== undefined || state?.marked === true });
  scheduleCarry(storeRoot);
}

/** Whether a root's located index is complete (`located`) or still being carried from v2 (`carrying`), and how
 *  far: a service reports this as readiness, apart from its liveness. */
export function locatedIndexState(storeRoot) {
  const sizes = v2Sizes(storeRoot), marker = readMarker(storeRoot);
  if (carriedThrough(marker, sizes)) return Object.freeze({ state: "located" });
  if (marker === undefined && !hasV2(sizes)) return Object.freeze({ state: segmentFilesUnder(storeRoot).length === 0 ? "located" : "carrying" });
  const error = carryErrors.get(storeRoot);
  return Object.freeze({ state: "carrying", carried: Object.freeze({ ...(marker?.carried ?? {}) }), sizes: Object.freeze(sizes),
    ...(marker?.rebuilt !== undefined ? { rebuilt: marker.rebuilt } : {}), ...(error ? { error } : {}) });
}

const UNWALKED = new Set(["node_modules", ".git"]);

/** Journal stores below `root`: every settlement `data/logs` and `.metroplat-journal` directory (the roots
 *  `artifactStoreRoot` yields) and any other directory holding a v2 causal-admission index. A store is not
 *  walked further: everything in it is a feed kind or one of the store's own areas. Symbolic links,
 *  node_modules, .git and dated content directories are not followed. */
export function journalStoreRoots(root, depth = 10) {
  const found = [];
  const visit = (directory, left) => {
    if (isJournalStoreDirectory(directory) || fs.existsSync(indexDirectory(directory))) { found.push(directory); return; }
    if (left === 0) return;
    let entries;
    try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || UNWALKED.has(entry.name) || /^\d{2,4}$/u.test(entry.name)) continue;
      visit(path.join(directory, entry.name), left - 1);
    }
  };
  visit(root, depth);
  return found.sort();
}

/** Store roots below `root` holding a v2 causal-admission index. */
export const v2StoreRoots = (root, depth = 10) => journalStoreRoots(root, depth).filter((storeRoot) => fs.existsSync(indexDirectory(storeRoot)));

/** Prepare every journal store below `root` at boot (`prepareLocatedIndex`), returning each one's state. */
export function prepareLocatedIndexesUnder(root, { depth = 10 } = {}) {
  return Object.freeze(journalStoreRoots(root, depth).map((storeRoot) => Object.freeze({ storeRoot, ...prepareLocatedIndex(storeRoot) })));
}

/** Start a root's carry in the background at boot, before any question, and return its state. A service calls
 *  this when it opens a store, so that little is left uncarried by the time questions arrive (each question
 *  reads only the uncarried v2 lines), and reports the state as readiness while answering liveness at once. */
export function prepareLocatedIndex(storeRoot) {
  const state = locatedIndexState(storeRoot);
  if (state.state === "carrying") scheduleCarry(storeRoot);
  return state;
}

/** A writer marks a fresh root as located before its first fact, so no later reader rebuilds it. */
function markLocated(storeRoot) {
  if (carried.get(storeRoot)?.marked) return;
  if (readMarker(storeRoot) === undefined) writeMarker(storeRoot, { formula: LOCATED_FORMULA, carried: {} });
  carried.set(storeRoot, { ...carried.get(storeRoot), marked: true });
}

/**
 * The admission facts of a root, each answered from the one bucket or ledger its address names.
 * Holds nothing per witness: the object is a set of computed reads over the store.
 */
export function locatedIndex(storeRoot) {
  carryV2(storeRoot);
  // A fact is in its bucket, or (while a carry is unfinished) among the v2 lines not yet carried.
  const uncarried = (kind, key) => remainders.get(storeRoot)?.kinds.get(kind).get(key);
  const both = (kind, key, same) => {
    const held = readBucket(storeRoot, kind, key).get(key), more = uncarried(kind, key);
    if (more === undefined) return held;
    if (held === undefined) return more;
    return [...held, ...more.filter((entry) => !held.some((kept) => same(kept, entry)))];
  };
  const sameFeed = (a, b) => a.log === b.log, sameWitness = (a, b) => a.id === b.id && a.log === b.log;
  const pendingOf = (id) => {
    if (admittedLogs(id) !== undefined || blocked(id)) return [];
    return both("pending", id, sameFeed) ?? [];
  };
  const admittedLogs = (id) => {
    const held = readBucket(storeRoot, "admitted", id).get(id), found = remainders.get(storeRoot)?.admitted.get(id);
    if (found === undefined) return held;
    const more = typeof found === "string" ? [found] : [...found];
    return new Set([...(held ?? []), ...more]);
  };
  const blocked = (id) => readBucket(storeRoot, "blocked", id).has(id) || remainders.get(storeRoot)?.kinds.get("blocked").has(id) === true;
  return Object.freeze({
    storeRoot,
    /** The feeds (store-relative) a witness was admitted into, or undefined. */
    admittedLogs,
    isAdmitted: (id) => admittedLogs(id) !== undefined,
    isBlocked: blocked,
    /** A witness's pending entries: none once it is admitted or blocked. */
    pendingOf,
    /** The pending witnesses that recorded `dependency` among what they wait on. */
    waitingOn: (dependency) => both("waiting", dependency, sameWitness) ?? [],
    artifactText: (ref) => readBucket(storeRoot, "artifacts", ref).get(ref) ?? uncarried("artifacts", ref),
    /** A source's canonical text carried by a pending witness's statement, or undefined. */
    pendingSourceText(ref) {
      for (const { id, log } of both("sources", ref, sameWitness) ?? []) {
        for (const entry of both("pending", id, sameFeed) ?? []) {
          if (entry.log !== log) continue;
          const found = entry.statement.sources?.find((source) => source.ref === ref);
          if (found) return found.canonicalText;
        }
      }
      return undefined;
    },
  });
}

/** Every segment under a journal store, walked (rebuilding a root that has no index at all). */
function segmentFilesUnder(storeRoot) {
  const found = [];
  const visit = (directory) => {
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (isStoreArea(entry.name) || entry.name.endsWith(".statements") || entry.name.endsWith(".index")) continue;
        visit(full);
      } else if (entry.isFile() && logPathOfSegment(full) !== undefined) found.push(full);
    }
  };
  visit(storeRoot);
  return found.sort();
}

/** Forget every in-process reading (tests and migration). */
export function clearSegmentIndexes() {
  carried.clear();
  remainders.clear();
  carryErrors.clear();
  rebuildLists.clear();
  bucketCache.clear();
  clearDataArtifactListings();
  segments.clear();
  projections.clear();
}

function deferredPendingEntry(id, log, sourceRefs, location) {
  return {
    log,
    sourceRefs: Object.freeze(sourceRefs),
    get statement() {
      const reader = openSegmentReader(location.file), buffer = Buffer.alloc(location.length);
      try {
        if (reader.read(buffer, 0, buffer.length, location.offset) < buffer.length) throw new TypeError(`pending witness ${id} is missing from its journal`);
        const held = parseLine(buffer.toString("utf8"));
        if (held?.id !== id || held.log !== log || !held.statement) throw new TypeError(`pending witness ${id} changed in its journal`);
        return held.statement;
      } finally { reader.close(); }
    },
  };
}

// ── segments: a feed's admitted witnesses ──

/**
 * A least-recently-kept set of disposable decoded readings, bounded by the heap they are estimated
 * to hold, not by the bytes of the files they were read from: a decoded witness costs about twice
 * its line (a segment's cache measured 1.7x its file) and a typed projection about three times its
 * JSON, plus an id string for every witness it has seen. A reading dearer than the whole budget is
 * not kept; the next read decodes it again from the flat file. An unbounded budget (`Infinity`)
 * holds every reading and evicts none, whatever `maximumEntries` says.
 */
export function readingCache(budget, maximumEntries = 4096) {
  if (budget === Infinity) maximumEntries = Infinity;
  const held = new Map();
  let total = 0;
  const cache = {
    get: (key) => held.get(key)?.reading,
    has: (key) => held.has(key),
    delete(key) {
      const entry = held.get(key);
      if (entry !== undefined) { total -= entry.cost; held.delete(key); }
    },
    clear() { held.clear(); total = 0; },
    keep(key, reading, cost) {
      cache.delete(key);
      if (cost > budget) return;
      while (held.size > 0 && (total + cost > budget || held.size >= maximumEntries)) cache.delete(held.keys().next().value);
      held.set(key, { reading, cost });
      total += cost;
    },
    get size() { return held.size; },
    get cost() { return total; },
  };
  return cache;
}

/**
 * A reading-cache budget in bytes, from `environment[name]`: a non-negative integer, or `unbounded`
 * (hold every reading, as the readers did before they were bounded); `fallback` when unset or empty.
 * Any other value throws, naming the variable, so a misconfigured process stops at start-up.
 */
export function cacheBudgetFromEnvironment(name, fallback, environment = process.env) {
  const raw = environment[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = raw.trim();
  if (value === "unbounded") return Infinity;
  if (!/^\d+$/u.test(value) || !Number.isSafeInteger(Number(value)))
    throw new RangeError(`${name} must be a byte count or "unbounded", not ${JSON.stringify(raw)}`);
  return Number(value);
}

const SEGMENT_CACHE_HEAP = cacheBudgetFromEnvironment("SEAVT_SEGMENT_CACHE_BYTES", 4 * 1024 * 1024);
const SEGMENT_DECODED_FACTOR = 2;
const PROJECTION_CACHE_HEAP = cacheBudgetFromEnvironment("SEAVT_PROJECTION_CACHE_BYTES", 6 * 1024 * 1024);
const PROJECTION_DECODED_FACTOR = 3;
const PROJECTED_ID_HEAP = 100;
const segments = readingCache(SEGMENT_CACHE_HEAP);

// ── verification checkpoints: `{segment, offset, digest}`, the latest line per segment wins ──

const CHECKPOINT_STRIDE = 64 * 1024;
const checkpointFile = (storeRoot) => path.join(journalIndexDirectory(storeRoot), "segment-verified", "v1.jsonl");
const checkpoints = new Map();

/** The root's checkpoints, read once per process; lines appended by other processes are not needed. */
function rootCheckpoints(storeRoot) {
  let held = checkpoints.get(storeRoot);
  if (held !== undefined) return held;
  held = new Map();
  let lines = 0;
  for (const line of readTail(checkpointFile(storeRoot), 0).lines) {
    const record = parseLine(line);
    lines += 1;
    if (typeof record?.segment === "string" && Number.isSafeInteger(record.offset) && typeof record.digest === "string") held.set(record.segment, record);
  }
  // Rewritten when mostly superseded lines; a line another process appends meanwhile only costs it a re-verification.
  if (lines > 1024 && lines > 4 * held.size) {
    const file = checkpointFile(storeRoot);
    const temporary = `${file}.${process.pid}.tmp`;
    try {
      fs.writeFileSync(temporary, [...held.values()].map((record) => `${canonicalJson(record)}\n`).join(""));
      fs.renameSync(temporary, file);
    } catch {
      fs.rmSync(temporary, { force: true });
    }
  }
  checkpoints.set(storeRoot, held);
  return held;
}

/** Record a segment verified through `offset`, every CHECKPOINT_STRIDE bytes: a cold reader re-verifies at most that much. */
function recordCheckpoint(file, offset, digest) {
  const storeRoot = artifactStoreRoot(logPathOfSegment(file));
  const held = rootCheckpoints(storeRoot);
  const segment = path.relative(storeRoot, file);
  const last = held.get(segment);
  if (last !== undefined && last.offset <= offset && offset - last.offset < Math.min(CHECKPOINT_STRIDE, segmentLimits.checkpointBytes)) return;
  const record = { segment, offset, digest };
  try {
    fs.mkdirSync(path.dirname(checkpointFile(storeRoot)), { recursive: true });
    // A checkpoint is re-derivable by verification, so it is not synced.
    appendDurably(checkpointFile(storeRoot), `${canonicalJson(record)}\n`, { sync: false });
    held.set(segment, record);
  } catch {
    // A store this process cannot write keeps verifying in full.
  }
}

/** The checkpoint through which a segment's current bytes were already verified, if it still holds,
 *  with the running hash of that prefix so the reading extends it rather than hashing it again. */
function verifiedPrefix(file, size) {
  const storeRoot = artifactStoreRoot(logPathOfSegment(file));
  const record = rootCheckpoints(storeRoot).get(path.relative(storeRoot, file));
  if (record === undefined || record.offset === 0 || record.offset > size) return undefined;
  const hash = hashRange(file, createHash("sha256"), 0, record.offset);
  return hash.copy().digest("hex") === record.digest ? { ...record, hash } : undefined;
}

/** The complete lines of a file's first `length` bytes, which end on a line boundary. */
function* readPrefixLines(file, length) {
  yield* segmentLines(file, 0, length);
}

/** Feed a file's bytes [from, to) into `hash`, without retaining them. */
function hashRange(file, hash, from, to) {
  if (to <= from) return hash;
  const reader = openSegmentReader(file), buffer = Buffer.alloc(64 * 1024);
  try {
    let position = from;
    while (position < to) {
      const bytes = reader.read(buffer, 0, Math.min(buffer.length, to - position), position);
      if (bytes === 0) throw new TypeError(`journal segment ${file} ended before its verified prefix`);
      hash.update(buffer.subarray(0, bytes));
      position += bytes;
    }
    return hash;
  } finally { reader.close(); }
}

/**
 * A segment is append-only by writer contract: a reading hashes each byte once, as it is appended,
 * and keeps the running hash. On append, file identity and the bytes at both ends of the old prefix
 * cheaply detect ordinary replacement or boundary changes. If metadata changes without the file
 * growing, invalidate the cache and verify the source again; a same-size middle rewrite can leave
 * both boundary samples intact. These checks do not authenticate arbitrary out-of-contract writes
 * that preserve file identity, extent and metadata.
 */
const FINGERPRINT_BYTES = 64 * 1024;
function fingerprintOf(file, offset) {
  if (offset === 0) return "";
  const hash = hashRange(file, createHash("sha256"), 0, Math.min(offset, FINGERPRINT_BYTES));
  return hashRange(file, hash, Math.max(Math.min(offset, FINGERPRINT_BYTES), offset - FINGERPRINT_BYTES), offset).digest("hex");
}
function readingHolds(file, stat, reading) {
  if (stat.size < reading.offset || stat.ino !== reading.ino || stat.dev !== reading.dev) return false;
  const metadataUnchanged = stat.mtimeMs === reading.mtimeMs && stat.ctimeMs === reading.ctimeMs;
  if (metadataUnchanged) return true;
  // A changed timestamp at the same extent cannot be an append. Re-read it so the checkpoint
  // digest, rather than a sampled boundary, decides whether the cached source still holds.
  if (stat.size === reading.offset) return false;
  return fingerprintOf(file, reading.offset) === reading.fingerprint;
}
/** Extend a reading's running hash through `offset` and record where and what it has read. */
function advanceReading(file, stat, reading, offset) {
  reading.hash ??= createHash("sha256");
  hashRange(file, reading.hash, reading.offset, offset);
  Object.assign(reading, { offset, mtimeMs: stat.mtimeMs, ctimeMs: stat.ctimeMs, ino: stat.ino, dev: stat.dev,
    digest: offset === 0 ? "" : reading.hash.copy().digest("hex"), fingerprint: fingerprintOf(file, offset) });
}

/**
 * A segment larger than this is verified by streaming (`streamVerifySegment`) before anything is
 * decoded from it, so progress is checkpointed as it is made and a process that is killed midway
 * resumes from the last checkpoint instead of re-verifying the whole segment on its next start.
 */
export const segmentLimits = {
  /** Segments larger than this are verified by streaming. */
  streamedBytes: 32 * 1024 * 1024,
  /** How much verified segment a streaming verification covers between checkpoints. */
  checkpointBytes: 32 * 1024 * 1024,
  /** The most heap `segmentStatements` will let one segment's decoded witnesses take (estimated). */
  materializeHeap: 256 * 1024 * 1024,
};

/**
 * Verify a segment's witnesses one line at a time, from its last checkpoint to its last complete
 * line, holding no witness after its line is checked, and checkpoint every `segmentLimits.checkpointBytes`.
 * The heap it takes does not depend on the segment's size. Every complete line is verified exactly
 * as `readSegmentFile` verifies it (a line that is not a verified witness throws), so a prefix this
 * leaves checkpointed is one whose digest matches or whose lines were verified here: the house's
 * guarantee, reached without ever holding the segment. Returns the offset verified through.
 */
function streamVerifySegment(file) {
  if (logPathOfSegment(file) === undefined) return 0;
  const size = fs.statSync(file).size;
  const start = verifiedPrefix(file, size);
  const hash = start?.hash ?? createHash("sha256");
  let hashed = start?.offset ?? 0;
  const tail = readTail(file, hashed, (line, { offset, length }) => {
    const record = parseLine(line);
    if (record === undefined || typeof record.id !== "string") throw new TypeError(`journal segment ${file} holds a line that is not a witness`);
    parseJournalWitness(record);
    const end = offset + length + 1;
    if (end - hashed >= segmentLimits.checkpointBytes) {
      hashRange(file, hash, hashed, end);
      hashed = end;
      recordCheckpoint(file, end, hash.copy().digest("hex"));
    }
  });
  if (tail.offset > hashed) {
    hashRange(file, hash, hashed, tail.offset);
    recordCheckpoint(file, tail.offset, hash.copy().digest("hex"));
  }
  return tail.offset;
}

/**
 * Every witness line of one segment file, verified and deduplicated by id, read incrementally: a
 * process re-reads only bytes appended since it last looked, and re-reads the whole file when the
 * bytes it already read have changed. A complete line that is not a verified witness is corruption
 * and throws; only a torn final line (a crash mid-append) is left unread.
 */
function readSegmentFile(file, { keep = true } = {}) {
  const stat = fs.statSync(file);
  let cached = segments.get(file);
  if (cached !== undefined && !readingHolds(file, stat, cached)) cached = undefined;
  if (cached === undefined) {
    cached = { offset: 0, byId: new Map(), mtimeMs: 0, digest: "" };
    if (stat.size > segmentLimits.streamedBytes && logPathOfSegment(file) !== undefined) {
      // Verify by streaming first: the decoded reading below then takes the cheap verified path, and
      // a segment too large to hold decoded is refused with an error rather than by exhausting the heap.
      streamVerifySegment(file);
      if (stat.size * SEGMENT_DECODED_FACTOR > segmentLimits.materializeHeap) {
        throw Object.assign(new RangeError(`journal segment ${file} (${stat.size} bytes) is too large to read whole; fold or project it instead`), { code: "JOURNAL_SEGMENT_TOO_LARGE" });
      }
    }
    const verified = logPathOfSegment(file) === undefined ? undefined : verifiedPrefix(file, stat.size);
    if (verified !== undefined) {
      for (const line of readPrefixLines(file, verified.offset)) {
        const record = parseLine(line);
        if (record === undefined || typeof record.id !== "string") throw new TypeError(`journal segment ${file} holds a line that is not a witness`);
        if (!cached.byId.has(record.id)) cached.byId.set(record.id, verifiedJournalWitness(record));
      }
      Object.assign(cached, { hash: verified.hash, offset: verified.offset });
      advanceReading(file, stat, cached, verified.offset);
      if (verified.offset !== stat.size) cached.mtimeMs = 0;
    }
  }
  const tail = readTail(file, cached.offset, (line) => {
    const record = parseLine(line);
    if (record === undefined || typeof record.id !== "string") throw new TypeError(`journal segment ${file} holds a line that is not a witness`);
    if (cached.byId.has(record.id)) return;
    cached.byId.set(record.id, parseJournalWitness(record));
  });
  if (tail.offset !== cached.offset || stat.mtimeMs !== cached.mtimeMs) {
    advanceReading(file, stat, cached, tail.offset);
    if (logPathOfSegment(file) !== undefined) recordCheckpoint(file, cached.offset, cached.digest);
  }
  // Decoded feeds are disposable. Retaining an arbitrary number of complete
  // historical telemetry feeds made a node's heap grow with its entire archive.
  // A walk over every segment (a rebuild, or a rebuild's remainder) reads each once and holds none, even when
  // the segment cache is unbounded: the walk would otherwise pin the whole archive decoded.
  if (keep) segments.keep(file, cached, cached.offset * SEGMENT_DECODED_FACTOR);
  return Object.freeze({ statements: Object.freeze([...cached.byId.values()]) });
}

/** The witnesses admitted into one feed's segment (none when nothing was admitted into it). A
 *  witness's line is on disk before its feed's ledger records the segment's size after it, so a
 *  segment that is missing or truncated below what its ledger records throws. */
export function segmentStatements(logPath) {
  const file = segmentPath(logPath);
  let size = 0;
  try { size = fs.statSync(file).size; } catch (error) { if (error.code !== "ENOENT") throw error; }
  const statements = size === 0 && !fs.existsSync(file) ? Object.freeze([]) : readSegmentFile(file).statements;
  checkLedger(logPath, size);
  return statements;
}

/** The order `readEvents` gives a feed's witnesses. */
const inIdOrder = (left, right) => left.localeCompare(right);

/** Read one witness line back from its exact byte range. */
function lineAt(file, { offset, length }) {
  const reader = openSegmentReader(file), buffer = Buffer.alloc(length);
  try {
    if (reader.read(buffer, 0, length, offset) < length) throw new TypeError(`journal segment ${file} ended inside a witness it held`);
    return buffer.toString("utf8");
  } finally { reader.close(); }
}

/**
 * Fold every witness of one feed, with `extra` (witnesses admitted elsewhere) merged in, in id
 * order, deduplicated and verified exactly as `segmentStatements` reads them, while holding one
 * decoded witness at a time. A feed is unbounded (a day of RPC evidence is a gigabyte), so a fold
 * over it may not first materialize it: the segment is indexed to byte ranges, and each witness is
 * decoded, verified, folded and released in turn. A small segment still reads through the cache.
 */
export function foldSegmentStatements(logPath, extra, visit) {
  const file = segmentPath(logPath);
  let stat;
  try { stat = fs.statSync(file); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (stat === undefined || stat.size <= segmentLimits.streamedBytes || segments.has(file)) {
    const byId = new Map();
    for (const statement of segmentStatements(logPath)) byId.set(statement.id, statement);
    for (const statement of extra) if (!byId.has(statement.id)) byId.set(statement.id, statement);
    for (const id of [...byId.keys()].sort(inIdOrder)) visit(byId.get(id));
    return;
  }
  checkLedger(logPath, stat.size);
  // Verified by streaming, checkpointing as it goes, so what follows decodes only verified bytes
  // and a process killed midway does not lose the verification it had done.
  streamVerifySegment(file);
  const verified = verifiedPrefix(file, stat.size);
  const located = new Map();
  // Indexing needs only each line's id; the witness is parsed and verified when it is folded.
  const tail = readTail(file, 0, (line, location) => {
    let id;
    try { id = JSON.parse(line)?.id; } catch { id = undefined; }
    if (typeof id !== "string") throw new TypeError(`journal segment ${file} holds a line that is not a witness`);
    if (!located.has(id)) located.set(id, location);
  });
  const others = new Map();
  for (const statement of extra) if (!located.has(statement.id)) others.set(statement.id, statement);
  for (const id of [...located.keys(), ...others.keys()].sort(inIdOrder)) {
    const location = located.get(id);
    if (location === undefined) { visit(others.get(id)); continue; }
    const record = parseLine(lineAt(file, location));
    if (record?.id !== id) throw new TypeError(`journal segment ${file} changed while it was read`);
    visit(verified !== undefined && location.offset < verified.offset ? verifiedJournalWitness(record) : parseJournalWitness(record));
  }
  // Every witness through the tail's end is now verified: checkpoint it so the next fold need not.
  const hash = verified?.hash ?? createHash("sha256");
  hashRange(file, hash, verified?.offset ?? 0, tail.offset);
  if (tail.offset > 0) recordCheckpoint(file, tail.offset, hash.copy().digest("hex"));
}

/**
 * Fold the witnesses appended to one feed's segment after byte `position`, one at a time, and return
 * the position just past the last complete line read: a checkpointed reader's resumable counterpart
 * to `foldSegmentStatements`, so a caller can persist the position across runs (a consumer offset).
 * `position` past the file's current size, or a file that no longer exists, restarts from 0 (a
 * truncated or replaced segment cannot be resumed from a stale offset). A torn final line (a crash
 * mid-append) is left for the next read.
 */
export function foldSegmentStatementsFrom(logPath, position, visit) {
  const file = segmentPath(logPath);
  let size = 0;
  try { size = fs.statSync(file).size; } catch { size = 0; }
  const from = Number.isSafeInteger(position) && position >= 0 && position <= size ? position : 0;
  const tail = readTail(file, from, (line) => {
    const record = parseLine(line);
    if (record === undefined || typeof record.id !== "string") throw new TypeError(`journal segment ${file} holds a line that is not a witness`);
    visit(parseJournalWitness(record));
  });
  return tail.offset;
}

/**
 * The position of the first complete line beginning within the last `bytes` of one feed's segment
 * (0 when the segment is no longer than that, or absent; its size when no line begins there): where
 * a reader that wants only the recent tail starts `foldSegmentStatementsFrom`, as a consumer seeks
 * a partition by time instead of replaying it from its first offset.
 */
export function segmentPositionBefore(logPath, bytes) {
  const file = segmentPath(logPath);
  let size;
  try { size = fs.statSync(file).size; } catch { return 0; }
  const start = size - bytes;
  if (start <= 0) return 0;
  const reader = openSegmentReader(file), chunk = Buffer.alloc(64 * 1024);
  try {
    for (let at = start - 1; at < size; at += chunk.length) {
      const read = reader.read(chunk, 0, Math.min(chunk.length, size - at), at);
      const newline = chunk.subarray(0, read).indexOf(10);
      if (newline >= 0) return at + newline + 1;
    }
    return size;
  } finally { reader.close(); }
}

/** A typed reader retains its projected values, rather than decoded witness bodies.
 * Source bytes and admitted identities remain authoritative. Changed prefixes
 * rebuild the reading; appended witnesses extend it after normal verification. */
const projections = readingCache(PROJECTION_CACHE_HEAP);
export function projectSegmentStatements(logPath, project) {
  const file = segmentPath(logPath);
  let stat;
  try { stat = fs.statSync(file); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (stat !== undefined && stat.size > segmentLimits.streamedBytes && !projections.has(file)) streamVerifySegment(file);
  const kept = projections.get(file);
  let view = kept?.project === project ? kept.view : undefined;
  if (view !== undefined && (stat === undefined || !readingHolds(file, stat, view))) view = undefined;
  if (view === undefined) {
    view = { offset: 0, mtimeMs: 0, digest: "", ids: new Set(), values: new Map(), bytes: 0 };
    const verified = stat === undefined ? undefined : verifiedPrefix(file, stat.size);
    if (verified !== undefined) {
      for (const line of readPrefixLines(file, verified.offset)) {
        const record = parseLine(line);
        if (record === undefined || typeof record.id !== "string") throw new TypeError(`journal segment ${file} holds a line that is not a witness`);
        if (view.ids.has(record.id)) continue;
        const value = project(verifiedJournalWitness(record));
        view.ids.add(record.id);
        if (value !== undefined) { view.values.set(record.id, value); view.bytes += Buffer.byteLength(JSON.stringify(value)); }
      }
      Object.assign(view, { hash: verified.hash, offset: verified.offset });
      advanceReading(file, stat, view, verified.offset);
      if (verified.offset !== stat.size) view.mtimeMs = 0;
    }
  }
  const tail = readTail(file, view.offset, (line) => {
    const record = parseLine(line);
    if (record === undefined || typeof record.id !== "string") throw new TypeError(`journal segment ${file} holds a line that is not a witness`);
    if (view.ids.has(record.id)) return;
    const value = project(parseJournalWitness(record));
    view.ids.add(record.id);
    if (value !== undefined) { view.values.set(record.id, value); view.bytes += Buffer.byteLength(JSON.stringify(value)); }
  });
  if (stat !== undefined && (tail.offset !== view.offset || stat.mtimeMs !== view.mtimeMs)) {
    advanceReading(file, stat, view, tail.offset);
    recordCheckpoint(file, view.offset, view.digest);
  }
  checkLedger(logPath, stat?.size ?? 0);
  // Bound disposable typed readings by their own payload, rather than the
  // larger encoded witness bodies. The source and loss checks survive eviction.
  projections.keep(file, { project, view }, view.bytes * PROJECTION_DECODED_FACTOR + view.ids.size * PROJECTED_ID_HEAP);
  return Object.freeze([...view.values.values()]);
}

// A feed's address is its proof path (`<kind>-logs/<date>-admit-<kind>.jsonl`), so a store's feeds are
// found by the log tier's own listing (eavt `dataArtifactFiles`), not by an index of feeds.
const isFeedFile = (name) => name.endsWith(`.jsonl${SEGMENT_SUFFIX}`) || name.endsWith(".jsonl.admitted");
const feedHandleOf = (file) => (file.endsWith(SEGMENT_SUFFIX) ? file.slice(0, -SEGMENT_SUFFIX.length) : file.slice(0, -".admitted".length));

/** Every feed of a store that holds a segment or an admission ledger, as logical handles, in date then
 *  path order; `date` keeps one date's feeds and `kind` one kind's. A feed whose segment was deleted
 *  keeps its ledger, so its read still fails closed rather than dropping out. */
export function segmentAdmittedLogs(storeRoot, { date, kind } = {}) {
  carryV2(storeRoot);
  const dataRoot = settlementRootOfStore(storeRoot);
  if (dataRoot === undefined) return Object.freeze([]);
  const logs = new Map();
  for (const file of dataArtifactFiles(dataRoot, "log", { date, subject: kind, match: isFeedFile })) {
    if (isStoreArea(path.basename(file.directory))) continue;
    const handle = feedHandleOf(file.path);
    if (!logs.has(handle)) logs.set(handle, file.date ?? "");
  }
  return Object.freeze([...logs].sort(([left, leftDate], [right, rightDate]) => leftDate.localeCompare(rightDate) || left.localeCompare(right)).map(([handle]) => handle));
}

/** The segment file of a feed, when it exists: the feed's source material. */
export function segmentFiles(logPath) {
  const file = segmentPath(logPath);
  return fs.existsSync(file) ? Object.freeze([file]) : Object.freeze([]);
}

// ── admission ──

/**
 * @param {string} logPath the feed's logical handle.
 * @param {readonly object} statements witnesses to admit.
 * @param {readonly {ref: string, canonicalText: string}[]} artifacts artifacts their observations reference beyond their sources.
 * @param {{state?: (id: string) => string, artifact?: (ref: string) => object|undefined}} [legacy] the earlier store's view, while it exists.
 * @returns per statement: whether this call admitted it, and its admission state.
 */
export function segmentAdmit(logPath, statements, artifacts = [], legacy = {}) {
  const storeRoot = artifactStoreRoot(logPath);
  const index = locatedIndex(storeRoot);
  markLocated(storeRoot);
  const log = path.relative(storeRoot, path.resolve(logPath));
  // Index lines written by this call, made durable once before it acknowledges.
  const deferred = new Set();

  for (const artifact of artifacts) {
    let canonicalText;
    try {
      canonicalText = verifyArtifact(artifact.ref, artifact.canonicalText).canonical.text;
    } catch (error) {
      throw new TypeError(`journal referenced artifact ${artifact.ref}: ${error.message}`);
    }
    if (index.artifactText(artifact.ref) !== undefined) continue;
    appendLine(locatedBucketFile(storeRoot, "artifacts", artifact.ref), { ref: artifact.ref, canonicalText }, deferred);
  }

  const batch = new Map();
  const sources = new Map();
  for (const statement of statements) {
    const parsed = parseJournalWitness(statement);
    batch.set(parsed.id, parsed);
    for (const source of parsed.sources) sources.set(source.ref, source.canonicalText);
  }

  const artifactCache = new Map();
  const artifactAt = (ref) => {
    if (artifactCache.has(ref)) return artifactCache.get(ref);
    const text = sources.get(ref) ?? index.artifactText(ref) ?? index.pendingSourceText(ref);
    let artifact;
    if (text !== undefined) {
      try {
        artifact = verifyArtifact(ref, text);
      } catch (error) {
        throw new TypeError(`corrupt journal artifact ${ref}: ${error.message}`);
      }
    } else {
      artifact = legacy.artifact?.(ref);
    }
    artifactCache.set(ref, artifact);
    return artifact;
  };
  const stateOf = (id) => {
    if (index.isAdmitted(id)) return "admitted";
    if (index.isBlocked(id)) return "blocked";
    if (index.pendingOf(id).length > 0 || batch.has(id)) return "quarantined";
    return legacy.state?.(id) ?? "not-witness";
  };

  const newly = new Set();
  const queue = [...batch.keys()].map((id) => ({ id, log, statement: batch.get(id) }));
  const queued = new Set(queue.map((item) => `${item.id}\u0000${item.log}`));
  // A pending dependent is woken again only when something has been admitted since it was last woken.
  const wokenAt = new Map();
  const enqueueDependents = (dependency) => {
    for (const dependent of new Set(index.waitingOn(dependency).map((entry) => entry.id))) {
      for (const entry of index.pendingOf(dependent)) {
        const key = `${dependent}\u0000${entry.log}`;
        if (queued.has(key) || wokenAt.get(key) === newly.size) continue;
        wokenAt.set(key, newly.size);
        queued.add(key);
        queue.push({ id: dependent, log: entry.log, statement: entry.statement });
      }
    }
  };

  // Another process may admit a cause, or record a dependent as pending, between this process's
  // reads and writes. Each side writes before it reads again: a pending record is followed by a
  // fresh read of what is admitted, and an admission by a fresh read of what is waiting, so one of
  // the two always sees the other and no dependency wakeup is lost. Every located read is fresh.
  const wakeDependentsOfAdmitted = () => {
    for (const id of newly) enqueueDependents(id);
  };
  for (;;) {
    if (queue.length === 0) {
      wakeDependentsOfAdmitted();
      if (queue.length === 0) break;
    }
    const { id, log: itemLog, statement } = queue.shift();
    queued.delete(`${id}\u0000${itemLog}`);
    const state = stateOf(id);
    if (state === "blocked") continue;
    if (state === "admitted" || legacy.state?.(id) === "admitted") {
      if (!index.admittedLogs(id)?.has(itemLog)) publish(storeRoot, id, itemLog, statement, deferred);
      continue;
    }
    const coreArtifact = artifactAt(id);
    if (coreArtifact === undefined) continue;
    const core = validateAddressedWitnessCore(coreArtifact.canonical);
    if (!isCausalWitness(core)) {
      block(storeRoot, index, id, core, deferred);
      enqueueDependents(id);
      continue;
    }
    const evaluation = evaluateWitnessDependencies(core.value, { artifact: artifactAt, witnessState: stateOf });
    if (evaluation.obstruction !== undefined) {
      block(storeRoot, index, id, evaluation.obstruction, deferred);
      enqueueDependents(id);
      continue;
    }
    if (evaluation.missing.length > 0) {
      if (!index.pendingOf(id).some((entry) => entry.log === itemLog)) {
        // The body stays on disk in the witness's pending bucket; the waiting and source buckets
        // name it by address, so neither a dependency's wakeup nor a source lookup holds it.
        writePendingFacts(storeRoot, (file, value) => appendLine(file, value, deferred), { id, log: itemLog, statement, missing: evaluation.missing });
        if (evaluation.missing.every((ref) => index.isAdmitted(ref) || artifactAt(ref) !== undefined)) {
          const key = `${id}\u0000${itemLog}`;
          if (!queued.has(key)) {
            queued.add(key);
            queue.push({ id, log: itemLog, statement });
          }
        }
      }
      continue;
    }
    publish(storeRoot, id, itemLog, statement, deferred);
    newly.add(id);
    enqueueDependents(id);
  }

  syncDeferred(deferred);
  return Object.freeze(statements.map((statement) => Object.freeze({
    statement,
    written: newly.has(statement.id),
    admission: stateOf(statement.id),
  })));
}

function publish(storeRoot, id, log, statement, deferred) {
  const logPath = path.resolve(storeRoot, log);
  // The segment line is on disk before the ledger and the bucket that name it exist.
  appendLine(segmentPath(logPath), { id: statement.id, observation: statement.observation });
  appendLine(ledgerPath(logPath), { id, end: fs.statSync(segmentPath(logPath)).size }, deferred);
  appendLine(locatedBucketFile(storeRoot, "admitted", id), { id, log }, deferred);
}

function block(storeRoot, index, id, obstruction, deferred) {
  if (index.isBlocked(id)) return;
  appendLine(locatedBucketFile(storeRoot, "blocked", id), { id, obstruction: JSON.parse(JSON.stringify(obstruction ?? null)) }, deferred);
}

/** A witness's admission state in its root's located index, or undefined when the index holds nothing of it. */
export function segmentState(logPath, id) {
  const index = locatedIndex(artifactStoreRoot(logPath));
  if (index.isAdmitted(id)) return "admitted";
  if (index.isBlocked(id)) return "blocked";
  if (index.pendingOf(id).length > 0) return "quarantined";
  return undefined;
}

/** Complete segment lines without retaining the rest of the feed. Exact artifact
 * resolution must not populate every historical feed's decoded witness cache. */
function* segmentLines(file, position = 0, length = Infinity) {
  if (!fs.existsSync(file)) return 0;
  const reader = openSegmentReader(file), buffer = Buffer.alloc(64 * 1024), decoder = new StringDecoder("utf8");
  let pending = "", read = 0, complete = position;
  try {
    let bytes;
    while (read < length && (bytes = reader.read(buffer, 0, Math.min(buffer.length, length - read), position + read)) > 0) {
      read += bytes;
      pending += decoder.write(buffer.subarray(0, bytes));
      let start = 0, end;
      while ((end = pending.indexOf("\n", start)) >= 0) {
        const line = pending.slice(start, end);
        complete += Buffer.byteLength(line, "utf8") + 1;
        yield line;
        start = end + 1;
      }
      pending = pending.slice(start);
    }
    // An incomplete final line belongs to the next admission/read.
    return complete;
  } finally { reader.close(); }
}

/** One exact admitted witness, in the feed its admitted bucket names.
 * Receipt lookup verifies only the indexed feed; unrelated territory history
 * is neither an authority input nor a prerequisite for this read. */
export function segmentWitness(logPath, id) {
  const storeRoot = artifactStoreRoot(logPath);
  const logs = locatedIndex(storeRoot).admittedLogs(id);
  if (logs === undefined) return undefined;
  for (const log of logs) {
    const file = segmentPath(path.resolve(storeRoot, log));
    const marker = JSON.stringify(id);
    for (const line of segmentLines(file)) {
      if (!line.includes(marker)) continue;
      const record = parseLine(line);
      if (record?.id === id) return parseJournalWitness(record);
    }
    throw new TypeError(`journal segment ${file} lacks the witness admitted at ${id}`);
  }
  return undefined;
}

/** One exact artifact: its explicit bytes, indexed witness feed, or a streamed
 * search for a referenced source. Only the selected witness is decoded and verified. */
export function segmentArtifact(logPath, ref) {
  const storeRoot = artifactStoreRoot(logPath);
  const index = locatedIndex(storeRoot);
  const explicit = index.artifactText(ref);
  if (explicit !== undefined) return Object.freeze({ ref, canonicalText: explicit });
  const indexed = [...(index.admittedLogs(ref) ?? [])].map(log => path.resolve(storeRoot, log));
  const logs = indexed.length > 0 ? indexed
    : [path.resolve(logPath), ...segmentFilesUnder(storeRoot).map(logPathOfSegment)];
  const marker = JSON.stringify(ref);
  for (const candidate of new Set(logs)) {
    for (const line of segmentLines(segmentPath(candidate))) {
      if (!line.includes(marker)) continue;
      const record = parseLine(line);
      if (record === undefined || !index.admittedLogs(record.id)?.has(path.relative(storeRoot, candidate))) continue;
      const statement = parseJournalWitness(record);
      const source = statement.sources.find(entry => entry.ref === ref);
      if (source) return Object.freeze({ ref, canonicalText: source.canonicalText });
    }
    if (indexed.includes(candidate)) throw new TypeError(`journal segment ${segmentPath(candidate)} lacks the witness admitted at ${ref}`);
  }
  return undefined;
}

// ── carrying a root from the one-file-per-fact store ──

/**
 * Carry a journal store written by the earlier one-file-per-fact layout into segments: every admitted
 * witness of every feed into its segment (in id order), every explicit artifact into
 * `artifacts.jsonl`, every blocked witness into `blocked.jsonl`, and every received but unadmitted
 * witness back through admission. With `remove`, the earlier layout's statement, index and object
 * directories are deleted once every admitted witness is readable from its segment.
 *
 * @param {string} storeRoot the `data/logs` directory.
 * @param {{feeds: () => string[], statements: (logPath: string) => object[], received: () => {logPath: string, statement: object}[],
 *   blocked: () => {id: string, obstruction: unknown}[], artifacts: () => {ref: string, canonicalText: string}[], remove?: boolean}} legacy
 */
export function compactLegacyStore(storeRoot, legacy) {
  const lock = path.join(indexDirectory(storeRoot), "compacting.lock");
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  let handle;
  try {
    handle = fs.openSync(lock, "wx");
  } catch (error) {
    if (error.code === "EEXIST") throw new Error(`journal store ${storeRoot} is already being compacted (${lock})`);
    throw error;
  }
  try {
    const index = locatedIndex(storeRoot);
    markLocated(storeRoot);
    const sourceRefs = new Set();
    const report = { feeds: 0, admitted: 0, blocked: 0, pending: 0, artifacts: 0, removed: [] };
    for (const logPath of legacy.feeds()) {
      report.feeds += 1;
      const log = path.relative(storeRoot, path.resolve(logPath));
      const statements = [...legacy.statements(logPath)].sort((left, right) => left.id.localeCompare(right.id));
      const present = new Set(segmentStatements(logPath).map((statement) => statement.id));
      for (const statement of statements) {
        for (const source of statement.sources) sourceRefs.add(source.ref);
        if (present.has(statement.id)) continue;
        publish(storeRoot, statement.id, log, statement);
        report.admitted += 1;
      }
    }
    for (const { id, obstruction } of legacy.blocked()) {
      if (index.isBlocked(id)) continue;
      block(storeRoot, index, id, obstruction);
      report.blocked += 1;
    }
    for (const artifact of legacy.artifacts()) {
      if (sourceRefs.has(artifact.ref) || index.artifactText(artifact.ref) !== undefined) continue;
      appendLine(locatedBucketFile(storeRoot, "artifacts", artifact.ref), { ref: artifact.ref, canonicalText: artifact.canonicalText });
      report.artifacts += 1;
    }
    const received = legacy.received().filter(({ statement }) => !index.isAdmitted(statement.id) && !index.isBlocked(statement.id));
    const byLog = new Map();
    for (const { logPath, statement } of received) byLog.set(logPath, [...(byLog.get(logPath) ?? []), statement]);
    for (const [logPath, statements] of byLog) {
      segmentAdmit(logPath, statements, [], {});
      report.pending += statements.length;
    }
    if (legacy.remove) {
      for (const logPath of legacy.feeds()) {
        const missing = legacy.statements(logPath).filter((statement) => !segmentStatements(logPath).some((held) => held.id === statement.id));
        if (missing.length > 0) throw new Error(`compaction left ${missing.length} witnesses of ${logPath} unreadable from its segment; nothing removed`);
      }
      for (const logPath of legacy.feeds()) {
        for (const directory of [`${logPath}.statements`, `${logPath}.index`]) {
          if (fs.existsSync(directory)) {
            fs.rmSync(directory, { recursive: true, force: true });
            report.removed.push(path.relative(storeRoot, directory));
          }
        }
      }
      for (const directory of [path.join(journalIndexDirectory(storeRoot), "causal-admission", "v1"), path.join(journalObjectDirectory(storeRoot), "sen")]) {
        if (fs.existsSync(directory)) {
          fs.rmSync(directory, { recursive: true, force: true });
          report.removed.push(path.relative(storeRoot, directory));
        }
      }
    }
    return Object.freeze(report);
  } finally {
    fs.closeSync(handle);
    fs.rmSync(lock, { force: true });
  }
}
