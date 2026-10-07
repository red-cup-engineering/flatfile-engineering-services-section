import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { eavtRow } from "./admit-row.mjs";
import { identifyContentAddressedRow } from "./identify-content-addressed-row.mjs";
import { readFileSync } from "node:fs";
export const inputSchema = Object.freeze({
  type: "object",
  required: ["rows"],
});
export const outputSchema = Object.freeze({
  type: "object",
  required: ["rows"],
});
export function saturateEavtTrace({ rows, retract = true } = {}) {
  if (!Array.isArray(rows)) throw new TypeError("rows must be an array");
  const seen = new Set(),
    trace = rows.map(eavtRow).filter((row) => {
      const identity = identifyContentAddressedRow({ row }).identity;
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
  if (!retract) return { rows: trace };
  const tombstones = new Map();
  for (const item of trace)
    if (item.v === null) {
      const key = canonicalJson([item.e, item.a]);
      if (!tombstones.has(key) || item.t > tombstones.get(key))
        tombstones.set(key, item.t);
    }
  return {
    rows: trace.filter(
      (item) =>
        item.v !== null &&
        !(
          tombstones.has(canonicalJson([item.e, item.a])) &&
          item.t < tombstones.get(canonicalJson([item.e, item.a]))
        ),
    ),
  };
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(saturateEavtTrace(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
