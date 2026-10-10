#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { normalizeEavtRow } from "@red-cup-engineering/eavt-services-section/normalize-row";
import { toDatom } from "./admit-datom.mjs";
export { default as inputSchema } from "../schemas/settle-row.input.schema.json" with { type: "json" };
export { default as outputSchema } from "../schemas/settle-row.output.schema.json" with { type: "json" };
export function settledDatom({ row, reading }) {
  const { e, a, v, t } = normalizeEavtRow(row);
  return toDatom([e, a, v, t, reading]);
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(settledDatom(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
