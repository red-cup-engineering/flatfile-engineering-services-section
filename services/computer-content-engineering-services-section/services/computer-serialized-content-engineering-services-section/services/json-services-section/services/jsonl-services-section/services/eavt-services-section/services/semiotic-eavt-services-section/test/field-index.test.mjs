import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createFieldIndex } from "@red-cup-engineering/semiotic-eavt-services-section/field-index";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { segmentAdmittedLogs, segmentPath } from "@red-cup-engineering/semiotic-eavt-services-section/journal/filesystem/segment-store";
import { journalDirectoryOf } from "@red-cup-engineering/semiotic-eavt-services-section/journal/store-root";

const HELD = { for: true, against: false };
const scratch = (t) => { const root = mkdtempSync(join(tmpdir(), "field-index-")); t.after(() => rmSync(root, { recursive: true, force: true })); return root; };
let tick = 0;
const at = () => new Date(Date.UTC(2026, 9, 10, 0, 0, tick++)).toISOString();

test("point reads by field: nested paths, array members, other categories and kinds passed over", (t) => {
  const root = scratch(t);
  const cash = createSemanticRecordJournal({ root, objectKind: "test.ledger" });
  cash.record({ category: "corroborated-cash", recordedAt: at(), told: HELD, record: { sourceId: "s1", book: { enterprise: "e:a" }, sourceRefs: ["r1", "r2"], amount: 5 } });
  cash.record({ category: "corroborated-cash", recordedAt: at(), told: HELD, record: { sourceId: "s2", book: { enterprise: "e:a" }, sourceRefs: ["r2"], amount: 7 } });
  cash.record({ category: "receipt", recordedAt: at(), told: HELD, record: { sourceId: "s1", type: "x402" } });
  createSemanticRecordJournal({ root, objectKind: "test.other" }).record({ category: "corroborated-cash", recordedAt: at(), told: HELD, record: { sourceId: "s1" } });

  const index = createFieldIndex({ root, objectKind: "test.ledger", category: "corroborated-cash", fields: { sourceId: "sourceId", enterprise: "book.enterprise", ref: "sourceRefs[*]", amount: "amount" } });
  assert.deepEqual(index.get("sourceId", "s1").map((row) => row.record.amount), [5]);
  assert.deepEqual(index.get("enterprise", "e:a").map((row) => row.record.sourceId), ["s1", "s2"]);
  assert.deepEqual(index.get("ref", "r2").map((row) => row.record.sourceId), ["s1", "s2"]);
  assert.deepEqual(index.get("amount", 7).map((row) => row.record.sourceId), ["s2"], "a number is indexed under its text");
  assert.equal(index.has("sourceId", "absent"), false);
  assert.equal(index.count("ref", "r2"), 2);
  assert.equal(index.latest("enterprise", "e:a").record.sourceId, "s2");
  const [row] = index.get("sourceId", "s1");
  assert.equal(row.category, "corroborated-cash");
  assert.equal(row.objectKind, "test.ledger");
  assert.deepEqual(row.told, HELD);
  assert.match(row.event, /^ni:\/\/\/sha-256;/u);
  assert.throws(() => index.get("unindexed", "x"), /does not index/u);
});

test("the index follows the journal as it grows, and a reopened index reads its kept locations", (t) => {
  const root = scratch(t);
  const journal = createSemanticRecordJournal({ root, objectKind: "test.occurrence" });
  const fields = { id: "id", seen: (record) => [record.source, record.path, record.revision].join("\u0000") };
  const index = createFieldIndex({ root, objectKind: "test.occurrence", category: "occurrence", fields });
  assert.equal(index.has("id", "b1"), false);
  journal.record({ category: "occurrence", recordedAt: at(), told: HELD, record: { id: "b1", source: "repo", path: "a.md", revision: "c1" } });
  assert.equal(index.has("seen", "repo\u0000a.md\u0000c1"), true, "a record made after the index opened is read");
  journal.record({ category: "occurrence", recordedAt: "2026-10-11T00:00:00.000Z", told: HELD, record: { id: "b1", source: "repo", path: "b.md", revision: "c2" } });
  const reopened = createFieldIndex({ root, objectKind: "test.occurrence", category: "occurrence", fields });
  assert.deepEqual(reopened.get("id", "b1").map((row) => row.record.path), ["a.md", "b.md"], "records of every day's feed");
  const directory = join(journalDirectoryOf(root), "index", "field", "v1");
  assert.ok(existsSync(directory), "the index is kept beside the journal");
  // A different declaration is a different reading, kept beside the first without disturbing it.
  const narrower = createFieldIndex({ root, objectKind: "test.occurrence", category: "occurrence", fields: { path: "path" } });
  assert.deepEqual(narrower.get("path", "b.md").map((row) => row.record.id), ["b1"]);
  assert.equal(reopened.count("id", "b1"), 2);
  assert.equal(readdirSync(join(directory, "test.occurrence", "occurrence")).length, 2);
});

test("a read decodes only the witnesses its key names, however large the journal's bodies", (t) => {
  const root = scratch(t);
  const journal = createSemanticRecordJournal({ root, objectKind: "test.body" });
  for (const id of ["b1", "b2", "b3"]) journal.record({ category: "body", recordedAt: at(), told: HELD, record: { id, text: id.repeat(40_000) } });
  const index = createFieldIndex({ root, objectKind: "test.body", category: "body", fields: { id: "id" } });
  const [body] = index.get("id", "b2");
  assert.equal(body.record.text.length, 80_000);
  assert.ok(body.record.text.startsWith("b2b2"));
  const declared = join(journalDirectoryOf(root), "index", "field", "v1", "test.body", "body");
  const [reading] = readdirSync(declared);
  const shards = readdirSync(join(declared, reading, "id"));
  const held = shards.reduce((total, name) => total + readFileSync(join(declared, reading, "id", name)).length, 0);
  assert.ok(held < 1000, "the index holds locations, never bodies");
});

test("a witness altered in its segment is refused when read", (t) => {
  const root = scratch(t);
  const journal = createSemanticRecordJournal({ root, objectKind: "test.tamper" });
  journal.record({ category: "fact", recordedAt: at(), told: HELD, record: { id: "f1", value: "original-value" } });
  const index = createFieldIndex({ root, objectKind: "test.tamper", category: "fact", fields: { id: "id" } });
  assert.equal(index.get("id", "f1")[0].record.value, "original-value");
  const [log] = segmentAdmittedLogs(journalDirectoryOf(root));
  const file = segmentPath(log);
  const text = readFileSync(file, "utf8");
  assert.ok(text.includes("original-value"));
  writeFileSync(file, text.replaceAll("original-value", "altered--value"));
  assert.throws(() => index.get("id", "f1"));
});
