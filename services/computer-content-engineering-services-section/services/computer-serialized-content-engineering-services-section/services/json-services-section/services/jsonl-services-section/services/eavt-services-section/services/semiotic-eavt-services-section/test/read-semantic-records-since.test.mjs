import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { journalCursorStart, readSemanticRecordsSince } from "@red-cup-engineering/semiotic-eavt-services-section/read-semantic-records-since";
import { segmentAdmittedLogs, segmentPath } from "@red-cup-engineering/semiotic-eavt-services-section/journal/filesystem/segment-store";
import { journalDirectoryOf } from "@red-cup-engineering/semiotic-eavt-services-section/journal/store-root";

const HELD = { for: true, against: false };
const scratch = (t) => { const root = mkdtempSync(join(tmpdir(), "read-since-")); t.after(() => rmSync(root, { recursive: true, force: true })); return root; };

test("a reader reads each record once: what was admitted since its cursor, across days and categories", (t) => {
  const root = scratch(t);
  const journal = createSemanticRecordJournal({ root, objectKind: "test.inbox" });
  journal.record({ category: "inbox", recordedAt: "2026-10-09T23:00:00.000Z", told: HELD, record: { n: 1 } });
  journal.record({ category: "outbox", recordedAt: "2026-10-09T23:30:00.000Z", told: HELD, record: { n: 2 } });
  journal.record({ category: "inbox", recordedAt: "2026-10-10T01:00:00.000Z", told: HELD, record: { n: 3 } });

  const first = journal.readSince({ category: "inbox" });
  assert.deepEqual(first.records.map((row) => row.record.n), [1, 3]);
  assert.equal(first.reset, false);
  assert.deepEqual(journal.readSince({ category: "inbox", cursor: first.cursor }).records, [], "nothing new, nothing read");

  journal.record({ category: "inbox", recordedAt: "2026-10-10T02:00:00.000Z", told: HELD, record: { n: 4 } });
  journal.record({ category: "inbox", recordedAt: "2026-10-11T00:00:00.000Z", told: { for: false, against: true }, record: { n: 5 } });
  // The cursor is plain data: a reader keeps it as JSON between runs.
  const kept = JSON.parse(JSON.stringify(first.cursor));
  const second = journal.readSince({ category: "inbox", cursor: kept });
  assert.deepEqual(second.records.map((row) => [row.record.n, row.told.against]), [[4, false], [5, true]]);
  assert.equal(second.records[0].category, "inbox");
  assert.equal(second.records[0].objectKind, "test.inbox");
  assert.match(second.records[0].event, /^ni:\/\/\/sha-256;/u);
  // One cursor serves every category of the kind.
  assert.deepEqual(journal.readSince({ cursor: journalCursorStart("test.inbox") }).records.map((row) => row.record.n), [1, 2, 3, 4, 5]);
  assert.deepEqual(readSemanticRecordsSince({ root, objectKind: "test.inbox", category: "outbox", cursor: second.cursor }).records, []);
});

test("a cursor of another kind is refused; a rewritten feed reads again from the start, saying so", (t) => {
  const root = scratch(t);
  const journal = createSemanticRecordJournal({ root, objectKind: "test.inbox" });
  journal.record({ category: "inbox", recordedAt: "2026-10-10T00:00:00.000Z", told: HELD, record: { n: 1 } });
  journal.record({ category: "inbox", recordedAt: "2026-10-10T00:00:01.000Z", told: HELD, record: { n: 2 } });
  const { cursor } = journal.readSince({ category: "inbox" });
  assert.throws(() => journal.readSince({ category: "inbox", cursor: journalCursorStart("test.other") }), /not a journal cursor/u);
  assert.throws(() => journal.readSince({ category: "inbox", cursor: { kind: "x" } }), /not a journal cursor/u);

  const [log] = segmentAdmittedLogs(journalDirectoryOf(root));
  const file = segmentPath(log), lines = readFileSync(file, "utf8").split("\n");
  writeFileSync(file, `${lines[0]}\n`);
  const again = journal.readSince({ category: "inbox", cursor });
  assert.equal(again.reset, true);
  assert.deepEqual(again.records.map((row) => row.record.n), [1]);
});

test("a witness altered in its feed is refused when read", (t) => {
  const root = scratch(t);
  const journal = createSemanticRecordJournal({ root, objectKind: "test.inbox" });
  journal.record({ category: "inbox", recordedAt: "2026-10-10T00:00:00.000Z", told: HELD, record: { text: "original-value" } });
  const [log] = segmentAdmittedLogs(journalDirectoryOf(root));
  const file = segmentPath(log);
  writeFileSync(file, readFileSync(file, "utf8").replaceAll("original-value", "altered--value"));
  assert.throws(() => journal.readSince({ category: "inbox" }));
});
