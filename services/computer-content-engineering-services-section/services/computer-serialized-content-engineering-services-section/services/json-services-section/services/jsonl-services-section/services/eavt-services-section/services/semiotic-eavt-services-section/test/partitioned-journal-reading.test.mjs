import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { journalWitness } from "../src/journal/event.mjs";
import { journalFeedPath } from "../src/journal/store-root.mjs";
import { clearSegmentIndexes, projectSegmentStatements, segmentAdmit, segmentPath } from "../src/journal/filesystem/segment-store.mjs";
import { packSegment } from "../src/journal/filesystem/segment-bytes.mjs";
import { createSemanticRecordJournal } from "../src/record-semantic-record.mjs";

function fixture(t, count = 32, bodyBytes = 90_000) {
  const root = mkdtempSync(join(tmpdir(), "partitioned-journal-"));
  t.after(() => { clearSegmentIndexes(); rmSync(root, { recursive: true, force: true }); });
  const log = journalFeedPath(root, "handling", "2026-10-11");
  const witness = n => journalWitness({
    kind: "metroplat.journal.observation", seat: "urn:test:partition-receiving",
    claim: tm.mark("held"), address: tm.mark("handling"),
    time: "2026-10-11T00:00:00.000Z", causes: [],
    payload: { category: `handled:${n}`, body: `${n}:` + "x".repeat(bodyBytes) },
  });
  const statements = Array.from({ length: count }, (_, n) => witness(n));
  segmentAdmit(log, statements);
  clearSegmentIndexes();
  return { root, log, witness, statements };
}

test("distinct category queries project only selected bodies and reuse the verified partition reading", t => {
  const { log, statements } = fixture(t);
  let projected = 0, partitioned = 0;
  const partitionBy = statement => { partitioned++; return statement.observation.payload.category; };
  const project = statement => { projected++; return statement.observation.payload; };
  for (let n = 0; n < statements.length; n++) {
    const answer = projectSegmentStatements(log, project, { partitionBy, selectedPartitions: new Set([`handled:${n}`]) });
    assert.equal(answer.length, 1);
    assert.deepEqual(answer[0], statements[n].observation.payload);
  }
  assert.equal(projected, statements.length, "unrelated bodies were never projected");
  assert.equal(partitioned, statements.length * 2, "one verified partition pass plus one independent selected-label check per answer");
});

test("4,181 distinct handling categories do not replay unrelated bodies for later unique questions", t => {
  const { log } = fixture(t, 4181, 96);
  let projected = 0, partitioned = 0;
  const partitionBy = statement => { partitioned++; return statement.observation.payload.category; };
  const project = statement => { projected++; return statement.observation.payload; };
  for (let n = 0; n < 128; n++) {
    const category = `handled:${n * 31}`;
    const answer = projectSegmentStatements(log, project, { partitionBy, selectedPartitions: new Set([category]) });
    assert.equal(answer.length, 1);
    assert.equal(answer[0].category, category);
  }
  assert.equal(projected, 128);
  assert.equal(partitioned, 4181 + 128, "unique questions reuse one verified location reading");
});

test("partition receiving retains append, unrelated tamper, selected identity and ledger-loss refusal", t => {
  const { log, witness } = fixture(t, 2);
  const partitionBy = statement => statement.observation.payload.category;
  const project = statement => statement.observation.payload;
  const selected = () => projectSegmentStatements(log, project, { partitionBy, selectedPartitions: new Set(["handled:0", "handled:2"]) });
  assert.equal(selected().length, 1);
  segmentAdmit(log, [witness(2)]);
  assert.deepEqual(selected().map(row => row.category), ["handled:0", "handled:2"]);
  const file = segmentPath(log), bytes = readFileSync(file);
  writeFileSync(file, bytes.toString().replace('"handled:1"', '"handled:9"'));
  assert.throws(selected, "a changed unselected witness cannot hide behind the partition cache");
  writeFileSync(file, bytes);
  clearSegmentIndexes();
  assert.equal(selected().length, 2);
  truncateSync(file, 0);
  assert.throws(selected, "missing admitted source bytes cannot become an empty answer");
});

test("selected locations read packed source and semantic category queries preserve original evidence and order", t => {
  const { log, statements } = fixture(t, 3);
  packSegment(segmentPath(log), { frameBytes: 4096 });
  const answer = projectSegmentStatements(log, statement => statement.id, {
    partitionBy: statement => statement.observation.payload.category,
    selectedPartitions: new Set(["handled:2", "handled:0"]),
  });
  assert.deepEqual(answer, [statements[0].id, statements[2].id], "selection order cannot rewrite original feed order");

  // The actual semantic-query consumer uses its own native rows and evidence.
  const root = mkdtempSync(join(tmpdir(), "semantic-partition-"));
  t.after(() => { clearSegmentIndexes(); rmSync(root, { recursive: true, force: true }); });
  const semantic = createSemanticRecordJournal({ root, objectKind: "activitypub.queue-handling" });
  const at = "2026-10-11T00:00:00.000Z";
  for (const [n, told] of [[0, { for: true, against: false }], [1, { for: false, against: true }], [2, { for: true, against: true }]])
    semantic.record({ category: `handled:${n}`, recordedAt: at, told, record: { filename: `message-${n}`, handlerResult: "returned" } });
  const rows = semantic.queryCategories({ categories: ["handled:2", "handled:0"] });
  assert.deepEqual(rows.map(row => row.record.filename), ["message-0", "message-2"]);
  assert.deepEqual(rows.map(row => row.told), [{ for: true, against: false }, { for: true, against: true }]);
  assert.ok(rows.every(row => row.event.startsWith("ni:///sha-256;")));
  rows[0].record.filename = "caller mutation";
  assert.equal(semantic.query({ category: "handled:0" })[0].record.filename, "message-0");
});
