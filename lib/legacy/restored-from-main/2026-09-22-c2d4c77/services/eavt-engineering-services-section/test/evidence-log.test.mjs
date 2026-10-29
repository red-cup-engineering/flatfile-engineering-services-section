import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { entry, seavt, asSeavt, isSeavt, identifySeavtSemanticContent } from "../src/row.mjs";
import { appendEntries, appendSeavt, logPathFor, readEntries, readSeavt, readSeavtAtPath } from "../src/journal.mjs";
import { latestPerCell, reading } from "../src/state.mjs";
import { checkConfiguredSemanticRecordReferences, createSemanticRecordJournal } from "../src/semantic-record.mjs";

const mark = (name) => ["mark", name];
function withRoot(run) {
  const root = mkdtempSync(path.join(tmpdir(), "eavt-evidence-"));
  try { return run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test("generic row and strict semantic profile remain distinct", () => {
  const generic = entry("subject", "predicate", { value: 1 }, "2026-09-20T00:00:00.000Z");
  assert.equal(isSeavt(generic), false);
  const strict = seavt(mark("subject"), mark("predicate"), mark("value"), generic.t);
  assert.deepEqual(asSeavt(strict), strict);
  const identity = identifySeavtSemanticContent(strict, { feed: "evidence", partition: "2026-09-20" });
  assert.equal(identity.source.e[1], "subject");
});

test("custody deduplicates within a dated feed and derives append trace", () => withRoot((root) => {
  const at = "2026-09-20T00:00:00.000Z";
  const rows = [entry("s", "p", 1, at), entry("s", "p", 2, at)];
  assert.deepEqual(appendEntries(root, "events", rows, at), { appended: 2 });
  assert.deepEqual(appendEntries(root, "events", rows, at), { appended: 0 });
  assert.deepEqual(readEntries(root, "events", at).map(({ trace }) => trace), [1, 2]);
  const strict = [seavt(mark("s"), mark("p"), mark("v"), at)];
  assert.deepEqual(appendSeavt(root, "semantic", strict, at), { appended: 1 });
  assert.deepEqual(readSeavt(root, "semantic", at).map(({ entry: row }) => row), strict);
  assert.deepEqual(readSeavtAtPath(logPathFor(root, "semantic", at)), strict);
}));

test("latest state and situational reading retain distinct semantics", () => {
  const rows = [entry("s", "status", "open", 1), entry("s", "status", "closed", 2), entry("s", "status", null, 3)];
  const state = latestPerCell(rows);
  assert.equal(Object.values(state)[0].value, null);
  const observed = reading(rows, { since: 1, until: 2 });
  assert.equal(Object.values(observed)[0].contested, true);
});

test("content record projection identifies and queries only its object kind", () => withRoot((root) => {
  const journal = createSemanticRecordJournal({ root, objectKind: "test.evidence" });
  const result = journal.record({ category: "observation", record: { value: "kept" }, recordedAt: "2026-09-20T00:00:00.000Z", charge: { support: true, refutation: false } });
  assert.equal(result.appended, 1);
  assert.deepEqual(journal.query({ category: "observation" }).map(({ record }) => record), [{ value: "kept" }]);
  assert.deepEqual(createSemanticRecordJournal({ root, objectKind: "other.evidence" }).query({ category: "observation" }), []);
}));

test("configured reference checks are a read-only projection of admitted records", () => withRoot((root) => {
  const sourceRoot = path.join(root, "source");
  mkdirSync(sourceRoot);
  const journal = createSemanticRecordJournal({ root, objectKind: "test.reference" });
  const admitted = journal.record({ category: "observation", record: { value: "kept" }, recordedAt: "2026-09-20T00:00:00.000Z", charge: { support: true, refutation: false } });
  writeFileSync(path.join(sourceRoot, "known.json"), JSON.stringify({ reference: admitted.id }));
  writeFileSync(path.join(sourceRoot, "missing.json"), JSON.stringify({ reference: "ni:///sha-256;missing" }));
  const result = checkConfiguredSemanticRecordReferences({ sourceRoot, journalRoot: root, objectKind: "test.reference", category: "observation", referencePointer: "/reference" });
  assert.equal(result.ok, false);
  assert.equal(result.rows.length, 1);
  assert.match(result.rows[0].reason, /names no admitted record/);
}));

test("one witness-journal application dispatches custody and state operations", () => withRoot((root) => {
  const app = new URL("../apps/witness-journal.mjs", import.meta.url);
  const at = "2026-09-20T00:00:00.000Z";
  const appended = spawnSync(process.execPath, [app.pathname, "append-entries", "--root", root, "--feed", "events", "--at", at], {
    input: JSON.stringify([entry("s", "p", 1, at)]), encoding: "utf8",
  });
  assert.equal(appended.status, 0, appended.stderr);
  assert.deepEqual(JSON.parse(appended.stdout), { appended: 1 });
  const state = spawnSync(process.execPath, [app.pathname, "read-state"], {
    input: JSON.stringify([entry("s", "p", 1, at)]), encoding: "utf8",
  });
  assert.equal(state.status, 0, state.stderr);
  assert.equal(Object.values(JSON.parse(state.stdout))[0].value, 1);
}));
