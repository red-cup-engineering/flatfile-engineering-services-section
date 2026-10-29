#!/usr/bin/env node
/** Census and conservatively retire pre-SEAVT semantic-record feeds. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { appendSeavt } from "./journal.mjs";
import { asSeavt } from "./row.mjs";

export const RETIRED_FILENAMES = Object.freeze(["semantic-record-content.jsonl", "semantic-record-seavt-claims.jsonl"]);
const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist"]);
const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const RE_ADMISSION_REQUIREMENTS = Object.freeze([
  "ORIGINAL_SOURCE_EVIDENCE",
  "DOMAIN_ADMISSION",
  "CUSTODY_WITNESS",
]);
function filesBelow(root, predicate) {
  const found = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) { if (!IGNORED_DIRECTORIES.has(entry.name)) walk(path); }
      else if (entry.isFile() && predicate(entry.name, path)) found.push(path);
    }
  };
  walk(root); return found.sort();
}
function sourceKind(path) { const parts = path.split(sep); return parts.includes("legacy") ? "legacy" : parts.includes("test") ? "test" : "current"; }
function refusal(rawDigest, reason) {
  return Object.freeze({
    rawDigest,
    status: "refused",
    reason,
    reAdmission: Object.freeze({
      status: "SOURCE_EVIDENCE_REQUIRED",
      requirements: RE_ADMISSION_REQUIREMENTS,
      note: "The raw archive preserves bytes only. Re-admission requires the original supporting source, a domain record kind/schema/category, and a time/custody witness; this retirement process cannot infer any of them.",
    }),
  });
}
function lineInventory(path, root) {
  const bytes = readFileSync(path), rows = [];
  for (const [index, raw] of bytes.toString("utf8").split("\n").entries()) {
    if (raw.length === 0) continue;
    const rawDigest = digest(Buffer.from(raw, "utf8"));
    try {
      const value = JSON.parse(raw);
      try { rows.push(Object.freeze({ line: index + 1, rawDigest, status: "admissible", row: asSeavt(value) })); }
      catch (error) { rows.push(Object.freeze({ line: index + 1, ...refusal(rawDigest, error instanceof Error ? error.message : String(error)) })); }
    } catch (error) { rows.push(Object.freeze({ line: index + 1, ...refusal(rawDigest, `invalid-json: ${error instanceof Error ? error.message : String(error)}`) })); }
  }
  return Object.freeze({ path: relative(root, path), kind: sourceKind(path), bytes: bytes.length, rawDigest: digest(bytes), rows: Object.freeze(rows) });
}
/** A deterministic inventory; it changes neither legacy nor target custody. */
export function inventorySemanticRecordRetirement({ sourceRoot }) {
  const root = resolve(sourceRoot);
  const files = filesBelow(root, (name) => RETIRED_FILENAMES.includes(name)).map((path) => lineInventory(path, root));
  const sourceReferences = filesBelow(root, (name) => /\.(?:mjs|mts|js|ts)$/u.test(name)).filter((path) => path !== new URL(import.meta.url).pathname).flatMap((path) => {
    const text = readFileSync(path, "utf8");
    return RETIRED_FILENAMES.flatMap((filename) => text.includes(filename) ? [Object.freeze({ path: relative(root, path), kind: sourceKind(path), filename })] : []);
  });
  const rows = files.flatMap((file) => file.rows);
  return Object.freeze({ kind: "semantic-record-retirement.inventory@1", sourceRoot: root, retiredFilenames: RETIRED_FILENAMES, files, sourceReferences: Object.freeze(sourceReferences), totals: Object.freeze({ files: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0), rows: rows.length, admissible: rows.filter((row) => row.status === "admissible").length, refused: rows.filter((row) => row.status === "refused").length, sourceReferences: sourceReferences.length }) });
}
function writeOnce(path, body) {
  if (existsSync(path)) { if (!readFileSync(path).equals(body)) throw new Error(`retirement evidence collision at ${path}`); return false; }
  mkdirSync(dirname(path), { recursive: true }); const temporary = `${path}.${process.pid}.tmp`; writeFileSync(temporary, body); renameSync(temporary, path); return true;
}
/** Copy raw legacy bytes, append only valid SEAVT, and never delete a source. */
export function replaySemanticRecordRetirement({ sourceRoot, targetRoot }) {
  const inventory = inventorySemanticRecordRetirement({ sourceRoot }), target = resolve(targetRoot); let appended = 0; const archived = [];
  for (const file of inventory.files) {
    const archivePath = join(target, "data", "records", "semantic-record-retirement", `${file.rawDigest.slice(7)}.jsonl`);
    archived.push(Object.freeze({ source: file.path, archive: relative(target, archivePath), rawDigest: file.rawDigest }));
    writeOnce(archivePath, readFileSync(join(inventory.sourceRoot, file.path)));
    for (const row of file.rows) if (row.status === "admissible") appended += appendSeavt(target, "witness-journal-seavt", [row.row], row.row.t).appended;
  }
  const refusals = Object.freeze(inventory.files.flatMap((file) => file.rows.filter((row) => row.status === "refused").map((row) => Object.freeze({ source: file.path, line: row.line, rawDigest: row.rawDigest, reason: row.reason, reAdmission: row.reAdmission }))));
  // The persisted receipt excludes effect observations such as `appended`, so
  // identical source bytes always yield one content-addressed retirement plan.
  const receipt = Object.freeze({ kind: "semantic-record-retirement.replay@2", inventory, targetRoot: target, archived: Object.freeze(archived), refusals, deletionAuthorized: false });
  const receiptPath = join(target, "data", "records", "semantic-record-retirement", `${digest(Buffer.from(json(receipt))).slice(7)}.json`);
  writeOnce(receiptPath, Buffer.from(json(receipt)));
  return Object.freeze({ ...receipt, appended, receipt: relative(target, receiptPath) });
}
