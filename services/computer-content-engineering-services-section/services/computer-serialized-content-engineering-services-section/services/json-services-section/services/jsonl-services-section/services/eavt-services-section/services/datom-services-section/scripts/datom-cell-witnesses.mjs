#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import {
  canonicalJson,
  requireJsonValue,
} from "@red-cup-engineering/json-services-section";
export { default as inputSchema } from "../schemas/datom-cell-witnesses.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/datom-cell-witnesses.output.schema.json" with { type: "json" };
export function objectDatomWitnesses({ section, cell }) {
  const e = "subject" in cell ? cell.subject : cell.e;
  const a = "predicate" in cell ? cell.predicate : cell.a;
  const v = "object" in cell ? cell.object : cell.v;
  const key = canonicalJson({
    e: requireJsonValue(e),
    a: requireJsonValue(a),
    v: requireJsonValue(v),
  });
  return (
    section.cells.find(
      (c) =>
        canonicalJson({ e: c.subject, a: c.predicate, v: c.object }) === key,
    )?.evidence[0] ?? []
  );
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(objectDatomWitnesses(JSON.parse(readInput(0, "utf8")))) +
      "\n",
  );
