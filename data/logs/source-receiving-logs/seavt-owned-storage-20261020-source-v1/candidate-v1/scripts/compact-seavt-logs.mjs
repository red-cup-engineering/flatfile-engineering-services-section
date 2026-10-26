#!/usr/bin/env node
// compact-seavt-logs [--remove] [--feed FEED ...] ROOT...
//   Rewrite the SEN-spine JSONL day files of ROOT/data/logs/*-seavt-logs as sealed compact-carrier segments.
//   Every row is verified to read back term-equal, and each segment is read back line for line, before the source
//   is touched. Without --remove nothing is deleted: earlier-named sources get a .compacted receipt and
//   <date>.jsonl is renamed <date>.jsonl.legacy. With --remove the verified source is deleted.
//   Prints one JSON report line per file, then a before/after total per root.
import { parseArgs } from "node:util";
import { compactRoot } from "../src/compact-logs.mjs";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { remove: { type: "boolean" }, feed: { type: "string", multiple: true } } });
if (positionals.length === 0) { process.stderr.write("compact-seavt-logs [--remove] [--feed FEED ...] ROOT...\n"); process.exit(2); }
let failed = false;
for (const root of positionals) {
  const reports = await compactRoot(root, { remove: values.remove, feeds: values.feed, log: (r) => process.stdout.write(`${JSON.stringify({ root, ...r })}\n`) });
  const done = reports.filter((r) => r.status === "converted");
  const sum = (key) => done.reduce((n, r) => n + r[key], 0);
  failed ||= reports.some((r) => r.status.startsWith("skipped"));
  process.stdout.write(`${JSON.stringify({ root, files: done.length, rows: sum("rows"), through: sum("through"), before: sum("before"), after: sum("after"), skipped: reports.filter((r) => r.status.startsWith("skipped")).length })}\n`);
}
process.exit(failed ? 3 : 0);
