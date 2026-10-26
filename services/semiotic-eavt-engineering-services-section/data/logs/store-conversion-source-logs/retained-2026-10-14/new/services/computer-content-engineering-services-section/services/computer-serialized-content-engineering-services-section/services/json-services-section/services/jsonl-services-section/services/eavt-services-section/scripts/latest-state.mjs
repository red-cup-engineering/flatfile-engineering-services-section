#!/usr/bin/env node
export const inputSchema = {
  type: "object",
  properties: {
    entries: {
      type: "array",
      items: {
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
  },
  required: ["entries"],
  additionalProperties: false,
};
export const outputSchema = { type: "object" };
import { readFileSync } from "node:fs";
import { normalizeEavtRow } from "./normalize-row.mjs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical";

export function latestState({ entries } = {}) {
  if (!Array.isArray(entries))
    throw new TypeError("EAVT state entries must be an array");
  const cells = new Map();
  for (const value of entries) {
    const row = normalizeEavtRow(value),
      key = canonicalJson([row.e, row.a]),
      prior = cells.get(key);
    if (!prior || canonicalJson(row.t) > canonicalJson(prior.time))
      cells.set(key, { e: row.e, a: row.a, value: row.v, time: row.t });
  }
  return Object.freeze(
    Object.fromEntries(
      [...cells].map(([key, value]) => [key, Object.freeze(value)]),
    ),
  );
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(latestState(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
