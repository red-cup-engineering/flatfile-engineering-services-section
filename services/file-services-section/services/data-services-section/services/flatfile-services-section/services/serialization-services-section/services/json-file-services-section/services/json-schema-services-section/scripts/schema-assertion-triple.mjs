#!/usr/bin/env node
import * as json from "../../../src/index.mjs";
import { freezeJson } from "../../../src/index.mjs";
import { admitSchemaAssertion } from "./admit-schema-assertion.mjs";

import contract from "../schemas/schema-assertion-triple.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function schemaAssertionTriple(request) {
  json.requireJsonValue(request);
  const assertion = (value) => admitSchemaAssertion({ assertion: value });
  const row = assertion(request.assertion);
  return Object.freeze({ s: row.e, p: row.a, o: row.v });
}
