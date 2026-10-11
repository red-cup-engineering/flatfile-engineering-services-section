import { test } from "node:test";
import { strict as assert } from "node:assert";
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { artifactStoreRoot, journalFeedPath } from "../src/journal/store-root.mjs";
import { journalWitness } from "../src/journal/event.mjs";
import {
  clearSegmentIndexes, locatedBucketFile, locatedIndex, segmentAdmit, segmentPath, segmentStatements,
} from "../src/journal/filesystem/segment-store.mjs";

const witness = (n, causes = []) => journalWitness({
  kind: "metroplat.journal.observation", seat: "urn:test:newsroom", claim: tm.mark("source-assayed"),
  address: tm.mark("held-document"), time: `2026-10-08T00:0${n}:00.000Z`, causes, payload: { n },
});

function store() {
  const root = mkdtempSync(join(tmpdir(), "journal-crash-tail-"));
  const log = journalFeedPath(root, "feed", "2026-10-08");
  const first = witness(1), second = witness(2, [first.id]), third = witness(3, [second.id]);
  segmentAdmit(log, [first]);
  clearSegmentIndexes();
  return { root, storeRoot: artifactStoreRoot(log), log, first, second, third, admitted: locatedBucketFile(artifactStoreRoot(log), "admitted", first.id) };
}
const warnings = () => {
  const seen = [];
  const listener = (warning) => { if (warning.code === "JOURNAL_TAIL_RECOVERED") seen.push(JSON.parse(warning.detail)); };
  process.on("warning", listener);
  return { seen, stop: () => process.off("warning", listener) };
};
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("a node starts on an admitted bucket padded with NUL bytes after its last newline, and its next write truncates them", async () => {
  const { root, storeRoot, log, first, admitted } = store();
  const other = journalFeedPath(root, "feed", "2026-10-09");
  const watch = warnings();
  try {
    const clean = readFileSync(admitted, "utf8");
    appendFileSync(admitted, Buffer.alloc(1993));
    assert.equal(locatedIndex(storeRoot).isAdmitted(first.id), true);
    assert.equal(segmentStatements(log).length, 1);

    // Admitting the same witness into another feed appends to the same bucket.
    const [result] = segmentAdmit(other, [first]);
    assert.equal(result.admission, "admitted");
    const text = readFileSync(admitted, "utf8");
    assert.ok(text.startsWith(clean));
    assert.ok(!text.includes("\0"));
    assert.equal(text.trim().split("\n").length, 2);
    clearSegmentIndexes();
    assert.deepEqual([...locatedIndex(storeRoot).admittedLogs(first.id)].sort(), ["feed-logs/2026-10-08-admit-feed.jsonl", "feed-logs/2026-10-09-admit-feed.jsonl"]);
    assert.equal(segmentStatements(other).length, 1);

    await settle();
    const truncated = watch.seen.find((detail) => detail.file === admitted && detail.bytes === 1993 && detail.offset === Buffer.byteLength(clean));
    assert.ok(truncated, "the truncation is reported with file, offset and size");
    assert.equal(truncated.kind, "nul");
  } finally { watch.stop(); rmSync(root, { recursive: true, force: true }); }
});

test("a segment padded with NUL bytes after its last newline reads as its complete lines and is truncated by the next admission", () => {
  const { root, log, first, second } = store();
  try {
    appendFileSync(segmentPath(log), Buffer.alloc(1993));
    assert.deepEqual(segmentStatements(log).map((statement) => statement.id), [first.id]);
    segmentAdmit(log, [second]);
    assert.ok(!readFileSync(segmentPath(log)).includes(0));
    clearSegmentIndexes();
    assert.equal(segmentStatements(log).length, 2);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a torn final line is unread, then truncated by the next admission instead of fusing with it", () => {
  const { root, log, first, second, admitted } = store();
  try {
    appendFileSync(segmentPath(log), '{"id":"ni:///sha-256;torn","obs');
    appendFileSync(admitted, '{"id":"ni:///sha-256;torn","lo');
    assert.equal(segmentStatements(log).length, 1);
    segmentAdmit(log, [second]);
    clearSegmentIndexes();
    assert.deepEqual(segmentStatements(log).map((statement) => statement.id).sort(), [first.id, second.id].sort());
    assert.ok(!readFileSync(segmentPath(log), "utf8").includes("torn"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a NUL byte mid-file or followed by data in a bucket is still refused", () => {
  const { root, storeRoot, first, admitted } = store();
  try {
    const clean = readFileSync(admitted);
    writeFileSync(admitted, Buffer.concat([clean, Buffer.alloc(20), Buffer.from('{"id":"x","log":"y"}\n')]));
    assert.throws(() => locatedIndex(storeRoot).isAdmitted(first.id), /holds NUL bytes outside its packed prefix/);
    clearSegmentIndexes();
    writeFileSync(admitted, Buffer.concat([clean, Buffer.alloc(20), Buffer.from("data")]));
    assert.throws(() => locatedIndex(storeRoot).isAdmitted(first.id), /holds NUL bytes outside its packed prefix/);
  } finally { clearSegmentIndexes(); rmSync(root, { recursive: true, force: true }); }
});
