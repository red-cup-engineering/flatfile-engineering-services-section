#!/usr/bin/env node
const { readFileSync: readInput } = globalThis.process?.getBuiltinModule?.("node:fs") ?? {};
const { readFileSync } = globalThis.process?.getBuiltinModule?.("node:fs") ?? {};
import { parseLines } from "./parse-jsonl.mjs";
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts.readJsonlAtPath.input;
export const outputSchema = contracts.readJsonlAtPath.output;
export function readJsonlAtPath(path) {
  try {
    return parseLines(readFileSync(path, "utf8"));
  } catch (error) {
    if (
      error?.code === "ENOENT" ||
      error?.code === "EACCES" ||
      error?.code === "ENOTDIR"
    )
      return [];
    throw error;
  }
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(readJsonlAtPath(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
