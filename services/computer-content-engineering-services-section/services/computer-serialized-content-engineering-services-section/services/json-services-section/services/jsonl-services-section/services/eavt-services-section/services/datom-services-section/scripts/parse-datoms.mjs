#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { parseLines } from "@red-cup-engineering/jsonl-services-section";
import { toDatom } from "./admit-datom.mjs";
export { default as inputSchema } from "../schemas/parse-datoms.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/parse-datoms.output.schema.json" with { type: "json" };
export function parse(text) {
  return parseLines(text).map(toDatom);
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(parse(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
