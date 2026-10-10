import assert from "node:assert/strict";
import { mkdtempSync, rmSync, truncateSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { recordSemanticRecord, semanticRecordFeed } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { clearQueryResultReadings, queryResultReadingUse, querySemanticRecords } from "@red-cup-engineering/semiotic-eavt-services-section/query-semantic-records";
import { segmentPath } from "../src/journal/filesystem/segment-store.mjs";

const kind = "test.query-result-readings";
const told = { for: true, against: false };
const at = "2026-10-10T02:00:00.000Z";

test("stable category queries reuse a bounded reading without sharing mutable values", (t) => {
  const root = mkdtempSync(join(tmpdir(), "query-result-readings-"));
  t.after(() => { clearQueryResultReadings(); rmSync(root, { recursive: true, force: true }); });
  clearQueryResultReadings();
  recordSemanticRecord({ root, objectKind: kind, category: "office", record: { nested: { value: 1 } }, recordedAt: at, told });
  const first = querySemanticRecords({ root, objectKind: kind, category: "office" });
  assert.equal(first.length, 1);
  assert.equal(queryResultReadingUse().entries, 1);
  first[0].record.nested.value = 99;
  const second = querySemanticRecords({ root, objectKind: kind, category: "office" });
  assert.equal(second[0].record.nested.value, 1);
  assert.ok(Object.isFrozen(second));
  assert.ok(Object.isFrozen(second[0]));
  assert.ok(Object.isFrozen(second[0].told));
});

test("a fresh journal append invalidates a held reading and reads new evidence", (t) => {
  const root = mkdtempSync(join(tmpdir(), "query-result-append-"));
  t.after(() => { clearQueryResultReadings(); rmSync(root, { recursive: true, force: true }); });
  clearQueryResultReadings();
  recordSemanticRecord({ root, objectKind: kind, category: "office", record: { n: 1 }, recordedAt: at, told });
  assert.deepEqual(querySemanticRecords({ root, objectKind: kind, category: "office" }).map((row) => row.record.n), [1]);
  recordSemanticRecord({ root, objectKind: kind, category: "office", record: { n: 2 }, recordedAt: "2026-10-10T02:00:01.000Z", told });
  assert.deepEqual(querySemanticRecords({ root, objectKind: kind, category: "office" }).map((row) => row.record.n), [1, 2]);
  assert.equal(queryResultReadingUse().entries, 1, "changed source replaces, rather than accumulates a stale reading");
});

test("a truncated segment invalidates cached results and fails closed against its admission ledger", (t) => {
  const root = mkdtempSync(join(tmpdir(), "query-result-corrupt-"));
  t.after(() => { clearQueryResultReadings(); rmSync(root, { recursive: true, force: true }); });
  clearQueryResultReadings();
  recordSemanticRecord({ root, objectKind: kind, category: "office", record: { n: 1 }, recordedAt: at, told });
  assert.equal(querySemanticRecords({ root, objectKind: kind, category: "office" }).length, 1);
  truncateSync(segmentPath(semanticRecordFeed(root, kind, at)), 0);
  assert.throws(
    () => querySemanticRecords({ root, objectKind: kind, category: "office" }),
    /lacks witnesses|journal segment/u,
    "a cached success never hides a lost admitted segment",
  );
});
