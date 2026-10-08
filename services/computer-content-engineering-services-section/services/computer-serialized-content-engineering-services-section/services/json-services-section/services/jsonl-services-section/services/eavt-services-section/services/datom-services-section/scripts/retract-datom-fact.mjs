#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { assertObjectDatom } from "./admit-datom-fact.mjs";
export { default as inputSchema } from "../schemas/retract-datom-fact.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/retract-datom-fact.output.schema.json" with { type: "json" };
export function retractDatomFact({ e, a, v, tx }) {
  return assertObjectDatom({ e, a, v, tx, op: "retract" });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(retractDatomFact(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
