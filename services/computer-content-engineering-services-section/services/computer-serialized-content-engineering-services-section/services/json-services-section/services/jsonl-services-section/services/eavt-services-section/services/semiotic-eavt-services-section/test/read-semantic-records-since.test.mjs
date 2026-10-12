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

test("finite turns resume after exactly received witnesses across filtering, restart and growing history", (t) => {
  const root = scratch(t), journal = createSemanticRecordJournal({ root, objectKind: "test.turn" });
  for (let n = 0; n < 7; n += 1) journal.record({ category: n % 2 ? "other" : "inbox", recordedAt: `2026-10-10T00:00:0${n}.000Z`, told: n === 4 ? { for: true, against: true } : HELD, record: { n } });
  let read = journal.readSince({ category: "inbox", maxRecords: 2 });
  assert.equal(read.visited, 2);
  assert.equal(read.more, true);
  assert.deepEqual(read.records.map(row => row.record.n), [0]);
  const values = [...read.records];
  // A new process's plain persisted cursor consumes another finite turn, never the prefix.
  for (let turn = 0; read.more && turn < 4; turn += 1) {
    read = journal.readSince({ category: "inbox", cursor: JSON.parse(JSON.stringify(read.cursor)), maxRecords: 2 });
    assert.ok(read.visited <= 2);
    assert.ok(read.decodedBytes <= 1024 * 1024);
    values.push(...read.records);
  }
  assert.equal(read.more, false);
  assert.deepEqual(values.map(row => row.record.n), [0, 2, 4, 6]);
  assert.deepEqual(values[2].told, { for: true, against: true });
  assert.equal(new Set(values.map(row => row.event)).size, values.length);
  journal.record({ category: "inbox", recordedAt: "2026-10-11T00:00:00.000Z", told: HELD, record: { n: 7 } });
  read = journal.readSince({ cursor: read.cursor, maxRecords: 2 });
  assert.deepEqual(read.records.map(row => row.record.n), [7]);
  assert.equal(read.visited, 1);
  assert.deepEqual(journal.readSince({ cursor: read.cursor }).records, []);
});

test("decoded-byte admission refuses oversized witnesses and cannot skip an unreceived or partial witness", (t) => {
  const root = scratch(t), journal = createSemanticRecordJournal({ root, objectKind: "test.bytes" });
  for (let n = 0; n < 2; n += 1) journal.record({ category: "inbox", recordedAt: `2026-10-10T00:00:0${n}.000Z`, told: HELD, record: { n, text: "bounded" } });
  const [log] = segmentAdmittedLogs(journalDirectoryOf(root), { kind: "test.bytes" });
  const file = segmentPath(log), wire = readFileSync(file), firstLength = wire.indexOf(10);
  const start = journalCursorStart("test.bytes"), retained = JSON.stringify(start);
  assert.throws(() => journal.readSince({ cursor: start, maxBytes: firstLength - 1 }), /decoded-byte admission/u);
  assert.equal(JSON.stringify(start), retained);
  const first = journal.readSince({ cursor: start, maxBytes: firstLength });
  assert.deepEqual(first.records.map(row => row.record.n), [0]);
  assert.equal(first.more, true);
  assert.equal(first.decodedBytes, firstLength);
  const next = journal.readSince({ cursor: first.cursor });
  assert.deepEqual(next.records.map(row => row.record.n), [1]);
  assert.throws(() => journal.readSince({ maxRecords: Infinity }), /journal turn/u);
  assert.throws(() => journal.readSince({ maxBytes: 0 }), /journal turn/u);
  const invalid = { ...first.cursor, feeds: Object.fromEntries(Object.entries(first.cursor.feeds).map(([name, offset]) => [name, offset - 1])) };
  assert.throws(() => journal.readSince({ cursor: invalid }), /witness boundary/u);
  const kept = JSON.stringify(first.cursor);
  writeFileSync(file, Buffer.concat([wire.subarray(0, firstLength + 1), Buffer.from('{"incomplete":')]));
  const partial = journal.readSince({ cursor: first.cursor });
  assert.deepEqual(partial.records, []);
  assert.equal(JSON.stringify(partial.cursor), kept);
});
