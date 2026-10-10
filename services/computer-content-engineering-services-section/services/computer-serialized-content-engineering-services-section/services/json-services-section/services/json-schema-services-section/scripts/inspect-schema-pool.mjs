#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { scanSchemaPool } from "./read-schema-pool.mjs";
import { inspectSchemaCorpus } from "./inspect-schema-corpus.mjs";

import contract from "../schemas/inspect-schema-pool.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
/**
 * Inspect a whole pool directory: every file must read and be admitted, each schema's id must agree
 * with the file it is filed under, the schemas must hold the corpus invariants together, and an empty
 * pool is a broken sweep rather than a clean one. Every error carries the `path` it was found at.
 */
export function inspectSchemaPool({ pool }) {
  const { records, refusals } = scanSchemaPool({ pool });
  const errors = refusals.map(({ path, reason }) => ({ schema: null, path, pointer: "", keyword: "file", message: reason }));
  const report = inspectSchemaCorpus({ schemas: records.map((record) => record.schema) });
  const pathOf = new Map(records.map((record) => [record.schema.$id, record.path]));
  for (const error of report.errors) errors.push({ ...error, path: pathOf.get(error.schema) ?? null });
  for (const record of records) {
    const stem = record.schema.$id
      .split("/")
      .at(-1)
      .replace(/\.schema\.json$|\.json$/u, "");
    if (`${stem}.schema.json` !== record.name)
      errors.push({
        schema: record.schema.$id,
        path: record.path,
        pointer: "",
        keyword: "$id",
        message: "schema id disagrees with filename",
      });
  }
  if (records.length + refusals.length === 0)
    errors.push({ schema: null, path: null, pointer: "", keyword: "pool", message: "the pool holds no schemas — an empty sweep is a broken sweep, not a clean one" });
  return { ok: errors.length === 0, checked: records.length, errors };
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(await inspectSchemaPool(JSON.parse(readInput(0, "utf8")))) +
      "\n",
  );
