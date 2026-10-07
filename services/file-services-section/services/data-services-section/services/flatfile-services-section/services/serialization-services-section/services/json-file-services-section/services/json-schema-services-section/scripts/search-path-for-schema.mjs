#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import * as json from "@red-cup-engineering/json-services-section";
import { lstat, readFile, readdir, realpath, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { admitSchema } from "./admit-schema.mjs";
import { unfoldSchema } from "./unfold-schema.mjs";

import contract from "../schemas/search-path-for-schema.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export async function searchPathForSchema(path) {
  if (typeof path !== "string" || path.length === 0)
    throw new TypeError("path must be nonempty text");
  const requested = resolve(path);
  const root = await realpath(requested);
  if ((await lstat(requested)).isSymbolicLink() || root !== requested)
    throw new TypeError(
      "path must be canonical and must not be a symbolic link",
    );
  const schemas = [],
    refusals = [];
  const candidates = [],
    pending = [root];
  while (pending.length) {
    const path = pending.pop(),
      details = await stat(path);
    if (details.isFile()) {
      candidates.push(path);
      continue;
    }
    if (!details.isDirectory())
      throw new TypeError("path must name a file or directory");
    for (const entry of (await readdir(path, { withFileTypes: true })).sort(
      (a, b) => b.name.localeCompare(a.name),
    )) {
      if (entry.isSymbolicLink()) continue;
      if (
        entry.isDirectory() &&
        ![".git", "node_modules", "dist", "data", "out", "cache"].includes(
          entry.name,
        )
      )
        pending.push(join(path, entry.name));
      else if (entry.isFile() && entry.name.endsWith(".schema.json"))
        candidates.push(join(path, entry.name));
    }
  }
  for (const candidate of candidates.sort()) {
    try {
      const parsed = JSON.parse(await readFile(candidate, "utf8"));
      const receipt = admitSchema({
        schema: parsed,
        allowUnknownAnnotations: true,
      });
      schemas.push(
        Object.freeze({
          path: candidate,
          schema: receipt.schema.$id,
          identity: receipt.identity,
          assertions: unfoldSchema({
            schema: receipt.schema,
            base: receipt.schema.$id,
            time: receipt.identity.sha256,
          }).assertions,
        }),
      );
    } catch (error) {
      refusals.push(Object.freeze({ path: candidate, reason: error.message }));
    }
  }
  return Object.freeze({
    type: "PathSchemaSearch",
    root,
    searched: schemas.length + refusals.length,
    schemas: Object.freeze(schemas),
    refusals: Object.freeze(refusals),
  });
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(
      await searchPathForSchema(JSON.parse(readInput(0, "utf8"))),
    ) + "\n",
  );
