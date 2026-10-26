import { eavtRow } from "./admit-row.mjs";
import { cell, cellSet } from "@red-cup-engineering/signcell/cell";
import { readFileSync } from "node:fs";
export const inputSchema = Object.freeze({ type: "array", items: { type: "object", required: ["e", "a", "v", "t"] } });
export const outputSchema = Object.freeze({ type: "array" });
// The cell one admitted EAVT row (e, a, v, t) tells: (e, a, v), told for, its time t the witness.
export function eavtToCell(row) {
  const { e, a, v, t } = eavtRow(row);
  return cell(e, a, v, { for: [t] });
}
// A cell's EAVT rows, one per for-witness. An EAVT row is an assertion and has no side, so evidence
// against a cell has no EAVT row.
export const cellToEavt = (told) =>
  told.for.map((t) => eavtRow({ e: told.subject, a: told.predicate, v: told.object, t }));
// A trace's cell set: each row's cell, the cells of one triple joined.
export const cellsOfEavtRows = (rows) => cellSet(rows.map(eavtToCell));
if (import.meta.main)
  process.stdout.write(`${JSON.stringify(cellsOfEavtRows(JSON.parse(readFileSync(0, "utf8"))))}\n`);
