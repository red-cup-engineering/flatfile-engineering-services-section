#!/usr/bin/env node
import { readFileSync as readCarrierInput } from "node:fs";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { journalDirectoryOf } from "./journal/store-root.mjs";
import { projectSegmentStatements, segmentAdmittedLogs } from "./journal/filesystem/segment-store.mjs";
import { semanticRecordOf } from "./query-semantic-records.mjs";

/** The one log, read by day: every semantic record any feed of any of the given settlement roots
 * admitted on one date, whatever its kind. A ledger transaction, a message and a channel event are
 * the same record underneath, so one query returns them together; the roots of several machines
 * read as one log, a witness held by more than one of them once, with every root that holds it. */

export const inputSchema = {
  type: "object",
  properties: {
    roots: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    feeds: { type: "array", items: { type: "string", minLength: 1 } },
  },
  required: ["roots", "date"],
  additionalProperties: false,
};
export const outputSchema = { type: "array", items: { type: "object" } };

/** The feed token a dated log handle names: `<date>-admit-<feed>.jsonl` → `<feed>`. */
export function feedOfLog(logPath, date) {
  const name = basename(logPath);
  const prefix = `${date}-admit-`;
  return name.startsWith(prefix) && name.endsWith(".jsonl") ? name.slice(prefix.length, -".jsonl".length) : undefined;
}

/** The feeds one settlement root admitted witnesses into on one date, as logical handles. */
export function journalDayLogs(root, date) {
  const store = journalDirectoryOf(root);
  const day = date.split("-").join(sep);
  return segmentAdmittedLogs(store).filter((log) => dirname(relative(store, log)) === day && feedOfLog(log, date) !== undefined);
}

export function queryJournalDay({ roots, date, feeds } = {}) {
  if (!Array.isArray(roots) || roots.length === 0 || roots.some((root) => typeof root !== "string" || !root))
    throw new TypeError("Journal day query requires one or more settlement roots");
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(date))
    throw new TypeError("Journal day query requires a YYYY-MM-DD date");
  const wanted = feeds === undefined ? undefined : new Set(feeds);
  const byEvent = new Map();
  for (const root of roots.map((each) => resolve(each))) {
    for (const log of journalDayLogs(root, date)) {
      const feed = feedOfLog(log, date);
      if (wanted !== undefined && !wanted.has(feed)) continue;
      for (const record of projectSegmentStatements(log, semanticRecordOf)) {
        const held = byEvent.get(record.event);
        if (held !== undefined) { if (!held.roots.includes(root)) held.roots.push(root); continue; }
        byEvent.set(record.event, { ...record, record: structuredClone(record.record), feed, roots: [root] });
      }
    }
  }
  return Object.freeze([...byEvent.values()]
    .map((record, index) => ({ record: Object.freeze({ ...record, roots: Object.freeze(record.roots) }), index }))
    .sort((left, right) => String(left.record.recordedAt).localeCompare(String(right.record.recordedAt)) || left.index - right.index)
    .map(({ record }) => record));
}

if (import.meta.main)
  process.stdout.write(JSON.stringify(queryJournalDay(JSON.parse(readCarrierInput(0, "utf8")))) + "\n");
