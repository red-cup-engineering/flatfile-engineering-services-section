#!/usr/bin/env node
import { assertSchema } from "./assert-schema.mjs";
import { DRAFT_2020_12 } from "../src/schema-vocabulary.mjs";
import { inspectSchema } from "../dist/index.mjs";

import contract from "../schemas/inspect-schema-corpus.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
/**
 * Judge a set of schemas as one corpus: each must be admitted, ids must be unique, and each must hold
 * the authoring invariants of the one policy inspector (src/index.mts inspectSchema) against the ids
 * the corpus offers; the pool rule that a schema's root `type` is a single string is held here too.
 */
export function inspectSchemaCorpus({ schemas }) {
  if (!Array.isArray(schemas)) throw new TypeError("schemas must be an array");
  const errors = [], ids = new Set();
  const poolIds = new Set(schemas.flatMap((schema) => (typeof schema?.$id === "string" ? [schema.$id] : [])));
  for (const schema of schemas) {
    const name = schema?.$id ?? null;
    try {
      assertSchema({ schema, allowUnknownAnnotations: true });
    } catch (error) {
      errors.push({ schema: name, pointer: "", keyword: "schema", message: error.message });
      continue;
    }
    if (schema.$id !== undefined && ids.has(schema.$id))
      errors.push({ schema: name, pointer: "", keyword: "$id", message: "duplicate schema id" });
    ids.add(schema.$id);
    try {
      for (const { pointer, keyword, message } of inspectSchema({ ...schema, $schema: DRAFT_2020_12 }, poolIds).errors)
        errors.push({ schema: name, pointer, keyword, message });
    } catch (error) {
      errors.push({ schema: name, pointer: "", keyword: "schema", message: `schema inspection failed: ${error.message}` });
    }
    if (schema.type !== undefined && typeof schema.type !== "string")
      errors.push({ schema: name, pointer: "", keyword: "type", message: "type must be a single string in this pool" });
  }
  return { ok: errors.length === 0, checked: schemas.length, errors };
}
