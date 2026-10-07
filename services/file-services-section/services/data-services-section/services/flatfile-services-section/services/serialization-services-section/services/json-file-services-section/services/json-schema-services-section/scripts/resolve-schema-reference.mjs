#!/usr/bin/env node
import * as json from "@red-cup-engineering/json-services-section";
import { freezeJson } from "@red-cup-engineering/json-services-section";
import { resolveSchemaPointer } from "./resolve-schema-pointer.mjs";

import contract from "../schemas/resolve-schema-reference.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function resolveSchemaReference(input) {
  const request = json.requireJsonValue(input);
  if (!json.isJsonRecord(request))
    throw new TypeError("request must be an object");
  if (typeof request.reference !== "string")
    throw new TypeError("reference must be text");
  const base = request.base;
  if (!json.isJsonRecord(base))
    throw new TypeError("base schema must be an object");
  const corpus = Array.isArray(request.schemas) ? request.schemas : [];
  const reference = request.reference;
  let document = base,
    fragment = "";
  if (!reference.startsWith("#")) {
    const at = reference.indexOf("#");
    const id = at < 0 ? reference : reference.slice(0, at);
    fragment = at < 0 ? "" : reference.slice(at);
    document = corpus.find((schema) => schema.$id === id);
    if (!document) return Object.freeze({ found: false });
  } else fragment = reference;
  const result = resolveSchemaPointer({ document, pointer: fragment });
  if (!result.found) return Object.freeze(result);
  if (typeof result.value !== "boolean" && !json.isJsonRecord(result.value))
    throw new TypeError(`reference ${reference} must resolve to a schema`);
  return Object.freeze({
    found: true,
    schema: result.value,
    ...(document.$id === undefined ? {} : { base: document.$id }),
  });
}

