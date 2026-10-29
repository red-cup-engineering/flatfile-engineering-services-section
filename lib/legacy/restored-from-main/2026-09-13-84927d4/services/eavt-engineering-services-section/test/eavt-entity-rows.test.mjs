// eavt-entity-rows.test.mjs — conformance tests for readEavtEntityRows: correctness (stratify +
// section over the entity subset equal stratify + section over the full trace, for a fixture with
// converse declarations, a contradiction, and an unrelated entity), and the on-disk index's
// build-once/reuse/invalidate-on-growth behavior. Hermetic temp-dir fixtures; no net.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { appendEavt, readEavtFile, readEavtEntityRows, stratify, section, constituteEntity, resolveProofTree } from "../src/eavt.mjs";

const withDir = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), "eavt-entity-rows-test-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

// A fixture with: a has-converse declaration (shut redirects onto open's negative face), a
// contradiction (x told both open and shut on the same object), a retracted-then-reasserted
// predicate, and an unrelated entity y that must not leak into x's subset.
function seedFixture(trace) {
  appendEavt(trace, { e: "open", a: "has-converse", v: "shut", t: 0 });
  appendEavt(trace, { e: "x", a: "open", v: "door", t: 1 });
  appendEavt(trace, { e: "x", a: "shut", v: "door", t: 2 });
  appendEavt(trace, { e: "y", a: "color", v: "red", t: 1 });
  appendEavt(trace, { e: "x", a: "color", v: "blue", t: 3 });
  appendEavt(trace, { e: "x", a: "color", v: null, t: 4 });
  appendEavt(trace, { e: "x", a: "color", v: "green", t: 5 });
}

const askCellEquivalent = (entity, rows) => {
  const strata = stratify(entity, rows, { converse: {} });
  return section(strata.settled);
};

test("readEavtEntityRows: stratify + section over the subset equal stratify + section over the full trace", () => withDir((dir) => {
  const trace = join(dir, "t.eavt");
  seedFixture(trace);

  const full = readEavtFile(trace);
  const subset = readEavtEntityRows({ path: trace, entity: "x" });

  assert.ok(subset.length < full.length, "the subset is strictly smaller than the full trace (y's row excluded)");
  assert.deepEqual(askCellEquivalent("x", subset), askCellEquivalent("x", full));

  const settled = askCellEquivalent("x", subset);
  assert.deepEqual(settled.contradicted, [{ predicate: "open", object: "door" }], "the converse-declared contradiction still settles");
  assert.deepEqual(settled.affirmed, [{ predicate: "color", object: "green" }], "the retracted-then-reasserted predicate settles to the reassertion only");
}));

test("readEavtEntityRows: an unknown entity returns no rows of its own, matching a full-trace filter", () => withDir((dir) => {
  const trace = join(dir, "t.eavt");
  seedFixture(trace);
  const subset = readEavtEntityRows({ path: trace, entity: "nowhere" });
  assert.deepEqual(subset.filter((r) => r.e === "nowhere"), []);
  assert.deepEqual(askCellEquivalent("nowhere", subset), askCellEquivalent("nowhere", readEavtFile(trace)));
}));

test("readEavtEntityRows: builds the index once and reuses it on a second call", () => withDir((dir) => {
  const trace = join(dir, "t.eavt");
  seedFixture(trace);
  const indexPath = `${trace}.entity-index.json`;

  assert.equal(existsSync(indexPath), false, "no index before the first read");
  readEavtEntityRows({ path: trace, entity: "x" });
  assert.equal(existsSync(indexPath), true, "the index is built on first miss");
  const firstMtime = statSync(indexPath).mtimeMs;

  readEavtEntityRows({ path: trace, entity: "y" });
  const secondMtime = statSync(indexPath).mtimeMs;
  assert.equal(secondMtime, firstMtime, "the second read reuses the cached index rather than rebuilding it");
}));

test("readEavtEntityRows: rebuilds the index when the trace grows, and still answers correctly", () => withDir((dir) => {
  const trace = join(dir, "t.eavt");
  seedFixture(trace);
  const indexPath = `${trace}.entity-index.json`;

  readEavtEntityRows({ path: trace, entity: "x" });
  const beforeMtime = statSync(indexPath).mtimeMs;

  appendEavt(trace, { e: "z", a: "color", v: "purple", t: 6 });
  const subset = readEavtEntityRows({ path: trace, entity: "z" });
  const afterMtime = statSync(indexPath).mtimeMs;

  assert.notEqual(afterMtime, beforeMtime, "a grown trace invalidates the cached index by content digest");
  assert.deepEqual(subset.filter((r) => r.e === "z"), [{ e: "z", a: "color", v: "purple", t: 6 }]);
  assert.deepEqual(subset.filter((r) => r.a === "has-converse"), [{ e: "open", a: "has-converse", v: "shut", t: 0 }], "has-converse declarations are always included, trace-wide");
}));

test("readEavtEntityRows: includes the citation closure so resolveProofTree over the subset matches resolveProofTree over the full trace", () => withDir((dir) => {
  const trace = join(dir, "t.eavt");
  seedFixture(trace);
  const cited = constituteEntity({ kind: "task", attributes: { title: "dep" }, t: 10 });
  appendEavt(trace, cited.genesisRow);
  const citer = constituteEntity({ kind: "task", attributes: { ref: cited.address }, t: 11 });
  appendEavt(trace, citer.genesisRow);
  // an unrelated entity between the citer and its citation must not be required for closure.
  appendEavt(trace, { e: "unrelated", a: "color", v: "teal", t: 12 });

  const full = readEavtFile(trace);
  const subset = readEavtEntityRows({ path: trace, entity: citer.address });

  assert.deepEqual(
    resolveProofTree({ rows: subset, root: citer.address }),
    resolveProofTree({ rows: full, root: citer.address }),
    "the proof tree resolved over the entity subset matches the one resolved over the full trace",
  );
  assert.ok(subset.some((r) => r.e === cited.address), "the cited entity's row is pulled into the subset");
  assert.equal(subset.some((r) => r.e === "unrelated"), false, "an uncited unrelated entity is excluded");
}));

test("readEavtEntityRows: refuses a non-string path", () => {
  assert.throws(() => readEavtEntityRows({ path: "", entity: "x" }), TypeError);
  assert.throws(() => readEavtEntityRows({ entity: "x" }), TypeError);
});
