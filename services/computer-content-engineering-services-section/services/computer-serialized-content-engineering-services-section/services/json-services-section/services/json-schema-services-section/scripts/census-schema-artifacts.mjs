#!/usr/bin/env node
import { isJsonRecord, requireJsonValue } from "@red-cup-engineering/json-services-section";
import { census } from "../dist/census.mjs";

import contract from "../schemas/census-schema-artifacts.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
/** The request face of the one census classifier (src/census.mts): path and content text in, classified entries and counts out. */
export function censusSchemaArtifacts(input) {
  const request = requireJsonValue(input);
  if (!isJsonRecord(request)) throw new TypeError("request must be an object");
  if (!Array.isArray(request.entries)) throw new TypeError("entries must be an array");
  return census(
    request.entries.map((item) => {
      if (!isJsonRecord(item)) throw new TypeError("census entry must be an object");
      if (typeof item.path !== "string" || typeof item.content !== "string")
        throw new TypeError("census entries require path and content text");
      return { path: item.path, content: item.content };
    }),
  );
}
