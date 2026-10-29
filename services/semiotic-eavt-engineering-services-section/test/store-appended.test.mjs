import assert from "node:assert/strict";
import test from "node:test";
import { appendFileSync, mkdtempSync, renameSync, rmSync, truncateSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appended, each, put } from "../src/store.mjs";
import { recordFile } from "../src/layout.mjs";

const roots = [];
function settlement() { const root = mkdtempSync(join(tmpdir(), "store-appended-")); roots.push(root); return root; }
test.after(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });
const addresses = (reading) => reading.records.map(({ address }) => address).sort();

test("appended without a cursor reads every record, as each does", () => {
  const root = settlement();
  for (let n = 0; n < 50; n += 1) put(root, "move", { at: `2026-10-21T00:00:${String(n).padStart(2, "0")}Z`, n });
  const reading = appended(root, "move");
  assert.deepEqual(addresses(reading), [...each(root, "move")].map(({ address }) => address).sort());
  assert.equal(reading.records.length, 50);
});

test("appended with a cursor reads only records put since, and nothing when nothing was", () => {
  const root = settlement();
  for (let n = 0; n < 20; n += 1) put(root, "move", { n });
  const first = appended(root, "move");
  const later = [put(root, "move", { n: 20 }), put(root, "move", { n: 21 })].sort();
  const second = appended(root, "move", first.cursor);
  assert.deepEqual(addresses(second), later);
  const third = appended(root, "move", second.cursor);
  assert.deepEqual(third.records, []);
  // A record put again is not appended again (ST-3), so it is not read again.
  put(root, "move", { n: 21 });
  assert.deepEqual(appended(root, "move", third.cursor).records, []);
});

test("appended leaves a line not yet terminated for the next call", () => {
  const root = settlement();
  const address = put(root, "move", { n: 1 });
  const { cursor } = appended(root, "move");
  const file = recordFile(root, "move", address);
  // A writer's line arrives in two writes: half of a verified line for this bucket, then the rest.
  const full = readFileSync(file, "utf8").trimEnd();
  appendFileSync(file, full.slice(0, 10));
  const partial = appended(root, "move", cursor);
  assert.deepEqual(partial.records, [], "an unterminated line is not read");
  appendFileSync(file, full.slice(10) + "\n");
  const finished = appended(root, "move", partial.cursor);
  assert.deepEqual(addresses(finished), [address], "the finished line is read once");
});

test("appended says reset when a bucket shrank, was replaced or is gone", () => {
  const root = settlement();
  const address = put(root, "move", { n: 1 });
  const file = recordFile(root, "move", address);
  const { cursor } = appended(root, "move");

  const bytes = readFileSync(file);
  truncateSync(file, 0);
  assert.equal(appended(root, "move", cursor).reset, true, "shrank");
  writeFileSync(file, bytes);

  const { cursor: again } = appended(root, "move");
  const replacement = `${file}.next`;
  writeFileSync(replacement, bytes);
  renameSync(replacement, file);
  assert.notEqual(statSync(file).ino, undefined);
  assert.equal(appended(root, "move", again).reset, true, "replaced");

  const { cursor: before } = appended(root, "move");
  rmSync(file);
  assert.equal(appended(root, "move", before).reset, true, "gone");
});

test("appended refuses a cursor it did not make", () => {
  const root = settlement();
  put(root, "move", { n: 1 });
  assert.throws(() => appended(root, "move", { buckets: {} }), /cursor/u);
});
