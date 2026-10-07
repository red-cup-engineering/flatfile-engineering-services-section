#!/usr/bin/env node
import * as json from "../../../src/index.mjs";
import { freezeJson } from "../../../src/index.mjs";
import { admitSchemaAssertion } from "./admit-schema-assertion.mjs";
import { cohereSchemaAssertions } from "./cohere-schema-assertions.mjs";
import { DRAFT_2020_12 } from "../src/schema-vocabulary.mjs";

import contract from "../schemas/project-schema-assertions.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function projectSchemaAssertions(request) {
  json.requireJsonValue(request);
  const assertion = (value) => admitSchemaAssertion({ assertion: value });
  if (typeof request.id !== "string" || !request.id)
    throw new TypeError("id is required");
  const coherent = cohereSchemaAssertions({ assertions: request.assertions });
  if (coherent.schema === null) return coherent;
  const { $id, $schema, ...rest } = coherent.schema;
  if ($id !== undefined && $id !== request.id)
    throw new TypeError("claimed $id disagrees with projection id");
  return Object.freeze({
    schema: freezeJson({ $schema: DRAFT_2020_12, $id: request.id, ...rest }),
    contradictions: Object.freeze([]),
  });
}
