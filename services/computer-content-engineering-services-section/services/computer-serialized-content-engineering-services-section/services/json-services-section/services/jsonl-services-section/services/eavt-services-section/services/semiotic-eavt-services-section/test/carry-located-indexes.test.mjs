import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { clearSegmentIndexes, indexDirectory, locatedBucketFile, locatedIndex, locatedIndexDirectory } from "../src/journal/filesystem/segment-store.mjs";
import { carryLocatedIndexes, v2StoreRoots } from "../scripts/carry-located-indexes.mjs";

const address = (n) => `ni:///sha-256;${createHash("sha256").update(String(n)).digest("base64url")}`;
const script = fileURLToPath(new URL("../scripts/carry-located-indexes.mjs", import.meta.url));

function v2Store(state, name, ids) {
  const storeRoot = join(state, name);
  mkdirSync(indexDirectory(storeRoot), { recursive: true });
  writeFileSync(join(indexDirectory(storeRoot), "admitted.jsonl"), ids.map((id) => `${JSON.stringify({ id, log: "2026/10/08/2026-10-08-admit-feed.jsonl" })}\n`).join(""));
  return storeRoot;
}

test("every v2 store under a state root is carried ahead of the release, once", () => {
  const state = mkdtempSync(join(tmpdir(), "located-carry-"));
  try {
    const one = v2Store(state, "journals/metroplat", [address(1), address(2)]);
    const two = v2Store(state, "data/journals/koios", [address(3)]);
    mkdirSync(join(state, "journals/metroplat/2026/10/08"), { recursive: true });
    assert.deepEqual(v2StoreRoots(state), [two, one]);
    const summary = carryLocatedIndexes([state]);
    assert.equal(summary.notCarried, 0);
    assert.deepEqual(summary.stores.map((store) => [store.storeRoot, store.carried]), [[two, true], [one, true]]);
    assert.ok(existsSync(join(locatedIndexDirectory(one), "formula.json")));
    // The release's first question is now answered from the carried buckets without carrying again.
    clearSegmentIndexes();
    assert.equal(locatedIndex(one).isAdmitted(address(2)), true);
    assert.equal(readFileSync(locatedBucketFile(one, "admitted", address(1)), "utf8").split(address(1)).length - 1, 1, "carried once");
    const again = carryLocatedIndexes([state]);
    assert.equal(again.notCarried, 0);
    assert.equal(readFileSync(locatedBucketFile(one, "admitted", address(1)), "utf8").split(address(1)).length - 1, 1, "a second run carries nothing twice");
  } finally { clearSegmentIndexes(); rmSync(state, { recursive: true, force: true }); }
});

test("a carry another process holds is reported, never claimed as done", () => {
  const state = mkdtempSync(join(tmpdir(), "located-carry-held-"));
  try {
    const storeRoot = v2Store(state, "journals/held", [address(4)]);
    mkdirSync(locatedIndexDirectory(storeRoot), { recursive: true });
    writeFileSync(join(locatedIndexDirectory(storeRoot), "carrying.lock"), "");
    clearSegmentIndexes();
    const summary = carryLocatedIndexes([state]);
    assert.equal(summary.notCarried, 1);
    assert.equal(summary.stores[0].carried, false);
  } finally { clearSegmentIndexes(); rmSync(state, { recursive: true, force: true }); }
});

test("the command prints one summary and exits nonzero only when a store was not carried", () => {
  const state = mkdtempSync(join(tmpdir(), "located-carry-cli-"));
  try {
    v2Store(state, "journals/cli", [address(5)]);
    const run = spawnSync(process.execPath, [script, "--root", state], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    const summary = JSON.parse(run.stdout);
    assert.equal(summary.kind, "located-index-carry.v1");
    assert.equal(summary.stores.length, 1);
    assert.equal(summary.stores[0].carried, true);
    assert.equal(spawnSync(process.execPath, [script], { encoding: "utf8" }).status, 1);
  } finally { rmSync(state, { recursive: true, force: true }); }
});
