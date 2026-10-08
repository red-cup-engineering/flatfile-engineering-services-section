#!/usr/bin/env node
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts["select-relations"].input;
export const outputSchema = contracts["select-relations"].output;
import { readFileSync } from "node:fs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { unique } from "./deduplicate-rows.mjs";
export function relations({ rows: values, attribute, value }) {
  return unique(values).filter(
    (fact) =>
      canonicalJson(fact.a) === canonicalJson(attribute) &&
      (value === undefined || canonicalJson(fact.v) === canonicalJson(value)),
  );
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(relations(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
