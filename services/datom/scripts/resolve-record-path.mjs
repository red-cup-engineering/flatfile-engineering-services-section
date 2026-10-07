#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { journalPath } from "../../../scripts/journal-path.mjs";
export { default as inputSchema } from "../schemas/resolve-record-path.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/resolve-record-path.output.schema.json" with { type: "json" };
export function recordPathFor({ root, feed, at }) {
  return journalPath({ root, feed, at }).replace(/\.jsonl$/, ".record.jsonl");
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(recordPathFor(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
