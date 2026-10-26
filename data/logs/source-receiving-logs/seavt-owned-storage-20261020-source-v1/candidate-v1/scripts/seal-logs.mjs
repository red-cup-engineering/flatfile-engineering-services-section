#!/usr/bin/env node
// Seal every SEAVT log day older than --keep-days (default 1, so today and yesterday stay open) under each
// settlement root given: each day becomes compressed segments that read exactly as before (src/sealed-log.mjs).
// --type limits it to the named feeds (repeatable): seal a feed only once every process that reads it carries
// semiotic-eavt-services-section 0.1.2 or later, since an older reader sees a sealed day as absent.
//   seal-seavt-logs [--keep-days N] [--type FEED ...] ROOT...
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { sealLogs } from "../src/store.mjs";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { "keep-days": { type: "string", default: "1" }, type: { type: "string", multiple: true, default: [] } } });
const keep = Number(values["keep-days"]);
if (!Number.isInteger(keep) || keep < 1 || positionals.length === 0) { process.stderr.write("seal-seavt-logs [--keep-days N>=1] [--type FEED ...] ROOT...\n"); process.exit(2); }
const only = new Set(values.type);
const before = new Date(Date.now() - keep * 86_400_000).toISOString().slice(0, 10);
for (const root of positionals) {
  let kinds = [];
  try { kinds = readdirSync(join(root, "data", "logs")).filter((name) => name.endsWith("-logs")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  for (const kind of kinds.filter((name) => only.size === 0 || only.has(name.slice(0, -"-logs".length)))) {
    const sealed = sealLogs(root, kind.slice(0, -"-logs".length), { before });
    for (const segment of sealed) process.stdout.write(`${JSON.stringify({ root, type: kind.slice(0, -"-logs".length), ...segment })}\n`);
  }
}
