// ST-14: the memory the store holds does not depend on how much it stores. The fixture writes bucket
// lines directly (the test, not the store, plays the part of a long history); the measurement is
// what a process retains after the store's operations ran over a settlement of that size, against
// the same operations over an empty one.
import assert from "node:assert/strict";
import test from "node:test";
import v8 from "node:v8";
import vm from "node:vm";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { niBucketPath } from "@red-cup-engineering/computer-content-address-engineering-services-section/ni-path";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { append, each, extend, get, has, heads, put, readHead, readLog, walk } from "../src/store.mjs";

v8.setFlagsFromString("--expose-gc");
const gc = vm.runInNewContext("gc");
const COUNT = 30_000;
const BOUND = 2 * 1024 * 1024;

function populate(root) {
  let previous = [];
  for (let n = 0; n < COUNT; n += 1) {
    const record = { n, causes: previous, note: "a record of the long history" };
    const address = semanticId(record);
    const file = join(root, "data/records/event-records", niBucketPath(address));
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, `{"id":"${address}","record":${JSON.stringify(record)}}\n`);
    previous = n % 200 === 199 ? [] : [address];
    if (n === COUNT - 1) { mkdirSync(join(root, "data/state/event-state"), { recursive: true }); extend(root, "event", "tail", { n: "tail" }, { causes: [address] }); }
  }
  for (let n = 0; n < COUNT; n += 1) {
    const day = `2026-10-${String(1 + (n % 9)).padStart(2, "0")}`;
    appendFileSync(join(root, `data/logs/event-logs/${day}.jsonl`), `{"at":"${day}T00:00:00Z","n":${n}}\n`, { flag: "a" });
  }
}

function operate(root) {
  for (let round = 0; round < 40; round += 1) {
    const address = put(root, "event", { round, probe: true });
    assert.equal(has(root, "event", address), true);
    get(root, "event", semanticId({ absent: round }));
    const head = readHead(root, "event", "tail");
    if (head !== undefined) for (const step of walk(root, "event", head.frontier, { limit: 256 })) void step;
    append(root, "probe", { at: "2026-10-12T00:00:00Z", round });
    for (const entry of readLog(root, "event", "2026-10-01")) void entry;
    for (const entry of heads(root, "event")) void entry;
  }
  let seen = 0;
  for (const entry of each(root, "event")) { seen += 1; if (seen >= 2_000) break; }
}

const retained = () => { gc(); gc(); const usage = process.memoryUsage(); return usage.heapUsed + usage.external + usage.arrayBuffers; };

test("ST-14: what a process retains after store calls does not grow with the store", () => {
  const empty = mkdtempSync(join(tmpdir(), "store-memory-empty-"));
  const full = mkdtempSync(join(tmpdir(), "store-memory-full-"));
  try {
    mkdirSync(join(full, "data/logs/event-logs"), { recursive: true });
    populate(full);
    operate(empty); operate(full); // warm up: code, regexps, the shapes of the structures
    const before = retained();
    operate(empty);
    const afterEmpty = retained();
    operate(full);
    const afterFull = retained();
    const emptyGrowth = afterEmpty - before, fullGrowth = afterFull - afterEmpty;
    assert.ok(Math.abs(fullGrowth - emptyGrowth) < BOUND, `retained growth differs by ${fullGrowth - emptyGrowth} bytes over ${COUNT} records`);
  } finally { rmSync(empty, { recursive: true, force: true }); rmSync(full, { recursive: true, force: true }); }
});

test("ST-14: a walk holds only its visited addresses", () => {
  const root = mkdtempSync(join(tmpdir(), "store-memory-walk-"));
  try {
    let previous = [];
    for (let n = 0; n < 600; n += 1) previous = [put(root, "link", { n, causes: previous })];
    const steps = [...walk(root, "link", previous, { limit: 256 })];
    assert.equal(steps.filter((step) => step.record).length, 256);
    assert.deepEqual(steps.at(-1), { truncated: true });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
