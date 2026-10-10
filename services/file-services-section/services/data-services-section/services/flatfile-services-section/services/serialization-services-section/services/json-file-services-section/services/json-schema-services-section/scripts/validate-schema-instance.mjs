#!/usr/bin/env node
import * as json from "@red-cup-engineering/json-services-section";
import { freezeJson } from "@red-cup-engineering/json-services-section";
import { assertSchema } from "./assert-schema.mjs";
import { resolveSchemaReference } from "./resolve-schema-reference.mjs";
import { DRAFT_2020_12 } from "../src/schema-vocabulary.mjs";

import contract from "../schemas/validate-schema-instance.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function validateSchemaInstance(input) {
  const request = json.requireJsonValue(input);
  if (!json.isJsonRecord(request))
    throw new TypeError("request must be an object");
  const instance = json.requireJsonValue(request.instance);
  const root = request.schema;
  const schemaNode = (value) => {
    if (typeof value !== "boolean" && !json.isJsonRecord(value))
      throw new TypeError("expected object or boolean schema");
    return value;
  };
  const violation = (pointer, keyword, message) => ({
    pointer,
    keyword,
    message,
  });
  const schemas = Array.isArray(request.schemas) ? request.schemas : [];
  const errors = [];
  try {
    assertSchema({ schema: root, allowUnknownAnnotations: true });
  } catch (error) {
    return Object.freeze({
      ok: false,
      errors: Object.freeze([violation("", "schema", error.message)]),
    });
  }
  const add = (pointer, keyword, message) =>
    errors.push(violation(pointer, keyword, message));
  const pointer = (at, key) =>
    `${at}/${String(key).replaceAll("~", "~0").replaceAll("/", "~1")}`;
  // A calendar date must survive a round trip: "2023-02-30" is shaped like a date and is not one.
  const calendar = (text) => {
    const stamp = new Date(`${text}T00:00:00.000Z`);
    return Number.isFinite(stamp.valueOf()) && stamp.toISOString().slice(0, 10) === text;
  };
  const date = (value, withTime) =>
    typeof value === "string" &&
    (withTime
      ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u
      : /^\d{4}-\d{2}-\d{2}$/u
    ).test(value) &&
    calendar(value.slice(0, 10)) &&
    !Number.isNaN(Date.parse(value));
  const same = (left, right) =>
    json.canonicalJson(left) === json.canonicalJson(right);
  const matchesType = (value, type) =>
    type === "null"
      ? value === null
      : type === "boolean"
        ? typeof value === "boolean"
        : type === "string"
          ? typeof value === "string"
          : type === "number"
            ? typeof value === "number"
            : type === "integer"
              ? Number.isInteger(value)
              : type === "array"
                ? Array.isArray(value)
                : type === "object"
                  ? json.isJsonRecord(value)
                  : false;
  const evaluate = (value, node, at, base, stack = new Set()) => {
    if (typeof node === "boolean") {
      if (!node) add(at, "false schema", "instance is refused");
      return;
    }
    if (typeof node.$ref === "string") {
      if (node.$ref === DRAFT_2020_12) {
        // The well-known Draft 2020-12 meta-schema URI is never a document
        // in the caller's explicit corpus; it names the dialect itself. A
        // $ref to it means "this value must itself be a JSON Schema
        // document" -- judged by this engine's own admission rule
        // (assertSchema), not by recursing into a fetched meta-schema.
        try {
          assertSchema({ schema: value, allowUnknownAnnotations: true });
        } catch (error) {
          add(at, "$ref", `value is not a Draft 2020-12 schema: ${error.message}`);
        }
      } else {
        const resolved = resolveSchemaReference({
          reference: node.$ref,
          base,
          schemas: [base, ...schemas],
        });
        if (!resolved.found) {
          add(at, "$ref", `unresolved or external reference ${node.$ref}`);
          return;
        }
        const identity = `${resolved.base ?? ""}\0${node.$ref}\0${at}`;
        if (!stack.has(identity)) {
          const next = new Set(stack);
          next.add(identity);
          evaluate(
            value,
            resolved.schema,
            at,
            resolved.schema.$id ? resolved.schema : base,
            next,
          );
        }
      }
    }
    if (node.type !== undefined) {
      const types = Array.isArray(node.type) ? node.type : [node.type];
      if (
        !types.some(
          (type) => typeof type === "string" && matchesType(value, type),
        )
      )
        add(at, "type", `expected ${types.join(" or ")}`);
    }
    if (node.const !== undefined && !same(value, node.const))
      add(at, "const", "value differs from const");
    if (
      node.enum !== undefined &&
      (!Array.isArray(node.enum) ||
        !node.enum.some((candidate) => same(value, candidate)))
    )
      add(at, "enum", "value is not enumerated");
    if (typeof value === "string") {
      const length = [...value].length;
      if (Number.isInteger(node.minLength) && length < node.minLength)
        add(at, "minLength", "string is shorter than minimum");
      if (Number.isInteger(node.maxLength) && length > node.maxLength)
        add(at, "maxLength", "string is longer than maximum");
      if (
        typeof node.pattern === "string" &&
        !new RegExp(node.pattern, "u").test(value)
      )
        add(at, "pattern", "string does not match pattern");
      if (node.format === "date" && !date(value, false))
        add(at, "format", "string is not a date");
      if (node.format === "date-time" && !date(value, true))
        add(at, "format", "string is not a date-time");
    }
    if (typeof value === "number") {
      for (const [keyword, predicate] of [
        ["minimum", (limit) => value < limit],
        ["maximum", (limit) => value > limit],
        ["exclusiveMinimum", (limit) => value <= limit],
        ["exclusiveMaximum", (limit) => value >= limit],
      ])
        if (typeof node[keyword] === "number" && predicate(node[keyword]))
          add(at, keyword, `number violates ${keyword}`);
      if (
        typeof node.multipleOf === "number" &&
        node.multipleOf > 0 &&
        Math.abs(
          value / node.multipleOf - Math.round(value / node.multipleOf),
        ) > 1e-12
      )
        add(at, "multipleOf", "number is not a multiple");
    }
    if (Array.isArray(value)) {
      if (Number.isInteger(node.minItems) && value.length < node.minItems)
        add(at, "minItems", "array is shorter than minimum");
      if (Number.isInteger(node.maxItems) && value.length > node.maxItems)
        add(at, "maxItems", "array is longer than maximum");
      if (
        node.uniqueItems === true &&
        new Set(value.map(json.canonicalJson)).size !== value.length
      )
        add(at, "uniqueItems", "array has duplicate values");
      let prefixCount = 0;
      if (Array.isArray(node.prefixItems)) {
        prefixCount = node.prefixItems.length;
        node.prefixItems.forEach((prefixSchema, index) => {
          if (index < value.length)
            evaluate(
              value[index],
              schemaNode(prefixSchema),
              pointer(at, index),
              base,
              stack,
            );
        });
      }
      if (node.items !== undefined)
        value.slice(prefixCount).forEach((item, offset) =>
          evaluate(
            item,
            schemaNode(node.items),
            pointer(at, prefixCount + offset),
            base,
            stack,
          ),
        );
      if (
        node.contains !== undefined &&
        !value.some((item) => {
          const before = errors.length;
          evaluate(item, schemaNode(node.contains), at, base, stack);
          const valid = errors.length === before;
          errors.length = before;
          return valid;
        })
      )
        add(at, "contains", "array has no matching item");
    }
    if (json.isJsonRecord(value)) {
      if (
        Number.isInteger(node.minProperties) &&
        Object.keys(value).length < node.minProperties
      )
        add(at, "minProperties", "object has too few properties");
      if (
        Number.isInteger(node.maxProperties) &&
        Object.keys(value).length > node.maxProperties
      )
        add(at, "maxProperties", "object has too many properties");
      if (Array.isArray(node.required))
        for (const key of node.required)
          if (typeof key === "string" && !Object.hasOwn(value, key))
            add(at, "required", `missing required property ${key}`);
      const properties = json.isJsonRecord(node.properties)
        ? node.properties
        : {};
      for (const [key, child] of Object.entries(properties))
        if (Object.hasOwn(value, key))
          evaluate(
            value[key],
            schemaNode(child),
            pointer(at, key),
            base,
            stack,
          );
      if (node.additionalProperties === false) {
        for (const key of Object.keys(value))
          if (!Object.hasOwn(properties, key))
            add(
              pointer(at, key),
              "additionalProperties",
              "property is not allowed",
            );
      } else if (
        node.additionalProperties !== undefined &&
        typeof node.additionalProperties !== "boolean"
      )
        for (const key of Object.keys(value))
          if (!Object.hasOwn(properties, key))
            evaluate(
              value[key],
              schemaNode(node.additionalProperties),
              pointer(at, key),
              base,
              stack,
            );
      if (node.propertyNames !== undefined)
        for (const key of Object.keys(value))
          evaluate(key, schemaNode(node.propertyNames), at, base, stack);
    }
    for (const keyword of ["allOf", "anyOf", "oneOf"])
      if (Array.isArray(node[keyword])) {
        const outcomes = node[keyword].map((child) => {
          const before = errors.length;
          evaluate(value, schemaNode(child), at, base, stack);
          const valid = errors.length === before;
          errors.length = before;
          return valid;
        });
        if (
          (keyword === "allOf" && outcomes.includes(false)) ||
          (keyword === "anyOf" && !outcomes.includes(true)) ||
          (keyword === "oneOf" && outcomes.filter(Boolean).length !== 1)
        )
          add(at, keyword, "composition does not hold");
      }
    if (node.not !== undefined) {
      const before = errors.length;
      evaluate(value, schemaNode(node.not), at, base, stack);
      const valid = errors.length === before;
      errors.length = before;
      if (valid) add(at, "not", "negated schema matched");
    }
    if (node.if !== undefined) {
      const before = errors.length;
      evaluate(value, schemaNode(node.if), at, base, stack);
      const condition = errors.length === before;
      errors.length = before;
      const branch = condition ? node.then : node.else;
      if (branch !== undefined)
        evaluate(value, schemaNode(branch), at, base, stack);
    }
  };
  evaluate(instance, root, "", typeof root === "boolean" ? {} : root);
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
  });
}

