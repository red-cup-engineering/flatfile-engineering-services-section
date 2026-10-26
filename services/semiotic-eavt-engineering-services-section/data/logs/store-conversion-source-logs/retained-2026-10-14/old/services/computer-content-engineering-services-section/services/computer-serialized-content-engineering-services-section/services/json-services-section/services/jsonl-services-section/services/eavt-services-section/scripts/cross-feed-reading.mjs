#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical";
import { readAllFeedsEntries } from "./read-all-feeds-entries.mjs";
import { readEavtState } from "./read-eavt-state.mjs";
export const inputSchema = {
  type: "object",
  required: ["root", "at"],
  properties: {
    root: { type: "string", minLength: 1 },
    at: {},
    feeds: { type: "array", items: { type: "string", minLength: 1 } },
    since: {},
    until: {},
  },
  additionalProperties: false,
};
export const outputSchema = {
  type: "object",
  additionalProperties: {
    type: "object",
    required: [
      "e",
      "a",
      "latest",
      "values",
      "contested",
      "independentlyWitnessed",
    ],
  },
};
export function crossFeedReading({ root, at, feeds, since, until }) {
  const low = since === undefined ? undefined : canonicalJson(since),
    high = until === undefined ? undefined : canonicalJson(until);
  const entries = readAllFeedsEntries({ root, at, feeds }).filter((row) => {
    const time = canonicalJson(row.t);
    return (
      !(low !== undefined && time < low) && !(high !== undefined && time > high)
    );
  });
  const envelope = readEavtState({
      entries: entries.map(({ e, a, v, t }) => ({ e, a, v, t })),
    }),
    feedsByCell = new Map(),
    feedsByValue = new Map();
  for (const row of entries) {
    const cell = canonicalJson([row.e, row.a]),
      value = canonicalJson([row.e, row.a, row.v]);
    if (!feedsByCell.has(cell)) feedsByCell.set(cell, new Set());
    if (!feedsByValue.has(value)) feedsByValue.set(value, new Set());
    feedsByCell.get(cell).add(row.feed);
    feedsByValue.get(value).add(row.feed);
  }
  return Object.fromEntries(
    Object.entries(envelope).map(([key, cell]) => [
      key,
      {
        ...cell,
        values: cell.values.map((entry) => ({
          ...entry,
          feeds: [
            ...feedsByValue.get(canonicalJson([cell.e, cell.a, entry.value])),
          ].sort(),
        })),
        independentlyWitnessed: feedsByCell.get(key).size > 1,
      },
    ]),
  );
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(crossFeedReading(JSON.parse(readFileSync(0, "utf8")))) +
      "\n",
  );
