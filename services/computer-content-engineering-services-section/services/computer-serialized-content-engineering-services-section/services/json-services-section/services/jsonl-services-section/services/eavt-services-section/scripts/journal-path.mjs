#!/usr/bin/env node
export const inputSchema = {
  type: "object",
  properties: {
    root: { type: "string", minLength: 1 },
    feed: { type: "string", minLength: 1 },
    at: {},
  },
  required: ["root", "feed", "at"],
  additionalProperties: false,
};
export const outputSchema = { type: "string", minLength: 1 };
import { readFileSync } from "node:fs";
import path from "node:path";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical";

export function journalPath({ root, feed, at } = {}) {
  if (typeof root !== "string" || root === "")
    throw new TypeError("EAVT journal root must be a nonempty string");
  if (typeof feed !== "string" || feed === "")
    throw new TypeError("EAVT journal feed must be a nonempty string");
  const text = typeof at === "string" ? at : canonicalJson(at),
    date = /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "0000-00-00";
  return path.join(root, "data", "logs", ...date.split("-"), `${feed}.jsonl`);
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(journalPath(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
