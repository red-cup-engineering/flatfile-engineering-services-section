#!/usr/bin/env node
import * as json from "../../../src/index.mjs";
import { freezeJson } from "../../../src/index.mjs";
import { admitSchemaAssertion } from "./admit-schema-assertion.mjs";

import contract from "../schemas/serialize-schema-assertions.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function serializeSchemaAssertions(request) {
  json.requireJsonValue(request);
  const assertion = (value) => admitSchemaAssertion({ assertion: value });
  const rows = (value) => {
    if (!Array.isArray(value))
      throw new TypeError("assertions must be an array");
    return value.map(assertion);
  };
  return Object.freeze({
    content:
      rows(request.assertions).map(json.canonicalJson).join("\n") +
      (request.assertions.length ? "\n" : ""),
  });
}
