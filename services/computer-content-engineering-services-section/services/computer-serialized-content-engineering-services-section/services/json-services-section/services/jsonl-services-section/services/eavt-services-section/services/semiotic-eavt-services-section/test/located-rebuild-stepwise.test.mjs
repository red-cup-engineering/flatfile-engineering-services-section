import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { artifactStoreRoot, journalFeedPath, journalIndexDirectory } from "../src/journal/store-root.mjs";
import { journalWitness } from "../src/journal/event.mjs";
import {
  carryLimits, carryLocatedIndex, clearSegmentIndexes, journalStoreRoots, locatedIndex, locatedIndexDirectory, locatedIndexState,
  prepareLocatedIndexesUnder, segmentAdmit,
} from "../src/journal/filesystem/segment-store.mjs";

const witness = (day, n) => journalWitness({
  kind: "metroplat.journal.observation", seat: "urn:test:newsroom", claim: tm.mark("source-assayed"),
  address: tm.mark("held-document"), time: `2026-10-0${day}T00:00:00.000Z`, causes: [], payload: { day, n },
});
const markerFile = (storeRoot) => join(locatedIndexDirectory(storeRoot), "formula.json");
const marker = (storeRoot) => JSON.parse(readFileSync(markerFile(storeRoot), "utf8"));

/** A store as an earlier layout left it: witness segments in three feeds, and no index of any kind. */
function segmentOnlyStore(t) {
  const root = mkdtempSync(join(tmpdir(), "located-rebuild-"));
  const saved = { ...carryLimits };
  t.after(() => { Object.assign(carryLimits, saved); clearSegmentIndexes(); rmSync(root, { recursive: true, force: true }); });
  const feeds = [1, 2, 3].map((day) => {
    const log = journalFeedPath(root, `feed-${day}`, `2026-10-0${day}`);
    const statements = Array.from({ length: 10 }, (_, n) => witness(day, n));
    segmentAdmit(log, statements);
    return { log, statements };
  });
  const storeRoot = artifactStoreRoot(feeds[0].log);
  rmSync(journalIndexDirectory(storeRoot), { recursive: true, force: true });
  clearSegmentIndexes();
  // Each step rebuilds one segment.
  carryLimits.chunkBytes = 1;
  return { root, storeRoot, feeds };
}

test("a store with segments and no index answers its first question without rebuilding on the question path", async (t) => {
  const { root, storeRoot, feeds } = segmentOnlyStore(t);
  const index = locatedIndex(storeRoot);
  for (const { statements } of feeds) assert.equal(index.isAdmitted(statements[3].id), true);
  assert.equal(existsSync(markerFile(storeRoot)), false, "nothing was rebuilt or marked on the question path");
  assert.equal(locatedIndexState(storeRoot).state, "carrying");
  // A writer admitting meanwhile does not mark the root located before it is rebuilt.
  const late = witness(4, 0);
  segmentAdmit(journalFeedPath(root, "feed-4", "2026-10-04"), [late]);
  assert.notEqual(locatedIndexState(storeRoot).state, "located");
  const deadline = Date.now() + 20_000;
  while (locatedIndexState(storeRoot).state !== "located" && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(locatedIndexState(storeRoot).state, "located");
  assert.equal(marker(storeRoot).rebuilt, undefined);
  clearSegmentIndexes();
  const rebuilt = locatedIndex(storeRoot);
  for (const { statements } of feeds) assert.equal(rebuilt.isAdmitted(statements[9].id), true);
  assert.equal(rebuilt.isAdmitted(late.id), true);
});

test("a rebuild runs in steps that resume after the last segment rebuilt", (t) => {
  const { storeRoot, feeds } = segmentOnlyStore(t);
  assert.equal(carryLocatedIndex(storeRoot, { steps: 1 }), "progress");
  const one = marker(storeRoot);
  assert.equal(one.complete, false);
  assert.match(one.rebuilt, /feed-1\.jsonl/u);
  assert.equal(locatedIndexState(storeRoot).rebuilt, one.rebuilt);
  // A new process answers the segments not yet rebuilt from the segments themselves.
  clearSegmentIndexes();
  assert.equal(locatedIndex(storeRoot).isAdmitted(feeds[2].statements[0].id), true);
  assert.equal(carryLocatedIndex(storeRoot), "located");
  assert.equal(marker(storeRoot).complete, undefined);
  clearSegmentIndexes();
  for (const { statements } of feeds) assert.equal(locatedIndex(storeRoot).isAdmitted(statements[5].id), true);
});

test("every journal store below a root is found and prepared, with or without a v2 index", (t) => {
  const { root, storeRoot } = segmentOnlyStore(t);
  assert.deepEqual(journalStoreRoots(root), [storeRoot]);
  const [prepared] = prepareLocatedIndexesUnder(root);
  assert.equal(prepared.storeRoot, storeRoot);
  assert.equal(prepared.state, "carrying");
});
