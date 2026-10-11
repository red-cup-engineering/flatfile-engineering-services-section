#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { assertObjectDatom } from "./admit-datom-fact.mjs";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
export { default as inputSchema } from "../schemas/identify-datom-fact.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/identify-datom-fact.output.schema.json" with { type: "json" };
export function objectDatomId(value) {
  return semanticId(assertObjectDatom(value));
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(objectDatomId(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
