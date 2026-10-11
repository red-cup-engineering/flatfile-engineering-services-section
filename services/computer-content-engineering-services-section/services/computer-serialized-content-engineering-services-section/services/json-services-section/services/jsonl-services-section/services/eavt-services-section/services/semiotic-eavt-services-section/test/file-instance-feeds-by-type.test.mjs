import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { journalWitness } from "../src/journal/event.mjs";
import { artifactStoreRoot, journalFeedPath, journalIndexDirectory } from "../src/journal/store-root.mjs";
import { clearSegmentIndexes, locatedIndex, segmentAdmit, segmentPath, segmentStatements, segmentWitness } from "../src/journal/filesystem/segment-store.mjs";
import { packSegment } from "../src/journal/filesystem/segment-bytes.mjs";
import { fileInstanceFeedsByType } from "../scripts/file-instance-feeds-by-type.mjs";

const witness = (run, n, causes = []) => journalWitness({
  kind: "metroplat.journal.observation", seat: "urn:test:encounter", claim: tm.mark("observed"),
  address: tm.mark(`${run}-${n}`), time: `2026-10-04T00:00:0${n}.000Z`, causes, payload: { run, n, body: "y".repeat(300) },
});

test("instance feeds are filed under their type's log of the same day and read back by id", (t) => {
  const root = mkdtempSync(join(tmpdir(), "instance-feeds-"));
  t.after(() => { clearSegmentIndexes(); rmSync(root, { recursive: true, force: true }); });
  const a1 = witness("a", 1), a2 = witness("a", 2, [a1.id]), b1 = witness("b", 1);
  segmentAdmit(journalFeedPath(root, "encounter-a", "2026-10-04"), [a1, a2]);
  segmentAdmit(journalFeedPath(root, "encounter-b", "2026-10-04"), [b1]);
  const typed = witness("c", 1);
  segmentAdmit(journalFeedPath(root, "encounter", "2026-10-04"), [typed]);
  assert.ok(packSegment(segmentPath(journalFeedPath(root, "encounter-a", "2026-10-04")), { frameBytes: 128 }).packed > 0);
  const store = artifactStoreRoot(journalFeedPath(root, "encounter", "2026-10-04"));
  clearSegmentIndexes();

  const report = fileInstanceFeedsByType(store, { prefix: "encounter", type: "encounter" });
  assert.equal(report.feeds, 2);
  assert.equal(report.appended, 3);
  assert.deepEqual(readdirSync(store).filter((name) => name.startsWith("encounter")), ["encounter-logs"]);

  const log = journalFeedPath(root, "encounter", "2026-10-04");
  assert.deepEqual(segmentStatements(log).map((statement) => statement.id), [typed.id, a1.id, a2.id, b1.id]);
  for (const statement of [a1, a2, b1, typed]) {
    assert.deepEqual([...locatedIndex(store).admittedLogs(statement.id)], ["encounter-logs/2026-10-04-admit-encounter.jsonl"]);
    assert.equal(segmentWitness(log, statement.id).id, statement.id);
  }
  assert.ok(locatedIndex(store).admittedEnd(a2.id, "encounter-logs/2026-10-04-admit-encounter.jsonl") > 0);
  const checkpoints = join(journalIndexDirectory(store), "segment-verified", "v1.jsonl");
  if (existsSync(checkpoints)) assert.equal(readFileSync(checkpoints, "utf8").includes("encounter-a-logs"), false);

  // A second run has nothing to file.
  const again = fileInstanceFeedsByType(store, { prefix: "encounter", type: "encounter" });
  assert.equal(again.feeds, 0);
});
