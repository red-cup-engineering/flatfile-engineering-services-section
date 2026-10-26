import { niUriDigest } from "@red-cup-engineering/uri-services-section/ni-uri";
import { eavtRow } from "./admit-row.mjs";
import { identifyContentAddressedRow } from "./identify-content-addressed-row.mjs";
import { readFileSync } from "node:fs";
export const inputSchema = Object.freeze({
  type: "object",
  required: ["genesisRow"],
});
export const outputSchema = Object.freeze({
  type: "object",
  required: ["address", "valid"],
});
export function verifyContentAddressedEntity({ genesisRow } = {}) {
  const row = eavtRow(genesisRow);
  if (typeof row.e !== "string" || !row.e.includes(":"))
    throw new TypeError("genesisRow.e must be a '<kind>:<digest>' address");
  const kind = row.e.slice(0, row.e.indexOf(":"));
  const address = `${kind}:${niUriDigest(identifyContentAddressedRow({ row: { e: null, a: row.a, v: row.v, t: row.t } }).identity)}`;
  return { address, valid: address === row.e };
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(verifyContentAddressedEntity(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
