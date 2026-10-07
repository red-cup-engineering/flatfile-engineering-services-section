#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import * as json from "../../../src/index.mjs";
import { readSchemaPool } from "./read-schema-pool.mjs";
import { inspectSchemaCorpus } from "./inspect-schema-corpus.mjs";

import contract from "../schemas/inspect-schema-pool.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function inspectSchemaPool({ pool }) {
  const { records } = readSchemaPool({ pool });
  const report = inspectSchemaCorpus({
    schemas: records.map((record) => record.schema),
  });
  for (const record of records) {
    const stem = record.schema.$id
      .split("/")
      .at(-1)
      .replace(/\.schema\.json$|\.json$/u, "");
    if (`${stem}.schema.json` !== record.name)
      report.errors.push({
        schema: record.schema.$id,
        path: record.path,
        pointer: "",
        keyword: "$id",
        message: "schema id disagrees with filename",
      });
  }
  report.ok = report.errors.length === 0;
  return report;
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(await inspectSchemaPool(JSON.parse(readInput(0, "utf8")))) +
      "\n",
  );
