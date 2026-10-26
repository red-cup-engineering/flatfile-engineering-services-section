#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { assertObjectDatom } from "./admit-datom-fact.mjs";
export { default as inputSchema } from "../schemas/fold-datom-evidence.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/fold-datom-evidence.output.schema.json" with { type: "json" };
export function foldObjectDatoms(datoms) {
  const cells = new Map(),
    admitted = datoms.map(assertObjectDatom);
  for (const d of admitted) {
    const key = canonicalJson({ e: d.e, a: d.a, v: d.v });
    const cell = cells.get(key) ?? {
      datom: d,
      positive: new Map(),
      negative: new Map(),
    };
    (d.op === "assert" ? cell.positive : cell.negative).set(
      canonicalJson(d.tx),
      d.tx,
    );
    cells.set(key, cell);
  }
  const result = [...cells.values()]
    .map(({ datom: d, positive, negative }) => {
      const present = [...positive.values()],
        absent = [...negative.values()];
      return Object.freeze({
        subject: d.e,
        predicate: d.a,
        object: d.v,
        value:
          present.length && absent.length
            ? "stable"
            : present.length
              ? "potential"
              : "active",
        evidence: [present, absent],
      });
    })
    .sort(
      (a, b) =>
        canonicalJson(a.subject).localeCompare(canonicalJson(b.subject)) ||
        canonicalJson(a.predicate).localeCompare(canonicalJson(b.predicate)) ||
        canonicalJson(a.object).localeCompare(canonicalJson(b.object)),
    );
  return Object.freeze({ datoms: admitted, cells: result });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(foldObjectDatoms(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
