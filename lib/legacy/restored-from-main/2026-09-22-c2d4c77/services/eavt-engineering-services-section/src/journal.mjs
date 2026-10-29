/**
 * Append-only journal custody: one JSONL file per (feed, day) at
 * `<root>/data/logs/YYYY/MM/DD/<feed>.jsonl`, the irreducible tier every
 * projection derives from; the sole effectful membrane touching node:fs.
 * Dedup uses canonical-carrier equality, not re-minted identity per row.
 * Trace is an entry's 1-based append-order index, computed at read time
 * and never stored.
 */

import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { canonical, parseLines, serializeLines as serialize } from "../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { asEntry, asSeavt, isEntry } from "./row.mjs";

/**
 * @typedef {import("./row.mjs").WitnessJournalEntry} WitnessJournalEntry
 * @typedef {import("./row.mjs").Seavt} Seavt
 * @typedef {{ readonly entry: WitnessJournalEntry, readonly trace: number }} TracedEntry
 * @typedef {{ readonly entry: Seavt, readonly trace: number }} TracedSeavt
 */

/** The UTC date (YYYY-MM-DD) named by a witness time; a safe fallback bucket
 *  otherwise, so a malformed `at` still lands somewhere instead of throwing. */
export function journalDateFor(at) {
  const text = typeof at === "string" ? at : canonical(at);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "0000-00-00";
}

/**
 * The dated journal path for one feed: `<root>/data/logs/YYYY/MM/DD/<feed>.jsonl`.
 * The date is derived from `at` (a witness-journal time value), not from the
 * wall clock — replaying an old witness files it under the day it witnesses,
 * not the day it happens to be replayed.
 *
 * @param {string} root
 * @param {string} feed
 * @param {import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue} at
 * @returns {string}
 */
export function logPathFor(root, feed, at) {
  const [year, month, day] = journalDateFor(at).split("-");
  return path.join(root, "data", "logs", year ?? "0000", month ?? "00", day ?? "00", `${feed}.jsonl`);
}

/**
 * Read one journal file's entries at an exact path, in append order. A
 * missing or unreadable file reads as the empty journal — the empty journal
 * is a first-class state, not an exceptional one.
 *
 * @param {string} filePath
 * @returns {WitnessJournalEntry[]}
 */
export function readEntriesAtPath(filePath) {
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return [];
  }
  return parseLines(content).filter(isEntry).map(asEntry);
}

/**
 * Read one journal file as strict SEAVT source rows. A present generic EAVT
 * row is refused rather than silently promoted into the semiotic source law.
 *
 * @param {string} filePath
 * @returns {Seavt[]}
 */
export function readSeavtAtPath(filePath) {
  return readEntriesAtPath(filePath).map((row) => asSeavt(row));
}

/**
 * Read any newline-delimited JSON at an exact path, one value per line,
 * skipping malformed lines. Unlike `readEntriesAtPath`, rows need not be
 * entry-shaped — this is the generic fallback reader for JSONL that predates
 * or otherwise does not conform to the entry law.
 *
 * @param {string} filePath
 * @returns {import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue[]}
 */
export function readJsonLinesAtPath(filePath) {
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return [];
  }
  return parseLines(content);
}

/**
 * Atomically write a journal file's full entry set at an exact path: write
 * to a sibling temp file, then rename over the target (atomic on POSIX), so
 * a crash mid-write never corrupts the live journal.
 *
 * @param {string} filePath
 * @param {readonly unknown[]} entries
 */
export function writeEntriesAtomicAtPath(filePath, entries) {
  const tmp = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  mkdirSync(path.dirname(filePath), { recursive: true });
  try {
    writeFileSync(tmp, serialize(/** @type {any} */ (entries.map((row) => asEntry(row)))), "utf8");
    renameSync(tmp, filePath);
  } catch (error) {
    try {
      rmSync(tmp, { force: true });
    } catch {
      // Best-effort cleanup: preserve the original write/rename failure.
    }
    throw error;
  }
}

/** Per-path memo of a file's canonical-carrier key set, valid only while
 * (mtimeMs, size) still matches the stat observed when it was built or last
 * updated by our own write; any external change is detected and discarded. */
const dedupKeyMemo = new Map();

function statOrNull(filePath) {
  try {
    const stat = statSync(filePath);
    return { mtimeMs: stat.mtimeMs, size: stat.size };
  } catch {
    return null;
  }
}

/** The file's existing canonical keys, read and canonicalized once per
 * distinct on-disk state rather than on every append -- the read is the
 * dominant cost against an already-large same-day partition. */
function dedupKeys(filePath, readRows) {
  const stat = statOrNull(filePath);
  const memo = dedupKeyMemo.get(filePath);
  if (stat && memo && memo.mtimeMs === stat.mtimeMs && memo.size === stat.size) return memo.keys;
  return new Set(readRows().map((row) => canonical(row)));
}

function rememberDedupKeys(filePath, keys) {
  const stat = statOrNull(filePath);
  if (stat) dedupKeyMemo.set(filePath, { ...stat, keys });
  else dedupKeyMemo.delete(filePath);
}

/**
 * Append only generic JSON entries not already present by canonical carrier
 * equality. This compatibility lane deliberately does not mint semantic
 * identity.
 * Reappending an already-witnessed entry is free: it is skipped, and the
 * returned `appended` count — the journal's growth signal — is 0 when
 * nothing was genuinely new.
 *
 * @param {string} root
 * @param {string} feed
 * @param {readonly unknown[]} rows
 * @param {import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue} at
 * @returns {{ readonly appended: number }}
 */
function appendGenericEntries(root, feed, rows, at) {
  if (rows.length === 0) return { appended: 0 };
  const filePath = logPathFor(root, feed, at);
  const present = new Set(dedupKeys(filePath, () => readEntriesAtPath(filePath)));
  const fresh = [];
  for (const row of rows) {
    const normalized = asEntry(row);
    const key = canonical(normalized);
    if (present.has(key)) continue;
    present.add(key);
    fresh.push(normalized);
  }
  if (fresh.length === 0) return { appended: 0 };
  mkdirSync(path.dirname(filePath), { recursive: true });
  appendFileSync(filePath, serialize(/** @type {any} */ (fresh)), "utf8");
  rememberDedupKeys(filePath, present);
  return { appended: fresh.length };
}


export function appendEntries(root, feed, rows, at) {
  return appendGenericEntries(root, feed, rows, at);
}

function assertNonemptyFeed(feed) {
  if (typeof feed !== "string" || feed.length === 0) {
    throw new TypeError("SEAVT custody: feed must be a nonempty string");
  }
}

/**
 * Append strict SEAVT rows under the direct typed-RMN law;
 * `appendEntries` remains the explicitly non-semantic JSON compatibility lane.
 *
 * @param {string} root
 * @param {string} feed
 * @param {readonly unknown[]} rows
 * @param {import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue} at
 * @returns {{ readonly appended: number }}
 */
export function appendSeavt(root, feed, rows, at) {
  if (rows.length === 0) return { appended: 0 };
  const filePath = logPathFor(root, feed, at);
  assertNonemptyFeed(feed);
  const present = new Set(dedupKeys(filePath, () => readSeavtAtPath(filePath)));
  const fresh = [];
  for (const row of rows) {
    const normalized = asSeavt(row);
    const key = canonical(normalized);
    if (present.has(key)) continue;
    present.add(key);
    fresh.push(normalized);
  }
  if (fresh.length === 0) return { appended: 0 };
  mkdirSync(path.dirname(filePath), { recursive: true });
  appendFileSync(filePath, serialize(/** @type {any} */ (fresh)), "utf8");
  rememberDedupKeys(filePath, present);
  return { appended: fresh.length };
}

/**
 * Read one feed's journal for a given day, with each entry's trace attached
 * — its 1-based ordinal position in append order. Trace is computed here,
 * at read time, from physical file order; it is never stored.
 *
 * @param {string} root
 * @param {string} feed
 * @param {import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue} at
 * @returns {readonly TracedEntry[]}
 */
export function readEntries(root, feed, at) {
  const rows = readEntriesAtPath(logPathFor(root, feed, at));
  return Object.freeze(rows.map((row, index) => Object.freeze({ entry: row, trace: index + 1 })));
}

/** Read one dated SEAVT journal with derived 1-based trace. */
export function readSeavt(root, feed, at) {
  const rows = readSeavtAtPath(logPathFor(root, feed, at));
  return Object.freeze(rows.map((row, index) => Object.freeze({ entry: row, trace: index + 1 })));
}

/**
 * The same ordered, traced reading as `readEntries`, offered as a generator
 * — the "stream" half of "ordered read/stream". The current implementation
 * reads the whole journal first and yields from it; a later incremental or
 * tailing implementation can replace the body without changing this shape.
 *
 * @param {string} root
 * @param {string} feed
 * @param {import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue} at
 * @returns {Generator<TracedEntry, void, void>}
 */
export function* streamEntries(root, feed, at) {
  for (const traced of readEntries(root, feed, at)) yield traced;
}

/** Stream the same strict, ordered SEAVT reading returned by `readSeavt`. */
export function* streamSeavt(root, feed, at) {
  for (const traced of readSeavt(root, feed, at)) yield traced;
}
