import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFileSync, closeSync, existsSync, openSync, writeSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { journalWitness } from "../src/journal/event.mjs";
import { artifactStoreRoot, journalFeedPath, journalIndexDirectory } from "../src/journal/store-root.mjs";
import {
  carryLocatedIndex, clearSegmentIndexes, indexDirectory, ledgerPath, locatedAddressOf, locatedBucketFile, locatedBucketPath, locatedIndex,
  locatedIndexDirectory, segmentAdmit, segmentAdmittedLogs, segmentPath, segmentState, segmentStatements, segmentWitness,
} from "../src/journal/filesystem/segment-store.mjs";

setFlagsFromString("--expose-gc");
const gc = runInNewContext("gc");
const address = (n) => `ni:///sha-256;${createHash("sha256").update(String(n)).digest("base64url")}`;
const witness = (n, causes = []) => journalWitness({
  kind: "metroplat.journal.observation", seat: "urn:test:located", claim: tm.mark("located"),
  address: tm.mark("held"), time: `2026-10-08T00:00:${String(n).padStart(2, "0")}.000Z`, causes, payload: { n },
});
function root() {
  const directory = mkdtempSync(join(tmpdir(), "journal-located-"));
  const log = journalFeedPath(directory, "feed", "2026-10-08");
  return { directory, log, storeRoot: artifactStoreRoot(log) };
}

test("the located index computes buckets by ni-path-v1, reproducing the address system's vectors", () => {
  const vectors = JSON.parse(readFileSync(new URL("./fixtures/ni-path-v1.json", import.meta.url), "utf8"));
  assert.equal(vectors.formula, "ni-path-v1");
  for (const vector of vectors.vectors) {
    if (vector.bucket === undefined) continue;
    assert.equal(locatedBucketPath(vector.key), vector.bucket, vector.label);
    if (vector["located-by"]) assert.equal(locatedAddressOf(vector.key), vector["located-by"], vector.label);
  }
});

test("admitted, pending and woken witnesses are found in the buckets their addresses name, by any process", () => {
  const { directory, log, storeRoot } = root();
  try {
    const cause = witness(1), effect = witness(2, [cause.id]);
    const [pending] = segmentAdmit(log, [effect]);
    assert.equal(pending.admission, "quarantined");
    assert.ok(existsSync(locatedBucketFile(storeRoot, "pending", effect.id)));
    assert.ok(existsSync(locatedBucketFile(storeRoot, "waiting", cause.id)));
    clearSegmentIndexes(); // another process admits the cause
    const results = segmentAdmit(log, [cause]);
    assert.equal(results[0].admission, "admitted");
    assert.equal(segmentState(log, effect.id), "admitted", "the waiting effect was woken by its cause's admission");
    assert.deepEqual(segmentStatements(log).map((s) => s.id).sort(), [cause.id, effect.id].sort());
    assert.equal(segmentWitness(log, effect.id).id, effect.id);
    assert.ok(readFileSync(locatedBucketFile(storeRoot, "admitted", cause.id), "utf8").includes(cause.id));
    assert.deepEqual(segmentAdmittedLogs(storeRoot), [log]);
    assert.ok(existsSync(ledgerPath(log)));
  } finally { clearSegmentIndexes(); rmSync(directory, { recursive: true, force: true }); }
});

test("a truncated segment fails closed against its ledger, and a deleted one is still listed", () => {
  const { directory, log, storeRoot } = root();
  try {
    segmentAdmit(log, [witness(1), witness(2)]);
    const bytes = readFileSync(segmentPath(log));
    writeFileSync(segmentPath(log), bytes.subarray(0, bytes.indexOf(10) + 1));
    clearSegmentIndexes();
    assert.throws(() => segmentStatements(log), /lacks witnesses admitted into it/u);
    rmSync(segmentPath(log));
    clearSegmentIndexes();
    assert.deepEqual(segmentAdmittedLogs(storeRoot), [log]);
    assert.throws(() => segmentStatements(log), /lacks witnesses admitted into it/u);
  } finally { clearSegmentIndexes(); rmSync(directory, { recursive: true, force: true }); }
});

test("a v2 root is carried into buckets once, and v2 lines written later are carried at the next question", () => {
  const { directory, log, storeRoot } = root();
  try {
    const first = witness(1), second = witness(2), blocked = address("blocked");
    segmentAdmit(log, [first, second]);
    // Rewrite the root as the v2 store left it: its index in four whole files, no buckets, no ledgers.
    rmSync(locatedIndexDirectory(storeRoot), { recursive: true, force: true });
    rmSync(ledgerPath(log));
    const relative = "feed-logs/2026-10-08-admit-feed.jsonl";
    mkdirSync(indexDirectory(storeRoot), { recursive: true });
    writeFileSync(join(indexDirectory(storeRoot), "admitted.jsonl"), `${JSON.stringify({ id: first.id, log: relative })}\n`);
    writeFileSync(join(indexDirectory(storeRoot), "blocked.jsonl"), `${JSON.stringify({ id: blocked, obstruction: { reason: "test" } })}\n`);
    clearSegmentIndexes();
    const index = locatedIndex(storeRoot);
    assert.deepEqual([...index.admittedLogs(first.id)], [relative]);
    assert.equal(index.isAdmitted(second.id), false, "only what v2 recorded is carried");
    assert.equal(index.isBlocked(blocked), true);
    // The questions above were answered from the uncarried v2 lines; the carry itself writes the ledger.
    assert.equal(carryLocatedIndex(storeRoot), "located");
    assert.ok(existsSync(ledgerPath(log)));
    appendFileSync(join(indexDirectory(storeRoot), "admitted.jsonl"), `${JSON.stringify({ id: second.id, log: relative })}\n`);
    assert.equal(segmentState(log, second.id), "admitted", "a later v2 line is carried");
    clearSegmentIndexes();
    assert.equal(locatedIndex(storeRoot).isAdmitted(second.id), true);
    assert.equal(readFileSync(locatedBucketFile(storeRoot, "admitted", first.id), "utf8").split(first.id).length - 1, 1, "carried once");
  } finally { clearSegmentIndexes(); rmSync(directory, { recursive: true, force: true }); }
});

test("a root with segments and no index at all is rebuilt from its segments", () => {
  const { directory, log, storeRoot } = root();
  try {
    const first = witness(1);
    segmentAdmit(log, [first]);
    rmSync(journalIndexDirectory(storeRoot), { recursive: true, force: true });
    rmSync(ledgerPath(log));
    clearSegmentIndexes();
    assert.equal(locatedIndex(storeRoot).isAdmitted(first.id), true);
    assert.equal(segmentStatements(log).length, 1);
  } finally { clearSegmentIndexes(); rmSync(directory, { recursive: true, force: true }); }
});

// The JavaScript memory a root's index adds once it has answered questions about `count` admitted witnesses.
function indexGrowth(count) {
  const { directory, storeRoot } = root();
  try {
    const relative = "feed-logs/2026-10-08-admit-feed.jsonl";
    mkdirSync(dirname(join(storeRoot, relative)), { recursive: true });
    writeFileSync(segmentPath(join(storeRoot, relative)), "");
    mkdirSync(indexDirectory(storeRoot), { recursive: true });
    const fd = openSync(join(indexDirectory(storeRoot), "admitted.jsonl"), "w");
    for (let n = 0; n < count; n += 1) writeSync(fd, `{"id":"${address(n)}","log":"${relative}"}\n`);
    closeSync(fd);
    clearSegmentIndexes();
    // Measured on a located root: while a carry is unfinished, the uncarried v2 lines are held as the v2
    // store held them, and released when the carry completes.
    carryLocatedIndex(storeRoot);
    clearSegmentIndexes();
    gc(); gc();
    const before = process.memoryUsage();
    const index = locatedIndex(storeRoot);
    for (let n = 0; n < count; n += Math.max(1, Math.floor(count / 400))) assert.equal(index.isAdmitted(address(n)), true);
    assert.equal(index.isAdmitted(address("absent")), false);
    gc(); gc();
    const after = process.memoryUsage();
    return (after.heapUsed + after.external + after.arrayBuffers) - (before.heapUsed + before.external + before.arrayBuffers);
  } finally { clearSegmentIndexes(); rmSync(directory, { recursive: true, force: true }); }
}

test("the memory a root's index takes does not grow with how many witnesses it has admitted", () => {
  // What a process holds is its bucket cache, bounded at 4 MB of estimated heap whatever the store
  // holds; the v2 index held each admitted id for the process's life (about 10 MB for these 200,000).
  const large = indexGrowth(200_000), larger = indexGrowth(400_000);
  assert.ok(large < 6 * 1024 * 1024, `200,000 admitted ids took ${(large / 2 ** 20).toFixed(1)} MB`);
  assert.ok(larger < 6 * 1024 * 1024, `400,000 admitted ids took ${(larger / 2 ** 20).toFixed(1)} MB`);
});

test("a reading cache is bounded by the heap its readings are estimated to hold, least recently kept first", async () => {
  const { readingCache } = await import("../src/journal/filesystem/segment-store.mjs");
  const cache = readingCache(100, 4);
  cache.keep("a", "A", 40);
  cache.keep("b", "B", 40);
  cache.keep("c", "C", 40);
  assert.equal(cache.has("a"), false, "the least recently kept reading made room");
  assert.equal(cache.cost, 80);
  cache.keep("b", "B2", 10);
  assert.equal(cache.get("b"), "B2");
  assert.equal(cache.cost, 50);
  cache.keep("huge", "H", 101);
  assert.equal(cache.has("huge"), false, "a reading dearer than the budget is not kept");
  assert.equal(cache.cost, 50);
  for (const key of ["d", "e", "f"]) cache.keep(key, key, 1);
  assert.equal(cache.size, 4, "the entry count is bounded too");
  cache.clear();
  assert.equal(cache.cost, 0);
});
