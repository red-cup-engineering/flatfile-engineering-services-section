#!/usr/bin/env node
import { resolveSchemaPointer } from "@red-cup-engineering/json-schema-services-section/resolve-schema-pointer";
import { readFileSync as readCarrierInput } from "node:fs";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { querySemanticRecords } from "./query-semantic-records.mjs";
export const inputSchema = {
  type: "object",
  properties: {
    sourceRoot: { type: "string", minLength: 1 },
    journalRoot: { type: "string", minLength: 1 },
    objectKind: { type: "string", minLength: 1 },
    category: { type: "string", minLength: 1 },
    referencePointer: { type: "string" },
    recursive: { type: "boolean" },
    requiredWhen: {
      type: "object",
      properties: { pointer: { type: "string" }, defaultValue: {}, equals: {} },
      required: ["pointer", "equals"],
      additionalProperties: false,
    },
  },
  required: [
    "sourceRoot",
    "journalRoot",
    "objectKind",
    "category",
    "referencePointer",
  ],
  additionalProperties: false,
};
export const outputSchema = { type: "object" };
export function checkConfiguredSemanticRecordReferences(configuration = {}) {
  const pointer = (document, pointer) => {
      try {
        const resolved = resolveSchemaPointer({ document, pointer });
        return resolved.found ? resolved.value : null;
      } catch {
        return null;
      }
    },
    jsonFiles = (root, recursive = false) =>
      !existsSync(root)
        ? []
        : readdirSync(root, { withFileTypes: true })
            .flatMap((item) => {
              const path = join(root, item.name);
              return item.isDirectory()
                ? recursive
                  ? jsonFiles(path, true)
                  : []
                : item.isFile() && item.name.endsWith(".json")
                  ? [path]
                  : [];
            })
            .sort(),
    sourceRoot = resolve(configuration.sourceRoot),
    known = new Set(
      querySemanticRecords({
        root: resolve(configuration.journalRoot),
        objectKind: configuration.objectKind,
        category: configuration.category,
      }).map((record) => record.id),
    ),
    failures = [],
    paths = jsonFiles(sourceRoot, configuration.recursive === true);
  for (const path of paths) {
    const value = JSON.parse(readFileSync(path, "utf8")),
      reference = pointer(value, configuration.referencePointer);
    if (typeof reference === "string" && !known.has(reference))
      failures.push({
        path,
        reason: `reference ${JSON.stringify(reference)} names no admitted record`,
      });
    if (
      configuration.requiredWhen &&
      (pointer(value, configuration.requiredWhen.pointer) ??
        configuration.requiredWhen.defaultValue) !==
        configuration.requiredWhen.equals &&
      reference === null
    )
      failures.push({
        path,
        reason: `reference at ${configuration.referencePointer} is required`,
      });
  }
  return failures.length
    ? {
        ok: false,
        refused: "DANGLING_OR_MISSING_SEMANTIC_RECORD_REFERENCE",
        rows: failures,
      }
    : { ok: true, rowsChecked: paths.length };
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(
      checkConfiguredSemanticRecordReferences(
        JSON.parse(readCarrierInput(0, "utf8")),
      ),
    ) + "\n",
  );
