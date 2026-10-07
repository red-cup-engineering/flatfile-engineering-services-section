#!/usr/bin/env node
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts["filter-consent"].input;
export const outputSchema = contracts["filter-consent"].output;
import { readFileSync } from "node:fs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { unique } from "./deduplicate-rows.mjs";
import { latest } from "./latest-attributes.mjs";
export function consent({ rows: values, audience }) {
  const facts = unique(values);
  const choices = latest({
    rows: facts.filter((fact) => fact.a === "consent"),
    attributes: ["consent"],
  });
  const admitted = new Set(
    choices
      .filter(
        (fact) =>
          fact.v === "public" ||
          (Array.isArray(fact.v) && fact.v.includes(audience)),
      )
      .map((fact) => canonicalJson(fact.e)),
  );
  const rows = facts.filter((fact) => admitted.has(canonicalJson(fact.e)));
  return Object.freeze({ rows, withheld: facts.length - rows.length });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(consent(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
