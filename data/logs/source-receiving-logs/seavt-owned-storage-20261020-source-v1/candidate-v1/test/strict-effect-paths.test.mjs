import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, lstatSync, writeFileSync, readFileSync, readdirSync, existsSync, symlinkSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { append, readLog, withFileLock, writeHead } from "../src/store-core.mjs";
import { logFile, headFile } from "../src/layout.mjs";
import { sealDay, writeSegment, segmentLines } from "../src/sealed-log.mjs";
import { appendSeavtRow, readSeavtFeed } from "../src/seavt-log.mjs";
import { seavtOfJson } from "../src/admit-seavt-row.mjs";
import { SEAVT_NAMED_CARRIER_PROFILE, rowsEqual } from "../src/seavt-carrier.mjs";
import { validateJsonSchema } from "@red-cup-engineering/json-schema-services-section/validation";
import schema from "../data/schemas/seavt-named-carrier.schema.json" with { type: "json" };

// The native receiver must supply Data SSE typed-log TMPDIR; actual HOME is
// inherited unchanged. This fixture proves no production owner or durability history.
function fixture(t) {
  const base = mkdtempSync(join(tmpdir(), "seavt-strict-effects-")), identity = lstatSync(base);
  t.after(() => { const current = lstatSync(base);
    assert.equal(current.dev, identity.dev);assert.equal(current.ino, identity.ino);
    assert.ok(current.isDirectory() && !current.isSymbolicLink());rmSync(base, { recursive: true });
  });
  const durableRoot = join(base, "data");mkdirSync(durableRoot);
  const root = join(durableRoot, "settlement");return { base, durableRoot, root };
}
const at = "2026-10-20T12:00:00.000Z";

test("explicit named filing keeps schema-exact wire while original default still requires line.at", t => {
  const f = fixture(t), row = seavtOfJson("subject", "predicate", { value: 1 }, at);
  assert.equal(appendSeavtRow(f.root, "named", row, { carrierProfile: SEAVT_NAMED_CARRIER_PROFILE, durableRoot: f.durableRoot }), true);
  const line = JSON.parse(readFileSync(logFile(f.root, "named", "2026-10-20"), "utf8"));
  assert.equal(Object.hasOwn(line, "at"), false);assert.equal(line.filedAt, at);
  assert.equal(validateJsonSchema(line, schema).valid, true);
  assert.ok(rowsEqual([...readSeavtFeed(f.root, "named")][0].row, row));
  assert.throws(() => append(f.root, "missing", { filedAt: at }), /log line/u);
  assert.throws(() => append(f.root, "mismatch", { at }, { at: "2026-10-21T00:00:00.000Z" }), /must agree/u);
  assert.equal(existsSync(logFile(f.root, "missing", "2026-10-20")), false);
});

test("strict next-day automatic sealing preserves exact original bytes and cursors", t => {
  const f = fixture(t), first = { at, value: "retained" };
  append(f.root, "arrival", first, { durableRoot: f.durableRoot });
  const file = logFile(f.root, "arrival", "2026-10-20"), bytes = readFileSync(file);
  append(f.root, "arrival", { at: "2026-10-21T00:00:00.000Z", value: 2 }, { durableRoot: f.durableRoot });
  assert.equal(existsSync(file), false);assert.equal(existsSync(file + ".sealing"), false);
  const rows = [...readLog(f.root, "arrival", "2026-10-20")];assert.deepEqual(rows[0].line, first);assert.equal(rows.at(-1).next, bytes.length);
  const directory = join(f.root, "data", "logs", "arrival-logs");
  const segment = readdirSync(directory).find(name => name.endsWith(".jsonl.gz"));assert.ok(segment);
  assert.equal([...segmentLines(join(directory, segment), 0, 0)].map(v => v.text + "\n").join(""), bytes.toString());
});

test("strict head lock refuses a redirected target before callback or record publication", t => {
  const f = fixture(t), file = headFile(f.root, "claim", "one"), foreign = join(f.base, "foreign");writeFileSync(foreign, "retained");
  mkdirSync(join(f.root, "data", "state", "claim-state"), { recursive: true });symlinkSync(foreign, file + ".lock");
  let called = false;assert.throws(() => withFileLock(file + ".lock", () => { called = true; }, { durableRoot: f.durableRoot }), /strict|regular|redirected/u);
  assert.equal(called, false);assert.equal(readFileSync(foreign, "utf8"), "retained");
  assert.throws(() => writeHead(f.root, "claim", "one", { frontier: [] }, { durableRoot: f.durableRoot }), /strict|regular|redirected/u);
  assert.equal(existsSync(file), false);
});

test("strict lock cleanup retains a replaced lock and reports earlier callback effects honestly", t => {
  const f = fixture(t), lock = join(f.durableRoot, "locks", "one.lock");let called = false;
  assert.throws(() => withFileLock(lock, () => {
    called = true;renameSync(lock, lock + ".original");writeFileSync(lock, "foreign");
  }, { durableRoot: f.durableRoot }), /ownership changed/u);
  assert.equal(called, true);assert.equal(readFileSync(lock, "utf8"), "foreign");assert.equal(existsSync(lock + ".original"), true);
});

test("strict segment partial redirect is refused without truncating source or foreign bytes", t => {
  const f = fixture(t), dir = join(f.durableRoot, "logs");mkdirSync(dir);
  const source = join(dir, "2026-10-20.jsonl.sealing"), foreign = join(f.base, "foreign");writeFileSync(source, "retained\n");writeFileSync(foreign, "foreign");
  symlinkSync(foreign, join(dir, ".2026-10-20.0.jsonl.gz.partial"));
  assert.throws(() => writeSegment(dir, "2026-10-20", source, 0, { durableRoot: f.durableRoot }), /strict|regular|redirected/u);
  assert.equal(readFileSync(source, "utf8"), "retained\n");assert.equal(readFileSync(foreign, "utf8"), "foreign");
});

test("strict computed segment target is received after local partial formation and before rename", t => {
  const f = fixture(t), dir = join(f.durableRoot, "logs");mkdirSync(dir);
  const source = join(dir, "2026-10-20.jsonl.sealing"), foreign = join(f.base, "foreign"), bytes = Buffer.from("retained\n");writeFileSync(source, bytes);writeFileSync(foreign, "foreign");
  symlinkSync(foreign, join(dir, `2026-10-20.0-${bytes.length}.jsonl.gz`));
  assert.throws(() => writeSegment(dir, "2026-10-20", source, 0, { durableRoot: f.durableRoot }), /strict|regular|redirected/u);
  assert.equal(existsSync(join(dir, ".2026-10-20.0.jsonl.gz.partial")), true, "partial formation was an actual earlier effect");
  assert.deepEqual(readFileSync(source), bytes);assert.equal(readFileSync(foreign, "utf8"), "foreign");
});

test("strict sealing refuses a redirected recovery source before renaming the open day", t => {
  const f = fixture(t), dir = join(f.durableRoot, "logs");mkdirSync(dir);
  const source = join(dir, "2026-10-20.jsonl"), foreign = join(f.base, "foreign");writeFileSync(source, "retained\n");writeFileSync(foreign, "foreign");
  symlinkSync(foreign, source + ".sealing");
  assert.throws(() => sealDay(dir, readdirSync(dir), "2026-10-20", { durableRoot: f.durableRoot }), /strict|regular|redirected/u);
  assert.equal(readFileSync(source, "utf8"), "retained\n");assert.equal(readFileSync(foreign, "utf8"), "foreign");
});

test("strict interrupted-seal completed-segment recovery removes only the matching source", t => {
  const f = fixture(t), dir = join(f.durableRoot, "logs");mkdirSync(dir);
  const source = join(dir, "2026-10-20.jsonl.sealing"), bytes = Buffer.from("retained\n");writeFileSync(source, bytes);
  const segment = writeSegment(dir, "2026-10-20", source, 0, { durableRoot: f.durableRoot });
  assert.equal(sealDay(dir, readdirSync(dir), "2026-10-20", { durableRoot: f.durableRoot }), null);
  assert.equal(existsSync(source), false);assert.equal(existsSync(join(dir, segment.name)), true);
  assert.equal([...segmentLines(join(dir, segment.name), 0, 0)].map(v => v.text + "\n").join(""), bytes.toString());
});
