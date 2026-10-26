import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { journalWitness } from "../src/journal/event.mjs";
import { artifactStoreRoot, journalFeedPath } from "../src/journal/store-root.mjs";
import { clearSegmentIndexes, locatedBucketFile, locatedIndex, segmentAdmit, segmentPath, segmentWitness } from "../src/journal/filesystem/segment-store.mjs";
import { packSegment } from "../src/journal/filesystem/segment-bytes.mjs";

const witness = (n) => journalWitness({
  kind: "metroplat.journal.observation", seat: "urn:test:located", claim: tm.mark("observed"),
  address: tm.mark(`held-${n}`), time: `2026-10-11T00:00:0${n}.000Z`, causes: [], payload: { n, body: "x".repeat(200 * n) },
});

function feed(t) {
  const root = mkdtempSync(join(tmpdir(), "segment-witness-located-"));
  t.after(() => { clearSegmentIndexes(); rmSync(root, { recursive: true, force: true }); });
  const log = journalFeedPath(root, "feed", "2026-10-11");
  const statements = [1, 2, 3].map(witness);
  segmentAdmit(log, statements);
  return { log, statements, storeRoot: artifactStoreRoot(log) };
}

test("an admitted fact names where its witness's line ends, and the witness is read there", (t) => {
  const { log, statements, storeRoot } = feed(t);
  const lines = readFileSync(segmentPath(log), "utf8").split("\n").slice(0, -1);
  let offset = 0;
  for (const [index, statement] of statements.entries()) {
    offset += Buffer.byteLength(`${lines[index]}\n`);
    const [admittedInto] = locatedIndex(storeRoot).admittedLogs(statement.id);
    assert.equal(locatedIndex(storeRoot).admittedEnd(statement.id, admittedInto), offset);
    assert.equal(segmentWitness(log, statement.id).id, statement.id);
  }
});

test("a packed segment is read at the named end through its packing", (t) => {
  const { log, statements } = feed(t);
  assert.ok(packSegment(segmentPath(log), { frameBytes: 128 }).packed > 0);
  clearSegmentIndexes();
  assert.deepEqual(statements.map((statement) => segmentWitness(log, statement.id).id), statements.map((statement) => statement.id));
});

test("an admitted fact recorded before facts named line ends is still found by searching its feed", (t) => {
  const { log, statements, storeRoot } = feed(t);
  const bucket = locatedBucketFile(storeRoot, "admitted", statements[1].id);
  writeFileSync(bucket, readFileSync(bucket, "utf8").split("\n").map((line) => {
    if (!line.trim()) return line;
    const { end: _end, ...fact } = JSON.parse(line);
    return JSON.stringify(fact);
  }).join("\n"));
  clearSegmentIndexes();
  const [log1] = locatedIndex(storeRoot).admittedLogs(statements[1].id);
  assert.equal(locatedIndex(storeRoot).admittedEnd(statements[1].id, log1), undefined);
  assert.equal(segmentWitness(log, statements[1].id).id, statements[1].id);
});
