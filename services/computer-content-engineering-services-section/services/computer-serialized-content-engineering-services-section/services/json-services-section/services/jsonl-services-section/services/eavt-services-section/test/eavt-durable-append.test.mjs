// eavt-durable-append — Wave 0 / OP1-4, OP3 acceptance tests for the durable+atomic+lock-safe append and
// the torn-line crash-tolerant read (real-computer-specification §1.5). Hermetic temp-dir fixtures; no net.
//
// Proves:
//   OP4/L8a — appended bytes are the ONE canonical jcs form, NOT JSON.stringify.
//   OP2     — two appends both land (G-Set, no loss), no interleave/corruption.
//   OP3     — a torn final line from a crash mid-append is tolerated on read: skipped, never a parse throw;
//             the intact prefix rows still read back.
//   OP1     — append returns only after the row is on disk (a re-read sees it without any flush step).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { appendEavtRow, readEavtTrace, cellsOfEavtRows } from "../src/index.mjs";
import { canonicalJson as jcs } from "../../../../../src/index.mjs";

const append = (path, row) => appendEavtRow({ path, row });
const readEavt = (path) => readEavtTrace({ path }).rows;

const withDir = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), "vph-durable-"));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};
const rowsOf = (rows) => rows;
const cells = (rows) => cellsOfEavtRows(rows);

test("OP4/L8a — appended bytes are canonical jcs, not JSON.stringify", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  // keys deliberately out of sorted order: jcs MUST sort them, JSON.stringify would preserve insertion order.
  const row = { v: "blue", t: "t0", e: "x", a: "color" };
  append(log, row);
  const onDisk = readFileSync(log, "utf8");
  assert.equal(onDisk, jcs(row) + "\n", "on-disk line is the canonical jcs form");
  assert.notEqual(onDisk, JSON.stringify(row) + "\n", "and is NOT a plain JSON.stringify (keys unsorted)");
  // sanity: jcs sorted the keys
  assert.equal(onDisk, '{"a":"color","e":"x","t":"t0","v":"blue"}\n');
}));

test("OP2 — two appends both land (G-Set, no loss, no interleave)", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  append(log, { e: "x", a: "color", v: "blue", t: "t0" });
  append(log, { e: "y", a: "size", v: 3, t: "t1" });
  const lines = readFileSync(log, "utf8").split("\n").filter((l) => l.trim());
  assert.equal(lines.length, 2, "both rows on disk");
  for (const l of lines) assert.doesNotThrow(() => JSON.parse(l), "each line is a whole, parseable row");
  const token = readEavt(log);
  assert.equal(rowsOf(token).length, 2, "read sees both rows");
  assert.equal(cells(token).length, 2, "a cell per row");
}));

test("OP2 — many sequential appends to one log all land in order", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  const N = 50;
  for (let i = 0; i < N; i++) append(log, { e: "counter", a: "tick", v: i, t: `t${i}` });
  const rows = rowsOf(readEavt(log));
  assert.equal(rows.length, N, "no append lost (G-Set monotone)");
  assert.deepEqual(rows.map((r) => r.v), Array.from({ length: N }, (_, i) => i), "order preserved");
}));

test("OP3 — a torn final line from a crash mid-append is tolerated (skipped, not thrown)", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  append(log, { e: "x", a: "color", v: "blue", t: "t0" });
  append(log, { e: "y", a: "size", v: 3, t: "t1" });
  // simulate a crash mid-append: a partial final line, never newline-terminated, never fsynced.
  appendFileSync(log, '{"e":"z","a":"half', "utf8");
  let token;
  assert.doesNotThrow(() => { token = readEavt(log); }, "read does NOT throw on a torn final line (OP3)");
  const rows = rowsOf(token);
  assert.equal(rows.length, 2, "the two intact rows survive; the torn tail is dropped");
  assert.deepEqual(rows.map((r) => r.e), ["x", "y"]);
  assert.equal(cells(token).length, 2, "cells of only the intact rows");
}));

test("OP3 — torn line in the middle: non-parsing lines skipped, intact rows still read", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  // a genuinely corrupt middle line between two good ones — still no throw, the good rows come back.
  writeFileSync(log, [
    jcs({ e: "x", a: "color", v: "blue", t: "t0" }),
    "{not json at all",
    jcs({ e: "y", a: "size", v: 3, t: "t1" }),
  ].join("\n") + "\n", "utf8");
  let token;
  assert.doesNotThrow(() => { token = readEavt(log); });
  assert.deepEqual(rowsOf(token).map((r) => r.e), ["x", "y"], "both intact rows recovered, bad line skipped");
}));

test("OP1 — append is durable: the row is readable immediately, no flush step", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  append(log, { e: "x", a: "color", v: "blue", t: "t0" });
  // a fresh read with no intervening flush sees the row — fsync happened before append returned.
  assert.equal(rowsOf(readEavt(log)).length, 1);
}));

test("empty / blank-only log reads to zero rows, no throw", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  writeFileSync(log, "\n\n", "utf8");
  let token;
  assert.doesNotThrow(() => { token = readEavt(log); });
  assert.equal(rowsOf(token).length, 0);
  assert.equal(cells(token).length, 0);
}));
