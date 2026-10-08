#!/usr/bin/env node
const { readFileSync } = globalThis.process?.getBuiltinModule?.("node:fs") ?? {};
import { parseLines } from "./parse-jsonl.mjs";
export const inputSchema = { type: "string" };
export const outputSchema = { type: "boolean" };
export function isJsonlText(text) {
  if (typeof text !== "string") return false;
  try {
    parseLines(text);
    return true;
  } catch {
    return false;
  }
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(isJsonlText(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
