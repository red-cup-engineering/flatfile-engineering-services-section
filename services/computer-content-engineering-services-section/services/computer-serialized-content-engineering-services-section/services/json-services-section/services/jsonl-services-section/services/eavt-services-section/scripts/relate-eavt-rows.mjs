import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { eavtRow } from "./admit-row.mjs";
import { isReifiedEntity } from "./reify-row.mjs";
import { readFileSync } from "node:fs";
export const inputSchema = Object.freeze({
  type: "object",
  required: ["rows", "predicate", "object"],
});
export const outputSchema = Object.freeze({
  type: "object",
  required: ["subjects"],
});
export function relateEavtRows({ rows, predicate, object } = {}) {
  if (typeof predicate !== "string")
    throw new TypeError("predicate must be a string");
  const subjects = new Map();
  for (const item of rows.map(eavtRow))
    if (!isReifiedEntity(item.e) && item.a === predicate && canonicalJson(item.v) === canonicalJson(object))
      subjects.set(canonicalJson(item.e), item.e);
  return {
    subjects: [...subjects.values()].sort((left, right) =>
      canonicalJson(left).localeCompare(canonicalJson(right)),
    ),
  };
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(relateEavtRows(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
