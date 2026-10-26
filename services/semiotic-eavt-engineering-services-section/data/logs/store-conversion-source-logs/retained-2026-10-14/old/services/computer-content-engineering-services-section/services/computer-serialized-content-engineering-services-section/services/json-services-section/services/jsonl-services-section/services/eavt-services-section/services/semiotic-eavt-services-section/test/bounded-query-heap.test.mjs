import { journalPath } from "@red-cup-engineering/eavt-services-section/journal-path";
import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";
import test from "node:test";

import {
  clearLegacyReadings, legacyReadingLimits, legacyReadingUse, querySemanticRecordCategories, querySemanticRecords,
} from "@red-cup-engineering/semiotic-eavt-services-section/query-semantic-records";
import { recordSemanticRecord } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { jsonToTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import {
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";

setFlagsFromString("--expose-gc");
const collect = runInNewContext("gc");
const heapUsed = () => { collect(); collect(); return process.memoryUsage().heapUsed; };

const kind = "test.bounded-query";
const categories = ["roadmap", "board", "agency", "settlement", "research", "operations"];
const MB = 1024 * 1024;

/** A legacy SEAVT feed per day, each holding large records of every category, like a laptop's uncommitted data/logs. */
function writeLegacyFeeds(root, { days, perCategory, bytes }) {
  const filler = "x".repeat(bytes);
  for (let day = 1; day <= days; day += 1) {
    const dd = String(day).padStart(2, "0");
    const file = journalPath({ root, feed: "witness-journal-seavt", at: `2026-09-${dd}` });
    mkdirSync(dirname(file), { recursive: true });
    const lines = [];
    for (const category of categories) {
      for (let n = 0; n < perCategory; n += 1) {
        const value = { day, category, n, body: filler };
        const { id } = identifyJsonSemanticContent({ objectKind: kind, value, witnessRoot: EMPTY_WITNESS_ROOT });
        lines.push(JSON.stringify({ e: jsonToTerm(id), a: jsonToTerm(category), v: jsonToTerm(value), t: `2026-09-${dd}T00:00:${String(n % 60).padStart(2, "0")}.000Z` }));
      }
    }
    appendFileSync(file, `${lines.join("\n")}\n`);
  }
}

test("held legacy readings stay within their heap budget over a large journal", (t) => {
  const root = mkdtempSync(join(tmpdir(), "bounded-query-"));
  const saved = { ...legacyReadingLimits };
  t.after(() => { Object.assign(legacyReadingLimits, saved); clearLegacyReadings(); rmSync(root, { recursive: true, force: true }); });
  Object.assign(legacyReadingLimits, { heap: 8 * MB });
  clearLegacyReadings();
  // About 60 MB of feed, far larger than the reading budget.
  writeLegacyFeeds(root, { days: 30, perCategory: 20, bytes: 16 * 1024 });

  const one = querySemanticRecords({ root, objectKind: kind, category: "roadmap" });
  assert.equal(one.length, 30 * 20, "every valid record of the category is returned");
  assert.ok(one.every((row) => row.category === "roadmap"));

  // Every category combination, repeatedly, as a long-lived MetroPlat would ask. The
  // unbounded per-combination readings this replaces held ~200 MB of this journal.
  const round = () => {
    for (let size = 1; size <= categories.length; size += 1) {
      const rows = querySemanticRecordCategories({ root, objectKind: kind, categories: categories.slice(0, size) });
      assert.equal(rows.length, 30 * 20 * size);
      peakHeld = Math.max(peakHeld, legacyReadingUse().heap);
    }
  };
  let peakHeld = 0;
  round(); round();
  const baseline = heapUsed();
  for (let n = 0; n < 6; n += 1) round();
  const grown = heapUsed() - baseline;
  assert.ok(grown < 8 * MB, `heap grew ${Math.round(grown / MB)} MB over 36 further queries (bounded)`);
  assert.ok(peakHeld <= legacyReadingLimits.heap, `held readings ${peakHeld} stay within ${legacyReadingLimits.heap}`);
});

test("a returned record is a copy: mutating it does not change the next query", (t) => {
  const root = mkdtempSync(join(tmpdir(), "bounded-query-copy-"));
  t.after(() => { clearLegacyReadings(); rmSync(root, { recursive: true, force: true }); });
  writeLegacyFeeds(root, { days: 1, perCategory: 2, bytes: 8 });
  const first = querySemanticRecords({ root, objectKind: kind, category: "board" });
  first[0].record.body = "changed";
  const second = querySemanticRecords({ root, objectKind: kind, category: "board" });
  assert.equal(second[0].record.body, "x".repeat(8));
});

test("a feed appended after a reading is read on, and journal records join it", (t) => {
  const root = mkdtempSync(join(tmpdir(), "bounded-query-append-"));
  t.after(() => { clearLegacyReadings(); rmSync(root, { recursive: true, force: true }); });
  writeLegacyFeeds(root, { days: 2, perCategory: 3, bytes: 8 });
  assert.equal(querySemanticRecords({ root, objectKind: kind, category: "agency" }).length, 6);
  writeLegacyFeeds(root, { days: 1, perCategory: 3, bytes: 9 });
  assert.equal(querySemanticRecords({ root, objectKind: kind, category: "agency" }).length, 9);
  recordSemanticRecord({ root, objectKind: kind, category: "agency", record: { journal: true },
    recordedAt: "2026-10-01T00:00:00.000Z", told: { for: true, against: false } });
  const rows = querySemanticRecords({ root, objectKind: kind, category: "agency" });
  assert.equal(rows.length, 10);
  assert.deepEqual(rows.at(-1).record, { journal: true });
});
