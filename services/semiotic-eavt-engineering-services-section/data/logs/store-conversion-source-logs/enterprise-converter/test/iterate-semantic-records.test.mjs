import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { iterateSemanticRecordsThroughDate, semanticRecordRevisionThroughDate } from "@red-cup-engineering/semiotic-eavt-services-section/iterate-semantic-records";

const HELD = { for: true, against: false };

test("records are read a day at a time through a date, in the order recorded, for one category", (t) => {
  const root = mkdtempSync(join(tmpdir(), "iterate-semantic-records-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const journal = createSemanticRecordJournal({ root, objectKind: "test.roadmap" });
  const write = (category, n, recordedAt) => journal.record({ category, record: { n }, recordedAt, told: HELD });
  write("cut", 1, "2026-10-08T01:00:00.000Z");
  write("correction", 2, "2026-10-08T02:00:00.000Z");
  write("cut", 3, "2026-10-09T01:00:00.000Z");
  write("cut", 4, "2026-10-10T01:00:00.000Z");

  const read = (throughDate) => [...iterateSemanticRecordsThroughDate({ root, objectKind: "test.roadmap", category: "cut", throughDate })].map((row) => row.record.n);
  assert.deepEqual(read(undefined), [1, 3, 4]);
  assert.deepEqual(read("2026-10-09"), [1, 3]);
  assert.deepEqual(read("2026-10-09T23:59:59.000Z"), [1, 3]);
  assert.deepEqual(read("2026-10-07"), []);
  assert.deepEqual([...iterateSemanticRecordsThroughDate({ root, objectKind: "test.roadmap", category: "correction" })].map((row) => row.record.n), [2]);
  const [first] = iterateSemanticRecordsThroughDate({ root, objectKind: "test.roadmap", category: "cut" });
  assert.deepEqual(first.told, HELD);
  assert.equal(first.objectKind, "test.roadmap");
  assert.match(first.id, /^ni:\/\/\/sha-256;/u);

  const before = semanticRecordRevisionThroughDate({ root, objectKind: "test.roadmap", throughDate: "2026-10-09" });
  assert.equal(semanticRecordRevisionThroughDate({ root, objectKind: "test.roadmap", throughDate: "2026-10-09" }), before, "unchanged journal, same revision");
  write("cut", 5, "2026-10-10T02:00:00.000Z");
  assert.equal(semanticRecordRevisionThroughDate({ root, objectKind: "test.roadmap", throughDate: "2026-10-09" }), before, "a later day does not change an earlier revision");
  write("cut", 6, "2026-10-09T02:00:00.000Z");
  assert.notEqual(semanticRecordRevisionThroughDate({ root, objectKind: "test.roadmap", throughDate: "2026-10-09" }), before);
  assert.equal(semanticRecordRevisionThroughDate({ root, objectKind: "test.absent" }), "");
  assert.throws(() => [...iterateSemanticRecordsThroughDate({ root, objectKind: "test.roadmap" })], TypeError);
});
