#!/usr/bin/env node
import * as json from "@red-cup-engineering/json-services-section";
import { freezeJson } from "@red-cup-engineering/json-services-section";
import { admitSchemaAssertion } from "./admit-schema-assertion.mjs";

import contract from "../schemas/unfold-schema.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function unfoldSchema(request) {
  json.requireJsonValue(request);
  const assertion = (value) => admitSchemaAssertion({ assertion: value });
  const pointerPart = (value) =>
    value.replaceAll("~", "~0").replaceAll("/", "~1");
  if (!json.isJsonRecord(request.schema))
    throw new TypeError("schema must be an object");
  const source = request.schema;
  if (typeof request.time !== "string" || !request.time)
    throw new TypeError("time is required");
  const output = [];
  const walk = (node, pointer) => {
    if (node === null || typeof node !== "object") return;
    for (const [key, value] of Array.isArray(node)
      ? node.map((value, index) => [String(index), value])
      : Object.entries(node)) {
      const composite = value !== null && typeof value === "object";
      output.push(
        Object.freeze({
          e: `${request.base ?? ""}#${pointer}`,
          a: key,
          v: composite ? (Array.isArray(value) ? [] : {}) : value,
          t: request.time,
        }),
      );
      if (composite) walk(value, `${pointer}/${pointerPart(key)}`);
    }
  };
  walk(source, "");
  return Object.freeze({ assertions: Object.freeze(output) });
}
