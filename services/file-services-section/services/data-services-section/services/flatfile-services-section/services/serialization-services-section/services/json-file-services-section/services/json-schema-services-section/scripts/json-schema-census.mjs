#!/usr/bin/env node
import { readFileSync, readdirSync, lstatSync } from "node:fs";
import { resolve, relative } from "node:path";
import { censusSchemaArtifacts } from "./census-schema-artifacts.mjs";
export const inputSchema = {
  type: "object",
  required: ["root"],
  properties: {
    root: { type: "string" },
    maxBytes: { type: "integer", minimum: 1 },
    maxFiles: { type: "integer", minimum: 1 },
  },
};
export const outputSchema = {
  type: "object",
  required: ["entries", "counts", "roleCounts"],
};
export function censusSchemaPath({
  root,
  maxBytes = 33554432,
  maxFiles = 20000,
}) {
  if (typeof root !== "string" || !root.startsWith("/"))
    throw new TypeError("root must be an explicit absolute path");
  const base = resolve(root),
    pending = [base],
    entries = [];
  let bytes = 0;
  while (pending.length) {
    const dir = pending.pop();
    for (const name of readdirSync(dir).sort()) {
      if (
        [
          ".git",
          "node_modules",
          ".venv",
          ".pnpm-store",
          ".tmp",
          "dist",
          "runtime-images",
        ].includes(name)
      )
        continue;
      const path = resolve(dir, name),
        info = lstatSync(path);
      if (info.isSymbolicLink()) continue;
      if (info.isDirectory()) {
        pending.push(path);
        continue;
      }
      if (!/\.(?:json|[cm]?[jt]s|md|rml|txt)$/u.test(name)) continue;
      bytes += info.size;
      if (bytes > maxBytes || entries.length >= maxFiles)
        throw new RangeError("schema census exceeds maxBytes or maxFiles");
      entries.push({
        path: relative(base, path),
        content: readFileSync(path, "utf8"),
      });
    }
  }
  return censusSchemaArtifacts({ entries });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(censusSchemaPath(JSON.parse(readFileSync(0, "utf8")))) +
      "\n",
  );
