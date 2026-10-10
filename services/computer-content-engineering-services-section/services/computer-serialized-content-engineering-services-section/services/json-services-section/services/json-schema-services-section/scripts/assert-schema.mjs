#!/usr/bin/env node
import * as json from "@red-cup-engineering/json-services-section";
import { freezeJson } from "@red-cup-engineering/json-services-section";
import { DRAFT_2020_12, supported, known } from "../src/schema-vocabulary.mjs";
import { assertKeywordValues } from "../src/assert-keyword-values.mjs";
import { schemaChildren } from "./schema-children.mjs";

import contract from "../schemas/assert-schema.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function assertSchema({ schema, allowUnknownAnnotations = false }) {
  json.requireJsonValue(schema);
  const pending = [[schema, "$"]];
  while (pending.length) {
    const [node, at] = pending.pop();
    if (typeof node === "boolean") continue;
    if (!json.isJsonRecord(node))
      throw new TypeError(`${at} must be an object or boolean schema`);
    for (const key of Object.keys(node))
      if (
        (!supported.has(key) && known.has(key)) ||
        (!supported.has(key) && !allowUnknownAnnotations)
      )
        throw new TypeError(`${at}: unsupported Draft 2020-12 keyword ${key}`);
    if (node.$schema !== undefined && node.$schema !== DRAFT_2020_12)
      throw new TypeError(
        `${at}: unsupported dialect ${JSON.stringify(node.$schema)}`,
      );
    assertKeywordValues(node, at);
    if (node.pattern !== undefined) {
      if (typeof node.pattern !== "string")
        throw new TypeError(`${at}/pattern must be a string`);
      new RegExp(node.pattern, "u");
    }
    if (
      node.format !== undefined &&
      !["date", "date-time"].includes(node.format)
    )
      throw new TypeError(
        `${at}/format: unsupported format ${JSON.stringify(node.format)}`,
      );
    for (const [path, child] of schemaChildren(node))
      pending.push([child, `${at}/${path}`]);
  }
  return schema;
}
