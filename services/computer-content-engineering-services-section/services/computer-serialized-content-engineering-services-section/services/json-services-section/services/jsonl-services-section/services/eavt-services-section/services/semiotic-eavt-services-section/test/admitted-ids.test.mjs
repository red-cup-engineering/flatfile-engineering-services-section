import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { AdmittedIds } from "../src/journal/filesystem/segment-store.mjs";

const address = (n) => `ni:///sha-256;${createHash("sha256").update(String(n)).digest("base64url")}`;

test("a packed admitted index answers as a Map of Sets would, across growth and re-admission", () => {
  const packed = new AdmittedIds();
  const model = new Map(), byLog = new Map();
  const logs = ["2026/10/01/a.jsonl", "2026/10/02/b.jsonl", "2026/10/03/c.jsonl"];
  for (let n = 0; n < 5000; n += 1) {
    const id = address(n % 3700), log = logs[n % 3];
    packed.add(id, log);
    model.set(id, (model.get(id) ?? new Set()).add(log));
    byLog.set(log, (byLog.get(log) ?? new Set()).add(id));
  }
  packed.add("odd-id", logs[0]);
  model.set("odd-id", new Set([logs[0]]));
  byLog.get(logs[0]).add("odd-id");
  for (const [id, set] of model) {
    assert.ok(packed.has(id));
    assert.deepEqual([...packed.get(id)].sort(), [...set].sort());
    for (const log of logs) assert.equal(packed.byLog.get(log).has(id), set.has(log));
  }
  assert.equal(packed.has(address("absent")), false);
  assert.equal(packed.get(address("absent")), undefined);
  assert.equal(packed.byLog.size, 3);
  assert.deepEqual([...packed.byLog.keys()], logs);
  assert.equal(packed.byLog.get("nowhere"), undefined);
  for (const log of logs) {
    assert.equal(packed.byLog.get(log).size, byLog.get(log).size);
    assert.deepEqual([...packed.byLog.get(log)].sort(), [...byLog.get(log)].sort());
  }
});

test("a reading cache is bounded by the heap its readings are estimated to hold, least recently kept first", async () => {
  const { readingCache } = await import("../src/journal/filesystem/segment-store.mjs");
  const cache = readingCache(100, 4);
  cache.keep("a", "A", 40);
  cache.keep("b", "B", 40);
  cache.keep("c", "C", 40);
  assert.equal(cache.has("a"), false, "the least recently kept reading made room");
  assert.equal(cache.cost, 80);
  cache.keep("b", "B2", 10);
  assert.equal(cache.get("b"), "B2");
  assert.equal(cache.cost, 50);
  cache.keep("huge", "H", 101);
  assert.equal(cache.has("huge"), false, "a reading dearer than the budget is not kept");
  assert.equal(cache.cost, 50);
  for (const key of ["d", "e", "f"]) cache.keep(key, key, 1);
  assert.equal(cache.size, 4, "the entry count is bounded too");
  cache.clear();
  assert.equal(cache.cost, 0);
});
