import { foldEavtEvidence } from "./fold-eavt-evidence.mjs";
import { unique } from "./deduplicate-rows.mjs";
import { supersedeEavtRows } from "./supersede-eavt-rows.mjs";
export const inputSchema = Object.freeze({
  type: "object",
  required: ["subject", "rows"],
});
export const outputSchema = Object.freeze({
  type: "object",
  required: ["entity", "fiber"],
});
// The read, fold, settle spine in one call: the distinct rows, the latest-t projection of the
// functional attributes, then the evidence fold.
export function settleEavtEvidence({ rows, functionalAttributes = [], ...fold } = {}) {
  return foldEavtEvidence({
    ...fold,
    rows: supersedeEavtRows({ rows: unique(rows), functionalAttributes }).rows,
  });
}
if (import.meta.main) {
  const { readFileSync } = await import("node:fs");

  process.stdout.write(
    `${JSON.stringify(settleEavtEvidence(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
}
