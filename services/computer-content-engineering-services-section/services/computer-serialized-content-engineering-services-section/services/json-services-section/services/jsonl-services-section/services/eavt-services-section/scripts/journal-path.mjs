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
import { dataArtifactAddress } from "../src/data-artifact-address.mjs";

/** A plain EAVT feed's file: the log tier's address of `feed` on the date `at` names
 *  (`data/logs/<feed>-logs/<date>.jsonl`), derived from the one tier law. */
export function journalPath({ root, feed, at } = {}) {
  if (typeof root !== "string" || root === "")
    throw new TypeError("EAVT journal root must be a nonempty string");
  if (typeof feed !== "string" || feed === "")
    throw new TypeError("EAVT journal feed must be a nonempty string");
  const text = typeof at === "string" ? at : canonicalJson(at);
  return path.normalize(dataArtifactAddress({ root, tier: "log", encoding: "jsonl", at: text, action: feed, subject: feed }).path);
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(journalPath(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
