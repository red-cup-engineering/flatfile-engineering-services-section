#!/usr/bin/env node
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts["read-contradictions"].input;
export const outputSchema = contracts["read-contradictions"].output;
import { readFileSync } from "node:fs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { unique } from "./deduplicate-rows.mjs";
export function settle({ rows: values, entity }) {
  const facts = unique(values).filter(
    (fact) => canonicalJson(fact.e) === canonicalJson(entity),
  );
  const positive = facts.filter((fact) => fact.v !== null);
  const denied = facts
    .filter((fact) => fact.v === null)
    .map(({ e, a }) => ({ e, a, v: null }));
  const deniedKeys = new Set(
    denied.map(({ e, a }) => `${canonicalJson(e)}\u0000${canonicalJson(a)}`),
  );
  const affirmed = positive.map(({ e, a, v }) => ({ e, a, v }));
  return Object.freeze({
    entity,
    affirmed,
    denied,
    contradicted: affirmed.filter(({ e, a }) =>
      deniedKeys.has(`${canonicalJson(e)}\u0000${canonicalJson(a)}`),
    ),
  });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(settle(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
