import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { niBucketPath } from "@red-cup-engineering/computer-content-address-engineering-services-section/ni-path";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import {
  HeadConflict, LegacyStoreRefused, StoreCorruption, StoreError, append, directoryRemote, each, extend, get, has, heads, logDates, pull, put, readHead, readLog, threadName, walk, writeHead,
} from "../src/store.mjs";
import { recordFile } from "../src/layout.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const roots = [];
function settlement() { const root = mkdtempSync(join(tmpdir(), "store-")); roots.push(root); return root; }
test.after(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });

function files(root) {
  const found = [];
  const visit = (directory) => { for (const entry of readdirSync(directory, { withFileTypes: true })) { const path = join(directory, entry.name); if (entry.isDirectory()) visit(path); else found.push(relative(root, path).split("\\").join("/")); } };
  visit(root);
  return found.sort();
}

test("ST-1: a record is filed where ni-path-v1 computes, over the conformance vectors", () => {
  const root = settlement();
  const vectors = JSON.parse(readFileSync(join(here, "../node_modules/@red-cup-engineering/computer-content-address-engineering-services-section/conformance/ni-path-v1.json"), "utf8")).vectors;
  let checked = 0;
  for (const vector of vectors) {
    if (!vector.key.startsWith("ni:///") || vector.widths.length !== 1 || vector.widths[0] !== 2) continue;
    assert.equal(recordFile(root, "fact", vector.key), join(root, "data/records/fact-records", vector.bucket));
    checked += 1;
  }
  assert.ok(checked >= 2);
  const address = put(root, "fact", { about: "hello" });
  assert.equal(address, semanticId({ about: "hello" }));
  assert.deepEqual(files(root), [`data/records/fact-records/${niBucketPath(address)}`]);
});

test("a record reads back as put, in one plain readable line", () => {
  const root = settlement();
  const record = { by: "emsenn", n: 3, nested: { b: [1, 2.5, null, "x"], a: true } };
  const address = put(root, "fact", record);
  assert.deepEqual(get(root, "fact", address), record);
  assert.equal(has(root, "fact", address), true);
  const [path] = files(root);
  const lines = readFileSync(join(root, path), "utf8").split("\n");
  assert.equal(lines.length, 2);
  assert.deepEqual(JSON.parse(lines[0]), { id: address, record });
  assert.ok(lines[0].startsWith(`{"id":"${address}","record":{`));
  assert.equal(get(root, "fact", semanticId({ other: 1 })), undefined);
});

test("ST-2: the files of a settlement are the three kinds and nothing else", () => {
  const root = settlement();
  const a = put(root, "thread-move", { n: 1 });
  extend(root, "thread-move", "alpha", { n: 2 });
  writeHead(root, "thread-move", "beta", { frontier: [a] });
  append(root, "service-lifecycle", { at: "2026-10-12T01:02:03.456Z", event: "start" });
  for (const file of files(root)) {
    assert.match(file, /^data\/(records\/[a-z-]+-records\/sha-256\/[A-Za-z0-9_-]{2}\.jsonl|state\/[a-z-]+-state\/[^/]+\.json|logs\/[a-z-]+-logs\/\d{4}-\d{2}-\d{2}\.jsonl)$/u);
  }
});

test("ST-3: put of a held record writes nothing", () => {
  const root = settlement();
  const address = put(root, "fact", { n: 1 });
  const [path] = files(root);
  const size = statSync(join(root, path)).size;
  assert.equal(put(root, "fact", { n: 1 }), address);
  assert.equal(put(root, "fact", { n: 1 }), address);
  assert.equal(statSync(join(root, path)).size, size);
});

test("ST-4: a cut tail becomes a line of its own before the next write", () => {
  const root = settlement();
  const first = put(root, "fact", { n: 1 });
  const file = join(root, "data/records/fact-records", niBucketPath(first));
  appendFileSync(file, '{"id":"ni:///sha-256;truncated');
  let again = 0;
  while (niBucketPath(semanticId({ n: 1, again })) !== niBucketPath(first)) again += 1;
  const second = put(root, "fact", { n: 1, again });
  const written = readFileSync(file, "utf8");
  assert.ok(written.includes('truncated\n'));
  assert.deepEqual(get(root, "fact", first), { n: 1 });
  assert.deepEqual(get(root, "fact", second), { n: 1, again });
  const log = join(root, "data/logs/tick-logs/2026-10-12.jsonl");
  mkdirSync(dirname(log), { recursive: true });
  writeFileSync(log, '{"at":"2026-10-12T00:00:00Z","cut');
  append(root, "tick", { at: "2026-10-12T00:00:01Z" });
  assert.deepEqual([...readLog(root, "tick", "2026-10-12")].map((entry) => entry.line), [{ at: "2026-10-12T00:00:01Z" }]);
});

test("ST-5: get returns only a line that hashes to its id, skipping bad lines", () => {
  const root = settlement();
  const address = semanticId({ n: 1 });
  const file = join(root, "data/records/fact-records", niBucketPath(address));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `not json\n{"id":"${address}","record":{"n":2}}\n`);
  assert.throws(() => get(root, "fact", address), StoreCorruption);
  appendFileSync(file, `{"id":"${address}","record":{"n":1}}\n`);
  assert.deepEqual(get(root, "fact", address), { n: 1 });
  assert.equal(put(root, "fact", { n: 1 }), address);
  assert.equal(readFileSync(file, "utf8").split("\n").length, 4);
  assert.deepEqual([...each(root, "fact")].map((entry) => entry.record), [{ n: 1 }]);
});

test("ST-6: admission is the line; causes are not read", () => {
  const root = settlement();
  const cause = semanticId({ never: "put" });
  const address = put(root, "fact", { causes: [cause], n: 1 });
  assert.equal(has(root, "fact", address), true);
  assert.equal(has(root, "fact", cause), false);
  assert.equal(files(root).length, 1);
  assert.equal(put(root, "fact", { never: "put" }), cause);
  assert.equal(has(root, "fact", cause), true);
});

test("ST-7 and ST-8: a walk yields effects first, marks what is missing, and stops at its limit", () => {
  const root = settlement();
  const a = put(root, "move", { n: "a" });
  const b = put(root, "move", { n: "b", causes: [a] });
  const c = put(root, "move", { n: "c", causes: [a] });
  const d = put(root, "move", { n: "d", causes: [b, c] });
  const order = [...walk(root, "move", [d])].map((entry) => entry.address);
  assert.deepEqual(new Set(order), new Set([a, b, c, d]));
  assert.equal(order.length, 4);
  assert.equal(order[0], d);
  assert.equal(order[3], a);
  const gone = semanticId({ gone: true });
  const e = put(root, "move", { n: "e", causes: [d, gone] });
  const steps = [...walk(root, "move", [e])];
  assert.deepEqual(steps.filter((step) => step.missing), [{ address: gone, type: "move", missing: true }]);
  assert.equal(steps.filter((step) => step.record).length, 5);
  const short = [...walk(root, "move", [e], { limit: 3 })];
  assert.equal(short.filter((step) => step.address).length, 3);
  assert.deepEqual(short.at(-1), { truncated: true });
  assert.equal([...walk(root, "move", [e], { limit: 6 })].some((step) => step.truncated), false);
  assert.throws(() => [...walk(root, "move", [e], { limit: 0 })], StoreError);
});

test("a walk crosses types by {type, id}", () => {
  const root = settlement();
  const claim = put(root, "claim", { n: 1 });
  const move = put(root, "move", { causes: [{ type: "claim", id: claim }] });
  const steps = [...walk(root, "move", [move])];
  assert.deepEqual(steps.map((step) => [step.type, step.address]), [["move", move], ["claim", claim]]);
});

test("ST-9 and ST-10: a head is replaced under its lock, and expect is checked first", () => {
  const root = settlement();
  const a = put(root, "move", { n: "a" });
  const b = put(root, "move", { n: "b", causes: [a] });
  writeHead(root, "move", "t", { frontier: [a] }, { expect: null });
  assert.throws(() => writeHead(root, "move", "t", { frontier: [b] }, { expect: null }), HeadConflict);
  assert.throws(() => writeHead(root, "move", "t", { frontier: [b] }, { expect: [b] }), HeadConflict);
  assert.deepEqual(readHead(root, "move", "t").frontier, [a]);
  writeHead(root, "move", "t", { frontier: [b] }, { expect: [a] });
  assert.deepEqual(readHead(root, "move", "t").frontier, [b]);
  assert.deepEqual(files(root).filter((file) => file.startsWith("data/state/")), ["data/state/move-state/t.json"]);
  const stale = join(root, "data/state/move-state/t.json.lock");
  writeFileSync(stale, "");
  const old = new Date(Date.now() - 120_000);
  utimesSync(stale, old, old);
  writeHead(root, "move", "t", { frontier: [a, b] });
  assert.deepEqual(files(root).filter((file) => file.startsWith("data/state/")), ["data/state/move-state/t.json"]);
  assert.equal(readHead(root, "move", "absent"), undefined);
});

test("a head name is percent-encoded and listed back by name", () => {
  const root = settlement();
  const a = put(root, "office-incumbency", { n: 1 });
  writeHead(root, "office-incumbency", "emsenn/office#senior", { frontier: [a], closed: true });
  assert.deepEqual(files(root).filter((file) => file.startsWith("data/state/")), ["data/state/office-incumbency-state/emsenn%2Foffice%23senior.json"]);
  const listed = [...heads(root, "office-incumbency")];
  assert.equal(listed.length, 1);
  assert.equal(listed[0].name, "emsenn/office#senior");
  assert.equal(listed[0].head.closed, true);
  assert.equal(threadName(a), a.slice("ni:///sha-256;".length));
  assert.deepEqual([...heads(root, "nothing-here")], []);
});

test("extend puts a record with its causes and advances the head", () => {
  const root = settlement();
  const a = extend(root, "move", "t", { n: "a" });
  assert.deepEqual(get(root, "move", a), { n: "a", causes: [] });
  const b = extend(root, "move", "t", { n: "b" });
  assert.deepEqual(get(root, "move", b).causes, [a]);
  assert.deepEqual(readHead(root, "move", "t").frontier, [b]);
  const c = extend(root, "move", "t", { n: "c" }, { causes: [a] });
  assert.deepEqual(readHead(root, "move", "t").frontier, [b, c].sort());
  const d = extend(root, "move", "t", { n: "d" });
  assert.deepEqual(readHead(root, "move", "t").frontier, [d]);
  assert.deepEqual([...walk(root, "move", readHead(root, "move", "t").frontier)].map((step) => step.address).at(-1), a);
});

test("ST-11: a log line is one write to the day of its at, never rewritten", () => {
  const root = settlement();
  append(root, "schedule-run", { at: "2026-10-12T23:59:59.999Z", schedule: "heartbeat", outcome: "ok", ms: 38 });
  append(root, "schedule-run", { at: "2026-10-13T00:00:00.000Z", schedule: "heartbeat", outcome: "ok", ms: 40 });
  append(root, "schedule-run", { schedule: "heartbeat", ms: 41, at: "2026-10-12T23:59:59.999Z" });
  const day = join(root, "data/logs/schedule-run-logs/2026-10-12.jsonl");
  assert.equal(readFileSync(day, "utf8"), '{"at":"2026-10-12T23:59:59.999Z","schedule":"heartbeat","outcome":"ok","ms":38}\n{"at":"2026-10-12T23:59:59.999Z","schedule":"heartbeat","ms":41}\n');
  assert.deepEqual([...logDates(root, "schedule-run")], ["2026-10-12", "2026-10-13"]);
  const lines = [...readLog(root, "schedule-run", "2026-10-12")];
  assert.equal(lines.length, 2);
  assert.equal(lines[0].next, Buffer.byteLength(readFileSync(day, "utf8").split("\n")[0]) + 1);
  assert.deepEqual([...readLog(root, "schedule-run", "2026-10-12", { from: lines[0].next })].map((entry) => entry.line.ms), [41]);
  assert.deepEqual([...readLog(root, "schedule-run", "2026-10-14")], []);
  assert.deepEqual([...logDates(root, "no-such")], []);
});

test("ST-12: an oversized record or log line is refused", () => {
  const root = settlement();
  assert.throws(() => put(root, "fact", { text: "x".repeat(65_536) }), StoreError);
  assert.ok(put(root, "fact", { text: "x".repeat(65_000) }));
  assert.throws(() => append(root, "tick", { at: "2026-10-12T00:00:00Z", text: "x".repeat(4_096) }), StoreError);
  assert.throws(() => append(root, "tick", { text: "no at" }), StoreError);
  assert.throws(() => append(root, "tick", { at: "yesterday" }), StoreError);
  assert.throws(() => put(root, "fact", [1]), StoreError);
  assert.deepEqual(files(root).filter((file) => file.includes("logs")), []);
});

test("ST-13: a type must be plain lowercase words joined by hyphens", () => {
  const root = settlement();
  for (const bad of ["", "Claim", "claim_session", "claim.session", "claim-2026", "ni:///sha-256;x", "a/b", "-a", "a-", "a--b", "x".repeat(25), `${"abcdefghij-".repeat(6)}abcdefghij`]) {
    assert.throws(() => put(root, bad, { n: 1 }), StoreError, bad);
    assert.throws(() => append(root, bad, { at: "2026-10-12T00:00:00Z" }), StoreError, bad);
    assert.throws(() => readHead(root, bad, "x"), StoreError, bad);
  }
  assert.ok(put(root, "claim-session", { n: 1 }));
  assert.deepEqual(files(root).length, 1);
});

test("ST-15: importing the store starts no timer or watcher and reads no file", () => {
  const source = `import "${new URL("../src/store.mjs", import.meta.url).href}"; console.log(JSON.stringify(process.getActiveResourcesInfo().filter((name) => !["TTYWrap","PipeWrap","FSReqCallback"].includes(name))));`;
  const out = execFileSync(process.execPath, ["--input-type=module", "-e", source], { cwd: tmpdir(), encoding: "utf8" });
  assert.deepEqual(JSON.parse(out.trim()), []);
});

test("ST-16: pull stops at an address the local store has, and converges heads", async () => {
  const remote = settlement(), local = settlement();
  const a = extend(remote, "move", "t", { n: "a" });
  const b = extend(remote, "move", "t", { n: "b" });
  const c = extend(remote, "move", "t", { n: "c" });
  put(local, "move", { n: "a", causes: [] });
  let reads = 0;
  const counting = directoryRemote(remote);
  const inner = counting.get;
  counting.get = (type, address) => { reads += 1; return inner(type, address); };
  const summary = await pull(local, counting, "move");
  assert.equal(summary.converged, 1);
  assert.equal(summary.records, 2);
  assert.deepEqual(readHead(local, "move", "t").frontier, [c]);
  assert.equal(has(local, "move", b), true);
  assert.ok(reads <= 4, `read ${reads} remote records`);
  assert.equal(a, semanticId({ n: "a", causes: [] }));
  const again = await pull(local, directoryRemote(remote), "move");
  assert.deepEqual([again.converged, again.records], [0, 0]);
});

test("pull merges diverged threads into the maximal frontier", async () => {
  const remote = settlement(), local = settlement();
  const base = extend(remote, "move", "t", { n: "base" });
  await pull(local, directoryRemote(remote), "move");
  const x = extend(local, "move", "t", { n: "x" });
  const y = extend(remote, "move", "t", { n: "y" });
  const summary = await pull(local, directoryRemote(remote), "move");
  assert.equal(summary.records, 1);
  assert.deepEqual(readHead(local, "move", "t").frontier, [x, y].sort());
  const z = extend(local, "move", "t", { n: "z" });
  assert.deepEqual(readHead(local, "move", "t").frontier, [z]);
  assert.equal(has(local, "move", base), true);
  const behind = settlement();
  extend(behind, "move", "t", { n: "base" });
  const ahead = await pull(behind, directoryRemote(local), "move", { walkLimit: 2 });
  assert.equal(ahead.truncated, true);
  assert.equal(readHead(behind, "move", "t").frontier.length, 1);
  assert.deepEqual((await pull(behind, directoryRemote(local), "move")).truncated, false);
  assert.deepEqual(readHead(behind, "move", "t").frontier, [z]);
});

test("ST-17: a root holding the earlier layout is refused on every operation", async () => {
  for (const legacy of ["data/state/log-state", "data/journals"]) {
    const root = settlement();
    mkdirSync(join(root, legacy), { recursive: true });
    const address = semanticId({ n: 1 });
    const attempts = [
      () => put(root, "fact", { n: 1 }), () => get(root, "fact", address), () => has(root, "fact", address), () => [...each(root, "fact")],
      () => [...walk(root, "fact", [address])], () => append(root, "tick", { at: "2026-10-12T00:00:00Z" }), () => [...readLog(root, "tick", "2026-10-12")],
      () => [...logDates(root, "tick")], () => readHead(root, "fact", "t"), () => writeHead(root, "fact", "t", { frontier: [] }),
      () => extend(root, "fact", "t", { n: 1 }), () => [...heads(root, "fact")],
    ];
    for (const attempt of attempts) assert.throws(attempt, (error) => error instanceof LegacyStoreRefused && /store-conversion\.md/u.test(error.message));
    await assert.rejects(pull(root, directoryRemote(settlement()), "fact"), LegacyStoreRefused);
    assert.deepEqual(readdirSync(join(root, "data")).sort(), [legacy.split("/")[1]]);
  }
});

test("ST-18: only the store's core writes files; layout and exchange do not", () => {
  const writes = /\b(writeFileSync|appendFileSync|renameSync|mkdirSync|openSync|unlinkSync|createWriteStream|writeSync|copyFileSync|rmSync)\b/u;
  for (const name of ["layout.mjs", "exchange.mjs", "store.mjs"]) assert.doesNotMatch(readFileSync(join(here, "../src", name), "utf8"), writes, name);
  assert.match(readFileSync(join(here, "../src/store-core.mjs"), "utf8"), writes);
});

test("each yields every record of a type once, in bucket order", () => {
  const root = settlement();
  const made = new Set();
  for (let n = 0; n < 60; n += 1) made.add(put(root, "fact", { n }));
  put(root, "other-fact", { n: 0 });
  const seen = [...each(root, "fact")];
  assert.equal(seen.length, 60);
  assert.deepEqual(new Set(seen.map((entry) => entry.address)), made);
  const buckets = seen.map((entry) => niBucketPath(entry.address));
  assert.deepEqual(buckets, [...buckets].sort());
});
