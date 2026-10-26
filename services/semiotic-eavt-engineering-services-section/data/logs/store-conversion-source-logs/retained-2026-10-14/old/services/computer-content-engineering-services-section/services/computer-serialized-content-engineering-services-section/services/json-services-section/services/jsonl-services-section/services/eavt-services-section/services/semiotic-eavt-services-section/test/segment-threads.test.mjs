import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { journalWitness } from "../src/journal/event.mjs";
import { artifactStoreRoot, journalFeedPath } from "../src/journal/store-root.mjs";
import { clearSegmentIndexes, locatedIndex, segmentAdmit, threadFrontier, threadWitnesses } from "../src/journal/filesystem/segment-store.mjs";
import { fileInstanceFeedsByType } from "../scripts/file-instance-feeds-by-type.mjs";

const witness = (name, n, causes = []) => journalWitness({
  kind: "metroplat.journal.observation", seat: "urn:test:thread", claim: tm.mark("observed"),
  address: tm.mark(`${name}-${n}`), time: `2026-10-11T00:00:0${n}.000Z`, causes, payload: { name, n },
});

function store(t) {
  const root = mkdtempSync(join(tmpdir(), "segment-threads-"));
  t.after(() => { clearSegmentIndexes(); rmSync(root, { recursive: true, force: true }); });
  return root;
}

test("witnesses admitted into a thread are its members, read from the type's log; its frontier follows causes", (t) => {
  const root = store(t);
  const log = journalFeedPath(root, "claim-session", "2026-10-11");
  const storeRoot = artifactStoreRoot(log);
  const a1 = witness("a", 1), a2 = witness("a", 2, [a1.id]), b1 = witness("b", 1), a3 = witness("a", 3, [a1.id]);
  segmentAdmit(log, [a1, a2], [], {}, { thread: "intent-a" });
  segmentAdmit(log, [b1], [], {}, { thread: "intent-b" });
  segmentAdmit(log, [a3], [], {}, { thread: "intent-a" });
  assert.deepEqual(locatedIndex(storeRoot).threadMembers("intent-a").map((member) => member.id), [a1.id, a2.id, a3.id]);
  assert.deepEqual(threadWitnesses(storeRoot, "intent-a").map((each) => each.id), [a1.id, a2.id, a3.id]);
  assert.deepEqual(threadFrontier(storeRoot, "intent-a"), [a2.id, a3.id].sort());
  assert.deepEqual(threadWitnesses(storeRoot, "intent-b").map((each) => each.id), [b1.id]);
  assert.deepEqual(threadWitnesses(storeRoot, "intent-c"), []);
  // Admitting a member again records nothing new.
  segmentAdmit(log, [a1], [], {}, { thread: "intent-a" });
  assert.equal(locatedIndex(storeRoot).threadMembers("intent-a").length, 3);
  // One log for the type; no directory per thread.
  assert.deepEqual(readdirSync(storeRoot).filter((name) => name.endsWith("-logs")), ["claim-session-logs"]);
});

test("a witness that waits for its cause joins its thread when it is admitted", (t) => {
  const root = store(t);
  const log = journalFeedPath(root, "claim-session", "2026-10-11");
  const storeRoot = artifactStoreRoot(log);
  const parent = witness("p", 1), child = witness("p", 2, [parent.id]);
  segmentAdmit(log, [child], [], {}, { thread: "intent-p" });
  assert.deepEqual(locatedIndex(storeRoot).threadMembers("intent-p"), []);
  segmentAdmit(log, [parent], [], {}, { thread: "intent-p" });
  assert.deepEqual(locatedIndex(storeRoot).threadMembers("intent-p").map((member) => member.id).sort(), [parent.id, child.id].sort());
  assert.deepEqual(threadFrontier(storeRoot, "intent-p"), [child.id]);
});

test("filing per-instance feeds with threads keeps each instance's history readable as one", (t) => {
  const root = store(t);
  const one = witness("one", 1), two = witness("one", 2, [one.id]), other = witness("two", 1);
  segmentAdmit(journalFeedPath(root, "structured-work-intent-one", "2026-10-04"), [one, two]);
  segmentAdmit(journalFeedPath(root, "structured-work-intent-two", "2026-10-04"), [other]);
  const storeRoot = artifactStoreRoot(journalFeedPath(root, "claim-session", "2026-10-04"));
  clearSegmentIndexes();
  const report = fileInstanceFeedsByType(storeRoot, { prefix: "structured-work-intent", type: "claim-session", threads: true });
  assert.equal(report.appended, 3);
  assert.deepEqual(readdirSync(storeRoot).filter((name) => name.endsWith("-logs")), ["claim-session-logs"]);
  assert.deepEqual(threadWitnesses(storeRoot, "structured-work-intent-one").map((each) => each.id), [one.id, two.id]);
  assert.deepEqual(threadFrontier(storeRoot, "structured-work-intent-one"), [two.id]);
  assert.deepEqual(threadWitnesses(storeRoot, "structured-work-intent-two").map((each) => each.id), [other.id]);
});
