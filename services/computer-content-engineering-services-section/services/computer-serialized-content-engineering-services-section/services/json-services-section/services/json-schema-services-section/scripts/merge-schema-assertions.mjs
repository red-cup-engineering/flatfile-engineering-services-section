#!/usr/bin/env node
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { mergeSchemaAssertions as merge } from "../src/schema-assertion-trace.mjs";

import contract from "../schemas/merge-schema-assertions.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function mergeSchemaAssertions(request) {
  requireJsonValue(request);
  const traces = request.traces ?? [];
  if (!Array.isArray(traces) || traces.some((trace) => !Array.isArray(trace)))
    throw new TypeError("traces must be an array of assertion arrays");
  return Object.freeze({ assertions: Object.freeze(merge(...traces)) });
}
