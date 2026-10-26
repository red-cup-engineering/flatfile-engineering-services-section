#!/usr/bin/env node
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts["identify-row"].input;
export const outputSchema = contracts["identify-row"].output;
import { encode } from "./encode-row.mjs";
export function identify(value) {
  return encode(value);
}
if (import.meta.main) {
  const { readFileSync } = (globalThis.process?.getBuiltinModule?.("node:fs") ?? {});

  process.stdout.write(
    JSON.stringify(identify(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
}
