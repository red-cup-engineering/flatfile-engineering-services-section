#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { serializeLines } from "@red-cup-engineering/jsonl-services-section";
import { toDatom } from "./admit-datom.mjs";
export { default as inputSchema } from "../schemas/serialize-datoms.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/serialize-datoms.output.schema.json" with { type: "json" };
export function serialize(datoms) {
  return serializeLines(datoms.map(toDatom));
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(serialize(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
