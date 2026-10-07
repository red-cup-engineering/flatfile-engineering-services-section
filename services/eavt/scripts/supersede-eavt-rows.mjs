import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { eavtRow, memoizeOnRow } from "./admit-row.mjs";
import { isReifiedEntity } from "./reify-row.mjs";
export const inputSchema = Object.freeze({
  type: "object",
  required: ["rows"],
});
export const outputSchema = Object.freeze({
  type: "object",
  required: ["rows"],
});
// A row's (subject, attribute) slot is a function of the admitted row.
const slot = memoizeOnRow((item) => canonicalJson([item.e, item.a]));
// Read-time latest-t projection: for each functional attribute (names as an array or Set, or a test
// on the attribute) only each subject's latest-t rows
// of it survive; other rows and rows about rows all survive.
export function supersedeEavtRows({ rows, functionalAttributes = [] } = {}) {
  const names =
    functionalAttributes instanceof Set ? [...functionalAttributes] : functionalAttributes;
  const functional =
    typeof names === "function"
      ? names
      : Array.isArray(names) && names.every((attribute) => typeof attribute === "string")
        ? ((set) => (attribute) => set.has(attribute))(new Set(names))
        : null;
  if (!functional)
    throw new TypeError("functionalAttributes must be attribute names or a test");
  if (!Array.isArray(rows)) throw new TypeError("rows must be an array");
  const trace = rows.map(eavtRow),
    counts = (item) => !isReifiedEntity(item.e) && functional(item.a),
    latest = new Map();
  for (const item of trace)
    if (counts(item) && (!latest.has(slot(item)) || item.t > latest.get(slot(item))))
      latest.set(slot(item), item.t);
  return { rows: trace.filter((item) => !counts(item) || item.t === latest.get(slot(item))) };
}
if (import.meta.main) {
  const { readFileSync } = await import("node:fs");

  process.stdout.write(
    `${JSON.stringify(supersedeEavtRows(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
}
