#!/usr/bin/env node
const { readFileSync } = globalThis.process?.getBuiltinModule?.("node:fs") ?? {};
import contract from "../schemas/keyed-json-text.json" with { type: "json" };
import { canonicalJson } from "./canonical-json.mjs";
import { isJsonRecord } from "./is-json-record.mjs";
export const inputSchema = contract.input;
export const outputSchema = contract.output;
/**
 * A JSON object as text a person reads line by line, the form of a keyed register: each member on its
 * own line, and the entries of the member `keyed` (an object of records, each under its key) one per
 * line in key order. Every value is canonical JSON, and the text parses to the same value.
 */
export function keyedJsonText(value, keyed) {
  if (!isJsonRecord(value) || !isJsonRecord(value[keyed])) {
    throw new TypeError(`keyed JSON text needs an object whose member ${JSON.stringify(keyed)} is an object of records`);
  }
  const entries = Object.keys(value[keyed]).sort()
    .map((key) => `    ${canonicalJson(key)}: ${canonicalJson(value[keyed][key])}`);
  const members = Object.keys(value).sort().map((key) => `  ${canonicalJson(key)}: ${key !== keyed
    ? canonicalJson(value[key])
    : entries.length === 0 ? "{}" : `{\n${entries.join(",\n")}\n  }`}`);
  return `{\n${members.join(",\n")}\n}\n`;
}
if (import.meta.main) {
  const { value, keyed } = JSON.parse(readFileSync(0, "utf8"));
  process.stdout.write(JSON.stringify(keyedJsonText(value, keyed)) + "\n");
}
