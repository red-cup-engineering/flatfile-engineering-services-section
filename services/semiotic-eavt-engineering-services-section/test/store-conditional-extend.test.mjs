import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { each, extend, get, readHead, writeHead } from "../src/store-core.mjs";
import { headFile, HeadConflict } from "../src/layout.mjs";

const TYPE = "conditional-observation", NAME = "source";
const store = new URL("../src/store-core.mjs", import.meta.url).href;
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "seavt-conditional-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
const records = root => [...each(root, TYPE, { strict: true })];
const headBytes = root => readFileSync(headFile(root, TYPE, NAME));

// Each child loads the real installed providers and starts from the actual
// on-disk source. IPC releases concurrent attempts from the same read cut.
const childSource = String.raw`
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
const d = JSON.parse(process.argv[1]);
let published = false;
if (d.failAfterPublication) {
  for (const operation of ["renameSync", "linkSync"]) {
    const original = fs[operation];
    fs[operation] = (from, to, ...rest) => {
      const result = original(from, to, ...rest);
      if (to === d.headFile) published = true;
      return result;
    };
  }
  const originalSync = fs.fsyncSync;
  fs.fsyncSync = fd => {
    if (published) throw Object.assign(new Error("injected post-publication failure"), { code: "EIO" });
    return originalSync(fd);
  };
  syncBuiltinESMExports();
}
const api = await import(d.store);
process.send({ phase: "ready" });
await new Promise(resolve => process.once("message", resolve));
let result;
try {
  if (d.readOnly) result = { status: "read", head: api.readHead(d.root, d.type, d.name), records: [...api.each(d.root, d.type, { strict: true })] };
  else result = { status: "appended", address: api.extend(d.root, d.type, d.name, { observation: d.observation }, { expect: d.expect, ...(d.strict ? { durableRoot: d.root } : {}) }) };
} catch (error) { result = { status: "refused", code: error.code, message: error.message, published }; }
process.send(result, () => process.disconnect());
`;
function child(t, root, options = {}) {
  const data = { store, root, type: TYPE, name: NAME, headFile: headFile(root, TYPE, NAME), ...options };
  const process = spawn(globalThis.process.execPath, ["--input-type=module", "-e", childSource, JSON.stringify(data)], { stdio: ["ignore", "pipe", "pipe", "ipc"] });
  let stderr = "", result, readyResolve, settledResolve, settledReject;
  process.stderr.on("data", bytes => { stderr += bytes; });
  const ready = new Promise(resolve => { readyResolve = resolve; });
  const settled = new Promise((resolve, reject) => { settledResolve = resolve; settledReject = reject; });
  process.on("message", message => { if (message.phase === "ready") readyResolve(); else result = message; });
  process.once("error", settledReject);
  process.once("exit", code => code === 0 && result ? settledResolve(result) : settledReject(new Error(`child exit ${code}: ${stderr}`)));
  t.after(() => { if (process.exitCode === null) process.kill(); });
  return { ready, settled, start() { process.send({ start: true }); } };
}
async function runChild(t, root, options) {
  const actor = child(t, root, options);
  await actor.ready; actor.start(); return actor.settled;
}

test("conditional extend: absent-only creation rejects a repeated attempt before another record is put", t => {
  const root = fixture(t);
  const first = extend(root, TYPE, NAME, { observation: "first" }, { expect: null });
  const before = records(root), bytes = headBytes(root);
  assert.throws(() => extend(root, TYPE, NAME, { observation: "retry" }, { expect: null }), HeadConflict);
  assert.deepEqual(records(root), before);
  assert.deepEqual(headBytes(root), bytes);
  assert.deepEqual(readHead(root, TYPE, NAME).frontier, [first]);
});

test("conditional extend: stale frontier rejects before persisting a second successor", t => {
  const root = fixture(t);
  const first = extend(root, TYPE, NAME, { observation: "first" });
  const second = extend(root, TYPE, NAME, { observation: "second" }, { expect: [first] });
  const before = records(root), bytes = headBytes(root);
  assert.throws(() => extend(root, TYPE, NAME, { observation: "second" }, { expect: [first] }), HeadConflict);
  assert.deepEqual(records(root), before);
  assert.deepEqual(headBytes(root), bytes);
  assert.deepEqual(get(root, TYPE, second).causes, [first]);
});

test("conditional extend: expected frontiers use the existing typed-reference set equivalence", t => {
  const root = fixture(t);
  const first = extend(root, TYPE, NAME, { observation: "first" });
  const second = extend(root, TYPE, NAME, { observation: "independent" }, { causes: [] });
  const expect = [{ type: TYPE, id: second }, first, second];
  const original = structuredClone(expect);
  const joined = extend(root, TYPE, NAME, { observation: "joined" }, { expect });
  assert.deepEqual(get(root, TYPE, joined).causes, [first, second].sort());
  assert.deepEqual(readHead(root, TYPE, NAME).frontier, [joined]);
  assert.deepEqual(expect, original, "the caller's source cut is not rewritten");
});

test("conditional extend: empty-frontier and omitted guards preserve their existing meanings", t => {
  const root = fixture(t);
  const first = extend(root, TYPE, NAME, { observation: "empty initial cut" }, { expect: [] });
  const second = extend(root, TYPE, NAME, { observation: "unguarded" });
  assert.deepEqual(get(root, TYPE, second).causes, [first]);
  assert.throws(() => extend(root, TYPE, NAME, { observation: "stale empty" }, { expect: [] }), HeadConflict);
  const emptyName = "empty-held-head";
  writeHead(root, TYPE, emptyName, { frontier: [] });
  assert.throws(() => extend(root, TYPE, emptyName, { observation: "not absent" }, { expect: null }), HeadConflict);
  const accepted = extend(root, TYPE, emptyName, { observation: "empty held cut" }, { expect: [] });
  assert.deepEqual(get(root, TYPE, accepted).causes, []);
});

test("conditional extend: invalid expected references cannot be ignored and publish a record", t => {
  const root = fixture(t);
  extend(root, TYPE, NAME, { observation: "first" });
  const before = records(root), bytes = headBytes(root);
  for (const expect of [false, "not a frontier", ["not an address"], [{ type: "invalid/type", id: before[0].address }]])
    assert.throws(() => extend(root, TYPE, NAME, { observation: "invalid guard" }, { expect }));
  assert.deepEqual(records(root), before);
  assert.deepEqual(headBytes(root), bytes);
});

test("conditional extend: a fresh process resumes the persisted cut and refuses its stale replay", { timeout: 15000 }, async t => {
  const root = fixture(t);
  const first = extend(root, TYPE, NAME, { observation: "first" });
  const accepted = await runChild(t, root, { observation: "after restart", expect: [first] });
  assert.equal(accepted.status, "appended");
  const before = records(root), bytes = headBytes(root);
  const replay = await runChild(t, root, { observation: "after restart", expect: [first] });
  assert.equal(replay.code, "head-conflict");
  assert.deepEqual(records(root), before);
  assert.deepEqual(headBytes(root), bytes);
  const receiver = await runChild(t, root, { readOnly: true });
  assert.deepEqual(receiver.head.frontier, [accepted.address]);
  assert.deepEqual(receiver.records, before);
});

test("conditional extend: two actual processes using one cut admit at most one successor", { timeout: 15000 }, async t => {
  const root = fixture(t);
  const first = extend(root, TYPE, NAME, { observation: "first" });
  const actors = ["left", "right"].map(observation => child(t, root, { observation, expect: [first] }));
  await Promise.all(actors.map(actor => actor.ready));
  actors.forEach(actor => actor.start());
  const outcomes = await Promise.all(actors.map(actor => actor.settled));
  assert.equal(outcomes.filter(outcome => outcome.status === "appended").length, 1);
  assert.equal(outcomes.filter(outcome => outcome.code === "head-conflict").length, 1);
  const winner = outcomes.find(outcome => outcome.status === "appended");
  assert.deepEqual(readHead(root, TYPE, NAME).frontier, [winner.address]);
  assert.equal(records(root).length, 2);
  assert.deepEqual(get(root, TYPE, winner.address).causes, [first]);
});

for (const strict of [false, true]) test(`conditional extend: ${strict ? "strict" : "ordinary"} uncertain publication remains read-only on stale retry`, { timeout: 15000 }, async t => {
  const root = fixture(t);
  const first = extend(root, TYPE, NAME, { observation: "first" }, { ...(strict ? { durableRoot: root } : {}) });
  const failed = await runChild(t, root, { observation: "uncertain", expect: [first], strict, failAfterPublication: true });
  assert.equal(failed.code, "EIO");
  assert.equal(failed.published, true);
  const receiver = await runChild(t, root, { readOnly: true });
  assert.equal(receiver.records.length, 2);
  assert.notDeepEqual(receiver.head.frontier, [first]);
  const bytes = headBytes(root), before = records(root);
  const retry = await runChild(t, root, { observation: "uncertain", expect: [first], strict });
  assert.equal(retry.code, "head-conflict");
  assert.deepEqual(headBytes(root), bytes);
  assert.deepEqual(records(root), before);
});
