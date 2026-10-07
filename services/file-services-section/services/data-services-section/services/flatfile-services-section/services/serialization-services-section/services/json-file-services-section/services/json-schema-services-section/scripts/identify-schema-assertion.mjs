#!/usr/bin/env node
import * as json from "@red-cup-engineering/json-services-section";
import { freezeJson } from "@red-cup-engineering/json-services-section";
import { admitSchemaAssertion } from "./admit-schema-assertion.mjs";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

import contract from "../schemas/identify-schema-assertion.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function identifySchemaAssertion(request) {
  json.requireJsonValue(request);
  return {
    id: sha256Hex(json.canonicalJson(
          admitSchemaAssertion({ assertion: request.assertion }),
        )),
  };
}
