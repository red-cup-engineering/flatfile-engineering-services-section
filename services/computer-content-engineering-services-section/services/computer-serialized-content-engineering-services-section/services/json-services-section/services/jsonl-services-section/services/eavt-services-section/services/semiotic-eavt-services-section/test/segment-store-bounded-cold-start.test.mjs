import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { artifactStoreRoot } from "../src/journal/store-root.mjs";
import { journalWitness } from "../src/journal/event.mjs";
import {
  clearSegmentIndexes, foldSegmentStatements, projectSegmentStatements, segmentAdmit, segmentLimits, segmentPath, segmentStatements,
} from "../src/journal/filesystem/segment-store.mjs";

const witness = (n) => journalWitness({
  kind: "metroplat.journal.observation", seat: "urn:test:newsroom", claim: tm.mark("source-assayed"),
  address: tm.mark("held-document"), time: "2026-10-08T00:00:00.000Z", causes: [], payload: { n: 1000 + n },
});

const count = 20;
function store() {
  const root = mkdtempSync(join(tmpdir(), "journal-bounded-"));
  const log = join(root, "data/journals/2026/10/08/feed.jsonl");
  const statements = Array.from({ length: count }, (_, n) => witness(n));
  segmentAdmit(log, statements);
  clearSegmentIndexes();
  const checkpoints = join(artifactStoreRoot(log), "index/segment-verified/v1.jsonl");
  const recorded = () => { try { return readFileSync(checkpoints, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)); } catch { return []; } };
  return { root, log, statements, recorded, file: segmentPath(log) };
}
const saved = { ...segmentLimits };
const small = () => Object.assign(segmentLimits, { streamedBytes: 1, checkpointBytes: 1 });
const restore = () => Object.assign(segmentLimits, saved);

test("a large segment is verified by streaming and checkpointed as it goes", () => {
  const { root, log, recorded, file } = store();
  try {
    small();
    assert.equal(segmentStatements(log).length, count);
    const lines = recorded().filter((record) => record.segment.endsWith(".witnesses"));
    assert.ok(lines.length >= count / 2, `progress is written incrementally (${lines.length} checkpoints)`);
    assert.equal(Math.max(...lines.map((record) => record.offset)), statSync(file).size);
  } finally { restore(); rmSync(root, { recursive: true, force: true }); }
});

test("a verification that fails midway leaves its progress checkpointed", () => {
  const { root, log, recorded, file } = store();
  try {
    small();
    const lines = readFileSync(file, "utf8").split("\n");
    lines[14] = JSON.stringify({ id: "ni:///sha-256;not-a-witness" });
    writeFileSync(file, lines.join("\n"));
    assert.throws(() => segmentStatements(log), /./);
    const through = Math.max(0, ...recorded().map((record) => record.offset));
    const startOfBad = Buffer.byteLength(lines.slice(0, 14).join("\n")) + 1;
    assert.ok(through > 0 && through <= startOfBad, `checkpointed ${through} of ${startOfBad} verified bytes before the bad line`);
  } finally { restore(); rmSync(root, { recursive: true, force: true }); }
});

test("a checkpointed segment whose bytes later change is verified again, not trusted", () => {
  const { root, log, file } = store();
  try {
    small();
    assert.equal(segmentStatements(log).length, count);
    writeFileSync(file, readFileSync(file, "utf8").replace('"n":1005', '"n":1999'));
    clearSegmentIndexes();
    assert.throws(() => segmentStatements(log), /./);
  } finally { restore(); rmSync(root, { recursive: true, force: true }); }
});

test("a segment too large to hold decoded is refused with an error; folding and projecting it still work", () => {
  const { root, log, statements } = store();
  try {
    small();
    segmentLimits.materializeHeap = 1;
    assert.throws(() => segmentStatements(log), (error) => error.code === "JOURNAL_SEGMENT_TOO_LARGE");
    clearSegmentIndexes();
    const folded = [];
    foldSegmentStatements(log, [], (statement) => folded.push(statement.id));
    assert.deepEqual(folded, statements.map((statement) => statement.id).sort((a, b) => a.localeCompare(b)));
    clearSegmentIndexes();
    assert.equal(projectSegmentStatements(log, (statement) => statement.id).length, count);
  } finally { restore(); rmSync(root, { recursive: true, force: true }); }
});
