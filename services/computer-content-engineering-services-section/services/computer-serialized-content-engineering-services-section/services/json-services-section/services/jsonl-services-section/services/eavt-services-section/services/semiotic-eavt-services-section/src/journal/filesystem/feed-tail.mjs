import { closeSync, openSync, readSync, statSync } from "node:fs";
import { relative } from "node:path";
import { segmentAdmittedLogs, segmentPath } from "./segment-store.mjs";

const READ_CHUNK = 1024 * 1024;
export const JOURNAL_TURN_RECORDS = 32;
export const JOURNAL_TURN_BYTES = 1024 * 1024;

export function admitJournalTurn({ maxRecords = JOURNAL_TURN_RECORDS, maxBytes = JOURNAL_TURN_BYTES } = {}) {
  if (!Number.isSafeInteger(maxRecords) || maxRecords < 1 || maxRecords > 1024
    || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 16 * READ_CHUNK)
    throw new TypeError("journal turn requires 1–1024 records and 1–16777216 decoded witness bytes");
  return { maxRecords, maxBytes };
}

/** The feeds of one object kind a journal store admitted witnesses into, in date order, as logical handles. */
export function kindFeeds(store, objectKind) {
  return segmentAdmittedLogs(store, { kind: objectKind });
}

/** The bytes a feed's segment holds now (0 before its first witness). */
export function feedSize(log) {
  try { return statSync(segmentPath(log)).size; }
  catch (error) { if (error.code === "ENOENT") return 0; throw error; }
}

/** Each complete line of `file` between `offset` and `end`, with its byte offset and length and where the next begins; a final line without its newline is left for later. */
export function* linesFrom(file, offset, end, { maxLineBytes = JOURNAL_TURN_BYTES } = {}) {
  const descriptor = openSync(file, "r");
  try {
    if (offset > 0) {
      const previous = Buffer.alloc(1);
      if (readSync(descriptor, previous, 0, 1, offset - 1) !== 1 || previous[0] !== 0x0a)
        throw new TypeError("journal cursor is not at a witness boundary");
    }
    let position = offset, carry = Buffer.alloc(0);
    while (position < end) {
      const buffer = Buffer.alloc(Math.min(READ_CHUNK, maxLineBytes + 1 - carry.length, end - position));
      const bytes = readSync(descriptor, buffer, 0, buffer.length, position);
      if (bytes === 0) break;
      position += bytes;
      const data = carry.length ? Buffer.concat([carry, buffer.subarray(0, bytes)]) : buffer.subarray(0, bytes);
      const base = position - data.length;
      let start = 0, newline;
      while ((newline = data.indexOf(0x0a, start)) >= 0) {
        if (newline - start > maxLineBytes) throw new RangeError("journal witness exceeds this turn's decoded-byte admission; cursor retained");
        yield { bytes: data.subarray(start, newline), offset: base + start, length: newline - start, next: base + newline + 1 };
        start = newline + 1;
      }
      carry = Buffer.from(data.subarray(start));
      if (carry.length > maxLineBytes) throw new RangeError("journal witness exceeds this turn's decoded-byte admission; cursor retained");
    }
  } finally { closeSync(descriptor); }
}

/**
 * Read what one kind's feeds gained since `positions` (feed, relative to the store, to byte offset):
 * `visit({ line, offset, length, log, feed })` sees each complete witness line, feed by feed in date
 * order. Returns the positions read to, and whether a feed was found shorter than its position (a
 * rewritten segment), or a position names a feed the store does not hold (a cursor
 * from before the store was filed by kind), in which case nothing was read and the caller starts again
 * from nothing.
 */
export function tailKindFeeds({ store, objectKind, positions = {}, visit, maxRecords, maxBytes }) {
  const limits = admitJournalTurn({ maxRecords, maxBytes });
  const feeds = kindFeeds(store, objectKind);
  const held = new Set(feeds.map((log) => relative(store, log)));
  if (Object.keys(positions).some((feed) => !held.has(feed))) return { positions, reset: true, more: true, visited: 0, decodedBytes: 0 };
  if (feeds.some((log) => feedSize(log) < (positions[relative(store, log)] ?? 0))) return { positions, reset: true, more: true, visited: 0, decodedBytes: 0 };
  const next = { ...positions };
  let visited = 0, decodedBytes = 0;
  for (const log of feeds) {
    const feed = relative(store, log), from = next[feed] ?? 0, size = feedSize(log);
    if (size === from) continue;
    let reached = from;
    for (const entry of linesFrom(segmentPath(log), from, size, { maxLineBytes: limits.maxBytes })) {
      if (visited >= limits.maxRecords || decodedBytes + entry.length > limits.maxBytes) {
        next[feed] = reached;
        return { positions: next, reset: false, more: true, visited, decodedBytes };
      }
      const { bytes, ...location } = entry;
      visit({ ...location, line: bytes.toString("utf8"), log, feed });
      reached = entry.next;
      visited += 1;
      decodedBytes += entry.length;
      // Do not decode a following witness after the record admission is spent.
      if (visited === limits.maxRecords || decodedBytes === limits.maxBytes) {
        next[feed] = reached;
        return { positions: next, reset: false, more: kindFeedsGrew(store, objectKind, next), visited, decodedBytes };
      }
    }
    next[feed] = reached;
  }
  return { positions: next, reset: false, more: kindFeedsGrew(store, objectKind, next), visited, decodedBytes };
}

/** Whether any of one kind's feeds holds bytes past `positions`. */
export const kindFeedsGrew = (store, objectKind, positions) => kindFeeds(store, objectKind).some((log) => feedSize(log) !== (positions[relative(store, log)] ?? 0));
