#!/usr/bin/env node
import { readFileSync as readCarrierInput } from "node:fs";
import { validateSchemaInstance } from "@red-cup-engineering/json-schema-services-section/validate-schema-instance";
import { recordSemanticRecord } from "./record-semantic-record.mjs";
export const inputSchema = {
  type: "object",
  properties: {
    root: { type: "string", minLength: 1 },
    objectKind: { type: "string", minLength: 1 },
    category: { type: "string", minLength: 1 },
    record: {},
    recordedAt: {},
    told: {
      type: "object",
      properties: {
        for: { type: "boolean" },
        against: { type: "boolean" },
      },
      required: ["for", "against"],
      additionalProperties: false,
    },
    relation: {
      type: "object",
      properties: { subject: {}, predicate: {}, object: {} },
      required: ["subject", "predicate", "object"],
      additionalProperties: false,
    },
    schema: { anyOf: [{ type: "object" }, { type: "boolean" }] },
  },
  required: [
    "root",
    "objectKind",
    "category",
    "record",
    "recordedAt",
    "told",
    "schema",
  ],
  additionalProperties: false,
};
export const outputSchema = { type: "object" };
export function recordAdmittedSemanticRecord(request = {}) {
  const admission = validateSchemaInstance({
    instance: request.record,
    schema: request.schema,
  });
  if (!admission.ok)
    return Object.freeze({
      refused: "INVALID_SEMANTIC_RECORD",
      errors: Object.freeze(admission.errors),
    });
  for (const field of ["root", "objectKind", "category", "recordedAt"])
    if (typeof request[field] !== "string" || !request[field])
      throw new TypeError(`Semantic record journal ${field} is required`);
  if (
    !request.told ||
    Object.getPrototypeOf(request.told) !== Object.prototype ||
    typeof request.told.for !== "boolean" ||
    typeof request.told.against !== "boolean"
  )
    throw new TypeError(
      "Semantic record journal told requires independent for and against booleans",
    );
  if (
    request.relation !== undefined &&
    (!request.relation ||
      Object.getPrototypeOf(request.relation) !== Object.prototype ||
      !["subject", "predicate", "object"].every((key) =>
        Object.hasOwn(request.relation, key),
      ))
  )
    throw new TypeError(
      "Semantic record journal relation requires subject, predicate, and object",
    );
  return recordSemanticRecord(request);
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(
      recordAdmittedSemanticRecord(JSON.parse(readCarrierInput(0, "utf8"))),
    ) + "\n",
  );
