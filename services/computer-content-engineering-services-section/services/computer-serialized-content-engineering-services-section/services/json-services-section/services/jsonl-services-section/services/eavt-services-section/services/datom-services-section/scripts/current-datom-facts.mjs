#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { assertObjectDatom } from "./admit-datom-fact.mjs";
export { default as inputSchema } from "../schemas/current-datom-facts.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/current-datom-facts.output.schema.json" with { type: "json" };
export function currentDatomValue(datoms) {
  const live = new Map();
  for (const value of datoms) {
    const d = assertObjectDatom(value),
      fact = Object.freeze({ e: d.e, a: d.a, v: d.v }),
      key = canonicalJson(fact);
    if (d.op === "retract") live.delete(key);
    else live.set(key, fact);
  }
  return [...live.values()];
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(currentDatomValue(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
