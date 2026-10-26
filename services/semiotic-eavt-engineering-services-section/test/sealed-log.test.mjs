import test from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { append, logDates, readLog, sealLogs } from "../src/store.mjs";
import { logsDirectory } from "../src/layout.mjs";
import { sealDay, writeSegment } from "../src/sealed-log.mjs";

const TYPE = "desk-decision";
function store(t) {
  const root = mkdtempSync(join(tmpdir(), "sealed-log-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
const write = (root, day, count, extra = "") => {
  for (let i = 0; i < count; i += 1) append(root, TYPE, { at: `${day}T00:00:${String(i % 60).padStart(2, "0")}.000Z`, i, padding: `${extra}${"x".repeat(i % 200)}` });
};
const read = (root, day, from = 0) => [...readLog(root, TYPE, day, { from })];

test("a sealed day reads back the same lines at the same cursors, and the open day stays open", (t) => {
  const root = store(t);
  for (const day of ["2026-10-15", "2026-10-16", "2026-10-17"]) write(root, day, 3000);
  const before = Object.fromEntries(["2026-10-15", "2026-10-16", "2026-10-17"].map((day) => [day, read(root, day)]));
  const sealed = sealLogs(root, TYPE, { before: "2026-10-17" });
  assert.equal(sealed.length, 2);
  const names = readdirSync(logsDirectory(root, TYPE)).sort();
  assert.ok(names.includes("2026-10-17.jsonl") && !names.includes("2026-10-15.jsonl") && names.some((name) => /^2026-10-15\.0-\d+\.jsonl\.gz$/u.test(name)), names.join(" "));
  for (const day of Object.keys(before)) assert.deepEqual(read(root, day), before[day], day);
  assert.deepEqual([...logDates(root, TYPE)], ["2026-10-15", "2026-10-16", "2026-10-17"]);
  // A cursor taken before sealing resumes at the same line.
  const middle = before["2026-10-15"][1499];
  assert.deepEqual(read(root, "2026-10-15", middle.next), before["2026-10-15"].slice(1500));
});

test("a sealed segment is ordinary gzip: its bytes are the day's bytes", (t) => {
  const root = store(t), day = "2026-10-15";
  write(root, day, 500);
  const bytes = readFileSync(join(logsDirectory(root, TYPE), `${day}.jsonl`));
  sealLogs(root, TYPE, { before: "2026-10-16" });
  const segment = readdirSync(logsDirectory(root, TYPE)).find((name) => name.endsWith(".jsonl.gz"));
  assert.deepEqual(gunzipSync(readFileSync(join(logsDirectory(root, TYPE), segment))), bytes);
  assert.ok(readFileSync(join(logsDirectory(root, TYPE), segment)).length < bytes.length / 5, "the repetitive log compresses");
});

test("a late line for a sealed day is a tail after the seal, and sealing again adds the next segment", (t) => {
  const root = store(t), day = "2026-10-15";
  write(root, day, 100);
  sealLogs(root, TYPE, { before: "2026-10-16" });
  const sealedLines = read(root, day);
  append(root, TYPE, { at: `${day}T23:59:59.000Z`, late: true });
  const withTail = read(root, day);
  assert.deepEqual(withTail.slice(0, 100), sealedLines);
  assert.equal(withTail.at(-1).line.late, true);
  assert.deepEqual(read(root, day, sealedLines.at(-1).next), [withTail.at(-1)]);
  sealLogs(root, TYPE, { before: "2026-10-16" });
  assert.equal(readdirSync(logsDirectory(root, TYPE)).filter((name) => name.endsWith(".jsonl.gz")).length, 2);
  assert.deepEqual(read(root, day), withTail);
});

test("a seal interrupted after writing its segment is finished without copying the day twice", (t) => {
  const root = store(t), day = "2026-10-15", directory = logsDirectory(root, TYPE);
  write(root, day, 200);
  const before = read(root, day);
  renameSync(join(directory, `${day}.jsonl`), join(directory, `${day}.jsonl.sealing`));
  writeSegment(directory, day, join(directory, `${day}.jsonl.sealing`), 0); // the run stopped here
  assert.deepEqual(read(root, day).slice(0, 200), before, "until it is finished, the day reads its segment");
  assert.equal(sealDay(directory, readdirSync(directory), day), null);
  assert.deepEqual(readdirSync(directory).filter((name) => name.startsWith(day)).length, 1);
  assert.deepEqual(read(root, day), before);
});

test("an unterminated last line is sealed terminated, and still skipped", (t) => {
  const root = store(t), day = "2026-10-15";
  write(root, day, 10);
  appendFileSync(join(logsDirectory(root, TYPE), `${day}.jsonl`), '{"at":"2026-10-15T00:00:59.000Z","cut');
  const before = read(root, day);
  sealLogs(root, TYPE, { before: "2026-10-16" });
  assert.deepEqual(read(root, day), before);
});
