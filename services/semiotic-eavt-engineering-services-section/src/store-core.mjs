/**
 * The store: records, logs and heads found by address (store.md).
 *
 * Without an explicitly caller-owned recordVerification scope, every function is synchronous and keeps nothing between calls: no map, set, cache, buffer pool,
 * descriptor, watcher or timer survives a call, and nothing is read at import. A call holds at most
 * one 64 KiB read chunk, one record and, for `walk`, the visited addresses (at most `limit`).
 * Discovery holds a 512-byte presence bitmap for the formula's 4096 buckets, never record contents.
 *
 * One implicit thing survives, and it is not the store's state: the verdicts of address verification. Whether a
 * record line hashes to the address it names is a function of the line's bytes alone, so a line whose
 * bytes were proven once is known by a SHA-256 digest of those bytes (`VERIFIED_LINES_MAX` digests at
 * most, a fixed bound whatever the store holds). Re-proving it re-encoded the record as canonical CBOR
 * and hashed it again on every read; a long-running host reading the same records each turn spent most
 * of its time there. A line whose bytes differ is a different digest and is proven afresh.
 */
import { hash } from "node:crypto";
import { closeSync, constants, fstatSync, fsyncSync, mkdirSync, openSync, opendirSync, readFileSync, readSync, statSync, unlinkSync, utimesSync, writeSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertDurableFilePathSync, openDurableFileSync, syncFileDurablySync, writeFileTextSync } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { canonicalJson, parseJsonValue } from "@red-cup-engineering/json-services-section";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { niBucketPath } from "@red-cup-engineering/computer-content-address-engineering-services-section/ni-path";
import { isNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import {
  HeadConflict, LOG_LINE_BYTES_MAX, SEAVT_ROW_BYTES_MAX, NI_PATH_VERSION, RECORD_BYTES_MAX, StoreCorruption, StoreError,
  checkDate, checkRoot, checkTypeName, decodeHeadName, encodeHeadName, headFile, logFile, logsDirectory, recordFile, recordsDirectory, stateDirectory,
} from "./layout.mjs";
import { sealDay, segmentDate, segmentLines, segmentsOf } from "./sealed-log.mjs";

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

function* scanLines(file, { from = 0, prefix = null, strict = false, durableRoot, lineBytesMax = LINE_BYTES_MAX } = {}) {
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
        // Most lines are wholly in this read chunk. Decode them directly without first
        // allocating a Buffer for each line fragment and then concatenating the fragments.
        // Compare an addressed lookup's prefix before decoding; the chunk remains owned by
        // this scanner and no borrowed Buffer escapes the yield.
        if (!skipping && held === 0 && found >= 0 && found < read) {
          const length = end - start;
          if (length > lineBytesMax) {
            if (strict) throw new StoreCorruption(`${file} has an overlong record line`);
          } else if (want === null || (length >= want.length && chunk.subarray(start, start + want.length).equals(want))) {
            yield { text: chunk.toString("utf8", start, end), next: position + end + 1 };
          }
          start = end + 1;
          continue;
        }
        if (!skipping) {
          if (held + (end - start) > lineBytesMax) {
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

/** Open for appending, write `data` (after a newline if the file's last byte is not one) in one write.
 *  Returns `{created, size}`: whether the file was new, and its size after the write; or `{refused: true, size}`
 *  when `cap` (the most bytes the file may hold) would be passed, in which case nothing is written. */
function appendText(file, data, { durable, durableRoot, cap }) {
  const strict = durableRoot !== undefined;
  if (!strict) mkdirSync(dirname(file), { recursive: true });
  const flags = constants.O_APPEND | constants.O_CREAT | constants.O_RDWR;
  const fd = strict ? openDurableFileSync(file, flags, { durableRoot, mode: 0o644, createParents: true }) : openSync(file, flags, 0o644);
  let result;
  try {
    const size = fstatSync(fd).size;
    let cut = false;
    if (size > 0) { const last = Buffer.alloc(1); readSync(fd, last, 0, 1, size - 1); cut = last[0] !== NEWLINE; }
    const bytes = Buffer.from(cut ? `\n${data}` : data, "utf8");
    if (cap !== undefined && size + bytes.length > cap) return { refused: true, size };
    if (writeSync(fd, bytes) !== bytes.length) throw new StoreError("short-write", `short write to ${file}`);
    if (durable) fsyncSync(fd);
    result = { created: size === 0, size: size + bytes.length };
  } finally { closeSync(fd); }
  if (strict) syncFileDurablySync(file, { durableRoot });
  return result;
}

// ---------------------------------------------------------------------------------------------
// Records.

/** Whether a claimed record address is its actual canonical content identity.
 * Used by both local bucket admission and peer exchange, without elevating identity to authority. */
export function recordAddressMatches(record, address) {
  if (!isObject(record) || typeof address !== "string") return false;
  try { return semanticId(record) === address; } catch { return false; }
}

/** The most verification verdicts held (see the module note): about 3 MiB, whatever the store holds. */
export const VERIFIED_LINES_MAX = 32_768;
const verifiedLines = new Set();

/** The record a bucket line holds, if the line is `{"id":<id>,"record":<object>}` and the record hashes to the id. */
function verifiedRecord(text, address) {
  let line;
  try { line = parseJsonValue(text); } catch { return undefined; }
  if (!isObject(line) || line.id !== address) return undefined;
  const digest = hash("sha256", text, "base64");
  if (verifiedLines.has(digest)) return line.record;
  if (!recordAddressMatches(line.record, address)) return undefined;
  if (verifiedLines.size >= VERIFIED_LINES_MAX) verifiedLines.clear();
  verifiedLines.add(digest);
  return line.record;
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

/**
 * The path whose mtime moves when a type gains a record: its records directory. `put` touches it
 * after each new line, so a consumer that folds a type waits on this one path (a watch, or its
 * mtime against when it last read) instead of reading the type again to learn that nothing came.
 * Bucket appends move no directory, so without the touch nothing fixed would witness them. The
 * directory holds no index: its mtime says only that the type changed after a given instant.
 */
export function recordsChangeWitness(root, type) {
  return recordsDirectory(checkRoot(root), checkTypeName(type));
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
  const changed = new Date();
  utimesSync(recordsDirectory(root, type), changed, changed);
  return address;
}

/** The record the address names, or undefined when it has not arrived. */
export function get(root, type, address) { return find(root, type, address, true); }

/** Whether a verified line for the address exists. */
export function has(root, type, address) { return find(root, type, address, true) !== undefined; }

const NAME_ALPHABET = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
/** The 4096 bucket files of formula `NI_PATH_VERSION`, in formula order. A bucket is a constant of
 * the formula, not of any record: the NI owner computes each once per process, the first time a type
 * is discovered, instead of once per directory name on every discovery. It holds no address. */
let formulaBuckets;
function bucketsOfFormula() {
  if (formulaBuckets !== undefined) return formulaBuckets;
  const buckets = new Array(4096);
  for (let index = 0; index < 4096; index += 1)
    buckets[index] = niBucketPath(`ni:///sha-256;${NAME_ALPHABET[index >>> 6]}${NAME_ALPHABET[index & 63]}${"A".repeat(41)}`, NI_PATH_VERSION);
  return formulaBuckets = Object.freeze(buckets);
}

/** Discover existing buckets once; an ephemeral 512-byte bitmap preserves formula order.
 * The NI owner computes every candidate path. No record/address index survives the call. */
function* bucketPaths(directory, { strict }) {
  const buckets = bucketsOfFormula();
  const algorithm = dirname(buckets[0]);
  const present = new Uint32Array(128);
  for (const name of directoryNames(`${directory}/${algorithm}`, { strict })) {
    const first = NAME_ALPHABET.indexOf(name[0]), second = NAME_ALPHABET.indexOf(name[1]);
    if (first < 0 || second < 0) continue;
    const index = first * 64 + second;
    if (buckets[index] !== `${algorithm}/${name}`) continue;
    present[index >>> 5] |= 1 << (index & 31);
  }
  for (let index = 0; index < 4096; index += 1) {
    if ((present[index >>> 5] & (1 << (index & 31))) !== 0) yield buckets[index];
  }
}

/** Every record of a type, bucket by bucket in name order and line by line in file order.
 * Strict discovery refuses malformed, misplaced or unverifiable rows. Consumers must exhaust
 * the iterator before using its result as complete; a yielded prefix is not a successful read.
 * This is streaming discovery, not a transaction or a snapshot across concurrent writers.
 */
export function* each(root, type, { strict = false, verification } = {}) {
  checkRoot(root);
  if (verification !== undefined && strict !== true)
    throw new StoreError("verification", "record verification requires strict discovery");
  const retained = verification === undefined ? undefined : verificationScope(root, verification);
  const directory = recordsDirectory(root, type);
  for (const bucket of bucketPaths(directory, { strict })) {
    const file = `${directory}/${bucket}`;
    const before = retained === undefined ? undefined : fileVersion(file);
    for (const { text } of scanLines(file, { strict })) {
      let line;
      try { line = parseJsonValue(text); } catch (error) {
        if (strict) throw new StoreCorruption(`${file} contains malformed record JSON`);
        continue;
      }
      const valid = isObject(line) && typeof line.id === "string" && isObject(line.record)
        && isNiUri(line.id) && bucketOf(line.id, bucket);
      const record = valid ? verifiedRecord(text, line.id) : undefined;
      if (record !== undefined) {
        const version = before !== undefined && before === fileVersion(file) ? before : undefined;
        rememberVerification(retained, { type, id: line.id }, record, version);
        yield { address: line.id, record };
      }
      else if (strict) throw new StoreCorruption(`${file} contains an invalid or unverifiable record`);
    }
  }
}
const bucketOf = (address, bucket) => niBucketPath(address, NI_PATH_VERSION) === bucket;

/**
 * The records of a type appended since `cursor`, with the cursor to pass next time:
 * `{records, cursor}`, or `{reset: true}` when a bucket the cursor names shrank, was replaced or is
 * gone, in which case the consumer folds again from a call without a cursor. Without a cursor every
 * record is read, as `each` reads them.
 *
 * Bucket files only grow, so a consumer that folds a type keeps, per bucket, the byte position after
 * its last complete line (and the file's inode), and the next call stats each bucket and reads only
 * what follows. The cursor is the consumer's, held between its calls as a log cursor is; the store
 * holds nothing. A line not yet terminated is left for the next call.
 */
export function appended(root, type, cursor) {
  checkRoot(root); checkTypeName(type);
  const prior = cursor === undefined || cursor === null ? null : cursor.buckets;
  if (prior !== null && !(prior instanceof Map)) throw new StoreError("cursor", "an appended cursor is one this function returned");
  const directory = recordsDirectory(root, type);
  const buckets = new Map(), records = [];
  for (const bucket of bucketPaths(directory, { strict: false })) {
    const file = `${directory}/${bucket}`;
    let stat;
    try { stat = statSync(file); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
    const was = prior?.get(bucket);
    if (was !== undefined && (stat.ino !== was.ino || stat.size < was.position)) return Object.freeze({ reset: true });
    let position = was?.position ?? 0;
    if (stat.size > position) {
      for (const { text, next } of scanLines(file, { from: position })) {
        position = next;
        let line;
        try { line = parseJsonValue(text); } catch { continue; }
        if (!isObject(line) || typeof line.id !== "string" || !isObject(line.record) || !isNiUri(line.id) || !bucketOf(line.id, bucket)) continue;
        const record = verifiedRecord(text, line.id);
        if (record !== undefined) records.push(Object.freeze({ address: line.id, record }));
      }
    }
    buckets.set(bucket, Object.freeze({ position, ino: stat.ino }));
  }
  if (prior !== null) for (const bucket of prior.keys()) if (!buckets.has(bucket)) return Object.freeze({ reset: true });
  return Object.freeze({ records: Object.freeze(records), cursor: Object.freeze({ buckets }) });
}

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
// One caller owns this bounded, read-only verification scope. It retains only
// addresses, short causal references and exact bucket fingerprints, never bodies.
const verificationScopes = new WeakMap();
const VERIFICATION_ENTRIES_MAX = 32768;
function fileVersion(file) {
  try {
    const stat = statSync(file, { bigint: true });
    return stat.isFile() ? `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}` : undefined;
  } catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
}
function verificationScope(root, verification) {
  const state = verificationScopes.get(verification);
  if (state === undefined || state.closed || state.root !== root)
    throw new StoreError("verification", "record verification is closed, foreign or not owned by this store");
  return state;
}
export function recordVerification(root, { maximumEntries = VERIFICATION_ENTRIES_MAX } = {}) {
  checkRoot(root);
  if (!Number.isSafeInteger(maximumEntries) || maximumEntries < 1 || maximumEntries > VERIFICATION_ENTRIES_MAX)
    throw new StoreError("verification", "record verification entries must fit the original finite bound");
  const verification = Object.freeze({ close() {
    const state = verificationScopes.get(verification);
    if (state !== undefined) { state.closed = true; state.entries.clear(); verificationScopes.delete(verification); }
  } });
  verificationScopes.set(verification, { root, maximumEntries, entries: new Map(), closed: false });
  return verification;
}
function rememberVerification(state, reference, record, version) {
  if (state === undefined || version === undefined || record === undefined) return;
  if (state.closed) throw new StoreError("verification", "record verification is closed");
  if (reference.type.length > 128 || reference.id.length > 128
      || Array.isArray(record.causes) && record.causes.length > 8) return;
  let causes;
  // Discovery validates canonical rows, not the graph interpretation of unheaded
  // records. An unsupported cause stays uncached; the original walk still judges it.
  try { causes = causesOf(record, reference.type); } catch { return; }
  if (causes.some(cause => cause.type.length > 128 || cause.id.length > 128)) return;
  const key = keyOf(reference);
  state.entries.delete(key);
  state.entries.set(key, { version, causes: Object.freeze(causes) });
  if (state.entries.size > state.maximumEntries) state.entries.delete(state.entries.keys().next().value);
}
function rememberedVerification(state, reference, version) {
  if (state === undefined) return undefined;
  if (state.closed) throw new StoreError("verification", "record verification is closed");
  const key = keyOf(reference), proof = state.entries.get(key);
  if (proof === undefined) return undefined;
  state.entries.delete(key);
  if (version === undefined || proof.version !== version) return undefined;
  state.entries.set(key, proof);
  return proof;
}

export function* walk(root, type, from, { limit = 256, verifyOnly = false, verification } = {}) {
  checkRoot(root); checkTypeName(type);
  if (!Array.isArray(from)) throw new StoreError("walk", "walk starts from a list of addresses");
  if (!Number.isSafeInteger(limit) || limit < 1) throw new StoreError("walk", "walk limit is a positive integer");
  if (typeof verifyOnly !== "boolean") throw new StoreError("walk", "walk verifyOnly is boolean");
  if (verification !== undefined && !verifyOnly)
    throw new StoreError("verification", "record verification is only for a proof walk");
  const retained = verification === undefined ? undefined : verificationScope(root, verification);
  const bucketVersion = reference => fileVersion(recordFile(root, reference.type, reference.id));
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
    const before = verifyOnly ? bucketVersion(reference) : undefined;
    const proof = rememberedVerification(retained, reference, before);
    const record = proof === undefined ? find(root, reference.type, reference.id, false) : undefined;
    const version = verifyOnly && before !== undefined && before === bucketVersion(reference) ? before : undefined;
    const causes = proof?.causes ?? (record === undefined ? null : causesOf(record, reference.type));
    rememberVerification(retained, reference, record, version);
    stack.push({ reference, causes: causes !== null && causes.length <= 8 ? causes : null, index: 0, missing: proof === undefined && record === undefined, ...(verifyOnly ? { version } : {}) });
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
      finished.push({ reference: frame.reference, missing: frame.missing, ...(verifyOnly ? { version: frame.version } : {}) });
    }
  }
  for (let at = finished.length - 1; at >= 0; at -= 1) {
    if (retained?.closed) throw new StoreError("verification", "record verification is closed");
    const { reference, missing, version } = finished[at];
    if (missing) { yield { address: reference.id, type: reference.type, missing: true }; continue; }
    // Reuse this call's verified bytes only while the exact bucket is unchanged.
    // Append, truncation, deletion, replacement or in-place mutation requires the
    // original current lookup, preserving disappearance-between-yields behavior.
    if (verifyOnly && version !== undefined && version === bucketVersion(reference)) {
      yield { address: reference.id, type: reference.type, verified: true }; continue;
    }
    const record = find(root, reference.type, reference.id, false);
    if (record !== undefined) yield verifyOnly
      ? { address: reference.id, type: reference.type, verified: true }
      : { address: reference.id, type: reference.type, record };
    else yield { address: reference.id, type: reference.type, missing: true };
  }
  if (truncated) yield { truncated: true };
}

// ---------------------------------------------------------------------------------------------
// Logs.

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u;

/**
 * Appends one line to the day's log of the type; the day is the first ten characters of `at`.
 *
 * Options (all optional):
 * - `maxBytes`: the most bytes the serialized line may take (default 4,096; a SEAVT row line passes
 *   SEAVT_ROW_BYTES_MAX).
 * - `guard`: a log guard (log-budget.mjs `logGuard`). When the day's file would pass the feed's hard cap the line
 *   is not written, the guard logs the refusal once, and `append` returns false.
 * - `seal`: whether the first append of a new day seals the earlier closed days of the feed (default true).
 *
 * Returns true when the line was written, false when the guard refused it.
 */
export function append(root, type, line, { maxBytes = LOG_LINE_BYTES_MAX, guard, seal = true } = {}) {
  checkRoot(root); checkTypeName(type);
  if (!isObject(line)) throw new StoreError("log-line", "a log line is a JSON object");
  if (typeof line.at !== "string" || !ISO_UTC.test(line.at) || Number.isNaN(Date.parse(line.at))) throw new StoreError("log-line", "a log line has an `at` member that is an ISO 8601 UTC timestamp");
  const text = JSON.stringify({ at: line.at, ...line });
  const size = Buffer.byteLength(text, "utf8");
  if (size > maxBytes) throw new StoreError("log-size", `a log line is at most ${maxBytes} bytes; this is ${size}`);
  const date = line.at.slice(0, 10), cap = guard?.capOf(type);
  const result = appendText(logFile(root, type, date), `${text}\n`, { durable: false, cap });
  if (result.refused) { guard.refuse(root, type, date, result.size, cap); return false; }
  // The first append of a day is the moment the days before it are closed: seal them, so a raw day file does not wait for a timer.
  if (result.created && seal) { try { sealLogs(root, type, { before: date }); } catch { /* sealing is retried by the next new day or an explicit seal */ } }
  return true;
}

/** A day's lines from byte `from`: `{line, next}`, `next` the byte position after the line. A day is its sealed
 *  segments, then a file being sealed, then its open file (src/sealed-log.mjs); positions run through all three. */
export function* readLog(root, type, date, { from = 0 } = {}) {
  checkRoot(root);
  if (!Number.isSafeInteger(from) || from < 0) throw new StoreError("log-cursor", "a log cursor is a non-negative byte position");
  const directory = logsDirectory(root, type), file = logFile(root, type, date);
  const lines = function* (texts) {
    for (const { text, next } of texts) {
      let line;
      try { line = parseJsonValue(text); } catch { continue; }
      if (isObject(line)) yield { line, next };
    }
  };
  let at = 0;
  for (const segment of segmentsOf([...directoryNames(directory)], date)) {
    if (segment.end > from) yield* lines(segmentLines(join(directory, segment.name), segment.start, from));
    at = segment.end;
  }
  for (const tail of [`${file}.sealing`, file]) {
    const start = at;
    yield* lines((function* () { for (const { text, next } of scanLines(tail, { from: Math.max(0, from - start), lineBytesMax: SEAVT_ROW_BYTES_MAX + 1_024 })) yield { text, next: next + start }; })());
    try { at += statSync(tail).size; } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}

/** Seal every day of the type's log before `before` (a date): each becomes compressed segments, read as before. */
export function sealLogs(root, type, { before }) {
  checkRoot(root); checkTypeName(type); checkDate(before);
  const directory = logsDirectory(root, type), sealed = [], names = [...directoryNames(directory)];
  const dates = new Set();
  for (const name of names) { const date = /^(\d{4}-\d{2}-\d{2})\.jsonl(?:\.sealing)?$/u.exec(name)?.[1]; if (date !== undefined && date < before) dates.add(date); }
  for (const date of [...dates].sort()) {
    const segment = sealDay(directory, [...directoryNames(directory)], date);
    if (segment) sealed.push(segment);
  }
  return sealed;
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
      const date = /^(\d{4}-\d{2}-\d{2})\.jsonl(?:\.sealing)?$/u.exec(name)?.[1] ?? segmentDate(name);
      if (date !== null && date > last && (next === null || date < next)) next = date;
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

function assertExpectedHead(current, object, name, expect) {
  if (expect !== undefined) {
    const holds = expect === null ? current === undefined : Array.isArray(expect) && sameFrontier(object, current?.frontier ?? [], expect) && (current !== undefined || expect.length === 0);
    if (!holds) throw new HeadConflict(`head ${object}/${name} is not as expected`);
  }
}

function writeHeadLocked(file, object, name, head, expect, durableRoot) {
  const current = readHeadFile(file, { durableRoot });
  assertExpectedHead(current, object, name, expect);
  const body = { name, frontier: frontierEntries(head.frontier, object), at: head.at ?? new Date().toISOString() };
  if (head.closed === true) body.closed = true;
  if (expect === null) {
    // The lock's age-based takeover does not fence a paused writer. Publish an
    // absent-only head through the file owner's exclusive final link instead.
    try {
      writeFileTextSync(file, JSON.stringify(body) + "\n", { flag: "wx", durableRoot, mode: 0o644 & ~process.umask() });
    } catch (error) {
      // EEXIST may name a temporary file. Only an admitted destination head
      // establishes a conflict; absence or any uncertain failure stays refused.
      if (error.code === "EEXIST" && readHeadFile(file, { strict: true, durableRoot }) !== undefined)
        throw new HeadConflict(`head ${object}/${name} is not as expected`);
      throw error;
    }
    return;
  }
  // Ordinary heads need the same complete-write publication boundary: one
  // unchecked writeSync could return a prefix and publish a truncated frontier.
  // File owns the full write, temporary custody and atomic replacement.
  writeFileTextSync(file, JSON.stringify(body) + "\n", { durableRoot, mode: 0o644 & ~process.umask() });
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

/** Puts the record, with `causes` (default: the head's whole frontier), and advances the head.
 * `expect` has writeHead's meaning and is checked under the lock before putting the record.
 * Returns the address; a later publication failure can still leave the record held. */
export function extend(root, object, name, record, { causes, closed, durableRoot, expect } = {}) {
  const file = headFile(checkRoot(root), object, name);
  checkTypeName(object);
  if (!isObject(record)) throw new StoreError("record", "a record is a JSON object");
  // Own the normalized guard before a source record can be read or serialized.
  // The same reference-set comparison governs conditional replacement and append.
  const expected = Array.isArray(expect) ? frontierEntries(expect, object) : expect;
  if (durableRoot !== undefined) {
    assertDurableFilePathSync(file, { durableRoot });
    assertDurableFilePathSync(`${file}.lock`, { durableRoot });
  }
  return withFileLock(`${file}.lock`, () => {
    const current = readHeadFile(file, { durableRoot });
    assertExpectedHead(current, object, name, expected);
    const frontier = frontierEntries(current?.frontier ?? [], object);
    const named = frontierEntries(causes ?? frontier, object);
    const address = put(root, object, { ...record, causes: named }, { durableRoot });
    const dropped = new Set(named.map((entry) => keyOf(referenceOf(entry, object))));
    const next = [...frontier.filter((entry) => !dropped.has(keyOf(referenceOf(entry, object)))), address];
    // Recheck at publication and retain absent-only exclusive publication.
    // This does not turn the age-reclaiming lock into a paused-writer fence.
    writeHeadLocked(file, object, name, { frontier: next, closed }, expected, durableRoot);
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
  // A filesystem directory's enumeration order is not stable or lexical.
  // Peer head continuations address names, so sort the *decoded* names before
  // yielding. This is source ordering, not a claim of snapshot isolation.
  const files = [];
  for (const file of directoryNames(directory, { strict })) {
    if (!file.endsWith(".json")) continue;
    const stem = file.slice(0, -".json".length);
    try {
      const name = decodeHeadName(stem);
      if (encodeHeadName(name) !== stem) throw new StoreCorruption("noncanonical head filename");
      files.push({ file, name });
    } catch {
      if (strict) throw new StoreCorruption(`${directory}/${file} does not name a canonical head`);
    }
  }
  files.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  let prior = null;
  for (const { file, name } of files) {
    if (name === prior) {
      if (strict) throw new StoreCorruption(`${directory}/${file} duplicates a head name`);
      continue;
    }
    prior = name;
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
    if (head !== undefined) yield { name, head };
  }
}

export { frontierEntries, keyOf };
