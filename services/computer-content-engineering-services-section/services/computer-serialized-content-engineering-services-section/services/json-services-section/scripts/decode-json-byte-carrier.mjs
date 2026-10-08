#!/usr/bin/env node
import contract from "../schemas/json-byte-carrier.json" with { type: "json" };
import { decodeJsonByteCarrier } from "../src/json-byte-carrier.mjs";
export const inputSchema = contract.decodeJsonByteCarrier.input;
export const outputSchema = contract.decodeJsonByteCarrier.output;
export { decodeJsonByteCarrier };
if (import.meta.main) {
  const { readFileSync } = process.getBuiltinModule("node:fs");
  process.stdout.write(JSON.stringify(decodeJsonByteCarrier(JSON.parse(readFileSync(0, "utf8")))) + "\n");
}
