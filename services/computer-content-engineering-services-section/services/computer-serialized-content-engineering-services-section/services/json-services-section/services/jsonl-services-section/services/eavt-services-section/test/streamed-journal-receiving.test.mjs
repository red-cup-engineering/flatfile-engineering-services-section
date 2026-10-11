import assert from "node:assert/strict";
import { appendFileSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { iterateEavtEntries, readEavtEntries, readEavtEntriesSince } from "../scripts/read-eavt-entries.mjs";
import { iterateEavtJournalThroughDate, readEavtJournalThroughDate } from "../scripts/read-eavt-journal.mjs";
import { journalPath } from "../scripts/journal-path.mjs";
import { mkdirSync } from "node:fs";

test("streamed recovery retains Unicode across carrier blocks, trace order and the final unseparated row", () => {
  const root = mkdtempSync(join(tmpdir(), "eavt-stream-receiving-"));
  try {
    const first = { e: "first", a: "observed", v: "🙂".repeat(20000), t: 1 };
    const last = { e: "last", a: "observed", v: false, t: 2 };
    const path = journalPath({ root, feed: "test", at: "2026-10-01" });
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(first) + "\nmalformed\n" + JSON.stringify(last));
    assert.deepEqual([...iterateEavtEntries({ path })], [first, last]);
    assert.deepEqual(readEavtEntries({ path }, { select: value => value.e === "last" }), [last]);
    const expected = [{ entry: first, trace: 1 }, { entry: last, trace: 2 }];
    assert.deepEqual([...iterateEavtJournalThroughDate({ root, feed: "test", throughDate: "2026-10-01" })], expected);
    assert.deepEqual(readEavtJournalThroughDate({ root, feed: "test", throughDate: "2026-10-01" }), expected);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("incremental reading holds a torn line, advances past malformed completed lines and resets on replacement and truncation", () => {
  const root = mkdtempSync(join(tmpdir(), "eavt-tail-receiving-"));
  try {
    const path = join(root, "feed.jsonl");
    const first = { e: "first", a: "seen", v: true, t: 1 };
    const next = { e: "next", a: "seen", v: "🙂", t: 2 };
    writeFileSync(path, JSON.stringify(first) + "\nmalformed\n" + JSON.stringify(next).slice(0, -2));
    const held = readEavtEntriesSince({ path });
    assert.deepEqual(held.rows, [first]);
    assert.equal(held.reading.offset, Buffer.byteLength(JSON.stringify(first) + "\nmalformed\n"));
    assert.deepEqual(readEavtEntriesSince({ path, since: held.reading }).rows, []);
    appendFileSync(path, JSON.stringify(next).slice(-2) + "\n");
    const advanced = readEavtEntriesSince({ path, since: held.reading });
    assert.deepEqual(advanced.rows, [next]);
    const replacement = join(root, "replacement.jsonl");
    writeFileSync(replacement, JSON.stringify(first) + "\n"); renameSync(replacement, path);
    const reset = readEavtEntriesSince({ path, since: advanced.reading });
    assert.equal(reset.reset, true); assert.deepEqual(reset.rows, [first]);
    writeFileSync(path, "");
    assert.equal(readEavtEntriesSince({ path, since: reset.reading }).reset, true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
