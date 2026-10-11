// A witness names its row by the row's content address and carries the row once, as its payload; a
// witness admitted before 2026-10-11 names its row by the row's text and still reads.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { eavtAddress, eavtId, eavtKey, isEavtAddressOf } from "@red-cup-engineering/eavt-services-section/row";
import { jsonToTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { createSemanticRecordJournal } from "../src/record-semantic-record.mjs";
import { journalWitness, parseJournalWitness } from "../src/journal/event.mjs";
import { clearSegmentIndexes, segmentAdmit } from "../src/journal/filesystem/segment-store.mjs";
import { eventForRow } from "../src/journal/filesystem/events.mjs";

const kind = "test.oversized-record";
function journal(t) {
  const root = mkdtempSync(join(tmpdir(), "oversized-record-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, journal: createSemanticRecordJournal({ root, objectKind: kind }) };
}
/** Every witness line written under `root`'s journal segments. */
function witnesses(root) {
  const found = [];
  const walk = (directory) => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith(".witnesses")) found.push(...readFileSync(path, "utf8").trim().split("\n").map((line) => JSON.parse(line)));
    }
  };
  walk(root);
  return found;
}

test("a row's address is its content id, whatever its length; its text still addresses it", () => {
  const small = [tm.mark("e"), tm.mark("a"), tm.mark("v"), "2026-10-10T00:00:00.000Z"];
  assert.equal(eavtAddress(small), eavtId(small));
  assert.match(eavtAddress(small), /^ni:\/\/\/sha-256;/u);
  assert.equal(isEavtAddressOf(eavtId(small), small), true);
  assert.equal(isEavtAddressOf(eavtKey(small), small), true, "the address witnesses carried before 2026-10-11");
  assert.equal(isEavtAddressOf(eavtId([...small.slice(0, 3), "2026-10-11T00:00:00.000Z"]), small), false);
});

test("a witness line carries its row once: the address is a fixed-length id, not a second copy", () => {
  const row = [jsonToTerm("ni:///sha-256;x"), jsonToTerm("inbox"), jsonToTerm({ body: "z".repeat(4096) }), "2026-10-10T00:00:00.000Z"];
  const witness = eventForRow(row, "test");
  const line = JSON.stringify({ id: witness.id, observation: witness.observation });
  assert.ok(line.length < JSON.stringify(row).length + 1024, `one copy of a ${JSON.stringify(row).length}-byte row, not two: ${line.length}`);
});

test("a record whose row is longer than one string is recorded and read back, addressed by its content id", (t) => {
  const { root, journal: records } = journal(t);
  // 300 small members: no single string is long, but the row's canonical text is ~330 KiB.
  const value = { tag: Array.from({ length: 300 }, (_, n) => ({ name: `${n} ${"y".repeat(1024)}` })) };
  const recorded = records.record({ category: "inbox", recordedAt: "2026-10-10T00:00:00.000Z", told: { for: true, against: false }, record: value });
  assert.equal(recorded.appended, 1);
  const [row] = records.query({ category: "inbox" });
  assert.equal(row.id, recorded.id);
  assert.deepEqual(row.record, value);
  const [stored] = witnesses(root).map(parseJournalWitness);
  assert.deepEqual(stored.observation.address, tm.mark(eavtId(stored.observation.payload)), "its witness is addressed by its row's content id");
  // Recording the same record again admits nothing new.
  assert.equal(records.record({ category: "inbox", recordedAt: "2026-10-10T00:00:00.000Z", told: { for: true, against: false }, record: value }).appended, 0);
});

test("a record whose witness names its row by text, as before 2026-10-11, still reads", (t) => {
  const { root, journal: records } = journal(t);
  const recorded = records.record({ category: "inbox", recordedAt: "2026-10-10T00:00:00.000Z", told: { for: true, against: false }, record: { n: 1 } });
  const [stored] = witnesses(root).map(parseJournalWitness);
  const { observation } = stored;
  const asBefore = journalWitness({ ...observation, address: tm.mark(eavtKey(observation.payload)) });
  assert.notEqual(asBefore.id, stored.id);
  const logs = readdirSync(root, { recursive: true }).filter((name) => String(name).endsWith(".witnesses"));
  assert.equal(logs.length, 1);
  rmSync(root, { recursive: true, force: true });
  clearSegmentIndexes();
  segmentAdmit(join(root, String(logs[0]).replace(/\.witnesses$/u, "")), [asBefore]);
  const [row] = createSemanticRecordJournal({ root, objectKind: kind }).query({ category: "inbox" });
  assert.equal(row.id, recorded.id);
  assert.deepEqual(row.record, { n: 1 });
});
