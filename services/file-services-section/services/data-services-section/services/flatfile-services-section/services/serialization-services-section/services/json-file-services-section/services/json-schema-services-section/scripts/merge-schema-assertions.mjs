#!/usr/bin/env node
import * as json from "../../../src/index.mjs";
import { freezeJson } from "../../../src/index.mjs";
import { admitSchemaAssertion } from "./admit-schema-assertion.mjs";
import { identifySchemaAssertion } from "./identify-schema-assertion.mjs";

import contract from "../schemas/merge-schema-assertions.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function mergeSchemaAssertions(request) {
  json.requireJsonValue(request);
  const assertion = (value) => admitSchemaAssertion({ assertion: value });
  const rows = (value) => {
    if (!Array.isArray(value))
      throw new TypeError("assertions must be an array");
    return value.map(assertion);
  };
  const id = (row) => identifySchemaAssertion({ assertion: row }).id;
  const found = new Map();
  for (const trace of request.traces ?? [])
    for (const row of rows(trace)) found.set(id(row), row);
  return Object.freeze({
    assertions: Object.freeze(
      [...found.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, row]) => row),
    ),
  });
}
