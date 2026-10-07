#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import * as json from "@red-cup-engineering/json-services-section";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { admitSchema } from "./admit-schema.mjs";

import contract from "../schemas/read-schema-pool.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function readSchemaPool({ pool }) {
  if (typeof pool !== "string" || !pool)
    throw new TypeError("pool must be a path");
  const directory = resolve(pool);
  const records = readdirSync(directory)
    .filter((name) => name.endsWith(".schema.json"))
    .sort()
    .map((name) => ({
      name,
      path: join(directory, name),
      schema: admitSchema({
        schema: JSON.parse(readFileSync(join(directory, name), "utf8")),
        allowUnknownAnnotations: true,
      }).schema,
    }));
  return { records };
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(await readSchemaPool(JSON.parse(readInput(0, "utf8")))) +
      "\n",
  );
