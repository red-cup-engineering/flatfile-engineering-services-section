#!/usr/bin/env node
import * as json from "@red-cup-engineering/json-services-section";
import { freezeJson } from "@red-cup-engineering/json-services-section";

import contract from "../schemas/admit-schema-assertion.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function admitSchemaAssertion({ assertion: row }) {
  if (
    !json.isJsonRecord(row) ||
    typeof row.e !== "string" ||
    !row.e ||
    typeof row.a !== "string" ||
    !row.a ||
    typeof row.t !== "string" ||
    !row.t ||
    !json.isJsonValue(row.v)
  )
    throw new TypeError(
      "schema assertion requires non-empty e, a, t and JSON v",
    );
  return freezeJson({ e: row.e, a: row.a, v: row.v, t: row.t });
}
