import { niUriDigest } from "@red-cup-engineering/uri-services-section/ni-uri";
import { eavtRow } from "./admit-row.mjs";
import { identifyContentAddressedRow } from "./identify-content-addressed-row.mjs";
import { readFileSync } from "node:fs";
export const inputSchema = Object.freeze({
  type: "object",
  required: ["kind", "attributes", "t"],
});
export const outputSchema = Object.freeze({
  type: "object",
  required: ["address", "genesisRow"],
});
export function constituteContentAddressedEntity({ kind, attributes, t } = {}) {
  if (typeof kind !== "string" || kind.length === 0 || kind.includes(":"))
    throw new TypeError("kind must be a non-empty string without ':'");
  if (
    attributes === null ||
    typeof attributes !== "object" ||
    Array.isArray(attributes)
  )
    throw new TypeError("attributes must be a JSON object");
  const precursor = eavtRow({ e: null, a: "constituted", v: attributes, t });
  const address = `${kind}:${niUriDigest(identifyContentAddressedRow({ row: precursor }).identity)}`;
  return { address, genesisRow: eavtRow({ ...precursor, e: address }) };
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(constituteContentAddressedEntity(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
