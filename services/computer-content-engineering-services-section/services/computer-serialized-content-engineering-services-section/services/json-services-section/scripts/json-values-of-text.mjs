#!/usr/bin/env node
const { readFileSync } = globalThis.process?.getBuiltinModule?.("node:fs") ?? {};
import contract from "../schemas/json-values-of-text.json" with { type: "json" };
import { parseJsonValue } from "./parse-json-value.mjs";
export const inputSchema = contract.input;
export const outputSchema = contract.output;
/**
 * The JSON values a text carries, most authoritative first: the whole text when it is one JSON
 * value, then each fenced code block that is one, the last block first (a text's final word is
 * its answer), then the span from its first opening brace or bracket to its last closing one.
 * A text carrying none yields none.
 */
export function jsonValuesOfText(text) {
  if (typeof text !== "string") return Object.freeze([]);
  const fenced = [...text.matchAll(/```[A-Za-z0-9_-]*[^\S\n]*\n?([\s\S]*?)```/gu)].map((match) => match[1]).reverse();
  const open = text.search(/[{[]/u);
  const close = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  const candidates = [text, ...fenced, ...(open >= 0 && close > open ? [text.slice(open, close + 1)] : [])]
    .map((candidate) => candidate.trim()).filter((candidate) => candidate !== "");
  const values = [];
  for (const candidate of new Set(candidates)) {
    try { values.push(parseJsonValue(candidate)); } catch { /* not one JSON value */ }
  }
  return Object.freeze(values);
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(jsonValuesOfText(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
