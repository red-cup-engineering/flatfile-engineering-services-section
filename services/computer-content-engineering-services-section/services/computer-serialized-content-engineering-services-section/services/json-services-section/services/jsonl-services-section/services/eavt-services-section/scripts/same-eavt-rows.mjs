#!/usr/bin/env node
const { readFileSync } = globalThis.process?.getBuiltinModule?.("node:fs") ?? {};
export const inputSchema = {
  type: "object",
  properties: {
    left: {
      oneOf: [
        {
          type: "object",
          required: ["e", "a", "v", "t"],
          properties: { e: {}, a: {}, v: {}, t: {} },
          additionalProperties: false,
        },
        { type: "array", minItems: 4, maxItems: 4 },
      ],
    },
    right: {
      oneOf: [
        {
          type: "object",
          required: ["e", "a", "v", "t"],
          properties: { e: {}, a: {}, v: {}, t: {} },
          additionalProperties: false,
        },
        { type: "array", minItems: 4, maxItems: 4 },
      ],
    },
  },
  required: ["left", "right"],
  additionalProperties: false,
};
export const outputSchema = { type: "boolean" };
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical";
import { normalizeEavtRow } from "./normalize-row.mjs";
/** Test canonical equality of two EAVT row spellings. */
export function sameEavtRows({ left, right } = {}) {
  return (
    canonicalJson(normalizeEavtRow(left)) ===
    canonicalJson(normalizeEavtRow(right))
  );
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(sameEavtRows(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
