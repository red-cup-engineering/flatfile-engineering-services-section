#!/usr/bin/env node
import * as json from "@red-cup-engineering/json-services-section";
import { assertSchema } from "./assert-schema.mjs";
import { resolveSchemaReference } from "./resolve-schema-reference.mjs";
import { schemaChildren } from "./schema-children.mjs";

import contract from "../schemas/inspect-schema-corpus.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function inspectSchemaCorpus({ schemas }) {
  if (!Array.isArray(schemas)) throw new TypeError("schemas must be an array");
  const errors = [],
    ids = new Set();
  for (const schema of schemas) {
    try {
      assertSchema({ schema, allowUnknownAnnotations: true });
    } catch (error) {
      errors.push({
        schema: schema?.$id ?? null,
        pointer: "",
        keyword: "schema",
        message: error.message,
      });
      continue;
    }
    if (schema.$id !== undefined && ids.has(schema.$id))
      errors.push({
        schema: schema.$id,
        pointer: "",
        keyword: "$id",
        message: "duplicate schema id",
      });
    ids.add(schema.$id);
    const pending = [[schema, ""]];
    while (pending.length) {
      const [node, pointer] = pending.pop();
      if (typeof node === "boolean") continue;
      if (typeof node.$ref === "string") {
        try {
          if (
            !resolveSchemaReference({
              base: schema,
              schemas,
              reference: node.$ref,
            }).found
          )
            errors.push({
              schema: schema.$id ?? null,
              pointer,
              keyword: "$ref",
              message: `unresolved reference ${node.$ref}`,
            });
        } catch (error) {
          errors.push({
            schema: schema.$id ?? null,
            pointer,
            keyword: "$ref",
            message: error.message,
          });
        }
      }
      if (
        node.type === "object" &&
        node.additionalProperties === false &&
        Array.isArray(node.required)
      )
        for (const key of node.required)
          if (!Object.hasOwn(node.properties ?? {}, key))
            errors.push({
              schema: schema.$id ?? null,
              pointer,
              keyword: "required",
              message: `required property ${key} is forbidden`,
            });
      for (const [path, child] of schemaChildren(node))
        pending.push([child, `${pointer}/${path}`]);
    }
  }
  return { ok: errors.length === 0, checked: schemas.length, errors };
}
