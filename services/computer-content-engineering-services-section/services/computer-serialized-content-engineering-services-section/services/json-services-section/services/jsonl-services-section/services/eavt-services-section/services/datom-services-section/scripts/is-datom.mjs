#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { toDatom } from "./admit-datom.mjs";
export { default as inputSchema } from "../schemas/is-datom.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/is-datom.output.schema.json" with { type: "json" };
export function isDatomShape(value) {
  try {
    toDatom(value);
    return true;
  } catch {
    return false;
  }
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(isDatomShape(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
