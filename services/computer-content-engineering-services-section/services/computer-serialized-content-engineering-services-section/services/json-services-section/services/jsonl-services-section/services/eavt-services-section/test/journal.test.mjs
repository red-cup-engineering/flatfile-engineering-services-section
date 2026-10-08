import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { journalPath } from "../scripts/journal-path.mjs";
import { appendEavtEntries } from "../scripts/append-eavt-entries.mjs";
import { readEavtEntries } from "../scripts/read-eavt-entries.mjs";
import { readEavtJournal } from "../scripts/read-eavt-journal.mjs";
import { writeEavtEntries } from "../scripts/write-eavt-entries.mjs";
test("dated EAVT JSONL custody appends only unseen rows and derives traces", () => {
  const root = mkdtempSync(path.join(tmpdir(), "eavt-"));
  try {
    const request = {
      root,
      feed: "events",
      at: "2026-07-31",
      entries: [{ e: "s", a: "p", v: 1, t: "2026-07-31" }],
    };
    assert.equal(appendEavtEntries(request).appended, 1);
    assert.equal(appendEavtEntries(request).appended, 0);
    const file = journalPath(request);
    assert.deepEqual(readEavtEntries({ path: file }), request.entries);
    assert.deepEqual(
      readEavtJournal(request).map((x) => x.trace),
      [1],
    );
    assert.equal(writeEavtEntries({ path: file, entries: [] }).entries, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("historical EAVT recovery skips malformed JSONL lines without weakening generic JSONL", () => {
  const root = mkdtempSync(path.join(tmpdir(), "eavt-history-"));
  try {
    const file = path.join(root, "history.jsonl");
    writeFileSync(
      file,
      '{"e":"s","a":"p","v":1,"t":"now"}\nbroken\n{"e":"s","a":"p"}\n',
    );
    assert.deepEqual(readEavtEntries({ path: file }), [
      { e: "s", a: "p", v: 1, t: "now" },
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
