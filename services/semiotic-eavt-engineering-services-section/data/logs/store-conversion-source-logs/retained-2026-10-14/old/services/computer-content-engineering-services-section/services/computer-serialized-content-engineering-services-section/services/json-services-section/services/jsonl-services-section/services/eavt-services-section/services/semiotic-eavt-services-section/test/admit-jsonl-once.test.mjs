import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { admitJsonlOnce, readAdmittingJsonl } from "@red-cup-engineering/semiotic-eavt-services-section/admit-jsonl-once";
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
const ids = (records) => records.map((record) => record.id);

test("old JSONL files are admitted once, read only, skipping records the journal held and keeping repeats within a file", (t) => {
  const dir = place(t);
  const book = ledger(join(dir, "book.journal"));
  const deliveries = join(dir, "deliveries.jsonl");
  const observations = join(dir, "observations.jsonl");
  jsonl(deliveries, [{ id: "d1", amount: 3 }, { id: "d2", amount: 5 }, { id: "d2", amount: 5 }]);
  writeFileSync(observations, `${JSON.stringify({ id: "o1", seen: true })}`);
  const before = readFileSync(deliveries, "utf8");
  book.record("delivery", { id: "d1", amount: 3 });
  const sources = [
    { path: deliveries, category: "delivery" },
    { path: observations, category: "observation" },
    { path: join(dir, "absent.jsonl"), category: "absent" },
  ];

  assert.deepEqual(admitJsonlOnce(book, sources, { type: "TestJsonlAdmission", from: dir }), { done: true, admitted: 3, counts: { delivery: 2, observation: 1 } });
  assert.deepEqual(ids(book.read("delivery")), ["d1", "d2", "d2"]);
  assert.deepEqual(book.read("observation"), [{ id: "o1", seen: true }], "a last line without a newline is read");
  assert.equal(readFileSync(deliveries, "utf8"), before);
  const marker = JSON.parse(readFileSync(join(book.root, "jsonl-admission.json"), "utf8"));
  assert.equal(marker.type, "TestJsonlAdmission");
  assert.equal(marker.from, dir);
  assert.deepEqual(marker.counts, { delivery: 2, observation: 1 });
  assert.equal(existsSync(join(book.root, ".lock")), false);

  jsonl(deliveries, [{ id: "d3", amount: 8 }]);
  assert.deepEqual(admitJsonlOnce(book, sources), { done: true, admitted: 0, counts: null });
  assert.deepEqual(ids(readAdmittingJsonl(book, sources, "delivery")), ["d1", "d2", "d2"], "after the marker a read is the journal's own");
});

test("a bounded step per call, continued from the cursor, and a read mid-admission misses nothing", (t) => {
  const dir = place(t);
  const root = join(dir, "book.journal");
  const deliveries = join(dir, "deliveries.jsonl");
  jsonl(deliveries, [{ id: "a" }, { id: "held" }, { id: "b" }, { id: "b" }, { id: "c" }]);
  const sources = [{ path: deliveries, category: "delivery" }];
  ledger(root).record("delivery", { id: "held" });
  const whole = ["held", "a", "b", "b", "c"];

  assert.deepEqual(ids(readAdmittingJsonl(ledger(root), sources, "delivery")), whole, "before the first step");
  const steps = [];
  for (let step = 0; step < 10; step += 1) {
    const book = ledger(root);
    const result = admitJsonlOnce(book, sources, { limit: 2 });
    steps.push([result.done, result.admitted]);
    assert.deepEqual([...ids(readAdmittingJsonl(book, sources, "delivery"))].sort(), [...whole].sort(), `step ${step}`);
    if (result.done) break;
  }
  assert.deepEqual(steps, [[false, 1], [false, 2], [true, 1]]);
  assert.deepEqual(ids(ledger(root).read("delivery")), ["held", "a", "b", "b", "c"]);
  assert.deepEqual(JSON.parse(readFileSync(join(root, "jsonl-admission.json"), "utf8")).counts, { delivery: 4 });
  assert.equal(existsSync(join(root, ".lock")), false);
});

test("a caller's identity decides what is already held; the marker's mode can be given; the lock is the journal's", (t) => {
  const dir = place(t);
  const book = ledger(join(dir, "credits.journal"));
  const readings = join(dir, "readings.jsonl");
  jsonl(readings, [{ at: "2026-10-10T00:00:00Z", credits: 40 }, { at: "2026-10-10T01:00:00Z", credits: 31 }, { at: "2026-10-10T01:00:00Z", credits: 31 }]);
  book.record("reading", { at: "2026-10-10T00:00:00Z", credits: 40 });

  assert.throws(() => withDirectoryLock(book.root, () => withDirectoryLock(book.root, () => 0, { waitMs: 20 })), /held by another writer/u);
  const options = { identity: (record) => JSON.stringify(record), marker: "readings-admission.json", mode: 0o600 };
  assert.deepEqual(admitJsonlOnce(book, [{ path: readings, category: "reading" }], options).counts, { reading: 2 });
  assert.deepEqual(book.read("reading").map((record) => record.credits), [40, 31, 31]);
  assert.equal(statSync(join(book.root, "readings-admission.json")).mode & 0o777, 0o600);
  assert.equal(statSync(join(book.root, "readings-admission.cursor.json")).mode & 0o777, 0o600);
});

test("a journal without the ledger shape, malformed sources and a non-positive limit are refused", () => {
  assert.throws(() => admitJsonlOnce({ root: "/x" }, []), TypeError);
  assert.throws(() => admitJsonlOnce({ root: "/x", record() {}, read() { return []; } }, [{ path: 1 }]), TypeError);
  assert.throws(() => admitJsonlOnce({ root: "/x", record() {}, read() { return []; } }, [], { limit: 0 }), TypeError);
});
