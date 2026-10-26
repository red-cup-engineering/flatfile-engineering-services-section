import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { jsonToTerm, listTerm, stringTerm, termToJson } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { jsonImageOf, lineOfRow, rowOfLine, rowsEqual, termsEqual } from "../src/seavt-carrier.mjs";
import { seavtOfJson, seavtRow } from "../src/admit-seavt-row.mjs";
import { appendSeavtRow, appendSeavtRows, readSeavtFeed, readSeavtRows } from "../src/seavt-log.mjs";
import { logDates, readLog } from "../src/store.mjs";
import { logsDirectory } from "../src/layout.mjs";
import { logGuard, writeBudget, readBudget } from "../src/log-budget.mjs";
import { overBudget, proposeBudget, staleRaw, volumeOf } from "../src/volume.mjs";
import { compactRoot } from "../src/compact-logs.mjs";

const mk = (x) => ["mark", x], pr = (a, b) => ["pair", a, b];
const scripts = fileURLToPath(new URL("../scripts/", import.meta.url));
const T = "2026-10-12T08:00:00.000Z";
function root(t) { const r = mkdtempSync(join(tmpdir(), "seavt-compact-")); t.after(() => rmSync(r, { recursive: true, force: true })); return r; }

// A small deterministic generator of JSON, so a failure replays.
function prng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; }; }
const STRINGS = ["", "a", "b", "key", "ni:///sha-256;abc", "héllo", "日本語", "😀 astral", "\u0000nul", "line\nbreak", "quote\"s", "back\\slash", "\ud800lone", "__proto__", "constructor", "10", "2", "Z", "z", "é", "é"];
const NUMBERS = [0, 1, -1, 0.5, -0.25, 1e21, 1e-7, 123456789012345680000, 2 ** 53 - 1, -(2 ** 53 - 1), 5e-324, 1.7976931348623157e308, 39635, 0.1 + 0.2];
function json(rand, depth = 0) {
  const kind = Math.floor(rand() * (depth > 3 ? 5 : 7));
  switch (kind) {
    case 0: return null;
    case 1: return rand() < 0.5;
    case 2: return STRINGS[Math.floor(rand() * STRINGS.length)];
    case 3: return NUMBERS[Math.floor(rand() * NUMBERS.length)];
    case 4: return Math.floor(rand() * 1000) - 500;
    case 5: return Array.from({ length: Math.floor(rand() * 5) }, () => json(rand, depth + 1));
    default: { const o = {}; for (let i = Math.floor(rand() * 6); i > 0; i -= 1) Object.defineProperty(o, STRINGS[Math.floor(rand() * STRINGS.length)], { value: json(rand, depth + 1), enumerable: true, writable: true, configurable: true }); return o; }
  }
}

test("property: the JSON carrier of a bridge image re-admits term-equal, through serialization, for random JSON", () => {
  const rand = prng(20261017);
  for (let i = 0; i < 1500; i += 1) {
    const e = json(rand), a = json(rand), v = json(rand);
    const row = seavtOfJson(e, a, v, T);
    const line = lineOfRow(row);
    assert.deepEqual([line.ej, line.aj, line.vj].map((x) => x === undefined), [false, false, false], "every bridge image is carried as JSON");
    assert.ok(!("e" in line) && !("a" in line) && !("v" in line));
    const text = JSON.stringify(line);              // key order and spelling are the serializer's, not the row's
    const back = rowOfLine(JSON.parse(text));
    assert.ok(rowsEqual(back, row), `case ${i}: ${text.slice(0, 200)}`);
    assert.ok(termsEqual(back.v, jsonToTerm(v)));
    assert.deepEqual(termToJson(back.v), termToJson(row.v));
    assert.equal(back.t, T);
  }
});

test("object keys are carried in the bridge's sorted order, and a differently ordered object is the same row", () => {
  const one = seavtOfJson("s", "p", { b: 1, a: 2, 10: 3, 2: 4, é: 5, Z: 6, z: 7 }, T);
  const two = seavtOfJson("s", "p", { z: 7, Z: 6, é: 5, 2: 4, 10: 3, a: 2, b: 1 }, T);
  assert.ok(rowsEqual(one, two));
  assert.ok(rowsEqual(rowOfLine(JSON.parse(JSON.stringify(lineOfRow(one)))), two));
});

test("numbers: integers, floats, exponents and extremes survive; -0 and non-finite are not JSON values", () => {
  for (const n of NUMBERS) {
    const row = seavtOfJson("s", "n", [n], T);
    assert.ok(rowsEqual(rowOfLine(JSON.parse(JSON.stringify(lineOfRow(row)))), row), String(n));
  }
  assert.throws(() => jsonToTerm(-0));
  assert.throws(() => jsonToTerm(Number.NaN));
});

test("a term outside the bridge's image keeps its full spine and is never altered", () => {
  const bare = mk(JSON.stringify("bare"));                      // a mark is not a string term
  const unsorted = pr(mk(JSON.stringify("sen.json.object")), listTerm([
    pr(mk(JSON.stringify("b")), stringTerm("1")), pr(mk(JSON.stringify("a")), stringTerm("2"))]));
  for (const outside of [bare, unsorted, pr(mk(JSON.stringify("sen.json.string")), mk("7"))]) {
    assert.equal(jsonImageOf(outside), undefined);
  }
  const row = seavtRow({ e: bare, a: jsonToTerm("p"), v: unsorted, t: T });
  const line = lineOfRow(row);
  assert.deepEqual(line.e, bare); assert.deepEqual(line.v, unsorted); assert.equal(line.aj, "p");
  const back = rowOfLine(JSON.parse(JSON.stringify(line)));
  assert.ok(rowsEqual(back, row));
  assert.deepEqual(back.v, unsorted, "the unsorted spine is returned as it was, not canonicalized");
});

test("readers accept every form: full spine, JSON, a mixture, and a row from before the carrier", () => {
  const row = seavtOfJson("subject", "attr", { k: [1, "two"] }, T);
  const full = { e: row.e, a: row.a, v: row.v, t: T };                // the earlier form: spines, `t`, no `at`
  assert.ok(rowsEqual(rowOfLine(full), row));
  assert.ok(rowsEqual(rowOfLine({ at: T, e: row.e, aj: "attr", vj: { k: [1, "two"] } }), row));
  assert.ok(rowsEqual(rowOfLine({ at: T, ...{ e: row.e, a: row.a, v: row.v } }), row), "an `{at,e,a,v}` line of the earlier store");
  assert.ok(rowsEqual(rowOfLine({ at: T, e: "subject", a: "attr", v: { k: [1, "two"] } }), row), "the plain form other feeds write");
  assert.throws(() => rowOfLine({ at: T, e: row.e, ej: "subject", aj: "attr", vj: 1 }), /exactly one/u);
  assert.throws(() => rowOfLine({ at: T, ej: "x", aj: "attr" }), /exactly one/u);
  assert.throws(() => rowOfLine({ at: T, ej: "x", aj: "a", vj: 1, extra: 1 }), /no member/u);
});

test("t differing from at is kept; t equal to at is not stored twice; a bare date files at midnight", () => {
  const same = lineOfRow(seavtOfJson("s", "a", 1, T));
  assert.ok(!("t" in same));
  const dated = lineOfRow(seavtOfJson("s", "a", 1, "2026-10-03"));
  assert.equal(dated.at, "2026-10-03T00:00:00.000Z"); assert.equal(dated.t, "2026-10-03");
  assert.equal(rowOfLine(dated).t, "2026-10-03");
  assert.equal(rowOfLine(lineOfRow(seavtOfJson("s", "a", 1, "2026-10-03T12:00:00+02:00"))).t, "2026-10-03T12:00:00+02:00");
});

test("filing and replay refuse impossible calendar days instead of normalizing them", () => {
  const leap = seavtOfJson("subject", "property", "value", "2024-02-29");
  assert.equal(lineOfRow(leap).at, "2024-02-29T00:00:00.000Z");
  const offset = seavtOfJson("subject", "property", "value", "2026-10-12T09:00:00-05:00");
  assert.equal(lineOfRow(offset).at, "2026-10-12T14:00:00.000Z");
  assert.equal(rowOfLine(lineOfRow(offset)).t, offset.t);
  for (const invalid of [
    "2026-02-30", "2025-02-29T00:00:00Z",
    "2026-02-30T00:00:00Z", "2026-10-12T24:00:00Z",
    "2026-13-01T00:00:00Z", "2026-10-12 10:00:00",
  ]) {
    assert.throws(() => lineOfRow(seavtOfJson("s", "p", "v", invalid)), /not a date or instant/);
    assert.throws(() => lineOfRow(seavtOfJson("s", "p", "v", T), { at: invalid }), /UTC instant/);
    assert.throws(() => rowOfLine({ at: invalid, ej: "s", aj: "p", vj: "v" }), /UTC instant/);
  }
});

test("the carrier is much smaller than the spine serialization", () => {
  const row = seavtOfJson("ni:///sha-256;0igEn4Ylrh6OGc_YYI2xcWTfcP_b2VoLQ-cZKWWk4eE", "kalshi:orderbook", { carrierAfterBytes: 39635, market: "KXHIGHNY-26OCT17-B80.5", bids: [[44, 100], [43, 250]], ok: true }, T);
  const spine = JSON.stringify({ e: row.e, a: row.a, v: row.v, t: row.t }).length, compact = JSON.stringify(lineOfRow(row)).length;
  assert.ok(compact * 4 < spine, `${spine} -> ${compact}`);
});

test("appendSeavtRow / readSeavtRows: day logs, the first append of a new day seals the days before it, reads stay continuous", (t) => {
  const r = root(t), feed = "market-book";
  const rows = [];
  for (const day of ["2026-10-10", "2026-10-11", "2026-10-12"])
    for (let i = 0; i < 40; i += 1) rows.push(seavtOfJson(`m${i}`, "book", { day, i, depth: [i, i + 1] }, `${day}T00:00:${String(i).padStart(2, "0")}.000Z`));
  for (const row of rows) assert.equal(appendSeavtRow(r, feed, row), true);
  const names = readdirSync(logsDirectory(r, feed)).sort();
  assert.ok(names.includes("2026-10-12.jsonl"), names.join());
  assert.ok(!names.includes("2026-10-10.jsonl") && !names.includes("2026-10-11.jsonl"), "closed days are sealed, not left raw");
  assert.ok(names.some((n) => /^2026-10-10\.0-\d+\.jsonl\.gz$/u.test(n)) && names.some((n) => /^2026-10-11\.0-\d+\.jsonl\.gz$/u.test(n)));
  assert.deepEqual([...logDates(r, feed)], ["2026-10-10", "2026-10-11", "2026-10-12"]);
  const read = [...readSeavtFeed(r, feed)];
  assert.equal(read.length, rows.length);
  read.forEach(({ row }, i) => assert.ok(rowsEqual(row, rows[i]), `row ${i}`));
  const day = [...readSeavtRows(r, feed, "2026-10-10")];
  assert.deepEqual([...readSeavtRows(r, feed, "2026-10-10", { from: day[19].next })].length, 20, "a cursor resumes inside a sealed day");
});

test("a row larger than a gzip block seals and reads back whole", (t) => {
  const r = root(t), feed = "big-feed", big = { blob: "x".repeat(200_000), n: [1, 2, 3] };
  appendSeavtRow(r, feed, seavtOfJson("s", "big", big, "2026-10-10T00:00:00.000Z"));
  appendSeavtRow(r, feed, seavtOfJson("s", "big", { ...big, n: 2 }, "2026-10-10T00:00:01.000Z"));
  appendSeavtRow(r, feed, seavtOfJson("s", "later", 1, "2026-10-11T00:00:00.000Z"));
  assert.ok(!existsSync(join(logsDirectory(r, feed), "2026-10-10.jsonl")));
  const rows = [...readSeavtRows(r, feed, "2026-10-10")].map((x) => x.row);
  assert.equal(rows.length, 2);
  assert.deepEqual(termToJson(rows[0].v), big);
  assert.equal(termToJson(rows[1].v).n, 2);
  assert.throws(() => appendSeavtRow(r, feed, seavtOfJson("s", "huge", "y".repeat(1_100_000), "2026-10-11T00:00:02.000Z")), /at most/u);
});

test("journal batches stop on their first refused write without processing later ledger rows", (t) => {
  const r = root(t), feed = "ledger-events";
  const rows = [
    seavtOfJson("payment", "status", "received", T),
    seavtOfJson("payment", "status", "settled", "2026-10-12T08:00:01.000Z"),
    seavtOfJson("payment", "status", "reversed", "2026-10-12T08:00:02.000Z"),
  ];
  let capReads = 0, refusals = 0;
  const guard = {
    capOf: () => (++capReads === 1 ? 100000 : capReads === 2 ? 0 : 100000),
    refuse: () => { refusals += 1; },
  };
  assert.equal(appendSeavtRows(r, feed, rows, { guard }), 1);
  assert.equal(capReads, 2, "the third write must not be attempted after a refusal");
  assert.equal(refusals, 1);
  const found = [...readSeavtFeed(r, feed)];
  assert.equal(found.length, 1);
  assert.ok(rowsEqual(found[0].row, rows[0]));
});

test("SEAVT batch resumes later days after one capped day, even when days are interleaved", (t) => {
  const r = root(t), feed = "message-ledger";
  const rows = [
    seavtOfJson("channel", "message", "first", "2026-10-10T08:00:00Z"),
    seavtOfJson("channel", "message", "capped", "2026-10-10T08:00:01Z"),
    seavtOfJson("ledger", "entry", "next-day", "2026-10-11T08:00:00Z"),
    seavtOfJson("channel", "message", "skip-denied-day", "2026-10-10T08:00:02Z"),
    seavtOfJson("ledger", "entry", "third-day", "2026-10-12T08:00:00Z"),
  ];
  let attempts = 0, refused = 0;
  const guard = {
    capOf: () => (++attempts === 2 ? 0 : 100_000),
    refuse: () => { refused += 1; },
  };
  assert.equal(appendSeavtRows(r, feed, rows, { guard }), 3);
  assert.equal(attempts, 4, "the refused day's later row is not attempted");
  assert.equal(refused, 1);
  assert.deepEqual([...logDates(r, feed)], ["2026-10-10", "2026-10-11", "2026-10-12"]);
  const actual = [...readSeavtFeed(r, feed)];
  assert.equal(actual.length, 3);
  for (const [index, expected] of [rows[0], rows[2], rows[4]].entries())
    assert.ok(rowsEqual(actual[index].row, expected), `admitted event ${index}`);
});

test("the guard refuses past the hard cap, logs once, and leaves a marker", (t) => {
  const r = root(t), feed = "runaway";
  const messages = [];
  const guard = logGuard(r, { budget: { default: { budget: 100, cap: 600 }, feeds: {} }, log: (m) => messages.push(m) });
  const results = [];
  for (let i = 0; i < 20; i += 1) results.push(appendSeavtRow(r, feed, seavtOfJson("s", "a", i, `2026-10-12T00:00:${String(i).padStart(2, "0")}.000Z`), { guard }));
  const written = results.filter(Boolean).length;
  assert.ok(written > 0 && written < 20, results.join());
  assert.deepEqual(results, [...Array(written).fill(true), ...Array(20 - written).fill(false)]);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /log-cap: runaway 2026-10-12/u);
  assert.ok(readFileSync(join(logsDirectory(r, feed), "2026-10-12.jsonl")).length <= 600);
  assert.ok(existsSync(join(logsDirectory(r, feed), "2026-10-12.capped")));
  assert.equal([...readSeavtRows(r, feed, "2026-10-12")].length, written);
  assert.equal(appendSeavtRow(r, feed, seavtOfJson("s", "a", 1, "2026-10-13T00:00:00.000Z"), { guard }), true, "the next day is a new allowance");
});

test("the budget file is validated, per root, with defaults", (t) => {
  const r = root(t);
  assert.ok(readBudget(r).default.cap > readBudget(r).default.budget);
  writeBudget(r, { feeds: { arrival: { budget: 1000, cap: 4000 } } });
  assert.deepEqual(readBudget(r).feeds.arrival, { budget: 1000, cap: 4000 });
  assert.throws(() => writeBudget(r, { feeds: { x: { budget: 10, cap: 5 } } }), /cap at least budget/u);
});

test("seavt-volume: census per feed per day, ranking, and --check exits nonzero over budget", (t) => {
  const r = root(t);
  for (let i = 0; i < 30; i += 1) appendSeavtRow(r, "noisy", seavtOfJson("s", "a", { i, pad: "p".repeat(300) }, `2026-10-1${i < 15 ? 0 : 1}T00:00:${String(i).padStart(2, "0")}.000Z`));
  appendSeavtRow(r, "quiet", seavtOfJson("s", "a", 1, "2026-10-10T00:00:00.000Z"));
  appendSeavtRow(r, "quiet", seavtOfJson("s", "a", 2, "2026-10-12T00:00:00.000Z"));
  const census = volumeOf(r);
  const noisy = census.feeds.find((f) => f.feed === "noisy");
  assert.equal(noisy.rows, 30);
  assert.equal(noisy.days["2026-10-10"].rows, 15);
  assert.ok(noisy.days["2026-10-10"].raw > noisy.days["2026-10-10"].stored, "a sealed day stores less than it holds");
  assert.ok(noisy.days["2026-10-10"].ratio > 2);
  assert.equal(census.top[0].feed, "noisy");
  const bin = join(scripts, "seavt-volume.mjs");
  assert.equal(spawnSync("node", [bin, r, "--check"], { encoding: "utf8" }).status, 0);
  writeBudget(r, { feeds: { noisy: { budget: 1000, cap: 100000 } } });
  const bad = spawnSync("node", [bin, r, "--check"], { encoding: "utf8" });
  assert.equal(bad.status, 1); assert.match(bad.stdout, /OVER\s+noisy 2026-10-10/u);
  assert.deepEqual(overBudget(r).map((o) => `${o.feed} ${o.date}`).sort(), ["noisy 2026-10-10", "noisy 2026-10-11"]);
  const report = spawnSync("node", [bin, r], { encoding: "utf8" });
  assert.equal(report.status, 0); assert.match(report.stdout, /top feeds by stored bytes/u);
  assert.ok(proposeBudget(r).noisy.budget >= 1_048_576);
});

test("an old raw day is reported as unsealed", (t) => {
  const r = root(t), dir = join(r, "data/logs/arrival-logs");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "2026-09-01.jsonl"), '{"at":"2026-09-01T00:00:00.000Z"}\n');
  assert.deepEqual(staleRaw(r, { today: "2026-10-17" }).map((s) => s.date), ["2026-09-01"]);
  assert.equal(spawnSync("node", [join(scripts, "seavt-volume.mjs"), r, "--check", "--stale-days", "3"], { encoding: "utf8" }).status, 1);
});

test("compact-seavt-logs: spine logs become sealed compact segments, verified, with the source kept unless --remove", async (t) => {
  const r = root(t), dir = join(r, "data/logs/witness-journal-seavt-logs");
  mkdirSync(dir, { recursive: true });
  const rows = Array.from({ length: 25 }, (_, i) => seavtOfJson(`ni:///sha-256;${i}`, "metroplat.sign-roadmap@1", { author: "g", claim: { for: [i], against: [] }, carrierAfterBytes: 39635 + i }, "2026-10-03"));
  const odd = { e: mk(JSON.stringify("bare")), a: jsonToTerm("p"), v: jsonToTerm(1), t: "2026-10-03" };
  const lines = [...rows.map((x) => JSON.stringify({ e: x.e, a: x.a, v: x.v, t: x.t })), JSON.stringify(odd), "not json at all", JSON.stringify({ unrelated: true })];
  const source = join(dir, "2026-10-03-admit-witness-journal-seavt.jsonl");
  writeFileSync(source, `${lines.join("\n")}\n`);
  writeFileSync(join(dir, "2026-10-04.jsonl"), `${JSON.stringify({ at: "2026-10-04T01:00:00.000Z", e: rows[0].e, a: rows[0].a, v: rows[0].v })}\n`);
  const reports = await compactRoot(r);
  const first = reports.find((x) => x.date === "2026-10-03");
  assert.equal(first.status, "converted"); assert.equal(first.rows, 26); assert.equal(first.through, 2);
  assert.ok(first.after * 5 < first.before, `${first.before} -> ${first.after}`);
  assert.ok(existsSync(source) && existsSync(`${source}.compacted`), "not removed without --remove");
  assert.ok(existsSync(join(dir, "2026-10-04.jsonl.legacy")) && !existsSync(join(dir, "2026-10-04.jsonl")));
  const read = [...readSeavtRows(r, "witness-journal-seavt", "2026-10-03")].map((x) => x.row);
  assert.equal(read.length, 26, "the unparseable and unrelated lines are carried but are not rows");
  rows.forEach((row, i) => assert.ok(rowsEqual(read[i], row)));
  assert.ok(rowsEqual(read[25], seavtRow(odd)));
  assert.equal([...readLog(r, "witness-journal-seavt", "2026-10-03")].length, 27, "readLog sees the JSON objects: 26 rows and the unrelated one");
  const second = await compactRoot(r);
  assert.ok(second.every((x) => x.status !== "converted"), "a rerun converts nothing twice");
  assert.equal([...readSeavtRows(r, "witness-journal-seavt", "2026-10-03")].length, 26);
});

test("compact-seavt-logs --remove deletes only a verified source", async (t) => {
  const r = root(t), dir = join(r, "data/logs/desk-seavt-logs");
  mkdirSync(dir, { recursive: true });
  const x = seavtOfJson("s", "a", { n: 1 }, "2026-10-05T00:00:00.000Z");
  const source = join(dir, "2026-10-05.jsonl");
  writeFileSync(source, `${JSON.stringify({ at: x.t, e: x.e, a: x.a, v: x.v })}\n`);
  const [report] = await compactRoot(r, { remove: true });
  assert.equal(report.status, "converted");
  assert.ok(!existsSync(source));
  const [back] = [...readSeavtRows(r, "desk-seavt", "2026-10-05")];
  assert.ok(rowsEqual(back.row, x));
});
