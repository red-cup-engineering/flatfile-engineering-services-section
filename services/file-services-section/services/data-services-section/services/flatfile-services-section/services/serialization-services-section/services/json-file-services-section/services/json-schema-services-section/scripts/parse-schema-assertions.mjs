#!/usr/bin/env node
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { parseSchemaAssertions as parse } from "../src/schema-assertion-trace.mjs";

import contract from "../schemas/parse-schema-assertions.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function parseSchemaAssertions(request) {
  requireJsonValue(request);
  return Object.freeze({
    assertions: Object.freeze(parse(String(request.content ?? ""))),
  });
}
