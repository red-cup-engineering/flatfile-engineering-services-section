#!/usr/bin/env node
const { readFileSync: readInput } = globalThis.process?.getBuiltinModule?.("node:fs") ?? {};
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts.serializeLines.input;
export const outputSchema = contracts.serializeLines.output;
export function serializeLines(values) {
  return values.length === 0
    ? ""
    : `${values.map((value) => canonicalJson(value)).join("\n")}\n`;
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(serializeLines(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
