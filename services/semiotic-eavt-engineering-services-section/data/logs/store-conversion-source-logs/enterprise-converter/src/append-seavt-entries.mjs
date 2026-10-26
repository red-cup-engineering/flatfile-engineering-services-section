#!/usr/bin/env node
import { readFileSync as readCarrierInput } from "node:fs";
import { appendEavtEntries } from "@red-cup-engineering/eavt-services-section/append-eavt-entries";
import { normalizeSeavtRow } from "./normalize-seavt-row.mjs";
export const inputSchema = {
  type: "object",
  properties: {
    root: { type: "string", minLength: 1 },
    feed: { type: "string", minLength: 1 },
    entries: {
      type: "array",
      items: {
        oneOf: [
          {
            type: "object",
            properties: {
              e: { type: "array" },
              a: { type: "array" },
              v: { type: "array" },
              t: {},
            },
            required: ["e", "a", "v", "t"],
            additionalProperties: false,
          },
          { type: "array", minItems: 4, maxItems: 4 },
        ],
      },
    },
    at: {},
  },
  required: ["root", "feed", "entries", "at"],
  additionalProperties: false,
};
export const outputSchema = {
  type: "object",
  properties: {
    path: { type: "string", minLength: 1 },
    appended: { type: "integer", minimum: 0 },
  },
  required: ["path", "appended"],
  additionalProperties: false,
};
export function appendSeavtEntries({ root, feed, entries, at } = {}) {
  if (!Array.isArray(entries))
    throw new TypeError("SEAVT entries must be an array");
  return appendEavtEntries({
    root,
    feed,
    entries: entries.map(normalizeSeavtRow),
    at,
  });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(
      appendSeavtEntries(JSON.parse(readCarrierInput(0, "utf8"))),
    ) + "\n",
  );
