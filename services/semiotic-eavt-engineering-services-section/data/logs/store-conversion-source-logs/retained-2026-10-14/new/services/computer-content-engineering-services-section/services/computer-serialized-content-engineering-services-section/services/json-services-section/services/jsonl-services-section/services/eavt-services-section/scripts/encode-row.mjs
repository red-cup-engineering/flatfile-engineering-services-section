#!/usr/bin/env node
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts["encode-row"].input;
export const outputSchema = contracts["encode-row"].output;
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { memoizeOnRow, row } from "./admit-row.mjs";
const encodeAdmitted = memoizeOnRow((fact) => canonicalJson(fact));
export function encode(value) {
  return encodeAdmitted(row(value));
}
if (import.meta.main) {
  const { readFileSync } = (globalThis.process?.getBuiltinModule?.("node:fs") ?? {});

  process.stdout.write(
    JSON.stringify(encode(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
}
