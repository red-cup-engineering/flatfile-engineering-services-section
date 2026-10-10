#!/usr/bin/env node
/**
 * Carry every journal store under one or more state roots into its located (v3) index ahead of a release, so
 * the release's first question is answered at once instead of carrying or rebuilding the whole store on its
 * event loop (src/journal/filesystem/segment-store.mjs, `carryV2`). A store is a directory holding a v2
 * causal-admission index, a `data/journals` directory or a `.metroplat-journal` directory (the roots
 * `artifactStoreRoot` yields). A store with a v2 index is carried; one with witness segments and no index at
 * all is rebuilt from its segments and marked; one already marked is left as it is.
 *
 * It runs beside the release that still writes v2: that release ignores the located index, and the v2 lines
 * it appends while or after this carry runs are carried at the next question. So a store counts as carried
 * when its marker covers every whole line its v2 files held when its carry started; a trailing partial line
 * (a write in progress) and lines appended since are reported (`appendedDuringCarry`), not failed. A carry is
 * resumable only from its last finished run; one interrupted is redone, and its repeated bucket lines fold.
 *
 *   carry-located-indexes.mjs --root <state> [--root <state> ...] [--depth 10]
 *
 * Roots are home-relative unless absolute. Symbolic links, node_modules and .git are not followed. Prints one
 * JSON summary; exits 1 if any store was not carried (an error, or a marker short of its start-of-carry sizes).
 */
import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { parseArgs } from "node:util";
import { indexDirectory, locatedIndex, locatedIndexDirectory } from "../src/journal/filesystem/segment-store.mjs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const V2_NAMES = ["artifacts", "admitted", "blocked", "pending"];
const SKIPPED = new Set(["node_modules", ".git"]);
const journalDirectory = (directory) => path.basename(directory) === ".metroplat-journal"
  || (path.basename(directory) === "journals" && path.basename(path.dirname(directory)) === "data");

/** Journal stores below `root`. A store with a v2 index is not walked further; a journal directory without
 *  one is walked for stores below it, past its content objects, its index and its day directories. */
export function journalStoreRoots(root, depth = 10) {
  const found = [];
  const visit = (directory, left) => {
    const journal = journalDirectory(directory);
    if (fs.existsSync(indexDirectory(directory))) { found.push(directory); return; }
    if (journal) found.push(directory);
    if (left === 0) return;
    let entries;
    try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || SKIPPED.has(entry.name) || /^\d{2,4}$/u.test(entry.name)) continue;
      if (journal && (entry.name === "objects" || entry.name === "index")) continue;
      visit(path.join(directory, entry.name), left - 1);
    }
  };
  visit(root, depth);
  return found.sort();
}

/** Store roots below `root` holding a v2 causal-admission index. */
export const v2StoreRoots = (root, depth = 10) => journalStoreRoots(root, depth).filter((storeRoot) => fs.existsSync(indexDirectory(storeRoot)));

const marker = (storeRoot) => {
  try { return JSON.parse(fs.readFileSync(path.join(locatedIndexDirectory(storeRoot), "formula.json"), "utf8")); }
  catch { return undefined; }
};

/** A v2 file's size, and the end of its last whole line (its size less a trailing partial line). */
function v2Extent(storeRoot, name) {
  const file = path.join(indexDirectory(storeRoot), `${name}.jsonl`);
  let handle;
  try { handle = fs.openSync(file, "r"); } catch { return { size: -1, whole: -1 }; }
  try {
    const { size } = fs.fstatSync(handle);
    const buffer = Buffer.alloc(64 * 1024);
    for (let end = size; end > 0;) {
      const start = Math.max(0, end - buffer.length);
      const read = fs.readSync(handle, buffer, 0, end - start, start);
      const at = buffer.subarray(0, read).lastIndexOf(0x0a);
      if (at >= 0) return { size, whole: start + at + 1 };
      end = start;
    }
    return { size, whole: 0 };
  } finally { fs.closeSync(handle); }
}

const extents = (storeRoot) => Object.fromEntries(V2_NAMES.map((name) => [name, v2Extent(storeRoot, name)]));
const covers = (found, start) => found !== undefined && found.complete !== false
  && V2_NAMES.every((name) => start[name].whole <= 0 || (found.carried?.[name] ?? -1) >= start[name].whole);

export function carryLocatedIndexes(roots, { depth = 10, now = () => Date.now(), duringCarry = () => {} } = {}) {
  const summary = { kind: "located-index-carry.v1", stores: [], notCarried: 0 };
  for (const root of roots) {
    for (const storeRoot of journalStoreRoots(root, depth)) {
      const startedAt = now();
      const v2 = fs.existsSync(indexDirectory(storeRoot));
      const start = v2 ? extents(storeRoot) : undefined;
      const before = marker(storeRoot);
      // A journal directory with no index, no marker and no segments holds nothing to carry or rebuild.
      if (!v2 && before === undefined && !hasSegments(storeRoot)) continue;
      const already = v2 ? covers(before, start) : before !== undefined;
      let error;
      try { locatedIndex(storeRoot); duringCarry(storeRoot); } catch (caught) { error = caught instanceof Error ? caught.message : String(caught); }
      const after = marker(storeRoot);
      const entry = { storeRoot, path: already ? "located" : v2 ? "carried" : "rebuilt", seconds: Math.round((now() - startedAt) / 1000) };
      if (v2) {
        const end = extents(storeRoot);
        entry.v2AdmittedBytes = start.admitted.whole;
        entry.appendedDuringCarry = V2_NAMES.reduce((sum, name) => sum + Math.max(0, end[name].size - Math.max(start[name].size, 0)), 0);
        entry.carried = error === undefined && covers(after, start);
      } else entry.carried = error === undefined && after !== undefined;
      if (error) entry.error = error;
      // No marker after the call: a carry another process holds (lock under ten minutes old), or a failure.
      if (!entry.carried) summary.notCarried += 1;
      summary.stores.push(entry);
    }
  }
  return summary;
}

function hasSegments(storeRoot) {
  const visit = (directory) => {
    let entries;
    try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch { return false; }
    return entries.some((entry) => (entry.isFile() && entry.name.endsWith(".witnesses"))
      || (entry.isDirectory() && !entry.isSymbolicLink() && !SKIPPED.has(entry.name) && entry.name !== "objects" && entry.name !== "index"
        && !fs.existsSync(indexDirectory(path.join(directory, entry.name))) && visit(path.join(directory, entry.name))));
  };
  return visit(storeRoot);
}

if ((process.argv[1] !== undefined && (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })())) {
  const { values } = parseArgs({ options: { root: { type: "string", multiple: true }, depth: { type: "string", default: "10" } } });
  if (!values.root?.length) throw new Error("usage: carry-located-indexes.mjs --root <state> [--root <state> ...] [--depth 10]");
  const summary = carryLocatedIndexes(values.root.map((given) => path.resolve(homedir(), given)), { depth: Number(values.depth) });
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  if (summary.notCarried > 0) process.exitCode = 1;
}
