#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { assertObjectDatom } from "./admit-datom-fact.mjs";
export { default as inputSchema } from "../schemas/datom-facts-as-of.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/datom-facts-as-of.output.schema.json" with { type: "json" };
export function objectDatomsAsOf({ datoms, asOf }) {
  return datoms
    .map(assertObjectDatom)
    .filter((d) => String(d.tx) <= String(asOf));
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(objectDatomsAsOf(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
