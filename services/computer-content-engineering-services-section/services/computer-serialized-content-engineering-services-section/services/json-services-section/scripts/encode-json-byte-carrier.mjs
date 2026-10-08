#!/usr/bin/env node
import contract from "../schemas/json-byte-carrier.json" with { type: "json" };
import { encodeJsonByteCarrier } from "../src/json-byte-carrier.mjs";
export const inputSchema = contract.encodeJsonByteCarrier.input;
export const outputSchema = contract.encodeJsonByteCarrier.output;
export { encodeJsonByteCarrier };
if (import.meta.main) {
  const { readFileSync } = process.getBuiltinModule("node:fs");
  process.stdout.write(JSON.stringify(encodeJsonByteCarrier(JSON.parse(readFileSync(0, "utf8")))) + "\n");
}
