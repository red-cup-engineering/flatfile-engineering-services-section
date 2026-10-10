#!/usr/bin/env node
export const inputSchema = {
  type: "object",
  properties: {
    path: { type: "string", minLength: 1 },
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
  required: ["path", "entries"],
  additionalProperties: false,
};
export const outputSchema = {
  type: "object",
  properties: {
    path: { type: "string", minLength: 1 },
    entries: { type: "integer", minimum: 0 },
    bytes: { type: "integer", minimum: 0 },
  },
  required: ["path", "entries", "bytes"],
  additionalProperties: false,
};
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical";
import { normalizeEavtRow } from "./normalize-row.mjs";
import { writeFileTextSync } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
/** Atomically replace one EAVT JSONL journal with normalized rows. */
export function writeEavtEntries({ path, entries } = {}) {
  if (typeof path !== "string" || path === "" || !Array.isArray(entries))
    throw new TypeError("write requires {path, entries}");
  const rows = entries.map(normalizeEavtRow),
    text = rows.length ? `${rows.map(canonicalJson).join("\n")}\n` : "";
  writeFileTextSync(path, text);
  return Object.freeze({
    path,
    entries: rows.length,
    bytes: Buffer.byteLength(text),
  });
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(writeEavtEntries(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
