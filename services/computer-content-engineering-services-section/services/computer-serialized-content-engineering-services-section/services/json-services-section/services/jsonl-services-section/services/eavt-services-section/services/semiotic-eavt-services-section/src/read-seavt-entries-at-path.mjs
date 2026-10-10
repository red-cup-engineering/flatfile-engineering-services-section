#!/usr/bin/env node
import { readFileSync as readCarrierInput } from "node:fs";
import { readEavtEntries } from "@red-cup-engineering/eavt-services-section/read-eavt-entries";
import { normalizeSeavtRow } from "./normalize-seavt-row.mjs";
export const inputSchema = {
  type: "object",
  properties: { path: { type: "string", minLength: 1 } },
  required: ["path"],
  additionalProperties: false,
};
export const outputSchema = {
  type: "array",
  items: {
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
};
export function readSeavtEntriesAtPath({ path } = {}) {
  return Object.freeze(readEavtEntries({ path }).map(normalizeSeavtRow));
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(
      readSeavtEntriesAtPath(JSON.parse(readCarrierInput(0, "utf8"))),
    ) + "\n",
  );
