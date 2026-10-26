#!/usr/bin/env node
/**
 * File a store's per-instance feeds under their type, once. A writer that named a feed for one
 * instance (`encounter-<run id>-logs/<date>-admit-encounter-<run id>.jsonl`) left a directory per
 * instance in `data/logs`; the instance is already each row's entity, so its witnesses belong in
 * the type's log of the same day (`encounter-logs/<date>-admit-encounter.jsonl`).
 *
 * For every kind directory `<prefix>-…-logs` other than `<type>-logs`, and every segment in it:
 *   1. its lines are appended, byte for byte (read through its packing when packed), to the type's
 *      segment of the same date, and the type's ledger records where each one ends;
 *   2. every located fact naming the instance feed (admitted, pending, waiting, sources) is rewritten
 *      to name the type's feed, an admitted fact with the line's new end;
 *   3. the instance segment, its ledger, its packing and its verification checkpoint are removed, and
 *      the emptied directory with them.
 * A witness the type's segment already holds is not appended twice. A second run finds nothing to do.
 *
 * With --threads, each witness is also recorded as a member of the thread its instance feed was
 * (the instance kind's name), so its history is still read as one (THR-5).
 *
 *   file-instance-feeds-by-type.mjs --store <data/logs> --prefix encounter --type encounter [--threads] [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { dataKindDirectoryName, dataKindOfDirectoryName } from "@red-cup-engineering/eavt-services-section/data-artifact-address";
import { journalIndexDirectory } from "../src/journal/store-root.mjs";
import { clearSegmentIndexes, ledgerPath, locatedBucketFile, locatedIndexDirectory, logPathOfSegment, segmentPath } from "../src/journal/filesystem/segment-store.mjs";
import { appendDurably, openSegmentReader, packingOf } from "../src/journal/filesystem/segment-bytes.mjs";

const LOCATED_KINDS_WITH_FEEDS = ["admitted", "pending", "waiting", "sources"];

const entries = (directory) => { try { return fs.readdirSync(directory, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return []; throw error; } };
const relativeTo = (store, file) => path.relative(store, file).split(path.sep).join("/");

/** Every complete line of one segment, read through its packing, with the byte offset after it. */
function* segmentLinesOf(file) {
  const reader = openSegmentReader(file);
  try {
    const size = Math.max(fs.statSync(file).size, packingOf(file)?.packed ?? 0);
    let carried = Buffer.alloc(0);
    let position = 0;
    const chunk = Buffer.alloc(4 * 1024 * 1024);
    while (position < size) {
      const got = reader.read(chunk, 0, Math.min(chunk.length, size - position), position);
      if (got === 0) break;
      const bytes = Buffer.concat([carried, chunk.subarray(0, got)]);
      position += got;
      let start = 0;
      for (let at = bytes.indexOf(0x0a); at >= 0; at = bytes.indexOf(0x0a, start)) {
        yield bytes.toString("utf8", start, at);
        start = at + 1;
      }
      carried = Buffer.from(bytes.subarray(start));
    }
  } finally {
    reader.close();
  }
}

/** The ids a segment already holds, so a witness is never appended twice. */
function idsOf(file) {
  const ids = new Set();
  if (!fs.existsSync(file)) return ids;
  for (const line of segmentLinesOf(file)) {
    try { ids.add(JSON.parse(line).id); } catch { /* A torn line holds no witness. */ }
  }
  return ids;
}

/** Rewrite one JSON-lines file's records through `map` (a record, or undefined to drop it), in place. */
function rewriteRecords(file, map) {
  const text = fs.readFileSync(file, "utf8");
  let changed = 0;
  const lines = text.split("\n").flatMap((line) => {
    if (!line.trim()) return [line];
    let record;
    try { record = JSON.parse(line); } catch { return [line]; }
    const next = map(record);
    if (next === record) return [line];
    changed += 1;
    return next === undefined ? [] : [canonicalJson(next)];
  });
  if (changed === 0) return 0;
  const temporary = `${file}.filing`;
  fs.writeFileSync(temporary, lines.join("\n"));
  fs.renameSync(temporary, file);
  return changed;
}

function filesBelow(directory) {
  return entries(directory).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(full) : entry.isFile() ? [full] : [];
  });
}

/** File one store's `<prefix>-…` instance feeds under `type`. */
export function fileInstanceFeedsByType(store, { prefix, type, threads = false, dryRun = false }) {
  const report = { kind: "instance-feed-filing.v1", store, prefix, type, dryRun, feeds: 0, appended: 0, duplicates: 0, rewritten: 0, removed: [] };
  const typeDirectory = dataKindDirectoryName("log", type);
  const moved = new Map();
  for (const entry of entries(store)) {
    const kind = entry.isDirectory() ? dataKindOfDirectoryName("log", entry.name) : null;
    if (kind === null || entry.name === typeDirectory || !kind.startsWith(`${prefix}-`)) continue;
    const directory = path.join(store, entry.name);
    for (const file of entries(directory).filter((each) => each.isFile()).map((each) => path.join(directory, each.name))) {
      const log = logPathOfSegment(file);
      if (log === undefined) continue;
      const date = /^(\d{4}-\d{2}-\d{2})-/u.exec(path.basename(log))?.[1];
      if (date === undefined) continue;
      const targetLog = path.join(store, typeDirectory, `${date}-admit-${type}.jsonl`);
      report.feeds += 1;
      const ends = new Map();
      if (!dryRun) {
        fs.mkdirSync(path.dirname(targetLog), { recursive: true });
        const held = idsOf(segmentPath(targetLog));
        for (const line of segmentLinesOf(file)) {
          let id, causes;
          try { const record = JSON.parse(line); id = record.id; causes = record.observation?.causes ?? []; } catch { continue; }
          // The instance feed was a thread (THR-5): each of its witnesses is a member of it.
          if (threads && typeof id === "string") {
            const bucket = locatedBucketFile(store, "threads", kind);
            fs.mkdirSync(path.dirname(bucket), { recursive: true });
            appendDurably(bucket, `${canonicalJson({ thread: kind, id, causes: [...causes].sort() })}\n`);
          }
          if (typeof id !== "string") continue;
          if (held.has(id)) { report.duplicates += 1; continue; }
          appendDurably(segmentPath(targetLog), `${line}\n`);
          const end = fs.statSync(segmentPath(targetLog)).size;
          appendDurably(ledgerPath(targetLog), `${canonicalJson({ id, end, filed: "instance" })}\n`);
          ends.set(id, end);
          held.add(id);
          report.appended += 1;
        }
      }
      moved.set(relativeTo(store, log), { log: relativeTo(store, targetLog), ends, file });
    }
  }
  if (dryRun || moved.size === 0) return report;

  // Located facts name the type's feed; an admitted fact also where its line now ends.
  const located = locatedIndexDirectory(store);
  for (const kind of LOCATED_KINDS_WITH_FEEDS) {
    for (const file of filesBelow(path.join(located, kind)).filter((each) => each.endsWith(".jsonl"))) {
      report.rewritten += rewriteRecords(file, (record) => {
        const target = typeof record?.log === "string" ? moved.get(record.log) : undefined;
        if (target === undefined) return record;
        const { end: _end, ...fact } = record;
        const end = kind === "admitted" ? target.ends.get(record.id) : undefined;
        return { ...fact, log: target.log, ...(end === undefined ? {} : { end }) };
      });
    }
  }
  const checkpoints = path.join(journalIndexDirectory(store), "segment-verified", "v1.jsonl");
  if (fs.existsSync(checkpoints)) {
    const segments = new Set([...moved.keys()].map((log) => `${log}.witnesses`));
    rewriteRecords(checkpoints, (record) => (segments.has(record?.segment) ? undefined : record));
  }

  // The instance feeds are gone: segment, ledger, packing, and the emptied directory.
  for (const { file } of moved.values()) {
    const packing = packingOf(file);
    for (const each of [file, ledgerPath(logPathOfSegment(file)), packing?.descriptionPath, packing?.dataPath]) {
      if (each !== undefined) fs.rmSync(each, { force: true });
    }
    const directory = path.dirname(file);
    if (entries(directory).every((entry) => entry.name.startsWith(".packed-"))) {
      fs.rmSync(directory, { recursive: true, force: true });
      report.removed.push(path.basename(directory));
    }
  }
  clearSegmentIndexes();
  return report;
}

if ((process.argv[1] !== undefined && (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })())) {
  const { values } = parseArgs({ options: { store: { type: "string" }, prefix: { type: "string" }, type: { type: "string" }, threads: { type: "boolean", default: false }, "dry-run": { type: "boolean", default: false } } });
  if (!values.store || !values.prefix || !values.type) {
    process.stderr.write("usage: file-instance-feeds-by-type.mjs --store <data/logs> --prefix <instance prefix> --type <type> [--threads] [--dry-run]\n");
    process.exit(1);
  }
  const report = fileInstanceFeedsByType(path.resolve(values.store), { prefix: values.prefix, type: values.type, threads: values.threads, dryRun: values["dry-run"] });
  process.stdout.write(`${JSON.stringify({ ...report, removed: report.removed.length })}\n`);
}
