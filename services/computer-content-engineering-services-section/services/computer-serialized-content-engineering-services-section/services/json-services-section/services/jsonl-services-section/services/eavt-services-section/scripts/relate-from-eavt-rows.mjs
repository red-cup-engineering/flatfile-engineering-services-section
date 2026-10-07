import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { eavtRow } from "./admit-row.mjs";
import { readFileSync } from "node:fs";
export const inputSchema = Object.freeze({
  type: "object",
  required: ["rows", "subject", "predicate"],
});
export const outputSchema = Object.freeze({
  type: "object",
  required: ["objects"],
});
export function relateFromEavtRows({ rows, subject, predicate } = {}) {
  if (typeof predicate !== "string")
    throw new TypeError("predicate must be a string");
  const objects = new Map();
  for (const item of rows.map(eavtRow))
    if (
      canonicalJson(item.e) === canonicalJson(subject) &&
      item.a === predicate &&
      !objects.has(canonicalJson(item.v))
    )
      objects.set(canonicalJson(item.v), item.v);
  return { objects: [...objects.values()] };
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(relateFromEavtRows(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
