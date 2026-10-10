#!/usr/bin/env node
import { freezeJson } from "@red-cup-engineering/json-services-section";
import { assertSchemaAssertion } from "../src/schema-assertion-trace.mjs";

import contract from "../schemas/admit-schema-assertion.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function admitSchemaAssertion({ assertion }) {
  return freezeJson(assertSchemaAssertion(assertion));
}
