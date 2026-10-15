/**
 * The store: records, logs and heads found by address (store.md).
 *
 * Every function is synchronous and keeps nothing between calls: no map, set, cache, buffer pool,
 * descriptor, watcher or timer survives a call, and nothing is read at import. A call holds at most
 * one 64 KiB read chunk, one record and, for `walk`, the visited addresses (at most `limit`).
 * Discovery holds a 512-byte presence bitmap for the formula's 4096 buckets, never record contents.
 */
import { closeSync, constants, fstatSync, fsyncSync, mkdirSync, openSync, opendirSync, readFileSync, readSync, renameSync, statSync, unlinkSync, writeSync } from "node:fs";
import { dirname } from "node:path";
import { assertDurableFilePathSync, openDurableFileSync, syncFileDurablySync, writeFileTextSync } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { canonicalJson, parseJsonValue } from "@red-cup-engineering/json-services-section";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { niBucketPath } from "@red-cup-engineering/computer-content-address-engineering-services-section/ni-path";
import { isNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import {
  HeadConflict, LOG_LINE_BYTES_MAX, NI_PATH_VERSION, RECORD_BYTES_MAX, StoreCorruption, StoreError,
  checkDate, checkRoot, checkTypeName, decodeHeadName, headFile, logFile, logsDirectory, recordFile, recordsDirectory, stateDirectory,
} from "./layout.mjs";

const CHUNK_BYTES = 64 * 1024;
const LINE_BYTES_MAX = RECORD_BYTES_MAX + 1024;
const NEWLINE = 10;
const LOCK_STALE_MS = 30_000;
const LOCK_WAIT_MS = 15_000;
const pause = new Int32Array(new SharedArrayBuffer(4));

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

// ---------------------------------------------------------------------------------------------
// Lines: stream a file in 64 KiB chunks, yielding complete lines only.

/**
 * Yield `{text, next}` for every complete (newline-terminated) line of `file` from byte `from`.
 * A line longer than the bound, or not beginning with `prefix`, is passed over without being held.
 * An absent file has no lines.
 */
function openStrictRegular(file) {
  if (!Number.isInteger(constants.O_NOFOLLOW) || !Number.isInteger(constants.O_NONBLOCK))
    throw new StoreError("strict-file-open", "strict discovery requires no-follow nonblocking file opens");
  let fd;
  try { fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
  catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
  try {
    if (!fstatSync(fd).isFile()) throw new StoreCorruption(`${file} is not a regular record or head file`);
    return fd;
  } catch (error) { closeSync(fd); throw error; }
}

function* scanLines(file, { from = 0, prefix = null, strict = false, durableRoot } = {}) {
  let fd;
  try { fd = durableRoot !== undefined ? openDurableFileSync(file, constants.O_RDONLY, { durableRoot }) : strict ? openStrictRegular(file) : openSync(file, "r"); } catch (error) { if (error.code === "ENOENT" || (!strict && durableRoot === undefined && error.code === "ENOTDIR")) return; throw error; }
  if (fd === undefined) return;
  try {
    const chunk = Buffer.allocUnsafe(CHUNK_BYTES);
    const want = prefix === null ? null : Buffer.from(prefix, "utf8");
    let position = from, parts = [], held = 0, skipping = false, checked = want === null;
    for (;;) {
      const read = readSync(fd, chunk, 0, CHUNK_BYTES, position);
      if (read === 0) {
        if (strict && (held > 0 || skipping)) throw new StoreCorruption(`${file} has an unterminated record line`);
        return;
      }
      let start = 0;
      while (start < read) {
        const found = chunk.indexOf(NEWLINE, start);
        const end = found < 0 || found >= read ? read : found;
        if (!skipping) {
          if (held + (end - start) > LINE_BYTES_MAX) {
            if (strict) throw new StoreCorruption(`${file} has an overlong record line`);
            skipping = true; parts = []; held = 0;
          } else {
            parts.push(Buffer.from(chunk.subarray(start, end)));
            held += end - start;
            if (!checked && held >= want.length) {
              if (Buffer.concat(parts, held).subarray(0, want.length).equals(want)) checked = true; else { skipping = true; parts = []; held = 0; }
            }
          }
        }
        if (end === read && (found < 0 || found >= read)) break;
        if (!skipping && checked) yield { text: Buffer.concat(parts, held).toString("utf8"), next: position + end + 1 };
        parts = []; held = 0; skipping = false; checked = want === null;
        start = end + 1;
      }
      position += read;
    }
  } finally { closeSync(fd); }
}

/** Open for appending, write `data` (after a newline if the file's last byte is not one) in one write. */
function appendText(file, data, { durable, durableRoot }) {
  const strict = durableRoot !== undefined;
  if (!strict) mkdirSync(dirname(file), { recursive: true });
  const flags = constants.O_APPEND | constants.O_CREAT | constants.O_RDWR;
  const fd = strict ? openDurableFileSync(file, flags, { durableRoot, mode: 0o644, createParents: true }) : openSync(file, flags, 0o644);
  try {
    const size = fstatSync(fd).size;
    let cut = false;
    if (size > 0) { const last = Buffer.alloc(1); readSync(fd, last, 0, 1, size - 1); cut = last[0] !== NEWLINE; }
    const bytes = Buffer.from(cut ? `\n${data}` : data, "utf8");
    if (writeSync(fd, bytes) !== bytes.length) throw new StoreError("short-write", `short write to ${file}`);
    if (durable) fsyncSync(fd);
  } finally { closeSync(fd); }
  if (strict) syncFileDurablySync(file, { durableRoot });
}

// ---------------------------------------------------------------------------------------------
// Records.

/** The record a bucket line holds, if the line is `{"id":<id>,"record":<object>}` and the record hashes to the id. */
function verifiedRecord(text, address) {
  let line;
  try { line = parseJsonValue(text); } catch { return undefined; }
  if (!isObject(line) || line.id !== address || !isObject(line.record)) return undefined;
  try { return semanticId(line.record) === address ? line.record : undefined; } catch { return undefined; }
}

/** The verified record of an address, or undefined; `strict` throws StoreCorruption when only bad lines name it. */
function find(root, type, address, strict, durableRoot) {
  const file = recordFile(checkRoot(root), type, address);
  let corrupt = false;
  for (const { text } of scanLines(file, { prefix: `{"id":"${address}"`, durableRoot })) {
    const record = verifiedRecord(text, address);
    if (record !== undefined) return record;
    corrupt = true;
  }
  if (corrupt && strict) throw new StoreCorruption(`${file} holds lines for ${address} and none hashes to it`);
  return undefined;
}

/** Writes the record once; returns its address. */
export function put(root, type, record, { durableRoot } = {}) {
  checkRoot(root); checkTypeName(type);
  if (!isObject(record)) throw new StoreError("record", "a record is a JSON object");
  const text = canonicalJson(record);
  const size = Buffer.byteLength(text, "utf8");
  if (size > RECORD_BYTES_MAX) throw new StoreError("record-size", `a record is at most ${RECORD_BYTES_MAX} bytes of canonical JSON; this is ${size}`);
  const address = semanticId(record);
  const file = recordFile(root, type, address);
  if (durableRoot !== undefined) assertDurableFilePathSync(file, { durableRoot });
  if (find(root, type, address, false, durableRoot) !== undefined) {
    if (durableRoot !== undefined) syncFileDurablySync(file, { durableRoot });
    return address;
  }
  appendText(file, `{"id":"${address}","record":${text}}\n`, { durable: true, durableRoot });
  return address;
}

/** The record the address names, or undefined when it has not arrived. */
export function get(root, type, address) { return find(root, type, address, true); }

/** Whether a verified line for the address exists. */
export function has(root, type, address) { return find(root, type, address, true) !== undefined; }

const NAME_ALPHABET = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
/** Discover existing buckets once; an ephemeral 512-byte bitmap preserves formula order.
 * The NI owner computes every candidate path. No record/address index survives the call. */
function* bucketPaths(directory, { strict }) {
  const algorithm = dirname(niBucketPath(`ni:///sha-256;${"A".repeat(43)}`, NI_PATH_VERSION));
  const present = new Uint32Array(128);
  for (const name of directoryNames(`${directory}/${algorithm}`, { strict })) {
    const first = NAME_ALPHABET.indexOf(name[0]), second = NAME_ALPHABET.indexOf(name[1]);
    if (first < 0 || second < 0) continue;
    const bucket = niBucketPath(`ni:///sha-256;${name.slice(0, 2)}${"A".repeat(41)}`, NI_PATH_VERSION);
    if (bucket !== `${algorithm}/${name}`) continue;
    const index = first * 64 + second;
    present[index >>> 5] |= 1 << (index & 31);
  }
  for (let index = 0; index < 4096; index += 1) {
    if ((present[index >>> 5] & (1 << (index & 31))) === 0) continue;
    yield niBucketPath(`ni:///sha-256;${NAME_ALPHABET[index >>> 6]}${NAME_ALPHABET[index & 63]}${"A".repeat(41)}`, NI_PATH_VERSION);
  }
}

/** Every record of a type, bucket by bucket in name order and line by line in file order.
 * Strict discovery refuses malformed, misplaced or unverifiable rows. Consumers must exhaust
 * the iterator before using its result as complete; a yielded prefix is not a successful read.
 * This is streaming discovery, not a transaction or a snapshot across concurrent writers.
 */
export function* each(root, type, { strict = false } = {}) {
  checkRoot(root);
  const directory = recordsDirectory(root, type);
  for (const bucket of bucketPaths(directory, { strict })) {
    const file = `${directory}/${bucket}`;
    for (const { text } of scanLines(file, { strict })) {
      let line;
      try { line = parseJsonValue(text); } catch (error) {
        if (strict) throw new StoreCorruption(`${file} contains malformed record JSON`);
        continue;
      }
      const valid = isObject(line) && typeof line.id === "string" && isObject(line.record)
        && isNiUri(line.id) && bucketOf(line.id, bucket);
      const record = valid ? verifiedRecord(text, line.id) : undefined;
      if (record !== undefined) yield { address: line.id, record };
      else if (strict) throw new StoreCorruption(`${file} contains an invalid or unverifiable record`);
    }
  }
}
const bucketOf = (address, bucket) => niBucketPath(address, NI_PATH_VERSION) === bucket;

// ---------------------------------------------------------------------------------------------
// Threads: references, walk.

/** A reference as `{type, id}`: a string is an address of the referrer's own type. */
export function referenceOf(entry, ownType) {
  if (typeof entry === "string" && isNiUri(entry)) return { type: ownType, id: entry };
  if (isObject(entry) && typeof entry.id === "string" && isNiUri(entry.id)) return { type: checkTypeName(entry.type), id: entry.id };
  throw new StoreError("reference", `not an address or {type, id}: ${JSON.stringify(entry)}`);
}
const keyOf = (reference) => `${reference.type} ${reference.id}`;

function causesOf(record, type) {
  const causes = record.causes;
  return Array.isArray(causes) ? causes.map((entry) => referenceOf(entry, type)) : [];
}

/**
 * Read a thread from `from` (addresses, or {type, id}) along `causes`, each address once, effects
 * before the causes they name. Yields `{address, type, record}` or `{address, type, missing: true}`,
 * then `{truncated: true}` if the limit stopped it. Memory: the visited addresses, at most `limit`.
 */
export function* walk(root, type, from, { limit = 256 } = {}) {
  checkRoot(root); checkTypeName(type);
  if (!Array.isArray(from)) throw new StoreError("walk", "walk starts from a list of addresses");
  if (!Number.isSafeInteger(limit) || limit < 1) throw new StoreError("walk", "walk limit is a positive integer");
  const starts = from.map((entry) => referenceOf(entry, type));
  const seen = new Set();
  const finished = [];
  let truncated = false;
  const stack = [];
  const enter = (reference) => {
    const key = keyOf(reference);
    if (seen.has(key)) return;
    if (seen.size >= limit) { truncated = true; return; }
    seen.add(key);
    const record = find(root, reference.type, reference.id, false);
    const causes = record === undefined ? null : causesOf(record, reference.type);
    stack.push({ reference, causes: causes !== null && causes.length <= 8 ? causes : null, index: 0, missing: record === undefined });
  };
  for (let start = starts.length - 1; start >= 0; start -= 1) {
    enter(starts[start]);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      let causes = frame.causes;
      if (!frame.missing && causes === null) {
        const record = find(root, frame.reference.type, frame.reference.id, false);
        causes = record === undefined ? [] : causesOf(record, frame.reference.type);
      }
      if (!frame.missing && frame.index < causes.length) { enter(causes[frame.index]); frame.index += 1; continue; }
      stack.pop();
      finished.push({ reference: frame.reference, missing: frame.missing });
    }
  }
  for (let at = finished.length - 1; at >= 0; at -= 1) {
    const { reference, missing } = finished[at];
    if (missing) { yield { address: reference.id, type: reference.type, missing: true }; continue; }
    const record = find(root, reference.type, reference.id, false);
    if (record !== undefined) yield { address: reference.id, type: reference.type, record };
    else yield { address: reference.id, type: reference.type, missing: true };
  }
  if (truncated) yield { truncated: true };
}

// ---------------------------------------------------------------------------------------------
// Logs.

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u;

/** Appends one line to the day's log of the type; the day is the first ten characters of `at`. */
export function append(root, type, line) {
  checkRoot(root); checkTypeName(type);
  if (!isObject(line)) throw new StoreError("log-line", "a log line is a JSON object");
  if (typeof line.at !== "string" || !ISO_UTC.test(line.at) || Number.isNaN(Date.parse(line.at))) throw new StoreError("log-line", "a log line has an `at` member that is an ISO 8601 UTC timestamp");
  const text = JSON.stringify({ at: line.at, ...line });
  const size = Buffer.byteLength(text, "utf8");
  if (size > LOG_LINE_BYTES_MAX) throw new StoreError("log-size", `a log line is at most ${LOG_LINE_BYTES_MAX} bytes; this is ${size}`);
  appendText(logFile(root, type, line.at.slice(0, 10)), `${text}\n`, { durable: false });
}

/** A day's lines from byte `from`: `{line, next}`, `next` the byte position after the line. */
export function* readLog(root, type, date, { from = 0 } = {}) {
  checkRoot(root);
  if (!Number.isSafeInteger(from) || from < 0) throw new StoreError("log-cursor", "a log cursor is a non-negative byte position");
  for (const { text, next } of scanLines(logFile(root, type, date), { from })) {
    let line;
    try { line = parseJsonValue(text); } catch { continue; }
    if (isObject(line)) yield { line, next };
  }
}

function* directoryNames(directory, { strict = false } = {}) {
  let dir;
  try { dir = opendirSync(directory); } catch (error) { if (error.code === "ENOENT" || (!strict && error.code === "ENOTDIR")) return; throw error; }
  try { for (let entry = dir.readSync(); entry !== null; entry = dir.readSync()) yield entry.name; } finally { dir.closeSync(); }
}

/** The dates that have a log, in order. Holds one name at a time: each pass of the directory picks the next date. */
export function* logDates(root, type) {
  checkRoot(root);
  const directory = logsDirectory(root, type);
  let last = "";
  for (;;) {
    let next = null;
    for (const name of directoryNames(directory)) {
      const match = /^(\d{4}-\d{2}-\d{2})\.jsonl$/u.exec(name);
      if (match !== null && match[1] > last && (next === null || match[1] < next)) next = match[1];
    }
    if (next === null) return;
    yield next;
    last = next;
  }
}

// ---------------------------------------------------------------------------------------------
// Heads.

export function withFileLock(lock, work) {
  mkdirSync(dirname(lock), { recursive: true });
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try { closeSync(openSync(lock, "wx")); break; } catch (error) {
      if (error.code !== "EEXIST") throw error;
      let age = 0;
      try { age = Date.now() - statSync(lock).mtimeMs; } catch { continue; }
      if (age > LOCK_STALE_MS) { try { unlinkSync(lock); } catch { /* taken over by another */ } continue; }
      if (Date.now() > deadline) throw new StoreError("lock", `${lock} is held by another writer`);
      Atomics.wait(pause, 0, 0, 5);
    }
  }
  try { return work(); } finally { try { unlinkSync(lock); } catch { /* already gone */ } }
}

function readHeadFile(file, { strict = false, maxBytes, durableRoot } = {}) {
  if (maxBytes !== undefined && (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes === Number.MAX_SAFE_INTEGER))
    throw new StoreError("head-size", "maxBytes must be a positive safe integer below MAX_SAFE_INTEGER");
  let text;
  if (strict || maxBytes !== undefined || durableRoot !== undefined) {
    let fd;
    try { fd = durableRoot !== undefined ? openDurableFileSync(file, constants.O_RDONLY, { durableRoot }) : openStrictRegular(file); }
    catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
    if (fd === undefined) return undefined;
    try {
      if (maxBytes === undefined) text = readFileSync(fd, "utf8");
      else {
        if (fstatSync(fd).size > maxBytes) throw new StoreError("head-size", "head exceeds maxBytes");
        const chunk = Buffer.allocUnsafe(Math.min(CHUNK_BYTES, maxBytes + 1));
        const parts = [];
        let total = 0;
        for (;;) {
          const count = readSync(fd, chunk, 0, Math.min(chunk.length, maxBytes + 1 - total), null);
          if (count === 0) break;
          total += count;
          if (total > maxBytes) throw new StoreError("head-size", "head exceeds maxBytes");
          parts.push(Buffer.from(chunk.subarray(0, count)));
        }
        // Preserve U+FEFF for the JSON owner's original admission; do not strip a BOM.
        try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(Buffer.concat(parts, total)); }
        catch { throw new StoreCorruption(file + " is not valid UTF-8 head text"); }
      }
    } finally { closeSync(fd); }
  } else {
    try { text = readFileSync(file, "utf8"); } catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
  }
  const head = parseJsonValue(text);
  if (!isObject(head) || !Array.isArray(head.frontier)) throw new StoreCorruption(file + " is not a head");
  return head;
}

/** Optional maxBytes enables strict descriptor admission and a max+1 byte read. */
export function readHead(root, object, name, options) { return readHeadFile(headFile(checkRoot(root), object, name), options); }

function frontierEntries(frontier, object) {
  if (!Array.isArray(frontier)) throw new StoreError("frontier", "a frontier is a list");
  const byKey = new Map();
  for (const entry of frontier) {
    const reference = referenceOf(entry, object);
    byKey.set(keyOf(reference), reference.type === object ? reference.id : { type: reference.type, id: reference.id });
  }
  return [...byKey.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, entry]) => entry);
}
const sameFrontier = (object, left, right) => JSON.stringify(frontierEntries(left, object)) === JSON.stringify(frontierEntries(right, object));

function writeHeadLocked(file, object, name, head, expect, durableRoot) {
  const current = readHeadFile(file, { durableRoot });
  if (expect !== undefined) {
    const holds = expect === null ? current === undefined : Array.isArray(expect) && sameFrontier(object, current?.frontier ?? [], expect) && (current !== undefined || expect.length === 0);
    if (!holds) throw new HeadConflict(`head ${object}/${name} is not as expected`);
  }
  const body = { name, frontier: frontierEntries(head.frontier, object), at: head.at ?? new Date().toISOString() };
  if (head.closed === true) body.closed = true;
  if (durableRoot !== undefined) {
    // Match the original 0644 creation subject to the process umask.
    writeFileTextSync(file, JSON.stringify(body) + "\n", { durableRoot, mode: 0o644 & ~process.umask() });
    return;
  }
  const temporary = `${file}.tmp`;
  const fd = openSync(temporary, "w", 0o644);
  try { writeSync(fd, `${JSON.stringify(body)}\n`); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temporary, file);
}

/** Replaces one head atomically. `expect`: absent, no check; null, the head must not exist; a list, the frontier must equal it. */
export function writeHead(root, object, name, head, { expect, durableRoot } = {}) {
  const file = headFile(checkRoot(root), object, name);
  if (!isObject(head)) throw new StoreError("head", "a head is an object with a frontier");
  if (durableRoot !== undefined) {
    assertDurableFilePathSync(file, { durableRoot });
    assertDurableFilePathSync(`${file}.lock`, { durableRoot });
  }
  withFileLock(`${file}.lock`, () => writeHeadLocked(file, object, name, head, expect, durableRoot));
}

/** Puts the record, with `causes` (default: the head's whole frontier), and advances the head. Returns the address. */
export function extend(root, object, name, record, { causes, closed, durableRoot } = {}) {
  const file = headFile(checkRoot(root), object, name);
  checkTypeName(object);
  if (!isObject(record)) throw new StoreError("record", "a record is a JSON object");
  if (durableRoot !== undefined) {
    assertDurableFilePathSync(file, { durableRoot });
    assertDurableFilePathSync(`${file}.lock`, { durableRoot });
  }
  return withFileLock(`${file}.lock`, () => {
    const frontier = frontierEntries(readHeadFile(file, { durableRoot })?.frontier ?? [], object);
    const named = frontierEntries(causes ?? frontier, object);
    const address = put(root, object, { ...record, causes: named }, { durableRoot });
    const dropped = new Set(named.map((entry) => keyOf(referenceOf(entry, object))));
    const next = [...frontier.filter((entry) => !dropped.has(keyOf(referenceOf(entry, object)))), address];
    writeHeadLocked(file, object, name, { frontier: next, closed }, undefined, durableRoot);
    return address;
  });
}

/** The heads of a type of thread, from the directory listing: `{name, head}`.
 * Strict discovery propagates unavailable reads and refuses malformed heads/frontiers instead
 * of silently omitting them. Fully exhaust before admitting a complete set. Concurrent writers
 * still require the consumer's ordinary final source check; this does not create a snapshot.
 */
export function* heads(root, object, { strict = false } = {}) {
  const directory = stateDirectory(checkRoot(root), object);
  for (const file of directoryNames(directory, { strict })) {
    if (!file.endsWith(".json")) continue;
    let head;
    try {
      head = readHeadFile(`${directory}/${file}`, { strict });
      if (strict && head === undefined) throw new StoreCorruption(`${directory}/${file} disappeared during head discovery`);
      if (strict) frontierEntries(head.frontier, object);
    } catch (error) {
      if (strict) {
        // Preserve genuine filesystem failures (and their cause) without echoing parsed values.
        if (typeof error?.code === "string" && /^E[A-Z]+$/u.test(error.code)) throw error;
        throw new StoreCorruption(`${directory}/${file} is not a valid head`);
      }
      continue;
    }
    if (head !== undefined) yield { name: decodeHeadName(file.slice(0, -".json".length)), head };
  }
}

export { frontierEntries, keyOf };
