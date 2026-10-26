/**
 * The volume census of a settlement root's logs: per feed per day, rows, raw (uncompressed) bytes, stored bytes
 * and their ratio; the feeds ranked by what they store; and the check against the root's budget.
 *
 * A feed is a directory `data/logs/<feed>-logs`. Its files are classed by name, with no parsing of content
 * except to count rows:
 * - `<date>.<start>-<end>.jsonl.gz`: a sealed segment. Raw bytes are `end - start`, stored bytes the file's size.
 * - `<date>….jsonl`, `….jsonl.sealing`, `….witnesses`, other files led by a date: open or legacy text, raw = stored.
 * - anything else (a subdirectory, a file with no date): `undated`, counted at its stored size.
 */
import { closeSync, openSync, opendirSync, readSync, statSync } from "node:fs";
import { join } from "node:path";
import { bgzfBlocks } from "@red-cup-engineering/computer-file-engineering-services-section/bgzf";
import { limitsOf, readBudget } from "./log-budget.mjs";

const SEGMENT = /^(\d{4}-\d{2}-\d{2})\.(\d+)-(\d+)\.jsonl\.gz$/u;
const DATED = /^(\d{4}-\d{2}-\d{2})/u;
const OPEN_RAW = /(?:\.jsonl|\.jsonl\.sealing|\.witnesses|\.json)$/u;

function* entries(directory) {
  let dir;
  try { dir = opendirSync(directory); } catch (error) { if (error.code === "ENOENT" || error.code === "ENOTDIR") return; throw error; }
  try { for (let entry = dir.readSync(); entry !== null; entry = dir.readSync()) yield entry; } finally { dir.closeSync(); }
}

/** Bytes of a tree, counting regular files only (no link followed). */
function treeBytes(directory) {
  let bytes = 0, files = 0;
  const stack = [directory];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of entries(current)) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) stack.push(path);
      else if (entry.isFile()) { try { bytes += statSync(path).size; files += 1; } catch { /* vanished */ } }
    }
  }
  return { bytes, files };
}

function countNewlines(file) {
  const fd = openSync(file, "r"), chunk = Buffer.allocUnsafe(1 << 20);
  let rows = 0, position = 0, last = 10;
  try {
    for (;;) {
      const read = readSync(fd, chunk, 0, chunk.length, position);
      if (read === 0) break;
      position += read;
      for (let at = chunk.indexOf(10); at >= 0 && at < read; at = chunk.indexOf(10, at + 1)) rows += 1;
      last = chunk[read - 1];
    }
  } finally { closeSync(fd); }
  return last === 10 ? rows : rows + 1;
}

function countSegmentRows(file) {
  let rows = 0;
  for (const { data } of bgzfBlocks(file)) for (let at = data.indexOf(10); at >= 0; at = data.indexOf(10, at + 1)) rows += 1;
  return rows;
}

/** The census of one feed directory: `{feed, days: {date: {rows, raw, stored, files, sealed}}}`. */
export function feedVolume(logs, feed, { rows = true } = {}) {
  const directory = join(logs, `${feed}-logs`), days = {};
  const day = (date) => (days[date] ??= { rows: rows ? 0 : null, raw: 0, stored: 0, files: 0, sealed: 0, open: 0 });
  for (const entry of entries(directory)) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) { const { bytes, files } = treeBytes(path); const d = day("undated"); d.raw += bytes; d.stored += bytes; d.files += files; d.open += bytes; continue; }
    if (!entry.isFile()) continue;
    let size;
    try { size = statSync(path).size; } catch { continue; }
    const segment = SEGMENT.exec(entry.name);
    if (segment) {
      const d = day(segment[1]);
      d.raw += Number(segment[3]) - Number(segment[2]); d.stored += size; d.files += 1; d.sealed += size;
      if (rows) { try { d.rows += countSegmentRows(path); } catch { /* unreadable segment: rows unknown */ } }
      continue;
    }
    const date = DATED.exec(entry.name)?.[1];
    const d = day(date ?? "undated");
    d.raw += size; d.stored += size; d.files += 1;
    if (OPEN_RAW.test(entry.name) || date === undefined) {
      d.open += size;
      if (rows && /\.(?:jsonl|jsonl\.sealing|witnesses)$/u.test(entry.name)) d.rows += countNewlines(path);
    } else d.sealed += size;
  }
  return { feed, days };
}

/** The feeds of a root: names of `data/logs/*-logs` without the suffix, sorted. */
export function feedsOf(root) {
  const names = [];
  for (const entry of entries(join(root, "data", "logs"))) if (entry.isDirectory() && entry.name.endsWith("-logs")) names.push(entry.name.slice(0, -"-logs".length));
  return names.sort();
}

/**
 * The census of a root: `{root, feeds: [{feed, days, rows, raw, stored, ratio}], top}`.
 * `ratio` is raw / stored. `only` limits to named feeds; `since` drops days before a date.
 */
export function volumeOf(root, { rows = true, only, since } = {}) {
  const logs = join(root, "data", "logs"), feeds = [];
  for (const feed of feedsOf(root)) {
    if (only && !only.includes(feed)) continue;
    const census = feedVolume(logs, feed, { rows });
    if (since) for (const date of Object.keys(census.days)) if (date !== "undated" && date < since) delete census.days[date];
    const total = { rows: rows ? 0 : null, raw: 0, stored: 0 };
    for (const d of Object.values(census.days)) { if (rows) total.rows += d.rows; total.raw += d.raw; total.stored += d.stored; }
    for (const d of Object.values(census.days)) d.ratio = d.stored > 0 ? Number((d.raw / d.stored).toFixed(2)) : null;
    feeds.push({ feed, ...total, ratio: total.stored > 0 ? Number((total.raw / total.stored).toFixed(2)) : null, days: census.days });
  }
  const top = [...feeds].sort((a, b) => b.stored - a.stored).map(({ feed, raw, stored, rows: n }) => ({ feed, raw, stored, rows: n }));
  return { root, feeds, top };
}

/** Feed-days over their budget: `[{feed, date, raw, budget, cap}]`. Needs no row counts. */
export function overBudget(root, { budget = readBudget(root), only, since } = {}) {
  const over = [];
  for (const feed of volumeOf(root, { rows: false, only, since }).feeds) {
    const { budget: limit, cap } = limitsOf(budget, feed.feed);
    for (const [date, d] of Object.entries(feed.days)) if (date !== "undated" && d.raw > limit) over.push({ feed: feed.feed, date, raw: d.raw, budget: limit, cap });
  }
  return over.sort((a, b) => b.raw / b.budget - a.raw / a.budget);
}

/** Open raw day files older than `days` days before `today`: `[{feed, date, raw}]`; these should have been sealed. */
export function staleRaw(root, { days = 2, today = new Date().toISOString().slice(0, 10) } = {}) {
  const limit = new Date(Date.parse(`${today}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10), stale = [];
  for (const feed of volumeOf(root, { rows: false }).feeds) for (const [date, d] of Object.entries(feed.days)) if (date !== "undated" && date < limit && d.open > 0) stale.push({ feed: feed.feed, date, raw: d.open });
  return stale;
}

/** A budget proposal from what a root has written: each feed's busiest day plus a quarter, rounded up to a MiB; cap four times that. */
export function proposeBudget(root) {
  const MIB = 1_048_576, feeds = {};
  for (const feed of volumeOf(root, { rows: false }).feeds) {
    const peak = Math.max(0, ...Object.entries(feed.days).filter(([date]) => date !== "undated").map(([, d]) => d.raw));
    if (peak === 0) continue;
    const budget = Math.max(MIB, Math.ceil((peak * 1.25) / MIB) * MIB);
    feeds[feed.feed] = { budget, cap: budget * 4 };
  }
  return feeds;
}
