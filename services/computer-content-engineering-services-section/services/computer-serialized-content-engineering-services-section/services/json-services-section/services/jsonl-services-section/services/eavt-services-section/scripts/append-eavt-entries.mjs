#!/usr/bin/env node
export const inputSchema = {
  type: "object",
  properties: {
    root: { type: "string", minLength: 1 },
    feed: { type: "string", minLength: 1 },
    at: {},
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
  required: ["root", "feed", "at", "entries"],
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
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical";
import { journalPath } from "./journal-path.mjs";
import { normalizeEavtRow } from "./normalize-row.mjs";
import { readEavtEntries } from "./read-eavt-entries.mjs";
/** Append only EAVT rows absent from the dated JSONL journal. */
export function appendEavtEntries({ root, feed, entries, at } = {}) {
  if (!Array.isArray(entries)) throw new TypeError("entries must be an array");
  const path = journalPath({ root, feed, at }),
    known = new Set(readEavtEntries({ path }).map(canonicalJson)),
    fresh = [];
  for (const value of entries) {
    const row = normalizeEavtRow(value),
      key = canonicalJson(row);
    if (!known.has(key)) {
      known.add(key);
      fresh.push(row);
    }
  }
  if (fresh.length) {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${fresh.map(canonicalJson).join("\n")}\n`, "utf8");
  }
  return Object.freeze({ path, appended: fresh.length });
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(appendEavtEntries(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
