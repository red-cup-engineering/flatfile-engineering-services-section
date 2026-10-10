import { closeSync, openSync, readSync, statSync } from "node:fs";
import { basename, relative } from "node:path";
import { segmentAdmittedLogs, segmentPath } from "./segment-store.mjs";

const READ_CHUNK = 1024 * 1024;

/** The feeds of one object kind a journal store admitted witnesses into, in date order, as logical handles. */
export function kindFeeds(store, objectKind) {
  const suffix = `-admit-${objectKind}.jsonl`;
  return segmentAdmittedLogs(store).filter((log) => basename(log).endsWith(suffix));
}

/** The bytes a feed's segment holds now (0 before its first witness). */
export function feedSize(log) {
  try { return statSync(segmentPath(log)).size; }
  catch (error) { if (error.code === "ENOENT") return 0; throw error; }
}

/** Each complete line of `file` between `offset` and `end`, with its byte offset and length and where the next begins; a final line without its newline is left for later. */
export function* linesFrom(file, offset, end) {
  const descriptor = openSync(file, "r");
  try {
    let position = offset, carry = Buffer.alloc(0);
    while (position < end) {
      const buffer = Buffer.alloc(Math.min(READ_CHUNK, end - position));
      const bytes = readSync(descriptor, buffer, 0, buffer.length, position);
      if (bytes === 0) break;
      position += bytes;
      const data = carry.length ? Buffer.concat([carry, buffer.subarray(0, bytes)]) : buffer.subarray(0, bytes);
      const base = position - data.length;
      let start = 0, newline;
      while ((newline = data.indexOf(0x0a, start)) >= 0) {
        yield { line: data.subarray(start, newline).toString("utf8"), offset: base + start, length: newline - start, next: base + newline + 1 };
        start = newline + 1;
      }
      carry = Buffer.from(data.subarray(start));
    }
  } finally { closeSync(descriptor); }
}

/**
 * Read what one kind's feeds gained since `positions` (feed, relative to the store, to byte offset):
 * `visit({ line, offset, length, log, feed })` sees each complete witness line, feed by feed in date
 * order. Returns the positions read to, and whether a feed was found shorter than its position (a
 * rewritten segment), in which case nothing was read and the caller starts again from nothing.
 */
export function tailKindFeeds({ store, objectKind, positions = {}, visit }) {
  const feeds = kindFeeds(store, objectKind);
  if (feeds.some((log) => feedSize(log) < (positions[relative(store, log)] ?? 0))) return { positions, reset: true };
  const next = { ...positions };
  for (const log of feeds) {
    const feed = relative(store, log), from = next[feed] ?? 0, size = feedSize(log);
    if (size === from) continue;
    let reached = from;
    for (const entry of linesFrom(segmentPath(log), from, size)) {
      reached = entry.next;
      visit({ ...entry, log, feed });
    }
    next[feed] = reached;
  }
  return { positions: next, reset: false };
}

/** Whether any of one kind's feeds holds bytes past `positions`. */
export const kindFeedsGrew = (store, objectKind, positions) => kindFeeds(store, objectKind).some((log) => feedSize(log) !== (positions[relative(store, log)] ?? 0));
