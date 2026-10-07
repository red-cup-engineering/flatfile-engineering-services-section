#!/usr/bin/env node
import { readFileSync as readCarrierInput } from "node:fs";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { normalizeSeavtRow } from "./normalize-seavt-row.mjs";
import { sha256Digest, sha256Hex } from "@red-cup-engineering/cryptographic-data-service/integrity";
export const RETIRED_FILENAMES = Object.freeze([
  "semantic-record-content.jsonl",
  "semantic-record-seavt-claims.jsonl",
]);
const ignored = new Set([".git", "node_modules", "dist"]),
  digest = (bytes) =>
    sha256Digest(bytes),
  requirements = Object.freeze([
    "ORIGINAL_SOURCE_EVIDENCE",
    "DOMAIN_ADMISSION",
    "CUSTODY_WITNESS",
  ]);
export const inputSchema = {
  type: "object",
  properties: { sourceRoot: { type: "string", minLength: 1 } },
  required: ["sourceRoot"],
  additionalProperties: false,
};
export const outputSchema = { type: "object" };
export function inventorySemanticRecordRetirement({ sourceRoot } = {}) {
  const root = resolve(sourceRoot),
    filesBelow = (directory, predicate) => {
      const found = [];
      const walk = (folder) => {
        for (const entry of readdirSync(folder, { withFileTypes: true })) {
          const path = join(folder, entry.name);
          if (entry.isDirectory()) {
            if (!ignored.has(entry.name)) walk(path);
          } else if (entry.isFile() && predicate(entry.name, path))
            found.push(path);
        }
      };
      walk(directory);
      return found.sort();
    },
    refusal = (rawDigest, reason) =>
      Object.freeze({
        rawDigest,
        status: "refused",
        reason,
        reAdmission: Object.freeze({
          status: "SOURCE_EVIDENCE_REQUIRED",
          requirements,
          note: "The raw archive preserves bytes only. Re-admission requires the original supporting source, a domain record kind/schema/category, and a time/custody witness; this retirement process cannot infer any of them.",
        }),
      }),
    inventoryPath = (path) => {
      const bytes = readFileSync(path),
        rows = [];
      for (const [index, raw] of bytes.toString("utf8").split("\n").entries()) {
        if (!raw) continue;
        const rawDigest = digest(Buffer.from(raw, "utf8"));
        try {
          const value = JSON.parse(raw);
          try {
            rows.push(
              Object.freeze({
                line: index + 1,
                rawDigest,
                status: "admissible",
                row: normalizeSeavtRow(value),
              }),
            );
          } catch (error) {
            rows.push(
              Object.freeze({
                line: index + 1,
                ...refusal(
                  rawDigest,
                  error instanceof Error ? error.message : String(error),
                ),
              }),
            );
          }
        } catch (error) {
          rows.push(
            Object.freeze({
              line: index + 1,
              ...refusal(
                rawDigest,
                `invalid-json: ${error instanceof Error ? error.message : String(error)}`,
              ),
            }),
          );
        }
      }
      return Object.freeze({
        path: relative(root, path),
        kind: path.split(sep).includes("legacy")
          ? "legacy"
          : path.split(sep).includes("test")
            ? "test"
            : "current",
        bytes: bytes.length,
        rawDigest: digest(bytes),
        rows: Object.freeze(rows),
      });
    },
    files = filesBelow(root, (name) => RETIRED_FILENAMES.includes(name)).map(
      inventoryPath,
    ),
    sourceReferences = filesBelow(root, (name) =>
      /\.(?:mjs|mts|js|ts)$/u.test(name),
    )
      .filter((path) => path !== new URL(import.meta.url).pathname)
      .flatMap((path) => {
        const text = readFileSync(path, "utf8"),
          kind = path.split(sep).includes("legacy")
            ? "legacy"
            : path.split(sep).includes("test")
              ? "test"
              : "current";
        return RETIRED_FILENAMES.flatMap((filename) =>
          text.includes(filename)
            ? [Object.freeze({ path: relative(root, path), kind, filename })]
            : [],
        );
      }),
    rows = files.flatMap((file) => file.rows);
  return Object.freeze({
    kind: "semantic-record-retirement.inventory@1",
    sourceRoot: root,
    retiredFilenames: RETIRED_FILENAMES,
    files,
    sourceReferences: Object.freeze(sourceReferences),
    totals: Object.freeze({
      files: files.length,
      bytes: files.reduce((sum, file) => sum + file.bytes, 0),
      rows: rows.length,
      admissible: rows.filter((row) => row.status === "admissible").length,
      refused: rows.filter((row) => row.status === "refused").length,
      sourceReferences: sourceReferences.length,
    }),
  });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(
      inventorySemanticRecordRetirement(
        JSON.parse(readCarrierInput(0, "utf8")),
      ),
    ) + "\n",
  );
