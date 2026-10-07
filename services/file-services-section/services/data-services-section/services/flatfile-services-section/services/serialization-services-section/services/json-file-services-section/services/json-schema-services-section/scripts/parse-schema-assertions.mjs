#!/usr/bin/env node
import * as json from "@red-cup-engineering/json-services-section";
import { freezeJson } from "@red-cup-engineering/json-services-section";
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
