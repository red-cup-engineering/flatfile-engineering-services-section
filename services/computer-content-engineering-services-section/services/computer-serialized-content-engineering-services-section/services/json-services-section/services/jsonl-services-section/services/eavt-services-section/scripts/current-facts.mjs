#!/usr/bin/env node
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts["current-facts"].input;
export const outputSchema = contracts["current-facts"].output;
import { readFileSync } from "node:fs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { unique } from "./deduplicate-rows.mjs";
export function current(values) {
  const facts = unique(values);
  const tombstones = new Map();
  const cellKey = (fact) => canonicalJson([fact.e, fact.a]);
  const later = (left, right) =>
    typeof left === "number" && typeof right === "number"
      ? left > right
      : typeof left === "string" && typeof right === "string"
        ? left > right
        : false;
  for (const fact of facts)
    if (fact.v === null) {
      const cell = cellKey(fact);
      const prior = tombstones.get(cell);
      if (prior === undefined || later(fact.t, prior))
        tombstones.set(cell, fact.t);
    }
  return facts.filter((fact) => {
    const tombstone = tombstones.get(cellKey(fact));
    return (
      fact.v !== null && (tombstone === undefined || !later(tombstone, fact.t))
    );
  });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(current(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
