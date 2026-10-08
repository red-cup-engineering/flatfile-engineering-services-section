#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { feedLogDirFor } from "./feed-log-directory.mjs";
export const inputSchema = {
  type: "object",
  required: ["root", "at"],
  properties: { root: { type: "string", minLength: 1 }, at: {} },
  additionalProperties: false,
};
export const outputSchema = { type: "array", items: { type: "string" } };
export function listFeedsAt({ root, at }) {
  const directory = feedLogDirFor({ root, at });
  try {
    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl"))
      .map((entry) => entry.name.slice(0, -6))
      .sort();
  } catch {
    return [];
  }
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(listFeedsAt(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
