#!/usr/bin/env node
// seavt-volume ROOT [--no-rows] [--json] [--top N] [--feed FEED ...] [--since DATE]
//   Per feed per day: rows, raw bytes, stored bytes and ratio; then the feeds by stored bytes.
// seavt-volume ROOT --check [--feed FEED ...] [--since DATE] [--stale-days N]
//   Exit 1 when a feed-day wrote more raw bytes than its budget (data/state/log-budget-state/budget.json),
//   or, with --stale-days, when an open raw day file is older than N days (it should have been sealed).
// seavt-volume ROOT --propose
//   Print a budget file that fits what the root has written (peak day plus a quarter, cap four times that).
import { parseArgs } from "node:util";
import { writeBudget } from "../src/log-budget.mjs";
import { overBudget, proposeBudget, staleRaw, volumeOf } from "../src/volume.mjs";

const usage = "seavt-volume ROOT [--check] [--propose [--write]] [--json] [--no-rows] [--top N] [--feed FEED ...] [--since DATE] [--stale-days N]\n";
let parsed;
try {
  parsed = parseArgs({ allowPositionals: true, options: { check: { type: "boolean" }, propose: { type: "boolean" }, write: { type: "boolean" }, json: { type: "boolean" }, "no-rows": { type: "boolean" }, top: { type: "string", default: "10" }, feed: { type: "string", multiple: true }, since: { type: "string" }, "stale-days": { type: "string" } } });
} catch (error) { process.stderr.write(`${error.message}\n${usage}`); process.exit(2); }
const { values, positionals } = parsed;
if (positionals.length !== 1) { process.stderr.write(usage); process.exit(2); }
const [root] = positionals, only = values.feed, since = values.since;
const mib = (n) => (n / 1_048_576).toFixed(n >= 104_857_600 ? 0 : 2);

if (values.propose) {
  const feeds = proposeBudget(root);
  if (values.write) { process.stdout.write(`${writeBudget(root, { feeds })}\n`); process.exit(0); }
  process.stdout.write(`${JSON.stringify({ profile: "seavt-log-budget/1", feeds }, null, 2)}\n`);
  process.exit(0);
}
if (values.check) {
  const over = overBudget(root, { only, since });
  const stale = values["stale-days"] === undefined ? [] : staleRaw(root, { days: Number(values["stale-days"]) });
  if (values.json) process.stdout.write(`${JSON.stringify({ over, stale })}\n`);
  else {
    for (const o of over) process.stdout.write(`OVER   ${o.feed} ${o.date} raw ${mib(o.raw)} MiB > budget ${mib(o.budget)} MiB (cap ${mib(o.cap)} MiB)\n`);
    for (const s of stale) process.stdout.write(`UNSEALED ${s.feed} ${s.date} ${mib(s.raw)} MiB raw\n`);
    if (over.length + stale.length === 0) process.stdout.write("ok: every feed-day is within budget\n");
  }
  process.exit(over.length + stale.length > 0 ? 1 : 0);
}
const census = volumeOf(root, { rows: !values["no-rows"], only, since });
if (values.json) { process.stdout.write(`${JSON.stringify(census)}\n`); process.exit(0); }
const pad = (s, n) => String(s).padStart(n);
for (const f of census.feeds) {
  process.stdout.write(`${f.feed}  rows ${f.rows ?? "-"}  raw ${mib(f.raw)} MiB  stored ${mib(f.stored)} MiB  ratio ${f.ratio ?? "-"}\n`);
  for (const [date, d] of Object.entries(f.days).sort()) process.stdout.write(`  ${date}  rows ${pad(d.rows ?? "-", 9)}  raw ${pad(mib(d.raw), 9)} MiB  stored ${pad(mib(d.stored), 9)} MiB  ratio ${d.ratio ?? "-"}\n`);
}
process.stdout.write(`\ntop feeds by stored bytes\n`);
for (const f of census.top.slice(0, Number(values.top))) process.stdout.write(`  ${pad(mib(f.stored), 10)} MiB stored  ${pad(mib(f.raw), 10)} MiB raw  ${f.feed}\n`);
