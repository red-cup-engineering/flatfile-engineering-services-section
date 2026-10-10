#!/usr/bin/env node
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { schemaAssertionId } from "../src/schema-assertion-trace.mjs";

import contract from "../schemas/identify-schema-assertion.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function identifySchemaAssertion(request) {
  requireJsonValue(request);
  return { id: schemaAssertionId(request.assertion) };
}
