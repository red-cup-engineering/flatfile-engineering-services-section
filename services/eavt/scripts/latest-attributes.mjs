#!/usr/bin/env node
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts["latest-attributes"].input;
export const outputSchema = contracts["latest-attributes"].output;
import { readFileSync } from "node:fs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { unique } from "./deduplicate-rows.mjs";
export function latest({ rows: values, attributes }) {
  const functional = new Set(attributes.map(canonicalJson));
  const facts = unique(values);
  const maximum = new Map();
  for (const fact of facts)
    if (functional.has(canonicalJson(fact.a))) {
      const cell = `${canonicalJson(fact.e)}\u0000${canonicalJson(fact.a)}`;
      const prior = maximum.get(cell);
      if (
        !prior ||
        canonicalJson(fact.t).localeCompare(canonicalJson(prior.t)) >= 0
      )
        maximum.set(cell, fact);
    }
  return facts.filter(
    (fact) =>
      !functional.has(canonicalJson(fact.a)) ||
      maximum.get(`${canonicalJson(fact.e)}\u0000${canonicalJson(fact.a)}`) ===
        fact,
  );
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(latest(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
