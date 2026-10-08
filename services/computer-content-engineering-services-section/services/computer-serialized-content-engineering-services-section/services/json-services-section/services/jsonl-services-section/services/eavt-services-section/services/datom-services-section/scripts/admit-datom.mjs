#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
export { default as inputSchema } from "../schemas/admit-datom.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/admit-datom.output.schema.json" with { type: "json" };
export function toDatom(value) {
  requireJsonValue(value);
  if (!Array.isArray(value) || value.length !== 5)
    throw new TypeError("datom must be [e,a,v,t,reading]");
  return Object.freeze([...value]);
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(toDatom(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
