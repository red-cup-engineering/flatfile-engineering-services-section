// The SEAVT reading caches' budgets, set by the environment: a byte count, `unbounded`, or the default.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { cacheBudgetFromEnvironment, readingCache } from "../src/journal/filesystem/segment-store.mjs";
import { jsonToTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-engineering-services-section/semantic-content-identity";

const MB = 1024 * 1024;
// A fresh process imports this package's own source, so it reads the budgets its environment gives.
const QUERY_MODULE = JSON.stringify(new URL("../src/query-semantic-records.mjs", import.meta.url).href);

test("a budget is a byte count, unbounded, or the default; anything else throws naming the variable", () => {
  assert.equal(cacheBudgetFromEnvironment("SEAVT_X", 4 * MB, {}), 4 * MB);
  assert.equal(cacheBudgetFromEnvironment("SEAVT_X", 4 * MB, { SEAVT_X: "  " }), 4 * MB);
  assert.equal(cacheBudgetFromEnvironment("SEAVT_X", 4 * MB, { SEAVT_X: "unbounded" }), Infinity);
  assert.equal(cacheBudgetFromEnvironment("SEAVT_X", 4 * MB, { SEAVT_X: "1048576" }), MB);
  assert.equal(cacheBudgetFromEnvironment("SEAVT_X", 4 * MB, { SEAVT_X: "0" }), 0);
  for (const bad of ["lots", "-1", "1.5", "4MB", "Infinity"]) {
    assert.throws(() => cacheBudgetFromEnvironment("SEAVT_X", 4 * MB, { SEAVT_X: bad }), (error) => error instanceof RangeError && /SEAVT_X/u.test(error.message));
  }
});

test("a bounded cache refuses a reading dearer than its budget; an unbounded one holds every reading and evicts none", () => {
  const bounded = readingCache(100, 2);
  bounded.keep("dear", "r", 101);
  assert.equal(bounded.has("dear"), false, "the default behaviour is unchanged: over budget is not held");
  for (const key of ["a", "b", "c"]) bounded.keep(key, key, 10);
  assert.equal(bounded.size, 2, "the entry limit still evicts");

  const unbounded = readingCache(Infinity, 2);
  unbounded.keep("dear", "r", 10 * 1024 * MB);
  for (const key of ["a", "b", "c", "d"]) unbounded.keep(key, key, 10);
  assert.equal(unbounded.size, 5, "no eviction, whatever the entry limit");
  assert.equal(unbounded.get("dear"), "r");
});

const kind = "test.cache-budgets";
/** One legacy SEAVT feed whose "move" records estimate far above a small budget. */
function legacyFeed(root) {
  const directory = join(root, "data", "logs", "2026", "09", "01");
  mkdirSync(directory, { recursive: true });
  const lines = [];
  for (let n = 0; n < 20; n += 1) {
    const value = { n, body: "x".repeat(16 * 1024) };
    const { id } = identifyJsonSemanticContent({ objectKind: kind, value, witnessRoot: EMPTY_WITNESS_ROOT });
    lines.push(JSON.stringify({ e: jsonToTerm(id), a: jsonToTerm("move"), v: jsonToTerm(value), t: `2026-09-01T00:00:${String(n).padStart(2, "0")}.000Z` }));
  }
  appendFileSync(join(directory, "witness-journal-seavt.jsonl"), `${lines.join("\n")}\n`);
}

/** Query the feed twice in a fresh process under `environment`; report whether the reading was held. */
function queryTwice(root, environment) {
  const source = `
    const { querySemanticRecords, legacyReadingUse } = await import(${QUERY_MODULE});
    const first = querySemanticRecords({ root: ${JSON.stringify(root)}, objectKind: ${JSON.stringify(kind)}, category: "move" });
    const held = legacyReadingUse();
    const second = querySemanticRecords({ root: ${JSON.stringify(root)}, objectKind: ${JSON.stringify(kind)}, category: "move" });
    process.stdout.write(JSON.stringify({ first: first.length, second: second.length, held }));`;
  return spawnSync(process.execPath, ["--input-type=module", "-e", source], {
    cwd: import.meta.dirname, encoding: "utf8", env: { ...process.env, ...environment },
  });
}

test("SEAVT_READING_CACHE_BYTES=unbounded holds a reading the default budget refuses, so a second query parses nothing again", (t) => {
  const root = mkdtempSync(join(tmpdir(), "seavt-cache-budgets-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  legacyFeed(root);

  const small = queryTwice(root, { SEAVT_READING_CACHE_BYTES: String(64 * 1024) });
  assert.equal(small.status, 0, small.stderr);
  const bounded = JSON.parse(small.stdout);
  assert.deepEqual([bounded.first, bounded.second], [20, 20]);
  assert.equal(bounded.held.entries, 0, "over budget: nothing held, so the next query parses the feed again");

  const all = queryTwice(root, { SEAVT_READING_CACHE_BYTES: "unbounded" });
  assert.equal(all.status, 0, all.stderr);
  const unbounded = JSON.parse(all.stdout);
  assert.deepEqual([unbounded.first, unbounded.second], [20, 20]);
  assert.equal(unbounded.held.entries, 1, "held: the next query reads only what was appended");
  assert.ok(unbounded.held.heap > 64 * 1024);
});

test("an invalid budget stops the process at start-up, naming the variable", () => {
  for (const name of ["SEAVT_READING_CACHE_BYTES", "SEAVT_SEGMENT_CACHE_BYTES", "SEAVT_PROJECTION_CACHE_BYTES"]) {
    const run = spawnSync(process.execPath, ["--input-type=module", "-e", `await import(${QUERY_MODULE});`], {
      cwd: import.meta.dirname, encoding: "utf8", env: { ...process.env, [name]: "plenty" },
    });
    assert.notEqual(run.status, 0, `${name}=plenty must not start`);
    assert.match(run.stderr, new RegExp(name, "u"));
  }
});
