#!/usr/bin/env node
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts["list-entities"].input;
export const outputSchema = contracts["list-entities"].output;
import { readFileSync } from "node:fs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { unique } from "./deduplicate-rows.mjs";
export function entities(values) {
  return unique(values).reduce(
    (found, fact) =>
      found.some((entity) => canonicalJson(entity) === canonicalJson(fact.e))
        ? found
        : [...found, fact.e],
    [],
  );
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(entities(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
