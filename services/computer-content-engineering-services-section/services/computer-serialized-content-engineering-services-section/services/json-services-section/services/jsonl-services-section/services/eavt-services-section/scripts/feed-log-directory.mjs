#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { journalPath } from "./journal-path.mjs";
export const inputSchema = {
  type: "object",
  required: ["root", "at"],
  properties: { root: { type: "string", minLength: 1 }, at: {} },
  additionalProperties: false,
};
export const outputSchema = { type: "string" };
export function feedLogDirFor({ root, at }) {
  return dirname(journalPath({ root, feed: "feed", at }));
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(feedLogDirFor(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
