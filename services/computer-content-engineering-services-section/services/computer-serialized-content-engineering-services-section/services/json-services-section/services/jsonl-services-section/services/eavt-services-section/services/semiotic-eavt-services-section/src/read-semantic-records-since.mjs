import { resolve } from "node:path";
import { parseJournalWitness } from "./journal/event.mjs";
import { tailKindFeeds } from "./journal/filesystem/feed-tail.mjs";
import { journalDirectoryOf } from "./journal/store-root.mjs";
import { semanticRecordOf } from "./query-semantic-records.mjs";

const CURSOR = "semiotic-eavt.journal-cursor.v1";

/** A cursor before any record of `objectKind`: reading from it starts the first finite turn. */
export const journalCursorStart = (objectKind) => Object.freeze({ kind: CURSOR, objectKind, feeds: Object.freeze({}) });

function admitCursor(cursor, objectKind) {
  if (cursor === undefined || cursor === null) return journalCursorStart(objectKind);
  if (cursor?.kind !== CURSOR || cursor.objectKind !== objectKind || cursor.feeds === null || typeof cursor.feeds !== "object"
    || Array.isArray(cursor.feeds) || Object.values(cursor.feeds).some((offset) => !Number.isSafeInteger(offset) || offset < 0))
    throw new TypeError(`not a journal cursor of ${objectKind}`);
  return cursor;
}

/**
 * The records of one kind (and, given, one category) admitted since `cursor`, each witness read
 * once from where the last read stopped and verified, and the cursor to read on from. A cursor is
 * plain data (per-feed byte positions), kept by the reader wherever it keeps its state; it covers
 * every category of the kind, so one cursor can serve readers of several. A feed found shorter
 * than its position (a rewritten segment) restarts one bounded turn, with `reset` saying so.
 * `more` says the cursor has not caught up; it must never be treated as complete receiving.
 * Each turn admits at most 32 witnesses and 1 MiB of UTF-8 witness text by default,
 * configurable within the finite owner ceilings. Filtering still spends that admission.
 * Oversized or altered witnesses refuse without advancing past them. Legacy SEAVT feed
 * rows (before records were witnesses) are not read.
 */
export function readSemanticRecordsSince({ root, objectKind, category, cursor, maxRecords, maxBytes } = {}) {
  if (typeof root !== "string" || !root || typeof objectKind !== "string" || !objectKind) throw new TypeError("journal root and objectKind are required");
  if (category !== undefined && (typeof category !== "string" || !category)) throw new TypeError("a category is a non-empty name");
  const store = journalDirectoryOf(resolve(root));
  const from = admitCursor(cursor, objectKind);
  const read = (positions) => {
    const records = [];
    const result = tailKindFeeds({ store, objectKind, positions, maxRecords, maxBytes, visit: ({ line, feed }) => {
      let parsed;
      try { parsed = JSON.parse(line); } catch { throw new TypeError(`journal feed ${feed} holds a line that is not a witness`); }
      const record = semanticRecordOf(parseJournalWitness(parsed));
      if (record === undefined || (category !== undefined && record.category !== category)) return;
      records.push(Object.freeze({ ...record, objectKind, record: structuredClone(record.record) }));
    } });
    return { records, result };
  };
  let { records, result } = read({ ...from.feeds });
  const reset = result.reset;
  if (reset) ({ records, result } = read({}));
  return Object.freeze({ records: Object.freeze(records), cursor: Object.freeze({ kind: CURSOR, objectKind, feeds: Object.freeze(result.positions) }), reset,
    more: result.more, visited: result.visited, decodedBytes: result.decodedBytes });
}
