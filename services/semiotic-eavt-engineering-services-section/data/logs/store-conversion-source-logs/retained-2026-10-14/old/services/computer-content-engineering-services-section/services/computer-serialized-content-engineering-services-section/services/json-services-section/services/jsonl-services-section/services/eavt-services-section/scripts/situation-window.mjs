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
    since: {},
    until: {},
  },
  required: ["entries"],
  additionalProperties: false,
};
export const outputSchema = {
  type: "array",
  items: {
    type: "object",
    required: ["e", "a", "v", "t"],
    properties: { e: {}, a: {}, v: {}, t: {} },
    additionalProperties: false,
  },
};
import { readFileSync } from "node:fs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical";
import { normalizeEavtRow } from "./normalize-row.mjs";
/** Select normalized EAVT rows inside an inclusive canonical-time window. */
export function situationWindow({ entries, since, until } = {}) {
  if (!Array.isArray(entries)) throw new TypeError("entries must be an array");
  const low = since === undefined ? undefined : canonicalJson(since),
    high = until === undefined ? undefined : canonicalJson(until);
  return Object.freeze(
    entries.map(normalizeEavtRow).filter((row) => {
      const time = canonicalJson(row.t);
      return (
        !(low !== undefined && time < low) &&
        !(high !== undefined && time > high)
      );
    }),
  );
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(situationWindow(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
