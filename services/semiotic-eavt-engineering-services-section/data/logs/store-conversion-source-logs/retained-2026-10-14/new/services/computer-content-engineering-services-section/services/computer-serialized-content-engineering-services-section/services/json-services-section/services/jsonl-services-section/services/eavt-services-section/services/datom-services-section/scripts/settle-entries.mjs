#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { normalizeEavtRow } from "@red-cup-engineering/eavt-services-section/normalize-row";
import { settledDatom } from "./settle-row.mjs";
export { default as inputSchema } from "../schemas/settle-entries.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/settle-entries.output.schema.json" with { type: "json" };
export function settle({ entries }) {
  const datoms = [],
    kept = [];
  for (const item of entries) {
    const row = normalizeEavtRow(item.row);
    if (Object.hasOwn(item, "reading"))
      datoms.push(settledDatom({ row, reading: item.reading }));
    else kept.push(row);
  }
  return Object.freeze({ datoms, kept });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(settle(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
