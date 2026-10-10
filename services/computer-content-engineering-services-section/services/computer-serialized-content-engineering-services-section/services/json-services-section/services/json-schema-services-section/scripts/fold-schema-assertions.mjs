#!/usr/bin/env node
import { foldSchema } from "../src/schema-assertion-trace.mjs";

import contract from "../schemas/fold-schema-assertions.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function foldSchemaAssertions({ assertions }) {
  if (!Array.isArray(assertions))
    throw new TypeError("assertions must be an array");
  return { schema: foldSchema(assertions) };
}
