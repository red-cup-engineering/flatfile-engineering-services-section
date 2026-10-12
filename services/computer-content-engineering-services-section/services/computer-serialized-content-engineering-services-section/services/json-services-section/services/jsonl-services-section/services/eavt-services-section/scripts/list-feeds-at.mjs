#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical";
import { dataDatePartition } from "../src/data-artifact-address.mjs";
import { dataArtifactFiles } from "../src/data-artifact-listing.mjs";
export const inputSchema = {
  type: "object",
  required: ["root", "at"],
  properties: { root: { type: "string", minLength: 1 }, at: {} },
  additionalProperties: false,
};
export const outputSchema = { type: "array", items: { type: "string" } };
/** The plain EAVT feeds a root holds on the date `at` names, by feed name. */
export function listFeedsAt({ root, at }) {
  const { date } = dataDatePartition(typeof at === "string" ? at : canonicalJson(at));
  return [...new Set(dataArtifactFiles(root, "log", { date, match: (name) => name.endsWith(".jsonl") }).map((file) => file.subject))].sort();
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(listFeedsAt(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
