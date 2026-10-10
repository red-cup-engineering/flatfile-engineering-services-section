#!/usr/bin/env node
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { projectSchemaAssertions as project } from "../src/schema-assertion-trace.mjs";

import contract from "../schemas/project-schema-assertions.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function projectSchemaAssertions(request) {
  requireJsonValue(request);
  if (typeof request.id !== "string" || !request.id)
    throw new TypeError("id is required");
  if (!Array.isArray(request.assertions))
    throw new TypeError("assertions must be an array");
  return project(request.assertions, { id: request.id });
}
