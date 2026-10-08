#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
export { default as inputSchema } from "../schemas/admit-datom-fact.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/admit-datom-fact.output.schema.json" with { type: "json" };
export function assertObjectDatom(value) {
  requireJsonValue(value);
  if (
    !value ||
    Array.isArray(value) ||
    typeof value !== "object" ||
    Object.keys(value).sort().join(",") !== "a,e,op,tx,v"
  )
    throw new TypeError("datom fact must be exactly {e,a,v,tx,op}");
  if (value.op !== "assert" && value.op !== "retract")
    throw new TypeError('datom fact op must be "assert" or "retract"');
  return Object.freeze({
    e: value.e,
    a: value.a,
    v: value.v,
    tx: value.tx,
    op: value.op,
  });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(assertObjectDatom(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
