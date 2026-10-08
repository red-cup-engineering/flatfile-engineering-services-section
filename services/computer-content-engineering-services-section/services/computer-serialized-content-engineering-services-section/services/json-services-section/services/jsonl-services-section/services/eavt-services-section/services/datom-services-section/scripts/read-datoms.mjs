#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { readFileSync } from "node:fs";
import { toDatom } from "./admit-datom.mjs";
export { default as inputSchema } from "../schemas/read-datoms.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/read-datoms.output.schema.json" with { type: "json" };
export function readDatomsAtPath(filePath) {
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return [];
  }
  const result = [];
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    try {
      result.push(toDatom(JSON.parse(line)));
    } catch {
      /* Tolerant journal recovery skips damaged records. */
    }
  }
  return result;
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(readDatomsAtPath(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
