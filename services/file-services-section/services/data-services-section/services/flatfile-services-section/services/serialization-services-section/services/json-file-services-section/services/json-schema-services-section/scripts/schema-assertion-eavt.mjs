#!/usr/bin/env node
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { schemaAssertionEavt as eavt } from "../src/schema-assertion-trace.mjs";

import contract from "../schemas/schema-assertion-eavt.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function schemaAssertionEavt(request) {
  requireJsonValue(request);
  return Object.freeze({ value: eavt(request.assertion) });
}
