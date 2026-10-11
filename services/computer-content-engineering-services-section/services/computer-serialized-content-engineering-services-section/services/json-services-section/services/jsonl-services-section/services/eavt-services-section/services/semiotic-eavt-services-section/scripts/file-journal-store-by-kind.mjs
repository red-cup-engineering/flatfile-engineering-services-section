#!/usr/bin/env node
/**
 * File a settlement's journal store by kind, once (store-root.mjs): the store that lived under
 * `data/journals/<YYYY>/<MM>/<DD>/` moves to `data/logs/<kind>-logs/`, and the plain EAVT feeds a
 * settlement kept under `data/logs/<YYYY>/<MM>/<DD>/<feed>.jsonl` move to the same law.
 *
 * For each settlement root, in this order:
 *   1. the old store's `index/` is renamed `journal-index-logs/` where it stands, and every v2
 *      causal-admission line is carried into the located (v3) index while the feeds are still at
 *      their dated paths (a carry writes each carried feed's ledger beside it);
 *   2. every file of every day directory moves to its kind directory (segments, ledgers, the
 *      earlier statement and index directories beside a feed), each day's `packets/` into
 *      `journal-packet-logs/` and each day's head `index/` into `journal-index-logs/heads/<date>/`;
 *      the store's `objects/` becomes `journal-object-logs/`;
 *   Books (`data/logs/ledgers/*.beancount`) are records and move to `data/records/ledger-records/`.
 *   3. the feed paths the located index and the segment checkpoints hold are rewritten to the kind
 *      layout, and the carried v2 index is removed;
 *   4. `data/logs` becomes the store: when the old store was a symbolic link into machine state
 *      (`<state>/<settlement>/journals`), the store moves to `<state>/<settlement>/data/logs` and
 *      `data/logs` links to it, once nothing else is left in a real `data/logs`; `data/journals`
 *      is replaced by a plain file that names the conversion, so a release still running the
 *      dated layout fails at its first write instead of opening an empty store beside this one.
 *
 * Nothing is overwritten: a target that exists with other bytes is reported and its source left.
 * A second run finds nothing left to move. Prints one JSON summary per settlement.
 *
 *   file-journal-store-by-kind.mjs --settlement <root> [--settlement <root> ...] [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { dataArtifactAddress, dataKindDirectory, dataKindDirectoryName, parseArtifactStem, projectDataArtifactPath } from "@red-cup-engineering/eavt-services-section/data-artifact-address";
import { journalPath } from "@red-cup-engineering/eavt-services-section/journal-path";
import { carryLocatedIndex, clearSegmentIndexes } from "../src/journal/filesystem/segment-store.mjs";
import { STORE_AREAS, journalSegment } from "../src/journal/store-root.mjs";

const OLD_STORE = path.join("data", "journals");
const DATED = [/^\d{4}$/u, /^\d{2}$/u, /^\d{2}$/u];
const LOCATED_KINDS_WITH_FEEDS = ["admitted", "pending", "waiting", "sources"];

const entries = (directory) => { try { return fs.readdirSync(directory, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return []; throw error; } };
const lstat = (file) => { try { return fs.lstatSync(file); } catch (error) { if (error.code === "ENOENT") return undefined; throw error; } };

/** Every `<YYYY>/<MM>/<DD>` directory directly under `root`, as `{ date, directory }`, in date order. */
function dayDirectories(root) {
  const days = [];
  for (const year of entries(root).filter((entry) => entry.isDirectory() && DATED[0].test(entry.name)).map((entry) => entry.name).sort()) {
    for (const month of entries(path.join(root, year)).filter((entry) => entry.isDirectory() && DATED[1].test(entry.name)).map((entry) => entry.name).sort()) {
      for (const day of entries(path.join(root, year, month)).filter((entry) => entry.isDirectory() && DATED[2].test(entry.name)).map((entry) => entry.name).sort()) {
        days.push({ date: `${year}-${month}-${day}`, directory: path.join(root, year, month, day) });
      }
    }
  }
  return days;
}

/**
 * Where a file of a store's day directory goes, relative to the store: its kind directory, under the
 * same name when the name is already the tier law's (`<date>-admit-<kind>.jsonl…`), else under the
 * name the law gives a plain feed named `<feed>.jsonl…`. Undefined for a name that is not a feed's.
 */
export function kindRelativeOf(date, name) {
  const at = name.indexOf(".jsonl");
  if (at <= 0) return undefined;
  const stem = name.slice(0, at), rest = name.slice(at + ".jsonl".length);
  const parsed = parseArtifactStem(stem);
  if (parsed !== null && parsed.act === "admit") return path.join(dataKindDirectoryName("log", parsed.token), name);
  if (stem.endsWith(".record")) return undefined;
  const address = dataArtifactAddress({ root: "", tier: "log", encoding: "jsonl", at: date, action: stem, subject: stem });
  return path.join(path.basename(address.directory), `${address.filename}${rest}`);
}

/** The kind-layout path, relative to the store, of a store-relative dated feed path; the path itself when it is not dated. */
export function kindLogOf(relative) {
  const parts = relative.split("/");
  if (parts.length !== 4 || !DATED.every((pattern, index) => pattern.test(parts[index]))) return relative;
  return (kindRelativeOf(parts.slice(0, 3).join("-"), parts[3]) ?? relative).split(path.sep).join("/");
}

function sameBytes(left, right) {
  const a = lstat(left), b = lstat(right);
  if (a === undefined || b === undefined || !a.isFile() || !b.isFile() || a.size !== b.size) return false;
  return fs.readFileSync(left).equals(fs.readFileSync(right));
}

function mover(report, dryRun) {
  return function move(from, to) {
    const target = lstat(to);
    if (target !== undefined) {
      if (sameBytes(from, to)) { if (!dryRun) fs.rmSync(from); report.duplicates += 1; return; }
      const source = lstat(from);
      if (source?.isDirectory() && target.isDirectory()) {
        for (const entry of entries(from)) move(path.join(from, entry.name), path.join(to, entry.name));
        if (!dryRun && entries(from).length === 0) fs.rmdirSync(from);
        return;
      }
      report.conflicts.push({ from, to });
      return;
    }
    report.moved += 1;
    if (dryRun) return;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.renameSync(from, to);
  };
}

/** Remove empty directories below and including `directory`. */
function pruneEmpty(directory) {
  for (const entry of entries(directory)) if (entry.isDirectory()) pruneEmpty(path.join(directory, entry.name));
  if (lstat(directory)?.isDirectory() && entries(directory).length === 0) fs.rmdirSync(directory);
}

/** Rewrite one JSON-lines file's `field` paths through `map`, in place; lines that are not JSON are kept as they are. */
function rewriteLines(file, field, map, report, dryRun) {
  const text = fs.readFileSync(file, "utf8");
  let changed = 0;
  const lines = text.split("\n").map((line) => {
    if (!line.trim()) return line;
    let record;
    try { record = JSON.parse(line); } catch { return line; }
    if (typeof record?.[field] !== "string") return line;
    const next = map(record[field]);
    if (next === record[field]) return line;
    changed += 1;
    return JSON.stringify({ ...record, [field]: next });
  });
  if (changed === 0) return;
  report.rewritten += changed;
  if (dryRun) return;
  const temporary = `${file}.filing`;
  fs.writeFileSync(temporary, lines.join("\n"));
  fs.renameSync(temporary, file);
}

function filesBelow(directory) {
  const found = [];
  for (const entry of entries(directory)) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...filesBelow(full));
    else if (entry.isFile()) found.push(full);
  }
  return found;
}

/** File one settlement's journal store and plain dated feeds by kind. */
export function fileJournalStoreByKind(settlementRoot, { dryRun = false } = {}) {
  const root = path.resolve(settlementRoot);
  const report = { kind: "journal-store-filing.v1", settlement: root, dryRun, moved: 0, duplicates: 0, rewritten: 0, conflicts: [], leftInPlace: [], steps: [] };
  const move = mover(report, dryRun);
  const oldLink = path.join(root, OLD_STORE);
  const logsPath = path.join(root, ...journalSegment.split("/"));
  const oldStat = lstat(oldLink);
  const linkTarget = (link) => path.resolve(path.dirname(link), fs.readlinkSync(link));
  // The old store, read through its link without requiring the link to resolve: a store already emptied is not one.
  const oldTarget = oldStat?.isSymbolicLink() ? linkTarget(oldLink) : oldStat?.isDirectory() ? oldLink : undefined;
  const oldStore = oldTarget !== undefined && lstat(oldTarget)?.isDirectory() ? oldTarget : undefined;
  const logsStat = lstat(logsPath);
  // The store's home: where data/logs already links, else data/logs beside the machine-state store data/journals
  // linked to (`<state>/<settlement>/journals` becomes `<state>/<settlement>/data/logs`), else data/logs itself.
  const store = logsStat?.isSymbolicLink() ? linkTarget(logsPath)
    : oldStat?.isSymbolicLink() ? path.join(path.dirname(oldTarget), ...journalSegment.split("/"))
      : logsPath;
  report.store = store;
  if (!dryRun) fs.mkdirSync(store, { recursive: true });

  if (oldStore !== undefined) {
    // 1. The index takes its kind name where it stands, and v2 is carried while the feeds are still dated.
    const oldIndex = path.join(oldStore, "index");
    if (lstat(oldIndex)?.isDirectory()) move(oldIndex, path.join(oldStore, STORE_AREAS.index));
    if (!dryRun && lstat(path.join(oldStore, STORE_AREAS.index, "causal-admission", "v2"))?.isDirectory()) {
      clearSegmentIndexes();
      const carried = carryLocatedIndex(oldStore);
      report.steps.push({ carry: carried });
      if (carried !== "located") throw new Error(`file-journal-store-by-kind: the v2 index of ${oldStore} was not carried (${carried}); nothing was moved`);
    }
    // 2. Day directories to kind directories; the store's own areas to theirs.
    for (const { date, directory } of dayDirectories(oldStore)) {
      const packed = new Map();
      for (const entry of entries(directory)) {
        const from = path.join(directory, entry.name);
        if (entry.isFile() && (entry.name.startsWith(".packing-") || entry.name.startsWith(".packed-"))) continue;
        if (entry.isDirectory() && entry.name === "packets") { move(path.join(from, "sha256"), path.join(store, STORE_AREAS.packets, "sha256")); continue; }
        if (entry.isDirectory() && entry.name === "index") { move(from, path.join(store, STORE_AREAS.index, "heads", date)); continue; }
        const relative = kindRelativeOf(date, entry.name);
        if (relative === undefined) { report.leftInPlace.push(from); continue; }
        // A packed segment's description (named from its basename) and the data it names (by a name in
        // its own directory) go with it; data two segments share is linked into each one's directory.
        const description = path.join(directory, `.packing-${createHash("sha256").update(entry.name, "utf8").digest("hex")}.packed.json`);
        if (entry.isFile() && lstat(description)?.isFile()) {
          const data = JSON.parse(fs.readFileSync(description, "utf8")).data;
          const target = path.dirname(path.join(store, relative));
          if (typeof data === "string" && lstat(path.join(directory, data))?.isFile()) {
            if (!dryRun) { fs.mkdirSync(target, { recursive: true }); if (lstat(path.join(target, data)) === undefined) fs.linkSync(path.join(directory, data), path.join(target, data)); }
            packed.set(data, true);
          }
          move(description, path.join(target, path.basename(description)));
        }
        move(from, path.join(store, relative));
      }
      for (const data of packed.keys()) if (!dryRun) fs.rmSync(path.join(directory, data), { force: true });
      for (const entry of entries(directory)) if (entry.name.startsWith(".packing-") || entry.name.startsWith(".packed-")) report.leftInPlace.push(path.join(directory, entry.name));
    }
    for (const [from, area] of [["index", STORE_AREAS.index], [STORE_AREAS.index, STORE_AREAS.index], ["objects", STORE_AREAS.objects]]) {
      const source = path.join(oldStore, from);
      if (lstat(source)?.isDirectory() && path.join(oldStore, from) !== path.join(store, area)) move(source, path.join(store, area));
    }
    for (const entry of entries(oldStore).filter((each) => each.isFile() && each.name.startsWith("objects-anchor.jsonl"))) {
      move(path.join(oldStore, entry.name), path.join(store, dataKindDirectoryName("log", "objects-anchor"), entry.name));
    }
    if (!dryRun) pruneEmpty(oldStore);
    for (const entry of entries(oldStore)) report.leftInPlace.push(path.join(oldStore, entry.name));
  }

  // Plain EAVT feeds a real data/logs kept by date (the earlier journalPath), and the records it kept beside them.
  if (logsStat?.isDirectory() && !logsStat.isSymbolicLink()) {
    for (const { date, directory } of dayDirectories(logsPath)) {
      for (const entry of entries(directory)) {
        const from = path.join(directory, entry.name);
        if (entry.isFile() && entry.name.endsWith(".record.jsonl")) {
          move(from, projectDataArtifactPath(journalPath({ root, feed: entry.name.slice(0, -".record.jsonl".length), at: date }), "record", "jsonl"));
          continue;
        }
        const relative = entry.isFile() ? kindRelativeOf(date, entry.name) : undefined;
        if (relative === undefined) { report.leftInPlace.push(from); continue; }
        move(from, path.join(store, relative));
      }
    }
    if (!dryRun) for (const entry of entries(logsPath)) if (entry.isDirectory() && DATED[0].test(entry.name)) pruneEmpty(path.join(logsPath, entry.name));
  }

  // Books are records: a settlement's Beancount books leave `data/logs/ledgers/` for `data/records/ledger-records/`
  // (organizing `enterpriseBookOf`).
  const ledgers = path.join(logsPath, "ledgers");
  if (lstat(logsPath)?.isDirectory() && !lstat(logsPath).isSymbolicLink() && lstat(ledgers)?.isDirectory()) {
    for (const entry of entries(ledgers)) {
      if (entry.isFile() && entry.name.endsWith(".beancount")) move(path.join(ledgers, entry.name), path.join(dataKindDirectory(root, "record", "ledger"), entry.name));
      else report.leftInPlace.push(path.join(ledgers, entry.name));
    }
    if (!dryRun && entries(ledgers).length === 0) fs.rmdirSync(ledgers);
  }

  // 3. The located index and the segment checkpoints name feeds by their kind paths; the carried v2 index goes.
  const located = path.join(store, STORE_AREAS.index, "causal-admission");
  for (const kind of LOCATED_KINDS_WITH_FEEDS) {
    for (const file of filesBelow(path.join(located, "v3", kind)).filter((each) => each.endsWith(".jsonl"))) rewriteLines(file, "log", kindLogOf, report, dryRun);
  }
  const checkpoints = path.join(store, STORE_AREAS.index, "segment-verified", "v1.jsonl");
  if (lstat(checkpoints)?.isFile()) {
    rewriteLines(checkpoints, "segment", (segment) => {
      const at = segment.indexOf(".jsonl");
      return at < 0 ? segment : `${kindLogOf(segment.slice(0, at + ".jsonl".length))}${segment.slice(at + ".jsonl".length)}`;
    }, report, dryRun);
  }
  if (!dryRun && lstat(path.join(located, "v3", "formula.json"))?.isFile() && lstat(path.join(located, "v2"))?.isDirectory()) {
    fs.rmSync(path.join(located, "v2"), { recursive: true, force: true });
    report.steps.push({ removed: "causal-admission/v2" });
  }

  // 4. data/logs is the store. A machine-state store that a long-running release writes to is guarded: data/journals
  // becomes a plain file naming the conversion, so a release still on the dated layout fails at its first write.
  if (store !== logsPath) {
    const real = lstat(logsPath)?.isDirectory() && !lstat(logsPath).isSymbolicLink();
    const remaining = real ? entries(logsPath) : [];
    if (remaining.length > 0) report.leftInPlace.push(...remaining.map((entry) => path.join(logsPath, entry.name)));
    else if (!lstat(logsPath)?.isSymbolicLink() && !dryRun) {
      if (real) fs.rmdirSync(logsPath);
      fs.symlinkSync(store, logsPath);
      report.steps.push({ linked: logsPath, to: store });
    }
  }
  const storeInPlace = store === logsPath || lstat(logsPath)?.isSymbolicLink() === true;
  if (!dryRun && storeInPlace && oldStat?.isSymbolicLink()) {
    fs.unlinkSync(oldLink);
    fs.writeFileSync(oldLink, `This settlement's journal is filed by kind under ${journalSegment} since ${new Date().toISOString().slice(0, 10)} (semiotic-eavt-services-section scripts/file-journal-store-by-kind.mjs).\nA release that still writes here runs the dated layout and must be rebuilt.\n`);
    report.steps.push({ guarded: oldLink });
  } else if (!dryRun && oldStat?.isDirectory() && entries(oldLink).length === 0) {
    fs.rmdirSync(oldLink);
    report.steps.push({ removed: oldLink });
  }
  return report;
}

if ((process.argv[1] !== undefined && (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })())) {
  const { values } = parseArgs({ options: { settlement: { type: "string", multiple: true }, "dry-run": { type: "boolean", default: false } } });
  if (!values.settlement?.length) {
    process.stderr.write("usage: file-journal-store-by-kind.mjs --settlement <root> [--settlement <root> ...] [--dry-run]\n");
    process.exit(1);
  }
  let failed = false;
  for (const settlement of values.settlement) {
    const report = fileJournalStoreByKind(settlement, { dryRun: values["dry-run"] });
    process.stdout.write(`${JSON.stringify(report)}\n`);
    if (report.conflicts.length > 0) failed = true;
  }
  if (failed) process.exitCode = 1;
}
