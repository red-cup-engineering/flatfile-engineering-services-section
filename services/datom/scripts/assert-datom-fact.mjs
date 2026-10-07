#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { assertObjectDatom } from "./admit-datom-fact.mjs";
export { default as inputSchema } from "../schemas/assert-datom-fact.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/assert-datom-fact.output.schema.json" with { type: "json" };
export function assertDatomFact({ e, a, v, tx }) {
  return assertObjectDatom({ e, a, v, tx, op: "assert" });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(assertDatomFact(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
