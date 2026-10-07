#!/usr/bin/env node
import * as json from "@red-cup-engineering/json-services-section";
import { freezeJson } from "@red-cup-engineering/json-services-section";

import contract from "../schemas/schema-children.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function schemaChildren(schema) {
  const children = [];
  for (const key of ["$defs", "properties"]) {
    if (schema[key] === undefined) continue;
    if (!json.isJsonRecord(schema[key]))
      throw new TypeError(`${key} must be an object`);
    for (const [name, child] of Object.entries(schema[key]))
      children.push([
        `${key}/${name.replaceAll("~", "~0").replaceAll("/", "~1")}`,
        child,
      ]);
  }
  for (const key of [
    "items",
    "contains",
    "propertyNames",
    "not",
    "if",
    "then",
    "else",
    "additionalProperties",
  ]) {
    const child = schema[key];
    if (
      child !== undefined &&
      !(key === "additionalProperties" && typeof child === "boolean")
    )
      children.push([key, child]);
  }
  for (const key of ["allOf", "anyOf", "oneOf", "prefixItems"]) {
    if (schema[key] !== undefined) {
      if (!Array.isArray(schema[key]))
        throw new TypeError(`${key} must be an array`);
      schema[key].forEach((child, index) =>
        children.push([`${key}/${index}`, child]),
      );
    }
  }
  return children;
}

