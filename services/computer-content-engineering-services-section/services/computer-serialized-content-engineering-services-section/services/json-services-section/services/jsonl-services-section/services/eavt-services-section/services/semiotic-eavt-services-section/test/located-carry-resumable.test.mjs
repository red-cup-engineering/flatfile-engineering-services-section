import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  carryLimits, carryLocatedIndex, clearSegmentIndexes, indexDirectory, locatedBucketFile, locatedIndex, locatedIndexDirectory,
  locatedIndexState, prepareLocatedIndex, prepareLocatedIndexesUnder, segmentPath,
} from "../src/journal/filesystem/segment-store.mjs";

const address = (n) => `ni:///sha-256;${createHash("sha256").update(String(n)).digest("base64url")}`;
const relative = "2026/10/08/2026-10-08-admit-feed.jsonl";
const marker = (storeRoot) => JSON.parse(readFileSync(join(locatedIndexDirectory(storeRoot), "formula.json"), "utf8"));

/** A root as the v2 store left it: `count` admitted witnesses in one whole index file, no buckets. */
function v2Root(t, count) {
  const storeRoot = mkdtempSync(join(tmpdir(), "located-carry-resumable-"));
  t.after(() => { clearSegmentIndexes(); rmSync(storeRoot, { recursive: true, force: true }); });
  mkdirSync(dirname(join(storeRoot, relative)), { recursive: true });
  writeFileSync(segmentPath(join(storeRoot, relative)), "");
  mkdirSync(indexDirectory(storeRoot), { recursive: true });
  const fd = openSync(join(indexDirectory(storeRoot), "admitted.jsonl"), "w");
  for (let n = 0; n < count; n += 1) writeSync(fd, `{"id":"${address(n)}","log":"${relative}"}\n`);
  closeSync(fd);
  clearSegmentIndexes();
  return storeRoot;
}

const saved = { ...carryLimits };
const smallSteps = (t) => { carryLimits.chunkBytes = 64 * 1024; t.after(() => Object.assign(carryLimits, saved)); };

test("the first question on a large v2 root is answered while its carry is unfinished, and nothing is carried on that path", (t) => {
  smallSteps(t);
  const storeRoot = v2Root(t, 20_000);
  const started = performance.now();
  const index = locatedIndex(storeRoot);
  for (const n of [0, 1, 9_999, 19_999]) assert.equal(index.isAdmitted(address(n)), true, `witness ${n} is answered from v2`);
  assert.equal(index.isAdmitted(address("absent")), false);
  const answered = performance.now() - started;
  // No step of the carry ran on the question path: the carry is still unfinished, with nothing written.
  assert.equal(locatedIndexState(storeRoot).state, "carrying");
  assert.throws(() => readFileSync(locatedBucketFile(storeRoot, "admitted", address(0))), { code: "ENOENT" });
  t.diagnostic(`answered in ${answered.toFixed(0)} ms with the carry unfinished`);
});

test("an interrupted carry resumes where it stopped, and carries no witness twice", (t) => {
  smallSteps(t);
  const storeRoot = v2Root(t, 20_000);
  assert.equal(carryLocatedIndex(storeRoot, { steps: 2 }), "progress");
  const stopped = marker(storeRoot);
  assert.equal(stopped.complete, false);
  assert.ok(stopped.carried.admitted > 0, "the step's progress is recorded");
  assert.equal(locatedIndexState(storeRoot).state, "carrying");
  // A new process (forgetting every in-process reading) continues from the recorded offset.
  clearSegmentIndexes();
  assert.equal(carryLocatedIndex(storeRoot), "located");
  assert.equal(marker(storeRoot).complete, undefined);
  assert.equal(locatedIndexState(storeRoot).state, "located");
  for (const n of [0, 1, 500, 19_999]) {
    const lines = readFileSync(locatedBucketFile(storeRoot, "admitted", address(n)), "utf8").split(address(n)).length - 1;
    assert.equal(lines, 1, `witness ${n} is carried once, not again from the start`);
  }
  clearSegmentIndexes();
  assert.equal(locatedIndex(storeRoot).isAdmitted(address(12_345)), true);
});

test("the carry finishes in the background, a step at a time, and the root is then located", async (t) => {
  smallSteps(t);
  const storeRoot = v2Root(t, 5_000);
  assert.equal(locatedIndex(storeRoot).isAdmitted(address(42)), true);
  const deadline = Date.now() + 20_000;
  while (locatedIndexState(storeRoot).state !== "located" && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(locatedIndexState(storeRoot).state, "located");
  assert.ok(readFileSync(locatedBucketFile(storeRoot, "admitted", address(42)), "utf8").includes(address(42)));
  assert.equal(locatedIndex(storeRoot).isAdmitted(address(4_999)), true);
});

test("a store prepared at boot is carried in the background before any question is asked", async (t) => {
  smallSteps(t);
  const storeRoot = v2Root(t, 5_000);
  assert.equal(prepareLocatedIndex(storeRoot).state, "carrying");
  const deadline = Date.now() + 20_000;
  while (locatedIndexState(storeRoot).state !== "located" && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(locatedIndexState(storeRoot).state, "located");
  // The first question then reads buckets only.
  clearSegmentIndexes();
  assert.equal(locatedIndex(storeRoot).isAdmitted(address(1_234)), true);
  assert.equal(prepareLocatedIndex(storeRoot).state, "located");
});

test("a host prepares every v2 store below its state root at boot", async (t) => {
  smallSteps(t);
  const storeRoot = v2Root(t, 2_000);
  const states = prepareLocatedIndexesUnder(dirname(storeRoot), { depth: 1 });
  const mine = states.find((entry) => entry.storeRoot === storeRoot);
  assert.equal(mine?.state, "carrying");
  const deadline = Date.now() + 20_000;
  while (locatedIndexState(storeRoot).state !== "located" && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(locatedIndexState(storeRoot).state, "located");
});

test("one step carries no more than its budget across every v2 file", (t) => {
  smallSteps(t);
  const storeRoot = v2Root(t, 100);
  const budget = carryLimits.chunkBytes;
  // The admitted file is smaller than one budget, so the step reaches the blocked file with what is left, and
  // that leftover is shorter than the blocked file's first line: the step must stop, not read the file whole.
  const first = `{"id":"${address("b-long")}","obstruction":"${"x".repeat(budget - 1024)}"}`;
  const fd = openSync(join(indexDirectory(storeRoot), "blocked.jsonl"), "w");
  writeSync(fd, `${first}\n`);
  for (let n = 0; n < 50_000; n += 1) writeSync(fd, `{"id":"${address(`b${n}`)}","obstruction":null}\n`);
  closeSync(fd);
  assert.equal(carryLocatedIndex(storeRoot, { steps: 1 }), "progress");
  const one = marker(storeRoot);
  const total = Object.values(one.carried).reduce((sum, offset) => sum + offset, 0);
  assert.ok(total <= budget, `one step carried ${total} bytes with a ${budget}-byte budget`);
  assert.ok(one.carried.admitted > 0);
  assert.equal(one.carried.blocked ?? 0, 0, "the blocked file waits for the next step");
  assert.equal(one.complete, false);
  // The next step starts on it with a whole budget, and carries no more than that.
  assert.equal(carryLocatedIndex(storeRoot, { steps: 1 }), "progress");
  const two = marker(storeRoot);
  assert.ok(two.carried.blocked > Buffer.byteLength(first) && two.carried.blocked <= budget);
  assert.equal(carryLocatedIndex(storeRoot), "located");
  clearSegmentIndexes();
  assert.equal(locatedIndex(storeRoot).isBlocked(address("b49999")), true);
});

test("a line longer than the budget is carried by a step of its own, to that line's end only", (t) => {
  smallSteps(t);
  const storeRoot = v2Root(t, 10);
  const budget = carryLimits.chunkBytes;
  const long = `{"ref":"r","canonicalText":"${"y".repeat(3 * budget)}"}`;
  writeFileSync(join(indexDirectory(storeRoot), "artifacts.jsonl"), `${long}\n${"{\"ref\":\"s\",\"canonicalText\":\"z\"}\n".repeat(20_000)}`);
  assert.equal(carryLocatedIndex(storeRoot, { steps: 1 }), "progress");
  assert.equal(marker(storeRoot).carried.artifacts, Buffer.byteLength(long) + 1, "the step stops at the long line's end");
  assert.equal(carryLocatedIndex(storeRoot), "located");
  assert.equal(locatedIndex(storeRoot).isAdmitted(address(9)), true);
});
