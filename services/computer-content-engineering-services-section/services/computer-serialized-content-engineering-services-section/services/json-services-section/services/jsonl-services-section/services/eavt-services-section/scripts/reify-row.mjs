import { identifyContentAddressedRow } from "./identify-content-addressed-row.mjs";
export const inputSchema = Object.freeze({ type: "object", required: ["e", "a", "v", "t"] });
export const outputSchema = Object.freeze({ type: "string" });
// A reified row is a row about a row: its subject is the base row's identity, prefixed, so reads can
// tell attributions from subject state.
export const REIFIED_PREFIX = "row:";
export const reifyEavtRow = (row) =>
  `${REIFIED_PREFIX}${identifyContentAddressedRow({ row }).identity}`;
export const isReifiedEntity = (entity) =>
  typeof entity === "string" && entity.startsWith(REIFIED_PREFIX);
if (import.meta.main) {
  const { readFileSync } = await import("node:fs");

  process.stdout.write(`${JSON.stringify(reifyEavtRow(JSON.parse(readFileSync(0, "utf8"))))}\n`);
}
