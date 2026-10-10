// A record whose row is too long to be its own journal address (one canonical JSON string holds at
// most 256 KiB) is addressed by its row's content id; every shorter row keeps its text address.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { EAVT_ADDRESS_KEY_BYTES, eavtAddress, eavtId, eavtKey } from "@red-cup-engineering/eavt-services-section/row";
import { jsonToTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { createSemanticRecordJournal } from "../src/record-semantic-record.mjs";
import { journalWitness, parseJournalWitness } from "../src/journal/event.mjs";
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

test("a row's address is its key while the key fits one string, and its content id past that", () => {
  const small = [tm.mark("e"), tm.mark("a"), tm.mark("v"), "2026-10-10T00:00:00.000Z"];
  assert.equal(eavtAddress(small), eavtKey(small), "an addressable row keeps its text address");
  const large = [tm.mark("e"), tm.mark("a"), tm.mark("v".repeat(EAVT_ADDRESS_KEY_BYTES)), "2026-10-10T00:00:00.000Z"];
  assert.ok(Buffer.byteLength(eavtKey(large)) > EAVT_ADDRESS_KEY_BYTES);
  assert.equal(eavtAddress(large), eavtId(large));
  assert.match(eavtAddress(large), /^ni:\/\/\/sha-256;/u);
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

// A short record's witness is unchanged (its address is still its row's text): record-addresses-stable
// pins the witness ids of short records, and still passes.

test("a row just under the bound keeps its text address: its witness is the one the text address made", () => {
  const time = "2026-10-10T00:00:00.000Z";
  const rowOf = (length) => [jsonToTerm("ni:///sha-256;x"), jsonToTerm("inbox"), jsonToTerm({ body: "z".repeat(length) }), time];
  // Grow the value until the row's key is as long as the bound allows.
  let length = EAVT_ADDRESS_KEY_BYTES - 4096;
  while (Buffer.byteLength(eavtKey(rowOf(length + 1))) <= EAVT_ADDRESS_KEY_BYTES) length += 1;
  const row = rowOf(length);
  assert.ok(Buffer.byteLength(eavtKey(row)) <= EAVT_ADDRESS_KEY_BYTES && Buffer.byteLength(eavtKey(rowOf(length + 1))) > EAVT_ADDRESS_KEY_BYTES);
  const asBefore = journalWitness({ kind: "metroplat.journal.observation", seat: "test", claim: tm.mark("metroplat.eavt.row"),
    address: tm.mark(eavtKey(row)), time, causes: [], payload: row });
  assert.equal(eventForRow(row, "test").id, asBefore.id, "byte for byte the witness the text address made");
  // One byte more and the text address could not be admitted at all; it is addressed by its content id.
  const over = rowOf(length + 1);
  assert.deepEqual(eventForRow(over, "test").observation.address, tm.mark(eavtId(over)));
});
