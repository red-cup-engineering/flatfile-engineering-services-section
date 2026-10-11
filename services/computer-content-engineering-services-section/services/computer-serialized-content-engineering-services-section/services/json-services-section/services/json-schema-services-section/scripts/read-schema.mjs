#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { readSchemaPool } from "./read-schema-pool.mjs";
export const inputSchema = {
  type: "object",
  required: ["pool", "name"],
  properties: { pool: { type: "string" }, name: { type: "string" } },
};
export const outputSchema = { type: "object", required: ["path", "schema"] };
export function readSchema({ pool, name }) {
  if (typeof name !== "string" || !name)
    throw new TypeError("name must be nonempty text");
  const matches = readSchemaPool({ pool }).records.filter(
    (record) =>
      record.name.replace(/\.schema\.json$/u, "") === name ||
      record.schema.$id === name,
  );
  if (matches.length !== 1)
    throw new TypeError(
      matches.length ? `ambiguous schema ${name}` : `no schema ${name} in pool`,
    );
  return { path: matches[0].path, schema: matches[0].schema };
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(readSchema(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
