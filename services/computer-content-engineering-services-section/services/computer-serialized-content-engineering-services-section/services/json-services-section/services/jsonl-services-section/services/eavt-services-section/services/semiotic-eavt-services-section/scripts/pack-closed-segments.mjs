#!/usr/bin/env node
/**
 * Pack every closed day's witness segments in one or more settlement journal stores (src/journal/filesystem/
 * segment-bytes.mjs): a day `--keep-days` or more days past (UTC) no longer grows, so its segments are
 * kept as seekable zstd frames and their plain bytes freed. Today's feeds stay plain for their writers.
 * Index files are never packed. Roots are home-relative unless absolute.
 *
 *   pack-closed-segments.mjs --root <settlement>/data/logs [--root ...] [--keep-days 1] [--min-bytes 1048576]
 */
import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { parseArgs } from "node:util";
import { dataArtifactFiles } from "@red-cup-engineering/eavt-services-section/data-artifact-listing";
import { packSegment } from "../src/journal/filesystem/segment-bytes.mjs";
import { isStoreArea, journalSegment, settlementRootOfStore } from "../src/journal/store-root.mjs";

const { values } = parseArgs({ options: {
  root: { type: "string", multiple: true }, "keep-days": { type: "string", default: "1" }, "min-bytes": { type: "string", default: String(1 << 20) },
} });
if (!values.root?.length) throw new Error("usage: pack-closed-segments.mjs --root <settlement>/data/logs [--keep-days 1]");
const keepDays = Number(values["keep-days"]), minBytes = Number(values["min-bytes"]);
const closedBefore = new Date(Date.now() - keepDays * 86_400_000).toISOString().slice(0, 10);
const startedAt = Date.now();
const summary = { kind: "journal-segment-packing.v1", closedBefore, packed: 0, unchanged: 0, plainBytes: 0, packedBytes: 0, refused: [] };
for (const given of values.root) {
  const root = path.resolve(homedir(), given);
  const dataRoot = settlementRootOfStore(root);
  if (dataRoot === undefined) { summary.refused.push({ file: root, error: `not a settlement's ${journalSegment} store` }); continue; }
  for (const { path: file, directory, date } of dataArtifactFiles(dataRoot, "log", { match: (name) => name.endsWith(".jsonl.witnesses") })) {
    if (isStoreArea(path.basename(directory)) || date === undefined || date >= closedBefore) continue;
    if (fs.statSync(file).size < minBytes) continue;
    try {
      const result = packSegment(file);
      if (result.unchanged) { summary.unchanged += 1; continue; }
      summary.packed += 1;
      summary.plainBytes += result.packed;
      summary.packedBytes += result.size;
    } catch (error) {
      summary.refused.push({ file, error: error instanceof Error ? error.message : String(error) });
    }
  }
}
summary.seconds = Math.round((Date.now() - startedAt) / 1000);
process.stdout.write(`${JSON.stringify(summary)}\n`);
if (summary.refused.length > 0) process.exitCode = 1;
