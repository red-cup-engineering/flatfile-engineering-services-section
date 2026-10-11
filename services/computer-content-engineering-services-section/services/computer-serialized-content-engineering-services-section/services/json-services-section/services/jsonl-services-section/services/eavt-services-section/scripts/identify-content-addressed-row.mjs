import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { eavtRow, memoizeOnRow } from "./admit-row.mjs";
export const inputSchema = Object.freeze({ type: "object", required: ["row"] });
export const outputSchema = Object.freeze({
  type: "object",
  required: ["identity"],
});
/** A row's identity is its semiotic content address. */
const identityOf = memoizeOnRow((fact) => semanticId(fact));
export function identifyContentAddressedRow({ row } = {}) {
  return { identity: identityOf(eavtRow(row)) };
}
if (import.meta.main) {
  const { readFileSync } = (globalThis.process?.getBuiltinModule?.("node:fs") ?? {});

  process.stdout.write(
    `${JSON.stringify(identifyContentAddressedRow(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
}
