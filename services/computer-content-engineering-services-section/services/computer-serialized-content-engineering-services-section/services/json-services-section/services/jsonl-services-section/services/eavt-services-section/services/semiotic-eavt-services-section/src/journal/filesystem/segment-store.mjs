/**
 * @packageDocumentation
 *
 * The journal's compact store: the log plate as append-only canonical JSONL.
 *
 * Each feed's admitted witnesses are one line each, in RFC 8785 canonical JSON:
 * `{id, observation}`, in `<feed>.jsonl.witnesses` beside the feed's logical handle.
 * Derived fields are reconstructed and address-verified; full records remain readable.
 * A journal root keeps its
 * causal-admission state in four append-only JSONL indexes under `index/causal-admission/v2/`:
 *
 * - `admitted.jsonl`: `{id, log}`, one line per witness admitted into a feed;
 * - `blocked.jsonl`: `{id, obstruction}`, witnesses admission refused for good;
 * - `pending.jsonl`: `{id, log, statement, missing}`, witnesses received before what they depend on;
 * - `artifacts.jsonl`: `{ref, canonicalText}`, artifacts an observation references beyond its own
 *   sources.
 *
 * Admission is the same causal law as before (`evaluateWitnessDependencies`); only where its facts
 * are kept changed. Segments are the source: the admitted index is rebuilt from them when absent,
 * readers deduplicate by witness id (two writers may race to the same line), and a process keeps
 * each index in memory, reading only the bytes appended since it last looked. A witness reaches its
 * segment before the index records it, so a segment never holds less than the index says was
 * admitted into it; a read that finds less has found loss, and throws rather than forget.
 *
 * Verifying a witness re-derives its content addresses, milliseconds each, so a process that starts
 * cold would spend its first read re-verifying every segment. `index/segment-verified/v1.jsonl`
 * records, per segment, a verified byte offset and the SHA-256 of the bytes before it; a later
 * process whose segment's checkpoint digest still matches takes its witnesses as verified and
 * verifies only what follows. An in-process reading relies on the append-only writer contract;
 * its file identity and boundary fingerprint are a change detector, not proof against arbitrary
 * middle-of-file rewrites.
 *
 * A root written by the earlier one-file-per-fact store is still read through the `legacy` view the
 * caller supplies, and `compactLegacyStore` carries it into this form.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { StringDecoder } from "node:string_decoder";
import { canonicalJson, parse } from "@red-cup-engineering/json-services-section";
import { verifyArtifact } from "../../identity/index.mjs";
import { parseJournalWitness, verifiedJournalWitness } from "../event.mjs";
import { isCausalWitness } from "../judgment.mjs";
import { evaluateWitnessDependencies } from "../substrate.mjs";
import { validateAddressedWitnessCore } from "../witness.mjs";
import { artifactStoreRoot } from "../store-root.mjs";
import { openSegmentReader } from "./segment-bytes.mjs";

/** The suffix of a feed's witness segment, appended to its logical `.jsonl` handle. */
export const SEGMENT_SUFFIX = ".witnesses";
export const segmentPath = (logPath) => `${logPath}${SEGMENT_SUFFIX}`;
/** A feed's logical handle from its segment path, or undefined. */
export const logPathOfSegment = (file) => (file.endsWith(`.jsonl${SEGMENT_SUFFIX}`) ? file.slice(0, -SEGMENT_SUFFIX.length) : undefined);

const INDEX_FILES = Object.freeze(["artifacts", "admitted", "blocked", "pending"]);
export const indexDirectory = (storeRoot) => path.join(storeRoot, "index", "causal-admission", "v2");
const indexFile = (storeRoot, name) => path.join(indexDirectory(storeRoot), `${name}.jsonl`);

function appendLine(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${canonicalJson(value)}\n`, "utf8");
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

// ── the root index: admitted, blocked and pending witnesses, and explicit artifacts ──

const roots = new Map();

/**
 * The admitted witnesses of a root: which feeds each witness id was admitted into. A root holds
 * hundreds of thousands of them (every RPC witness ever admitted), and a Map of id strings to Sets
 * of log strings cost some 200 MB of a node's heap at boot. A content address is 32 bytes, so the
 * ids are packed into one byte table with an open-addressing hash over it, and feeds are interned
 * to small integers: about 50 bytes a witness, no per-witness object. An id that is not a
 * sha-256 content address (none is admitted today) is kept in an ordinary Map, so behaviour is
 * unchanged for any id.
 */
const ADDRESS_PREFIX = "ni:///sha-256;";
const DIGEST_BYTES = 32;

class LogIds {
  constructor(admitted, log) { this.admitted = admitted; this.log = log; }
  get size() { return this.admitted.entriesOfLog(this.log).length + (this.admitted.oddOfLog.get(this.log)?.size ?? 0); }
  has(id) { return this.admitted.admittedInto(id, this.log); }
  *[Symbol.iterator]() {
    for (const entry of this.admitted.entriesOfLog(this.log)) yield this.admitted.idOf(entry);
    yield* this.admitted.oddOfLog.get(this.log) ?? [];
  }
}

class ByLog {
  constructor(admitted) { this.admitted = admitted; }
  get size() { return this.admitted.logNames.length; }
  get(log) { return this.admitted.logNumbers.has(log) ? new LogIds(this.admitted, log) : undefined; }
  keys() { return this.admitted.logNames[Symbol.iterator](); }
}

export class AdmittedIds {
  constructor() {
    this.count = 0;
    this.capacity = 1024;
    this.digests = new Uint8Array(this.capacity * DIGEST_BYTES);
    this.logOf = new Int32Array(this.capacity);
    this.nextSame = new Int32Array(this.capacity);
    this.table = new Int32Array(this.capacity * 2).fill(-1);
    this.logNames = [];
    this.logNumbers = new Map();
    this.byLogEntries = [];
    this.odd = new Map();
    this.oddOfLog = new Map();
    this.byLog = new ByLog(this);
  }

  static digestOf(id) {
    if (typeof id !== "string" || id.length !== ADDRESS_PREFIX.length + 43 || !id.startsWith(ADDRESS_PREFIX)) return undefined;
    const text = id.slice(ADDRESS_PREFIX.length);
    const bytes = Buffer.from(text, "base64url");
    return bytes.length === DIGEST_BYTES && bytes.toString("base64url") === text ? bytes : undefined;
  }

  idOf(entry) {
    return `${ADDRESS_PREFIX}${Buffer.from(this.digests.buffer, this.digests.byteOffset + entry * DIGEST_BYTES, DIGEST_BYTES).toString("base64url")}`;
  }

  entriesOfLog(log) {
    const number = this.logNumbers.get(log);
    return number === undefined ? [] : this.byLogEntries[number];
  }

  slotOf(digest) {
    const mask = this.table.length - 1;
    let slot = (digest[0] | (digest[1] << 8) | (digest[2] << 16) | (digest[3] << 24)) & mask;
    for (;;) {
      const entry = this.table[slot];
      if (entry === -1) return { slot, entry: -1 };
      if (this.sameDigest(entry, digest)) return { slot, entry };
      slot = (slot + 1) & mask;
    }
  }

  sameDigest(entry, digest) {
    const base = entry * DIGEST_BYTES;
    for (let i = 0; i < DIGEST_BYTES; i += 1) if (this.digests[base + i] !== digest[i]) return false;
    return true;
  }

  firstEntry(id) {
    const digest = AdmittedIds.digestOf(id);
    return digest === undefined ? undefined : this.slotOf(digest).entry;
  }

  has(id) {
    const entry = this.firstEntry(id);
    return entry === undefined ? this.odd.has(id) : entry !== -1;
  }

  admittedInto(id, log) {
    const number = this.logNumbers.get(log);
    if (number === undefined) return false;
    const entry = this.firstEntry(id);
    if (entry === undefined) return this.odd.get(id)?.has(log) ?? false;
    for (let at = entry; at !== -1; at = this.nextSame[at]) if (this.logOf[at] === number) return true;
    return false;
  }

  /** The feeds a witness was admitted into, as a fresh Set, or undefined when it was not admitted. */
  get(id) {
    const entry = this.firstEntry(id);
    if (entry === undefined) return this.odd.get(id);
    if (entry === -1) return undefined;
    const logs = new Set();
    for (let at = entry; at !== -1; at = this.nextSame[at]) logs.add(this.logNames[this.logOf[at]]);
    return logs;
  }

  grow() {
    this.capacity *= 2;
    const digests = new Uint8Array(this.capacity * DIGEST_BYTES); digests.set(this.digests); this.digests = digests;
    const logOf = new Int32Array(this.capacity); logOf.set(this.logOf); this.logOf = logOf;
    const nextSame = new Int32Array(this.capacity); nextSame.set(this.nextSame); this.nextSame = nextSame;
    this.table = new Int32Array(this.capacity * 2).fill(-1);
    for (let entry = 0; entry < this.count; entry += 1) {
      if (this.isChained(entry)) continue;
      this.table[this.slotOf(this.digests.subarray(entry * DIGEST_BYTES, (entry + 1) * DIGEST_BYTES)).slot] = entry;
    }
  }

  /** A later entry for an id already seen hangs off that id's first entry rather than the table. */
  isChained(entry) { return this.chained?.has(entry) ?? false; }

  logNumber(log) {
    let number = this.logNumbers.get(log);
    if (number === undefined) {
      number = this.logNames.length;
      this.logNames.push(log);
      this.logNumbers.set(log, number);
      this.byLogEntries.push([]);
    }
    return number;
  }

  add(id, log) {
    const number = this.logNumber(log);
    const digest = AdmittedIds.digestOf(id);
    if (digest === undefined) {
      const logs = this.odd.get(id) ?? new Set();
      logs.add(log);
      this.odd.set(id, logs);
      const ids = this.oddOfLog.get(log) ?? new Set();
      ids.add(id);
      this.oddOfLog.set(log, ids);
      return;
    }
    if (this.count === this.capacity) this.grow();
    const { slot, entry: first } = this.slotOf(digest);
    if (first !== -1) {
      let tail = first;
      for (let at = first; at !== -1; at = this.nextSame[at]) {
        if (this.logOf[at] === number) return;
        tail = at;
      }
      const entry = this.append(digest, number);
      this.nextSame[tail] = entry;
      (this.chained ??= new Set()).add(entry);
      return;
    }
    this.table[slot] = this.append(digest, number);
  }

  append(digest, number) {
    const entry = this.count;
    this.digests.set(digest, entry * DIGEST_BYTES);
    this.logOf[entry] = number;
    this.nextSame[entry] = -1;
    this.byLogEntries[number].push(entry);
    this.count += 1;
    return entry;
  }
}

function emptyIndex() {
  const admitted = new AdmittedIds();
  return {
    offsets: Object.fromEntries(INDEX_FILES.map((name) => [name, 0])),
    admitted,
    byLog: admitted.byLog,
    blocked: new Map(),
    pending: new Map(),
    dependents: new Map(),
    artifacts: new Map(),
  };
}

function addDependent(index, dependency, id) {
  const set = index.dependents.get(dependency) ?? new Set();
  set.add(id);
  index.dependents.set(dependency, set);
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

function applyLine(index, name, record, location) {
  if (name === "artifacts" && typeof record.ref === "string" && typeof record.canonicalText === "string") index.artifacts.set(record.ref, record.canonicalText);
  else if (name === "admitted" && typeof record.id === "string" && typeof record.log === "string") {
    index.admitted.add(record.id, record.log);
    index.pending.delete(record.id);
  } else if (name === "blocked" && typeof record.id === "string") {
    index.blocked.set(record.id, record.obstruction ?? null);
    index.pending.delete(record.id);
  } else if (name === "pending" && typeof record.id === "string" && typeof record.log === "string" && record.statement) {
    if (index.admitted.has(record.id) || index.blocked.has(record.id)) return;
    const entries = index.pending.get(record.id) ?? [];
    if (!entries.some((entry) => entry.log === record.log)) {
      // Pending witness bodies remain in the authoritative append-only index.
      // Ordinary standing queries need only identities, dependencies and feeds;
      // decode a body's exact byte range only when admission actually needs it.
      entries.push(deferredPendingEntry(record.id, record.log, (record.statement.sources ?? []).map((source) => source.ref), location));
    }
    index.pending.set(record.id, entries);
    for (const dependency of record.missing ?? []) addDependent(index, dependency, record.id);
  }
}

/** Every segment under a journal store, walked (used only to rebuild a missing admitted index). */
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
        if (entry.name === "index" || entry.name === "objects" || entry.name.endsWith(".statements") || entry.name.endsWith(".index")) continue;
        visit(full);
      } else if (entry.isFile() && logPathOfSegment(full) !== undefined) found.push(full);
    }
  };
  visit(storeRoot);
  return found.sort();
}

/** The admitted index is derived from the segments; rebuild it when it is missing. */
function rebuildAdmittedIndex(storeRoot) {
  const file = indexFile(storeRoot, "admitted");
  if (fs.existsSync(file)) return;
  const lines = [];
  for (const segment of segmentFilesUnder(storeRoot)) {
    const log = path.relative(storeRoot, logPathOfSegment(segment));
    for (const statement of readSegmentFile(segment).statements) lines.push(canonicalJson({ id: statement.id, log }));
  }
  if (lines.length === 0) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${lines.join("\n")}\n`, { flag: "wx" });
}

/** Read the required components of the same authoritative append-only index.
 * Admitted-feed discovery and verified replay depend only on membership;
 * receiving decisions require the full causal state. Component offsets remain
 * independent, so a membership read neither decodes nor advances pending,
 * blocked or artifact history. The default retains full admission behavior. */
export function rootIndex(storeRoot, components = INDEX_FILES) {
  let index = roots.get(storeRoot);
  if (index === undefined) {
    rebuildAdmittedIndex(storeRoot);
    index = emptyIndex();
    roots.set(storeRoot, index);
  }
  for (const name of components) {
    const tail = readTail(indexFile(storeRoot, name), index.offsets[name], (line, location) => {
      const record = parseLine(line);
      if (record !== undefined) applyLine(index, name, record, location);
    });
    if (tail.reset) {
      roots.delete(storeRoot);
      return rootIndex(storeRoot, components);
    }
    index.offsets[name] = tail.offset;
  }
  return index;
}

/** Forget every in-memory index (tests and migration). */
export function clearSegmentIndexes() {
  roots.clear();
  segments.clear();
  projections.clear();
}

// ── segments: a feed's admitted witnesses ──

/**
 * A least-recently-kept set of disposable decoded readings, bounded by the heap they are estimated
 * to hold, not by the bytes of the files they were read from: a decoded witness costs about twice
 * its line (a segment's cache measured 1.7x its file) and a typed projection about three times its
 * JSON, plus an id string for every witness it has seen. A reading dearer than the whole budget is
 * not kept; the next read decodes it again from the flat file.
 */
export function readingCache(budget, maximumEntries = 4096) {
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

const SEGMENT_CACHE_HEAP = 24 * 1024 * 1024;
const SEGMENT_DECODED_FACTOR = 2;
const PROJECTION_CACHE_HEAP = 48 * 1024 * 1024;
const PROJECTION_DECODED_FACTOR = 3;
const PROJECTED_ID_HEAP = 100;
const segments = readingCache(SEGMENT_CACHE_HEAP);

// ── verification checkpoints: `{segment, offset, digest}`, the latest line per segment wins ──

const CHECKPOINT_STRIDE = 64 * 1024;
const checkpointFile = (storeRoot) => path.join(storeRoot, "index", "segment-verified", "v1.jsonl");
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
  if (last !== undefined && last.offset <= offset && offset - last.offset < CHECKPOINT_STRIDE) return;
  const record = { segment, offset, digest };
  try {
    fs.mkdirSync(path.dirname(checkpointFile(storeRoot)), { recursive: true });
    fs.appendFileSync(checkpointFile(storeRoot), `${canonicalJson(record)}\n`);
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
 * Every witness line of one segment file, verified and deduplicated by id, read incrementally: a
 * process re-reads only bytes appended since it last looked, and re-reads the whole file when the
 * bytes it already read have changed. A complete line that is not a verified witness is corruption
 * and throws; only a torn final line (a crash mid-append) is left unread.
 */
function readSegmentFile(file) {
  const stat = fs.statSync(file);
  let cached = segments.get(file);
  if (cached !== undefined && !readingHolds(file, stat, cached)) cached = undefined;
  if (cached === undefined) {
    cached = { offset: 0, byId: new Map(), mtimeMs: 0, digest: "" };
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
  segments.keep(file, cached, cached.offset * SEGMENT_DECODED_FACTOR);
  return Object.freeze({ statements: Object.freeze([...cached.byId.values()]) });
}

/** The witnesses admitted into one feed's segment (none when nothing was admitted into it). The root's
 *  index is read before the segment, so every witness it names was already written there: a segment
 *  that is missing, truncated or overwritten below what was admitted into it throws. */
export function segmentStatements(logPath) {
  const file = segmentPath(logPath);
  const storeRoot = artifactStoreRoot(logPath);
  const admitted = rootIndex(storeRoot, ["admitted"]).byLog.get(path.relative(storeRoot, path.resolve(logPath)));
  const statements = fs.existsSync(file) ? readSegmentFile(file).statements : Object.freeze([]);
  if (admitted !== undefined) {
    const held = new Set(statements.map((statement) => statement.id));
    let lost = 0;
    for (const id of admitted) if (!held.has(id)) lost += 1;
    if (lost > 0) throw new TypeError(`journal segment ${file} lacks ${lost} of the ${admitted.size} witnesses admitted into it`);
  }
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
  if (stat === undefined || stat.size <= 32 * 1024 * 1024 || segments.has(file)) {
    const byId = new Map();
    for (const statement of segmentStatements(logPath)) byId.set(statement.id, statement);
    for (const statement of extra) if (!byId.has(statement.id)) byId.set(statement.id, statement);
    for (const id of [...byId.keys()].sort(inIdOrder)) visit(byId.get(id));
    return;
  }
  const storeRoot = artifactStoreRoot(logPath);
  const admitted = rootIndex(storeRoot, ["admitted"]).byLog.get(path.relative(storeRoot, path.resolve(logPath)));
  const verified = verifiedPrefix(file, stat.size);
  const located = new Map();
  // Indexing needs only each line's id; the witness is parsed and verified when it is folded.
  const tail = readTail(file, 0, (line, location) => {
    let id;
    try { id = JSON.parse(line)?.id; } catch { id = undefined; }
    if (typeof id !== "string") throw new TypeError(`journal segment ${file} holds a line that is not a witness`);
    if (!located.has(id)) located.set(id, location);
  });
  let lost = 0;
  for (const id of admitted ?? []) if (!located.has(id)) lost += 1;
  if (lost > 0) throw new TypeError(`journal segment ${file} lacks ${lost} of the ${admitted.size} witnesses admitted into it`);
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
  const storeRoot = artifactStoreRoot(logPath);
  const admitted = rootIndex(storeRoot, ["admitted"]).byLog.get(path.relative(storeRoot, path.resolve(logPath)));
  let stat;
  try { stat = fs.statSync(file); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
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
  let lost = 0;
  for (const id of admitted ?? []) if (!view.ids.has(id)) lost += 1;
  if (lost > 0) throw new TypeError(`journal segment ${file} lacks ${lost} of the ${admitted.size} witnesses admitted into it`);
  // Bound disposable typed readings by their own payload, rather than the
  // larger encoded witness bodies. The source and loss checks survive eviction.
  projections.keep(file, { project, view }, view.bytes * PROJECTION_DECODED_FACTOR + view.ids.size * PROJECTED_ID_HEAP);
  return Object.freeze([...view.values.values()]);
}

const admittedLogLists = new WeakMap();
/** Every feed of a root that witnesses were admitted into, as logical handles: a reader enumerating a
 *  root's feeds from its directories alone would pass over one whose segment was deleted. An index
 *  only gains feeds, so its listing is held until it gains one. */
export function segmentAdmittedLogs(storeRoot) {
  const index = rootIndex(storeRoot, ["admitted"]);
  const held = admittedLogLists.get(index);
  if (held?.size === index.byLog.size) return held.logs;
  const logs = Object.freeze([...index.byLog.keys()].map((log) => path.resolve(storeRoot, log)).sort());
  admittedLogLists.set(index, { size: index.byLog.size, logs });
  return logs;
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
  const index = rootIndex(storeRoot);
  const log = path.relative(storeRoot, path.resolve(logPath));

  for (const artifact of artifacts) {
    let canonicalText;
    try {
      canonicalText = verifyArtifact(artifact.ref, artifact.canonicalText).canonical.text;
    } catch (error) {
      throw new TypeError(`journal referenced artifact ${artifact.ref}: ${error.message}`);
    }
    if (index.artifacts.has(artifact.ref)) continue;
    appendLine(indexFile(storeRoot, "artifacts"), { ref: artifact.ref, canonicalText });
    index.artifacts.set(artifact.ref, canonicalText);
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
    let text = sources.get(ref) ?? index.artifacts.get(ref);
    if (text === undefined) {
      for (const entries of index.pending.values()) {
        const entry = entries[0];
        if (entry?.sourceRefs && !entry.sourceRefs.includes(ref)) continue;
        const found = entry?.statement.sources?.find((source) => source.ref === ref);
        if (found) { text = found.canonicalText; break; }
      }
    }
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
    if (index.admitted.has(id)) return "admitted";
    if (index.blocked.has(id)) return "blocked";
    if (index.pending.has(id) || batch.has(id)) return "quarantined";
    return legacy.state?.(id) ?? "not-witness";
  };

  const newly = new Set();
  const queue = [...batch.keys()].map((id) => ({ id, log, statement: batch.get(id) }));
  const queued = new Set(queue.map((item) => `${item.id}\u0000${item.log}`));
  // A pending dependent is woken again only when something has been admitted since it was last woken.
  const wokenAt = new Map();
  const enqueueDependents = (dependency) => {
    for (const dependent of index.dependents.get(dependency) ?? []) {
      for (const entry of index.pending.get(dependent) ?? []) {
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
  // fresh read of what is admitted, and an admission by a fresh read of what is pending, so one of
  // the two always sees the other and no dependency wakeup is lost.
  const wakeDependentsOfAdmitted = () => {
    rootIndex(storeRoot);
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
      if (!index.admitted.get(id)?.has(itemLog)) publish(storeRoot, index, id, itemLog, statement);
      continue;
    }
    const coreArtifact = artifactAt(id);
    if (coreArtifact === undefined) continue;
    const core = validateAddressedWitnessCore(coreArtifact.canonical);
    if (!isCausalWitness(core)) {
      block(storeRoot, index, id, core);
      enqueueDependents(id);
      continue;
    }
    const evaluation = evaluateWitnessDependencies(core.value, { artifact: artifactAt, witnessState: stateOf });
    if (evaluation.obstruction !== undefined) {
      block(storeRoot, index, id, evaluation.obstruction);
      enqueueDependents(id);
      continue;
    }
    if (evaluation.missing.length > 0) {
      if (!(index.pending.get(id) ?? []).some((entry) => entry.log === itemLog)) {
        const record = { id, log: itemLog, statement, missing: evaluation.missing };
        appendLine(indexFile(storeRoot, "pending"), record);
        // Read back rather than applied in place: the tail read knows the line's byte range, so the
        // index holds the body on disk. A body held in memory per pending witness grew a node's heap
        // with everything that ever waited on a cause.
        rootIndex(storeRoot);
        if (evaluation.missing.every((ref) => index.admitted.has(ref) || artifactAt(ref) !== undefined)) {
          const key = `${id}\u0000${itemLog}`;
          if (!queued.has(key)) {
            queued.add(key);
            queue.push({ id, log: itemLog, statement });
          }
        }
      }
      continue;
    }
    publish(storeRoot, index, id, itemLog, statement);
    newly.add(id);
    enqueueDependents(id);
  }

  return Object.freeze(statements.map((statement) => Object.freeze({
    statement,
    written: newly.has(statement.id),
    admission: stateOf(statement.id),
  })));
}

function publish(storeRoot, index, id, log, statement) {
  appendLine(segmentPath(path.resolve(storeRoot, log)), { id: statement.id, observation: statement.observation });
  const record = { id, log };
  appendLine(indexFile(storeRoot, "admitted"), record);
  applyLine(index, "admitted", record);
}

function block(storeRoot, index, id, obstruction) {
  if (index.blocked.has(id)) return;
  const record = { id, obstruction: JSON.parse(JSON.stringify(obstruction ?? null)) };
  appendLine(indexFile(storeRoot, "blocked"), record);
  applyLine(index, "blocked", record);
}

/** A witness's admission state in its root's compact index, or undefined when the index holds nothing of it. */
export function segmentState(logPath, id) {
  const storeRoot = artifactStoreRoot(logPath);
  const index = rootIndex(storeRoot, ["admitted"]);
  if (index.admitted.has(id)) return "admitted";
  const causal = rootIndex(storeRoot, ["admitted", "blocked", "pending"]);
  if (causal.admitted.has(id)) return "admitted";
  if (causal.blocked.has(id)) return "blocked";
  if (causal.pending.has(id)) return "quarantined";
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

/** One exact admitted witness, located by the existing admission index.
 * Receipt lookup verifies only the indexed feed; unrelated territory history
 * is neither an authority input nor a prerequisite for this read. */
export function segmentWitness(logPath, id) {
  const storeRoot = artifactStoreRoot(logPath);
  const logs = rootIndex(storeRoot, ["admitted"]).admitted.get(id);
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
  const index = rootIndex(storeRoot, ["artifacts", "admitted"]);
  const explicit = index.artifacts.get(ref);
  if (explicit !== undefined) return Object.freeze({ ref, canonicalText: explicit });
  const indexed = [...(index.admitted.get(ref) ?? [])].map(log => path.resolve(storeRoot, log));
  const logs = indexed.length > 0 ? indexed
    : [path.resolve(logPath), ...segmentFilesUnder(storeRoot).map(logPathOfSegment)];
  const marker = JSON.stringify(ref);
  for (const candidate of new Set(logs)) {
    for (const line of segmentLines(segmentPath(candidate))) {
      if (!line.includes(marker)) continue;
      const record = parseLine(line);
      if (record === undefined || !index.byLog.get(path.relative(storeRoot, candidate))?.has(record.id)) continue;
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
 * @param {string} storeRoot the `data/journals` directory.
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
    const index = rootIndex(storeRoot);
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
        publish(storeRoot, index, statement.id, log, statement);
        report.admitted += 1;
      }
    }
    for (const { id, obstruction } of legacy.blocked()) {
      if (index.blocked.has(id)) continue;
      block(storeRoot, index, id, obstruction);
      report.blocked += 1;
    }
    for (const artifact of legacy.artifacts()) {
      if (sourceRefs.has(artifact.ref) || index.artifacts.has(artifact.ref)) continue;
      appendLine(indexFile(storeRoot, "artifacts"), artifact);
      index.artifacts.set(artifact.ref, artifact.canonicalText);
      report.artifacts += 1;
    }
    const received = legacy.received().filter(({ statement }) => !index.admitted.has(statement.id) && !index.blocked.has(statement.id));
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
      for (const directory of [path.join(storeRoot, "index", "causal-admission", "v1"), path.join(storeRoot, "objects", "sen")]) {
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
