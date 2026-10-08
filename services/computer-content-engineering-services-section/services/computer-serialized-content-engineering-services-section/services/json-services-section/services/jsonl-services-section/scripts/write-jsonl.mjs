#!/usr/bin/env node
const { readFileSync: readInput } = globalThis.process?.getBuiltinModule?.("node:fs") ?? {};
const { mkdirSync, writeFileSync } = globalThis.process?.getBuiltinModule?.("node:fs") ?? {};
const { dirname } = globalThis.process?.getBuiltinModule?.("node:path") ?? {};
import { serializeLines } from "./serialize-jsonl.mjs";
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts.writeJsonl.input;
export const outputSchema = contracts.writeJsonl.output;
export function writeJsonl({ path, records }) {
  if (typeof path !== "string" || path === "" || !Array.isArray(records))
    throw new TypeError(
      "writeJsonl input must be { path: string, records: array }",
    );
  const text = serializeLines(records);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf8");
  return { path, records: records.length, bytes: Buffer.byteLength(text) };
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(writeJsonl(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
