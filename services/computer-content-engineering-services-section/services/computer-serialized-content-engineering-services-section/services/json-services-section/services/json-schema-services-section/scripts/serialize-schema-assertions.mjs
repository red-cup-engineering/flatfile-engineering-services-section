#!/usr/bin/env node
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { serializeSchemaAssertions as serialize } from "../src/schema-assertion-trace.mjs";

import contract from "../schemas/serialize-schema-assertions.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function serializeSchemaAssertions(request) {
  requireJsonValue(request);
  if (!Array.isArray(request.assertions))
    throw new TypeError("assertions must be an array");
  return Object.freeze({ content: serialize(request.assertions) });
}
