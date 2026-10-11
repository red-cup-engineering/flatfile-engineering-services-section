#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { journalPath } from "@red-cup-engineering/eavt-services-section/journal-path";
import { projectDataArtifactPath } from "@red-cup-engineering/eavt-services-section/data-artifact-address";
export { default as inputSchema } from "../schemas/resolve-record-path.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/resolve-record-path.output.schema.json" with { type: "json" };
/** A feed's settled records on a date: the record tier's projection of its log, `data/records/<feed>-records/`. */
export function recordPathFor({ root, feed, at }) {
  return projectDataArtifactPath(journalPath({ root, feed, at }), "record", "jsonl");
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(recordPathFor(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
