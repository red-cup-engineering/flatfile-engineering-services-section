#!/usr/bin/env node
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { schemaAssertionTriple as triple } from "../src/schema-assertion-trace.mjs";

import contract from "../schemas/schema-assertion-triple.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function schemaAssertionTriple(request) {
  requireJsonValue(request);
  return triple(request.assertion);
}
