#!/usr/bin/env node
import * as json from "@red-cup-engineering/json-services-section";
import { freezeJson } from "@red-cup-engineering/json-services-section";

import contract from "../schemas/census-schema-artifacts.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function censusSchemaArtifacts(input) {
  const request = json.requireJsonValue(input);
  if (!json.isJsonRecord(request))
    throw new TypeError("request must be an object");
  if (!Array.isArray(request.entries))
    throw new TypeError("entries must be an array");
  const entries = request.entries
    .map((entry) => {
      const item = entry;
      if (!json.isJsonRecord(item))
        throw new TypeError("census entry must be an object");
      if (typeof item.path !== "string" || typeof item.content !== "string")
        throw new TypeError("census entries require path and content text");
      const archived =
        /(?:^|\/)(?:legacy|_archive|archive|retired-carriers|content\/assets\/legacy)(?:\/|$)/u.test(
          item.path,
        );
      const schemaDocument = item.path.endsWith(".schema.json");
      const implementation =
        /\.(?:[cm]?[jt]s)$/u.test(item.path) &&
        /(?:validateSchemaInstance|admitSchema|resolveSchemaReference|censusSchemaArtifacts|transformSchemaAssertions)/u.test(
          item.content,
        );
      const kind = schemaDocument
        ? archived
          ? "legacy-schema-document"
          : "schema-document"
        : implementation
          ? archived
            ? "legacy-implementation"
            : "schema-implementation"
          : "other";
      const role = schemaDocument
        ? "schema-document"
        : implementation
          ? "implementation"
          : /(?:^|\/)test(?:\/|$)|\.test\.[cm]?[jt]s$/u.test(item.path)
            ? "test"
            : /\.(?:md|rml|txt)$/u.test(item.path)
              ? "documentation"
              : item.path.endsWith("package.json")
                ? "package"
                : "other";
      return Object.freeze({
        path: item.path,
        kind,
        role,
        generation: archived ? "legacy" : "current",
        dialect:
          /["']\$schema["']\s*:\s*["']([^"']+)["']/u.exec(item.content)?.[1] ??
          null,
        recoveryDisposition: archived
          ? "retain-as-evidence"
          : schemaDocument
            ? "live-schema-law"
            : implementation
              ? "canonical-owner"
              : null,
      });
    })
    .sort((left, right) => left.path.localeCompare(right.path));
  const counts = {
    "schema-document": 0,
    "schema-implementation": 0,
    "legacy-schema-document": 0,
    "legacy-implementation": 0,
    other: 0,
  };
  const roleCounts = {
    "schema-document": 0,
    implementation: 0,
    test: 0,
    documentation: 0,
    package: 0,
    other: 0,
  };
  for (const entry of entries) {
    counts[entry.kind] += 1;
    roleCounts[entry.role] += 1;
  }
  return Object.freeze({
    entries: Object.freeze(entries),
    counts: Object.freeze(counts),
    roleCounts: Object.freeze(roleCounts),
  });
}

