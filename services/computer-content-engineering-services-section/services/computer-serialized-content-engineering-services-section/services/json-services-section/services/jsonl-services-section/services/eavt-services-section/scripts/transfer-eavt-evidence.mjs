import { foldEavtEvidence } from "./fold-eavt-evidence.mjs";
import { readFileSync } from "node:fs";
export const inputSchema = Object.freeze({
  type: "object",
  required: ["subject", "rows"],
});
export const outputSchema = Object.freeze({
  type: "object",
  required: ["entity", "fiber"],
});
export function transferEavtEvidence(value = {}) {
  return foldEavtEvidence({ ...value, retract: false });
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(transferEavtEvidence(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
