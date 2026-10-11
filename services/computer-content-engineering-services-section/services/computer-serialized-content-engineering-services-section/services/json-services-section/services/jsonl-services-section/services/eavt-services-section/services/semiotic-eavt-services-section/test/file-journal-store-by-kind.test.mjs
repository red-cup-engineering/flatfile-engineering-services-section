import assert from "node:assert/strict";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { journalWitness } from "../src/journal/event.mjs";
import { journalDirectoryOf, journalFeedPath, STORE_AREAS } from "../src/journal/store-root.mjs";
import { clearSegmentIndexes, locatedIndex, segmentAdmit, segmentAdmittedLogs, segmentStatements } from "../src/journal/filesystem/segment-store.mjs";
import { packSegment } from "../src/journal/filesystem/segment-bytes.mjs";
import { fileJournalStoreByKind, kindLogOf } from "../scripts/file-journal-store-by-kind.mjs";

const witness = (n) => journalWitness({
  kind: "metroplat.journal.observation", seat: "urn:test:filing", claim: tm.mark("observed"),
  address: tm.mark("held"), time: `2026-10-0${n}T00:00:00.000Z`, causes: [], payload: { n },
});

test("a dated feed path takes its kind directory; a path that is not dated is kept", () => {
  assert.equal(kindLogOf("2026/10/08/2026-10-08-admit-metroplat.clock.schedule.jsonl"), "metroplat.clock.schedule-logs/2026-10-08-admit-metroplat.clock.schedule.jsonl");
  assert.equal(kindLogOf("2026/10/08/feed.jsonl"), "feed-logs/2026-10-08-admit-feed.jsonl");
  assert.equal(kindLogOf("feed-logs/2026-10-08-admit-feed.jsonl"), "feed-logs/2026-10-08-admit-feed.jsonl");
});

/** A settlement as the dated layout left it: its store in machine state behind `data/journals`, a v2 index not yet
 *  carried, a day's packets and heads, and plain feeds and records kept by date in a real `data/logs`. */
function datedSettlement(t) {
  const base = mkdtempSync(join(tmpdir(), "journal-filing-"));
  t.after(() => { clearSegmentIndexes(); rmSync(base, { recursive: true, force: true }); });
  // Real segments and ledgers, written by the store, then laid out as the dated layout kept them.
  const scratch = join(base, "scratch");
  const statements = [1, 2].map((n) => {
    const statement = witness(n);
    segmentAdmit(journalFeedPath(scratch, "feed", `2026-10-0${n}`), [statement]);
    return statement;
  });
  const state = join(base, "state", "settlement", "journals");
  for (const n of [1, 2]) {
    const day = join(state, "2026", "10", `0${n}`);
    mkdirSync(day, { recursive: true });
    for (const suffix of [".witnesses", ".admitted"]) renameSync(`${journalFeedPath(scratch, "feed", `2026-10-0${n}`)}${suffix}`, join(day, `2026-10-0${n}-admit-feed.jsonl${suffix}`));
  }
  // A closed day's segment, packed as pack-closed-segments leaves it: its bytes in a zstd frame beside it.
  const packing = packSegment(join(state, "2026", "10", "01", "2026-10-01-admit-feed.jsonl.witnesses"), { frameBytes: 64 });
  mkdirSync(join(state, "index", "causal-admission", "v2"), { recursive: true });
  writeFileSync(join(state, "index", "causal-admission", "v2", "admitted.jsonl"),
    statements.map((statement, index) => `${JSON.stringify({ id: statement.id, log: `2026/10/0${index + 1}/2026-10-0${index + 1}-admit-feed.jsonl` })}\n`).join(""));
  mkdirSync(join(state, "2026", "10", "01", "packets", "sha256"), { recursive: true });
  writeFileSync(join(state, "2026", "10", "01", "packets", "sha256", "abc.json"), "{}\n");
  mkdirSync(join(state, "2026", "10", "01", "index", "work-heads"), { recursive: true });
  writeFileSync(join(state, "2026", "10", "01", "index", "work-heads", "key.json"), "{}\n");
  mkdirSync(join(state, "objects"), { recursive: true });
  const root = join(base, "settlement");
  mkdirSync(join(root, "data", "logs", "2026", "09", "20"), { recursive: true });
  symlinkSync(state, join(root, "data", "journals"));
  writeFileSync(join(root, "data", "logs", "2026", "09", "20", "witness-journal-seavt.jsonl"), "{\"e\":\"e\",\"a\":\"a\",\"v\":\"v\",\"t\":\"2026-09-20\"}\n");
  writeFileSync(join(root, "data", "logs", "2026", "09", "20", "witness.record.jsonl"), "[\"e\",\"a\",\"v\"]\n");
  mkdirSync(join(root, "data", "logs", "ledgers"), { recursive: true });
  writeFileSync(join(root, "data", "logs", "ledgers", "books.beancount"), "; books\n");
  mkdirSync(join(root, "data", "logs", "intake"), { recursive: true });
  writeFileSync(join(root, "data", "logs", "intake", "2026-09-30.jsonl"), "{}\n");
  clearSegmentIndexes();
  return { base, root, statements, packing, store: join(base, "state", "settlement", "data", "logs") };
}

test("a dated store is filed by kind once, its index rewritten, and data/logs becomes the store when nothing else is left", (t) => {
  const { root, statements, packing, store } = datedSettlement(t);
  assert.ok(packing.packed > 0, "the fixture packed a segment");
  const first = fileJournalStoreByKind(root);
  assert.deepEqual(first.conflicts, []);
  assert.equal(first.store, store);
  // The feeds, packets, heads and the store's areas are in the kind layout, in machine state beside the old store.
  const feed = (n) => join(store, "feed-logs", `2026-10-0${n}-admit-feed.jsonl`);
  for (const n of [1, 2]) assert.ok(existsSync(`${feed(n)}.witnesses`) && existsSync(`${feed(n)}.admitted`));
  assert.ok(existsSync(join(store, STORE_AREAS.packets, "sha256", "abc.json")));
  assert.ok(existsSync(join(store, STORE_AREAS.index, "heads", "2026-10-01", "work-heads", "key.json")));
  assert.ok(existsSync(join(store, STORE_AREAS.objects)));
  assert.ok(existsSync(join(store, "witness-journal-seavt-logs", "2026-09-20-admit-witness-journal-seavt.jsonl")));
  assert.ok(existsSync(join(root, "data", "records", "witness-records", "2026-09-20-commit-witness.jsonl")));
  // The v2 index was carried before the move and every feed path it holds names the kind layout; v2 is gone.
  assert.equal(existsSync(join(store, STORE_AREAS.index, "causal-admission", "v2")), false);
  clearSegmentIndexes();
  const index = locatedIndex(store);
  assert.deepEqual([...index.admittedLogs(statements[0].id)], ["feed-logs/2026-10-01-admit-feed.jsonl"]);
  assert.deepEqual(segmentStatements(feed(2)).map((statement) => statement.id), [statements[1].id]);
  // The packed segment reads through its description and data, which moved beside it.
  assert.deepEqual(segmentStatements(feed(1)).map((statement) => statement.id), [statements[0].id]);
  assert.ok(existsSync(join(store, "feed-logs", packing.description ?? "")) || readdirSync(join(store, "feed-logs")).some((name) => name.startsWith(".packing-")));
  // data/logs still holds something that is not a log feed, so it is not replaced, and the old link stays.
  assert.ok(existsSync(join(root, "data", "records", "ledger-records", "books.beancount")), "books are records");
  assert.ok(first.leftInPlace.some((entry) => entry.endsWith(join("data", "logs", "intake"))));
  assert.equal(lstatSync(join(root, "data", "logs")).isSymbolicLink(), false);
  assert.equal(lstatSync(join(root, "data", "journals")).isSymbolicLink(), true);

  // Once the rest of data/logs has its home, a second run makes data/logs the store and guards data/journals.
  rmSync(join(root, "data", "logs", "intake"), { recursive: true });
  const second = fileJournalStoreByKind(root);
  assert.equal(second.moved, 0);
  assert.deepEqual(second.conflicts, []);
  assert.equal(readlinkSync(join(root, "data", "logs")), store);
  assert.ok(lstatSync(join(root, "data", "journals")).isFile());
  assert.match(readFileSync(join(root, "data", "journals"), "utf8"), /filed by kind under data\/logs/u);
  assert.equal(journalDirectoryOf(root), join(root, "data", "logs"));
  clearSegmentIndexes();
  assert.deepEqual(segmentAdmittedLogs(join(root, "data", "logs"), { kind: "feed" }).map((log) => log.slice(log.lastIndexOf("/") + 1)),
    ["2026-10-01-admit-feed.jsonl", "2026-10-02-admit-feed.jsonl"]);
  // A third run has nothing left to do.
  const third = fileJournalStoreByKind(root);
  assert.equal(third.moved, 0);
  assert.equal(third.rewritten, 0);
});

test("a dry run moves nothing", (t) => {
  const { root, store } = datedSettlement(t);
  const report = fileJournalStoreByKind(root, { dryRun: true });
  assert.ok(report.moved > 0);
  assert.equal(existsSync(join(store, "feed-logs")), false);
  assert.ok(existsSync(join(root, "data", "journals", "2026", "10", "01", "2026-10-01-admit-feed.jsonl.witnesses")));
});
