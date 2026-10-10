import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { admitJsonlOnce } from "@red-cup-engineering/semiotic-eavt-services-section/admit-jsonl-once";
import { withDirectoryLock } from "@red-cup-engineering/semiotic-eavt-services-section/journal/filesystem/directory-lock";

const HELD = { for: true, against: false };
const place = (t) => {
  const root = mkdtempSync(join(tmpdir(), "admit-jsonl-once-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
};
let tick = 0;
const ledger = (root) => {
  mkdirSync(root, { recursive: true });
  const journal = createSemanticRecordJournal({ root, objectKind: "561-group.test.ledger" });
  return {
    root,
    record: (category, record) => journal.record({ category, recordedAt: new Date(Date.UTC(2026, 9, 10, 0, 0, 0, tick++)).toISOString(), told: HELD, record }),
    read: (category) => journal.query({ category }).map((row) => row.record),
  };
};
const jsonl = (path, records) => writeFileSync(path, records.map((record) => `${JSON.stringify(record)}\n`).join(""));

test("old JSONL files are admitted once, read only, skipping records the journal held and keeping repeats within a file", (t) => {
  const dir = place(t);
  const book = ledger(join(dir, "book.journal"));
  const deliveries = join(dir, "deliveries.jsonl");
  const observations = join(dir, "observations.jsonl");
  jsonl(deliveries, [{ id: "d1", amount: 3 }, { id: "d2", amount: 5 }, { id: "d2", amount: 5 }]);
  jsonl(observations, [{ id: "o1", seen: true }]);
  const before = readFileSync(deliveries, "utf8");
  book.record("delivery", { id: "d1", amount: 3 });

  const first = admitJsonlOnce(book, [
    { path: deliveries, category: "delivery" },
    { path: observations, category: "observation" },
    { path: join(dir, "absent.jsonl"), category: "absent" },
  ], { type: "TestJsonlAdmission", from: dir });
  assert.deepEqual(first, { admitted: true, counts: { delivery: 2, observation: 1 } });
  assert.deepEqual(book.read("delivery").map((record) => record.id), ["d1", "d2", "d2"]);
  assert.deepEqual(book.read("observation"), [{ id: "o1", seen: true }]);
  assert.equal(readFileSync(deliveries, "utf8"), before);

  const marker = JSON.parse(readFileSync(join(book.root, "jsonl-admission.json"), "utf8"));
  assert.equal(marker.type, "TestJsonlAdmission");
  assert.equal(marker.from, dir);
  assert.deepEqual(marker.counts, { delivery: 2, observation: 1 });
  assert.equal(existsSync(join(book.root, ".lock")), false);

  jsonl(deliveries, [{ id: "d3", amount: 8 }]);
  assert.deepEqual(admitJsonlOnce(book, [{ path: deliveries, category: "delivery" }]), { admitted: false, counts: null });
  assert.deepEqual(book.read("delivery").map((record) => record.id), ["d1", "d2", "d2"]);
});

test("a caller's identity decides what is already held, and the lock is the journal's writer lock", (t) => {
  const dir = place(t);
  const book = ledger(join(dir, "credits.journal"));
  const readings = join(dir, "readings.jsonl");
  jsonl(readings, [{ at: "2026-10-10T00:00:00Z", credits: 40 }, { at: "2026-10-10T01:00:00Z", credits: 31 }]);
  book.record("reading", { at: "2026-10-10T00:00:00Z", credits: 40 });

  const result = withDirectoryLock(book.root, () => "held", { waitMs: 50 });
  assert.equal(result, "held");
  assert.throws(() => withDirectoryLock(book.root, () => withDirectoryLock(book.root, () => 0, { waitMs: 20 })), /held by another writer/u);

  const admitted = admitJsonlOnce(book, [{ path: readings, category: "reading" }], { identity: (record) => record.at, marker: "readings-admission.json", mode: 0o600 });
  assert.deepEqual(admitted.counts, { reading: 1 });
  assert.deepEqual(book.read("reading").map((record) => record.credits), [40, 31]);
  assert.equal(statSync(join(book.root, "readings-admission.json")).mode & 0o777, 0o600);
});

test("a journal without the ledger shape is refused", () => {
  assert.throws(() => admitJsonlOnce({ root: "/x" }, []), TypeError);
  assert.throws(() => admitJsonlOnce({ root: "/x", record() {}, read() { return []; } }, [{ path: 1 }]), TypeError);
});
