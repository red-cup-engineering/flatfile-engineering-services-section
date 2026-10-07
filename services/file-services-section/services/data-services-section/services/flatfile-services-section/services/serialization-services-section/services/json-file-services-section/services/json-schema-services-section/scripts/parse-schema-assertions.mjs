#!/usr/bin/env node
import * as json from "../../../src/index.mjs";
import { freezeJson } from "../../../src/index.mjs";
import { admitSchemaAssertion } from "./admit-schema-assertion.mjs";

import contract from "../schemas/parse-schema-assertions.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function parseSchemaAssertions(request) {
  json.requireJsonValue(request);
  const assertion = (value) => admitSchemaAssertion({ assertion: value });
  return Object.freeze({
    assertions: Object.freeze(
      String(request.content ?? "")
        .split("\n")
        .filter((line) => line.trim())
        .map((line, index) => {
          try {
            return assertion(JSON.parse(line));
          } catch (error) {
            throw new TypeError(`line ${index + 1}: ${error.message}`);
          }
        }),
    ),
  });
}
