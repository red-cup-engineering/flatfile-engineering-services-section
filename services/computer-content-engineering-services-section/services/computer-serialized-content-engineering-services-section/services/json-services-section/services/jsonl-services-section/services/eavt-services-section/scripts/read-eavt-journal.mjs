#!/usr/bin/env node
export const inputSchema = {
  type: "object",
  properties: {
    root: { type: "string", minLength: 1 },
    feed: { type: "string", minLength: 1 },
    at: {},
  },
  required: ["root", "feed", "at"],
  additionalProperties: false,
};
export const outputSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      entry: {
        type: "object",
        required: ["e", "a", "v", "t"],
        properties: { e: {}, a: {}, v: {}, t: {} },
        additionalProperties: false,
      },
      trace: { type: "integer", minimum: 1 },
    },
    required: ["entry", "trace"],
    additionalProperties: false,
  },
};
import { readFileSync, statSync } from "node:fs";
import { dataArtifactDates } from "../src/data-artifact-listing.mjs";
import { journalPath } from "./journal-path.mjs";
import { iterateEavtEntries } from "./read-eavt-entries.mjs";
/** Read one dated EAVT journal and derive its append-order trace. */
export function* iterateEavtJournal({ root, feed, at } = {}) {
  let trace = 0;
  for (const entry of iterateEavtEntries({ path: journalPath({ root, feed, at }) })) {
    yield Object.freeze({ entry, trace: ++trace });
  }
}
export function readEavtJournal(input) {
  return Object.freeze([...iterateEavtJournal(input)]);
}

/** The dates of a feed's dated cuts through an inclusive calendar frontier, in order. */
function datesThrough({ root, feed, throughDate }) {
  if (typeof throughDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(throughDate)) throw new TypeError("EAVT journal frontier must be a calendar date");
  // Validate root and feed with the same address law as an individual read.
  journalPath({ root, feed, at: throughDate });
  return dataArtifactDates(root, "log", { subject: feed, through: throughDate, match: (name) => name.endsWith(".jsonl") });
}

/** Read a feed's dated cuts through an inclusive calendar frontier. */
export function* iterateEavtJournalThroughDate({ root, feed, throughDate } = {}) {
  let trace = 0;
  for (const date of datesThrough({ root, feed, throughDate })) {
    for (const { entry } of iterateEavtJournal({ root, feed, at: date })) yield Object.freeze({ entry, trace: ++trace });
  }
}
export function readEavtJournalThroughDate(input) {
  return Object.freeze([...iterateEavtJournalThroughDate(input)]);
}

/** The revision of what `readEavtJournalThroughDate` reads: each dated cut's identity and extent.
 *  A cut changes only by append or replacement, so equal revisions read equal rows. */
export function eavtJournalRevisionThroughDate({ root, feed, throughDate } = {}) {
  return datesThrough({ root, feed, throughDate }).map((date) => {
    const path = journalPath({ root, feed, at: date });
    let stat;
    try { stat = statSync(path); } catch (error) {
      if (error?.code === "ENOENT") return `${date}:absent`;
      throw error;
    }
    return `${date}:${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeMs}`;
  }).join("\n");
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(readEavtJournal(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
