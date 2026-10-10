#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { admitSchema } from "./admit-schema.mjs";

import contract from "../schemas/read-schema-pool.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;

/** Nearest-first search upward from `start` for `<directory>/<shape>`; never downward, so one unit's private answer cannot capture a question asked outside it. */
export function findUp(start, shape) {
  let directory = resolve(start);
  for (;;) {
    const candidate = join(directory, shape);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

/** The schema pool a caller means: the nearest lib/schemas above `from`, and only where that finds nothing, the nearest above `near` (the calling script's own location). */
export function discoverSchemaPool({ from = process.cwd(), near } = {}) {
  return findUp(from, "lib/schemas") ?? (near === undefined ? null : findUp(near, "lib/schemas"));
}

const describe = (error) => (error instanceof Error ? error.message : String(error));

/**
 * Read every `*.schema.json` in one explicit directory, sorted by file name. A file that is not JSON
 * or not an admitted schema is reported as a refusal beside the records that did read; nothing here
 * decides whether a refusal is fatal (readSchemaPool refuses at the first, the pool inspector reports all).
 */
export function scanSchemaPool({ pool }) {
  if (typeof pool !== "string" || !pool)
    throw new TypeError("pool must be a path");
  const directory = resolve(pool);
  const records = [], refusals = [];
  for (const name of readdirSync(directory).filter((entry) => entry.endsWith(".schema.json")).sort()) {
    const path = join(directory, name);
    let parsed;
    try { parsed = JSON.parse(readFileSync(path, "utf8")); }
    catch (error) { refusals.push({ name, path, reason: `${name} is not valid JSON: ${describe(error)}` }); continue; }
    try { records.push({ name, path, schema: admitSchema({ schema: parsed, allowUnknownAnnotations: true }).schema }); }
    catch (error) { refusals.push({ name, path, reason: `${name} is not an admitted schema: ${describe(error)}` }); }
  }
  return { records, refusals };
}

export function readSchemaPool({ pool }) {
  const { records, refusals } = scanSchemaPool({ pool });
  if (refusals.length > 0) throw new TypeError(refusals[0].reason);
  return { records };
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(await readSchemaPool(JSON.parse(readInput(0, "utf8")))) +
      "\n",
  );
