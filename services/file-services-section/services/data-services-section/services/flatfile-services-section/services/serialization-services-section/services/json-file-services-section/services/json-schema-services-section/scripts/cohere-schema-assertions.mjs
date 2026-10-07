#!/usr/bin/env node
import * as json from "../../../src/index.mjs";
import { freezeJson } from "../../../src/index.mjs";
import { admitSchemaAssertion } from "./admit-schema-assertion.mjs";
import { foldSchemaAssertions } from "./fold-schema-assertions.mjs";

import contract from "../schemas/cohere-schema-assertions.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function cohereSchemaAssertions(request) {
  json.requireJsonValue(request);
  const assertion = (value) => admitSchemaAssertion({ assertion: value });
  const rows = (value) => {
    if (!Array.isArray(value))
      throw new TypeError("assertions must be an array");
    return value.map(assertion);
  };
  const cells = new Map();
  for (const row of rows(request.assertions)) {
    const key = `${row.e}\0${row.a}`;
    cells.set(key, [...(cells.get(key) ?? []), row]);
  }
  const accepted = [],
    contradictions = [];
  for (const entries of cells.values()) {
    const values = new Map(
      entries.map((row) => [json.canonicalJson(row.v), row.v]),
    );
    if (values.size > 1)
      contradictions.push(
        Object.freeze({
          e: entries[0].e,
          a: entries[0].a,
          values: Object.freeze([...values.values()]),
          assertions: Object.freeze(entries),
        }),
      );
    else
      accepted.push(
        entries.reduce((left, right) => (left.t >= right.t ? left : right)),
      );
  }
  return Object.freeze({
    schema: contradictions.length
      ? null
      : foldSchemaAssertions({ assertions: accepted }).schema,
    contradictions: Object.freeze(contradictions),
  });
}
