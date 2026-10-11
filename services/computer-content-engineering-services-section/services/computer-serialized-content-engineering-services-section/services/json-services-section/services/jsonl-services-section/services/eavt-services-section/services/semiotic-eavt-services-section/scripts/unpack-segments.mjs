#!/usr/bin/env node
/**
 * Read every packed witness segment of one or more settlement stores back into plain lines a person can
 * read in a text editor (segment-bytes `unpackSegment`), so no log is kept in a binary encoding. A kind
 * directory named by --except is left packed. Roots are home-relative unless absolute.
 *
 *   unpack-segments.mjs --root <settlement>/data/logs [--root ...] [--except <kind>-logs ...] [--dry-run]
 */
import path from "node:path";
import { homedir } from "node:os";
import { parseArgs } from "node:util";
import { dataArtifactFiles } from "@red-cup-engineering/eavt-services-section/data-artifact-listing";
import { packingOf, unpackSegment } from "../src/journal/filesystem/segment-bytes.mjs";
import { journalSegment, settlementRootOfStore } from "../src/journal/store-root.mjs";

const { values } = parseArgs({ options: {
  root: { type: "string", multiple: true }, except: { type: "string", multiple: true, default: [] }, "dry-run": { type: "boolean", default: false },
} });
if (!values.root?.length) throw new Error("usage: unpack-segments.mjs --root <settlement>/data/logs [--except <kind>-logs ...] [--dry-run]");
const except = new Set(values.except);
const summary = { kind: "journal-segment-unpacking.v1", dryRun: values["dry-run"], unpacked: 0, bytes: 0, kept: [], refused: [] };
for (const given of values.root) {
  const root = path.resolve(homedir(), given);
  const dataRoot = settlementRootOfStore(root);
  if (dataRoot === undefined) { summary.refused.push({ file: root, error: `not a settlement's ${journalSegment} store` }); continue; }
  for (const { path: file, directory } of dataArtifactFiles(dataRoot, "log", { match: (name) => name.endsWith(".jsonl.witnesses") })) {
    const packing = packingOf(file);
    if (packing === null) continue;
    if (except.has(path.basename(directory))) { summary.kept.push(path.relative(root, file)); continue; }
    if (values["dry-run"]) { summary.unpacked += 1; summary.bytes += packing.packed; continue; }
    try {
      const result = unpackSegment(file);
      if (!result.unchanged) { summary.unpacked += 1; summary.bytes += result.unpacked; }
    } catch (error) {
      summary.refused.push({ file, error: error instanceof Error ? error.message : String(error) });
    }
  }
}
process.stdout.write(`${JSON.stringify(summary)}\n`);
