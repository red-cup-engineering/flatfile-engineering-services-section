#!/usr/bin/env node
/**
 * Carry every v2 causal-admission index under one or more state roots into its located (v3) index
 * ahead of a release, so the release's first question is answered at once instead of carrying the
 * whole root itself (src/journal/filesystem/segment-store.mjs, `carryLocatedIndex`). It runs beside
 * the release that still writes v2: that release ignores the located index, and any v2 lines it
 * appends after this carry are carried by the next release in the background. A carry records where
 * each step stopped, so one interrupted resumes from its last step; repeated bucket lines fold by key.
 *
 *   carry-located-indexes.mjs --root <state> [--root <state> ...] [--depth 8]
 *
 * Roots are home-relative unless absolute. Prints one JSON summary; exits 1 if any store was not carried.
 */
import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { parseArgs } from "node:util";
import { carryLocatedIndex, indexDirectory, locatedIndexDirectory, v2StoreRoots } from "../src/journal/filesystem/segment-store.mjs";

export { v2StoreRoots };

const marker = (storeRoot) => {
  try { return JSON.parse(fs.readFileSync(path.join(locatedIndexDirectory(storeRoot), "formula.json"), "utf8")); }
  catch { return undefined; }
};

export function carryLocatedIndexes(roots, { depth = 8, now = () => Date.now() } = {}) {
  const summary = { kind: "located-index-carry.v1", stores: [], notCarried: 0 };
  for (const root of roots) {
    for (const storeRoot of v2StoreRoots(root, depth)) {
      const startedAt = now();
      let error;
      try { carryLocatedIndex(storeRoot); } catch (caught) { error = caught instanceof Error ? caught.message : String(caught); }
      const carried = marker(storeRoot);
      const v2Bytes = (() => { try { return fs.statSync(path.join(indexDirectory(storeRoot), "admitted.jsonl")).size; } catch { return 0; } })();
      const entry = { storeRoot, v2AdmittedBytes: v2Bytes, seconds: Math.round((now() - startedAt) / 1000),
        carried: carried !== undefined && carried.complete !== false && (carried.carried?.admitted ?? -1) >= v2Bytes, ...(error ? { error } : {}) };
      // No marker after the call: a carry another process holds (lock under ten minutes old), or a failure.
      if (!entry.carried) summary.notCarried += 1;
      summary.stores.push(entry);
    }
  }
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const { values } = parseArgs({ options: { root: { type: "string", multiple: true }, depth: { type: "string", default: "8" } } });
  if (!values.root?.length) throw new Error("usage: carry-located-indexes.mjs --root <state> [--root <state> ...] [--depth 8]");
  const summary = carryLocatedIndexes(values.root.map((given) => path.resolve(homedir(), given)), { depth: Number(values.depth) });
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  if (summary.notCarried > 0) process.exitCode = 1;
}
