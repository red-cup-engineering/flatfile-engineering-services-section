#!/usr/bin/env node
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts["decode-row"].input;
export const outputSchema = contracts["decode-row"].output;
import { readFileSync } from "node:fs";
import { decodeCanonical } from "@red-cup-engineering/cbor-services-section";
import { row } from "./admit-row.mjs";
import { encode } from "./encode-row.mjs";
export function decode(line) {
  try {
    const fact = row(JSON.parse(line));
    if (line !== encode(fact))
      throw new TypeError("EAVT line is not canonical");
    return fact;
  } catch {
    try {
      return row(decodeCanonical(Buffer.from(line, "base64")));
    } catch {
      throw new TypeError("EAVT line is not a canonical JSON or CBOR row");
    }
  }
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(decode(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
