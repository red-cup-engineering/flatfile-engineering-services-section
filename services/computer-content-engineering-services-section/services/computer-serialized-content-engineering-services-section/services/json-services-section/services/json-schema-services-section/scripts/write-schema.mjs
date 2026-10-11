#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import * as json from "@red-cup-engineering/json-services-section";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { admitSchema } from "./admit-schema.mjs";
import { readSchemaPool } from "./read-schema-pool.mjs";
import { inspectSchemaCorpus } from "./inspect-schema-corpus.mjs";

import contract from "../schemas/write-schema.json" with { type: "json" };
import { writeFileTextSync } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function writeSchema({
  pool,
  schema: input,
  amend = false,
  dryRun = false,
}) {
  const schema = admitSchema({
    schema: input,
    allowUnknownAnnotations: true,
  }).schema;
  const { records } = readSchemaPool({ pool });
  const stem = schema.$id
    .split("/")
    .at(-1)
    .replace(/\.schema\.json$|\.json$/u, "");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(stem))
    throw new TypeError("schema id needs a filename-safe final segment");
  const path = join(resolve(pool), `${stem}.schema.json`),
    exists = existsSync(path);
  if (exists !== amend)
    throw new TypeError(
      exists
        ? "schema already exists; use amend"
        : "amend requires an existing schema",
    );
  const report = inspectSchemaCorpus({
    schemas: [
      ...records
        .filter((record) => record.path !== path)
        .map((record) => record.schema),
      schema,
    ],
  });
  if (!report.ok) throw new TypeError(JSON.stringify(report.errors));
  if (dryRun) return { ok: true, dryRun: true, path, schema: schema.$id };
  writeFileTextSync(path, JSON.stringify(schema, null, 2) + "\n");
  return { ok: true, dryRun: false, path, schema: schema.$id };
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(await writeSchema(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
