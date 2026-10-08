import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { recordSemanticRecord } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { querySemanticRecords } from "@red-cup-engineering/semiotic-eavt-services-section/query-semantic-records";

test("a record whose content holds a 500-item list records and reads back", (t) => {
  const root = mkdtempSync(join(tmpdir(), "long-list-record-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const ids = Array.from({ length: 500 }, (_, index) => `ni:///sha-256;item-${index}`);
  const recorded = recordSemanticRecord({
    root,
    objectKind: "test.long-list",
    category: "claims",
    record: { ids, nested: [ids.slice(0, 60), { more: ids.slice(0, 70) }] },
    recordedAt: "2026-10-04T00:00:00.000Z",
    told: { for: true, against: false },
  });
  assert.equal(recorded.appended, 1);
  const rows = querySemanticRecords({ root, objectKind: "test.long-list", category: "claims" });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].record.ids, ids);
  assert.equal(rows[0].record.nested[1].more.length, 70);
});
