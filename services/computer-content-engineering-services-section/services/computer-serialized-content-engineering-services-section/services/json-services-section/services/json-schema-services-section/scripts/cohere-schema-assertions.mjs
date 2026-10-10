#!/usr/bin/env node
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { cohereSchemaAssertions as cohere } from "../src/schema-assertion-trace.mjs";

import contract from "../schemas/cohere-schema-assertions.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function cohereSchemaAssertions(request) {
  requireJsonValue(request);
  if (!Array.isArray(request.assertions))
    throw new TypeError("assertions must be an array");
  return cohere(request.assertions);
}
