#!/usr/bin/env node
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { unfoldSchema as unfold } from "../src/schema-assertion-trace.mjs";

import contract from "../schemas/unfold-schema.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function unfoldSchema(request) {
  requireJsonValue(request);
  if (typeof request.time !== "string" || !request.time)
    throw new TypeError("time is required");
  return Object.freeze({
    assertions: unfold(request.schema, { base: request.base, t: request.time }),
  });
}
