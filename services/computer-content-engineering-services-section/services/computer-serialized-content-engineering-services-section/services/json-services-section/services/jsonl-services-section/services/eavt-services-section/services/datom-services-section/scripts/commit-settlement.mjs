#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { writeEavtEntries } from "@red-cup-engineering/eavt-services-section/write-eavt-entries";
import { mkdirSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";
import { recordPathFor } from "./resolve-record-path.mjs";
import { serialize } from "./serialize-datoms.mjs";
import { normalizeEavtRow } from "@red-cup-engineering/eavt-services-section/normalize-row";
import { journalPath } from "@red-cup-engineering/eavt-services-section/journal-path";
export { default as inputSchema } from "../schemas/commit-settlement.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/commit-settlement.output.schema.json" with { type: "json" };
export function commitSettledRecord({ root, feed, datoms, kept, at }) {
  if (datoms.length === 0) return null;
  const text = serialize(datoms),
    entries = kept.map(normalizeEavtRow);
  const recordPath = recordPathFor({ root, feed, at }),
    logPath = journalPath({ root, feed, at });
  mkdirSync(dirname(recordPath), { recursive: true });
  appendFileSync(recordPath, text, "utf8");
  writeEavtEntries({ path: logPath, entries });
  return { recordPath, logPath };
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(commitSettledRecord(JSON.parse(readInput(0, "utf8")))) +
      "\n",
  );
