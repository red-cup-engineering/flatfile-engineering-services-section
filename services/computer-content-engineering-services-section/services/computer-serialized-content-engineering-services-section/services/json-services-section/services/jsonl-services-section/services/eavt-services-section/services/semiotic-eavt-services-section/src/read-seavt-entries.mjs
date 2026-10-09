#!/usr/bin/env node
import { readFileSync as readCarrierInput } from "node:fs";
import { readEavtJournal, iterateEavtJournalThroughDate } from "@red-cup-engineering/eavt/read-eavt-journal";
import { normalizeSeavtRow } from "./normalize-seavt-row.mjs";
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
        properties: {
          e: { type: "array" },
          a: { type: "array" },
          v: { type: "array" },
          t: {},
        },
        required: ["e", "a", "v", "t"],
        additionalProperties: false,
      },
      trace: { type: "integer", minimum: 1 },
    },
    required: ["entry", "trace"],
    additionalProperties: false,
  },
};
export function readSeavtEntries({ root, feed, at } = {}) {
  return Object.freeze(
    readEavtJournal({ root, feed, at }).map(({ entry, trace }) =>
      Object.freeze({ entry: normalizeSeavtRow(entry), trace }),
    ),
  );
}

export function* iterateSeavtEntriesThroughDate(input) {
  for (const { entry, trace } of iterateEavtJournalThroughDate(input)) {
    yield Object.freeze({ entry: normalizeSeavtRow(entry), trace });
  }
}
export function readSeavtEntriesThroughDate(input) {
  return Object.freeze([...iterateSeavtEntriesThroughDate(input)]);
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(readSeavtEntries(JSON.parse(readCarrierInput(0, "utf8")))) +
      "\n",
  );
