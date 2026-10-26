#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { listFeedsAt } from "./list-feeds-at.mjs";
import { readEavtJournal } from "./read-eavt-journal.mjs";
export const inputSchema = {
  type: "object",
  required: ["root", "at"],
  properties: {
    root: { type: "string", minLength: 1 },
    at: {},
    feeds: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
};
export const outputSchema = {
  type: "array",
  items: { type: "object", required: ["e", "a", "v", "t", "feed", "trace"] },
};
export function readAllFeedsEntries({ root, at, feeds }) {
  if (
    feeds !== undefined &&
    (!Array.isArray(feeds) ||
      feeds.some((feed) => typeof feed !== "string" || !feed))
  )
    throw new TypeError("feeds must be nonempty names");
  return (feeds ?? listFeedsAt({ root, at })).flatMap((feed) =>
    readEavtJournal({ root, feed, at }).map(({ entry, trace }) => ({
      ...entry,
      feed,
      trace,
    })),
  );
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(readAllFeedsEntries(JSON.parse(readFileSync(0, "utf8")))) +
      "\n",
  );
