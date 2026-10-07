import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { eavtRow } from "../scripts/admit-row.mjs";
import { appendEavtEntries } from "../scripts/append-eavt-entries.mjs";
import { readEavtEntries } from "../scripts/read-eavt-entries.mjs";
import { journalPath } from "../scripts/journal-path.mjs";
import {
  settledDatom,
  settle,
  recordPathFor,
  readDatomsAtPath,
  commitSettledRecord,
} from "../services/datom-services-section/src/index.mjs";

function withTempRoot(fn) {
  const root = mkdtempSync(path.join(tmpdir(), "witness-journal-record-test-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const AT = "2026-07-31T12:00:00.000Z";
const entry = (e, a, v, t) => eavtRow({ e, a, v, t });

test("settledDatom builds the five-part [e, a, v, t, reading] shape", () => {
  const row = entry("s", "urn:sen:observed", "v", AT);
  const datom = settledDatom({
    row,
    reading: { kind: "witness-journal.record.reading", verdict: "held" },
  });
  assert.equal(datom.length, 5);
  assert.deepEqual(datom, [
    "s",
    "urn:sen:observed",
    "v",
    AT,
    { kind: "witness-journal.record.reading", verdict: "held" },
  ]);
});

test("settle splits entries into settled Datoms and still-live kept entries by caller judgment", () => {
  const rows = [
    entry("s1", "urn:sen:observed", "a", AT),
    entry("s2", "urn:sen:observed", "b", AT),
    entry("s3", "urn:sen:observed", "c", AT),
  ];
  const { datoms, kept } = settle({
    entries: rows.map((row) =>
      row.e === "s2" ? { row } : { row, reading: { verdict: "settled" } },
    ),
  });
  assert.equal(datoms.length, 2);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].e, "s2");
  assert.deepEqual(
    datoms.map((d) => d[0]),
    ["s1", "s3"],
  );
});

test("settle with a judge that settles nothing keeps every entry live", () => {
  const rows = [entry("s1", "p", "v", AT)];
  const { datoms, kept } = settle({ entries: rows.map((row) => ({ row })) });
  assert.equal(datoms.length, 0);
  assert.equal(kept.length, 1);
});

test("recordPathFor sits beside the live journal file under the same dated directory", () => {
  withTempRoot((root) => {
    const logPath = journalPath({ root, feed: "feed-a", at: AT });
    const recordPath = recordPathFor({ root, feed: "feed-a", at: AT });
    assert.equal(path.dirname(recordPath), path.dirname(logPath));
    assert.equal(recordPath, logPath.replace(/\.jsonl$/, ".record.jsonl"));
  });
});

test("commitSettledRecord appends Datoms to the record file and compacts the live log to kept", () => {
  withTempRoot((root) => {
    const feed = "feed-b";
    const rows = [
      entry("s1", "urn:sen:observed", "a", AT),
      entry("s2", "urn:sen:observed", "b", AT),
      entry("s3", "urn:sen:observed", "c", AT),
    ];
    appendEavtEntries({ root, feed, entries: rows, at: AT });

    const { datoms, kept } = settle({
      entries: rows.map((row) =>
        row.e === "s2" ? { row } : { row, reading: { verdict: "settled" } },
      ),
    });
    const result = commitSettledRecord({ root, feed, datoms, kept, at: AT });
    assert.ok(result);

    const settledBack = readDatomsAtPath(recordPathFor({ root, feed, at: AT }));
    assert.equal(settledBack.length, 2);
    assert.deepEqual(settledBack.map((d) => d[0]).sort(), ["s1", "s3"]);
    for (const datom of settledBack) assert.equal(datom.length, 5);

    // The live log is atomically rewritten to only the kept (still-live) entry.
    const liveLog = readEavtEntries({
      path: journalPath({ root, feed, at: AT }),
    });
    assert.equal(liveLog.length, 1);
    assert.equal(liveLog[0].e, "s2");
  });
});

test("commitSettledRecord is a no-op when there is nothing to settle", () => {
  withTempRoot((root) => {
    const feed = "feed-c";
    const rows = [entry("s1", "p", "v", AT)];
    appendEavtEntries({ root, feed, entries: rows, at: AT });

    const { datoms, kept } = settle({ entries: rows.map((row) => ({ row })) });
    const result = commitSettledRecord({ root, feed, datoms, kept, at: AT });
    assert.equal(result, null);

    assert.equal(
      existsSync(recordPathFor({ root, feed, at: AT })),
      false,
      "no record file materializes for an empty commit",
    );
    const liveLog = readEavtEntries({
      path: journalPath({ root, feed, at: AT }),
    });
    assert.equal(liveLog.length, 1, "the live log is untouched");
  });
});

test("readDatomsAtPath reads back a missing file as no settled records", () => {
  withTempRoot((root) => {
    assert.deepEqual(
      readDatomsAtPath(path.join(root, "nope.record.jsonl")),
      [],
    );
  });
});
