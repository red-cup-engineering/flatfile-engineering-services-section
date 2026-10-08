import { eavtRow } from "./admit-row.mjs";
import { citations } from "./collect-eavt-citations.mjs";
import { readFileSync } from "node:fs";
export const inputSchema = Object.freeze({ type: "object", required: ["row"] });
export const outputSchema = Object.freeze({
  type: "object",
  required: ["citations"],
});
/** Extract unique content-address citations from a row's JSON value. */
export function extractEavtCitations({ row } = {}) {
  return { citations: citations(eavtRow(row).v) };
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(extractEavtCitations(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
