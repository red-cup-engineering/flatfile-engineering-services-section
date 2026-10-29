// One test per example of content/text/documents/specifications/2026-10-19-observability-seavt.md, named by its id.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appendMessage, blobFile, blobSize, exportAll, exportTrace, getBlob, getChannel, hasBlob, putBlob, putChannel, readTrace, traces } from "../src/telemetry-store.mjs";
import { niBucketPath } from "@red-cup-engineering/computer-content-address-engineering-services-section/ni-path";
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { openTelemetry, systemPorts } from "../src/telemetry.mjs";
import { StoreCorruption, StoreError } from "../src/layout.mjs";
import { channel, message } from "@red-cup-engineering/signcell/signal";
import { otlpLogRecord } from "@red-cup-engineering/signcell/observability";

const roots = [];
const fresh = () => { const root = mkdtempSync(join(tmpdir(), "seavt-telemetry-")); roots.push(root); return root; };
after(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });
const EXPORT = fileURLToPath(new URL("../scripts/export-otlp.mjs", import.meta.url));

let tick = 0, calls = 0;
const ports = (env = {}) => ({ now: () => `2026-10-19T01:00:${String(tick++ % 60).padStart(2, "0")}.000Z`, entropy: (n) => { const seed = ++calls; return Uint8Array.from({ length: n }, (_, i) => ((seed * 31 + i * 17) % 251) + 1); }, env });
const service = { name: "receiver", version: "1.0.0", namespace: "561-group" };
const open = (root, env, extra = {}) => openTelemetry({ root, service, ports: ports(env), ...extra });
const failing = (stderr, status = 128) => ({ status, signal: null, stdout: "", stderr });
const line = channel({ name: "n", resource: { "service.name": "s" } });
const logRecord = (text) => otlpLogRecord({ observedAt: "2026-10-19T01:00:00Z", body: text });

test("sv1-positive", () => { const root = fresh(); const bytes = new Uint8Array(10_000).fill(7); const address = putBlob(root, bytes); assert.match(address, /^ni:\/\/\/sha-256;/u); assert.deepEqual(getBlob(root, address), bytes); });
test("sv1-alternate", () => { const root = fresh(); const a = putBlob(root, Uint8Array.of(1, 2, 3)); assert.equal(putBlob(root, Uint8Array.of(1, 2, 3)), a); assert.equal(getBlob(root, "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"), undefined); });
test("sv1-refusal", () => { const root = fresh(); const a = putBlob(root, Uint8Array.of(1, 2, 3)); writeFileSync(blobFile(root, a), Uint8Array.of(9, 9, 9)); assert.throws(() => getBlob(root, a), StoreCorruption); assert.throws(() => getBlob(root, "not-an-address"), StoreError); assert.throws(() => putBlob(root, "text"), StoreError); });

// Distinct source bytes found independently to occupy the same historical
// 12-bit NI record bucket. No hash collision is involved.
const collisionBytes = ["blob-probe-16", "blob-probe-52"].map(value => new TextEncoder().encode(value));
const legacyBlobFile = (root, address) => join(root, "data", "blobs", "telemetry", niBucketPath(address));

test("sv1-full-address: distinct blobs in one record bucket retain both byte strings", () => {
  const root = fresh();
  const [first, second] = collisionBytes.map(bytes => makeNiUri(bytes));
  assert.notEqual(first, second);
  assert.equal(legacyBlobFile(root, first), legacyBlobFile(root, second));
  assert.notEqual(blobFile(root, first), blobFile(root, second));
  for (let index = 0; index < collisionBytes.length; index++)
    assert.equal(putBlob(root, collisionBytes[index]), [first, second][index]);
  for (let index = 0; index < collisionBytes.length; index++) {
    const address = [first, second][index];
    assert.deepEqual(getBlob(root, address), collisionBytes[index]);
    assert.equal(hasBlob(root, address), true);
    assert.equal(blobSize(root, address), collisionBytes[index].byteLength);
    assert.equal(putBlob(root, collisionBytes[index]), address);
  }
});

test("sv1-existing-custody: duplicate put refuses corrupt addressed bytes without replacing them", () => {
  const root = fresh(), bytes = Uint8Array.of(1, 2, 3), address = putBlob(root, bytes);
  const corrupt = Uint8Array.of(9, 9, 9);
  writeFileSync(blobFile(root, address), corrupt);
  assert.throws(() => putBlob(root, bytes), StoreCorruption);
  assert.deepEqual(new Uint8Array(readFileSync(blobFile(root, address))), corrupt);
});

test("sv1-raced-publication: EEXIST is received only when the winning bytes verify", (context) => {
  const originalLink = fs.linkSync;
  for (const outcome of ["valid", "corrupt", "removed"]) {
    const root = fresh(), bytes = collisionBytes[0], address = makeNiUri(bytes), file = blobFile(root, address);
    const winner = outcome === "corrupt" ? Uint8Array.of(9, 9, 9) : bytes;
    let contested = 0;
    // Stage the actual competing file immediately before the File owner's
    // exclusive publication. The real link syscall then reports EEXIST.
    const intercepted = context.mock.method(fs, "linkSync", (from, to) => {
      if (to !== file) return originalLink(from, to);
      contested++;
      writeFileSync(file, winner);
      try { return originalLink(from, to); }
      finally { if (outcome === "removed") rmSync(file); }
    });
    syncBuiltinESMExports();
    try {
      if (outcome === "valid") assert.equal(putBlob(root, bytes), address);
      else assert.throws(() => putBlob(root, bytes), outcome === "corrupt" ? StoreCorruption : StoreError);
    } finally {
      intercepted.mock.restore();
      syncBuiltinESMExports();
    }
    assert.equal(contested, 1);
    if (outcome === "removed") assert.equal(existsSync(file), false);
    else assert.deepEqual(new Uint8Array(readFileSync(file)), winner);
  }
});

test("sv1-legacy-custody: reads admit original bucket bytes and preserve them during a new write", () => {
  const root = fresh(), bytes = collisionBytes[0], address = makeNiUri(bytes);
  const oldFile = legacyBlobFile(root, address);
  mkdirSync(dirname(oldFile), { recursive: true });
  writeFileSync(oldFile, bytes);
  assert.deepEqual(getBlob(root, address), bytes);
  assert.equal(hasBlob(root, address), true);
  assert.equal(blobSize(root, address), bytes.byteLength);
  assert.equal(existsSync(blobFile(root, address)), false, "a legacy read does not migrate state");
  assert.equal(putBlob(root, bytes), address);
  assert.equal(existsSync(blobFile(root, address)), true, "new writes use the full address");
  assert.deepEqual(new Uint8Array(readFileSync(oldFile)), bytes);
  assert.deepEqual(getBlob(root, address), bytes);
});

test("sv1-legacy-collision: an unrelated occupied bucket is not reported as the requested blob", () => {
  const root = fresh(), [first, second] = collisionBytes.map(bytes => makeNiUri(bytes));
  const oldFile = legacyBlobFile(root, first);
  mkdirSync(dirname(oldFile), { recursive: true });
  writeFileSync(oldFile, collisionBytes[0]);
  for (const read of [getBlob, hasBlob, blobSize]) assert.throws(() => read(root, second), StoreCorruption);
  assert.equal(putBlob(root, collisionBytes[1]), second, "only caller-supplied bytes can restore the second blob");
  assert.deepEqual(getBlob(root, second), collisionBytes[1]);
  assert.deepEqual(getBlob(root, first), collisionBytes[0]);
  assert.deepEqual(new Uint8Array(readFileSync(oldFile)), collisionBytes[0]);
});

test("sv1-current-corruption: a valid historical copy cannot hide a corrupt current addressed file", () => {
  const root = fresh(), bytes = collisionBytes[0], address = makeNiUri(bytes);
  const oldFile = legacyBlobFile(root, address), currentFile = blobFile(root, address);
  mkdirSync(dirname(oldFile), { recursive: true });
  writeFileSync(oldFile, bytes);
  mkdirSync(dirname(currentFile), { recursive: true });
  writeFileSync(currentFile, "corrupt current file");
  assert.throws(() => getBlob(root, address), StoreCorruption);
  assert.throws(() => putBlob(root, bytes), StoreCorruption);
  assert.equal(readFileSync(currentFile, "utf8"), "corrupt current file");
  assert.deepEqual(new Uint8Array(readFileSync(oldFile)), bytes);
});

test("sv1-current-io-refusal: historical bytes cannot mask ENOTDIR at the current address", () => {
  const root = fresh(), bytes = collisionBytes[0], address = makeNiUri(bytes);
  const oldFile = legacyBlobFile(root, address), currentFile = blobFile(root, address);
  mkdirSync(dirname(oldFile), { recursive: true });
  writeFileSync(oldFile, bytes);
  writeFileSync(dirname(currentFile), "a file blocks the current prefix directory");
  for (const read of [getBlob, hasBlob, blobSize])
    assert.throws(() => read(root, address), error => error.code === "ENOTDIR");
  assert.throws(() => putBlob(root, bytes), error => error.code === "ENOTDIR");
  assert.deepEqual(new Uint8Array(readFileSync(oldFile)), bytes);
  assert.equal(readFileSync(dirname(currentFile), "utf8"), "a file blocks the current prefix directory");
});

test("sv4-and-sv6-custody: corrupt command and report blobs refuse before a successful journal append", () => {
  for (const kind of ["command", "report"]) {
    const root = fresh(), handle = open(root);
    const original = kind === "command" ? "unaltered output" : "TAP version 13\n1..1\nok 1 - original\n";
    const address = putBlob(root, new TextEncoder().encode(original));
    writeFileSync(blobFile(root, address), "corrupt evidence");
    const record = kind === "command"
      ? () => handle.recordCommand({ command: "runner", result: failing(original) })
      : () => handle.recordTestRun({ format: "tap", report: original, command: "runner", result: { status: 0, stdout: "", stderr: "" } });
    assert.throws(record, StoreCorruption);
    assert.equal(readTrace(root, handle.traceId).messages.length, 0);
    assert.equal(readFileSync(blobFile(root, address), "utf8"), "corrupt evidence");
  }
});

test("sv2-positive", () => {
  const root = fresh(); const other = channel({ name: "o", resource: { "service.name": "s" } }); putChannel(root, line); putChannel(root, other);
  const traceId = "4bf92f3577b34da6a3ce929d0e0e4736";
  const first = appendMessage(root, { channel: line.id, traceId, observedAt: "2026-10-19T01:00:00.000Z", body: logRecord("one") });
  const second = appendMessage(root, { channel: other.id, traceId, observedAt: "2026-10-19T01:00:01.000Z", body: logRecord("two") });
  assert.deepEqual(second.causes, [first.id]);
  assert.equal(first.id, message({ channel: line, observedAt: first.observedAt, body: first.body }).id, "the store address is the SignCell message address");
  assert.deepEqual(readTrace(root, traceId).messages.map((m) => m.id), [first.id, second.id]);
  assert.equal([...traces(root)].length, 1);
});
test("sv2-alternate", () => {
  const root = fresh(); putChannel(root, line);
  appendMessage(root, { channel: line.id, traceId: "a".repeat(32), observedAt: "2026-10-19T01:00:00.000Z", body: logRecord("a") });
  appendMessage(root, { channel: line.id, traceId: "b".repeat(32), observedAt: "2026-10-19T01:00:00.000Z", body: logRecord("b") });
  const loose = appendMessage(root, { channel: line.id, observedAt: "2026-10-19T01:00:00.000Z", body: logRecord("c") });
  assert.deepEqual([...traces(root)].map((t) => t.traceId).sort(), ["a".repeat(32), "b".repeat(32), "untraced"]);
  assert.deepEqual(readTrace(root, "untraced").messages.map((m) => m.id), [loose.id]);
});
test("sv2-refusal", () => {
  const root = fresh(); putChannel(root, line);
  assert.throws(() => appendMessage(root, { channel: line.id, traceId: "Trace", observedAt: "2026-10-19T01:00:00.000Z", body: logRecord("x") }), /trace id/u);
  assert.throws(() => appendMessage(root, { channel: line.id, traceId: "a".repeat(32), observedAt: "2026-10-19T01:00:00.000Z", body: logRecord("x".repeat(70_000)) }), (e) => e.code === "record-size");
  assert.throws(() => appendMessage(root, { channel: channel({ name: "never put" }).id, observedAt: "2026-10-19T01:00:00.000Z", body: logRecord("x") }), /was not put/u);
});

test("sv3-positive", () => {
  const root = fresh(); const parent = open(fresh()); const env = { TRACEPARENT: parent.traceparent };
  const handle = open(root, env); assert.equal(handle.traceId, parent.traceId); assert.equal(handle.joined, true); assert.equal(handle.parentSpanId, parent.spanId);
  const child = handle.childEnvironment({ A: "1" }); assert.match(child.TRACEPARENT, new RegExp(`^00-${handle.traceId}-[0-9a-f]{16}-01$`, "u")); assert.notEqual(child.TRACEPARENT, handle.traceparent); assert.equal(child.A, "1");
});
test("sv3-alternate", () => {
  const root = fresh(); const none = open(root, {}); assert.equal(none.joined, false); assert.equal(none.rootReason, "absent");
  const bad = open(root, { TRACEPARENT: "garbage" }); assert.equal(bad.joined, false); assert.equal(bad.rootReason, "invalid-traceparent"); assert.match(bad.traceId, /^[0-9a-f]{32}$/u);
  assert.equal(open(root, {}, { traceparent: "00-0102030405060708090a0b0c0d0e0f10-1112131415161718-01" }).traceId, "0102030405060708090a0b0c0d0e0f10");
});
test("sv3-refusal", () => { assert.throws(() => openTelemetry({ service, ports: ports() }), StoreError); assert.throws(() => openTelemetry({ root: fresh(), ports: ports() }), StoreError); assert.throws(() => openTelemetry({ root: fresh(), service, ports: { entropy: () => new Uint8Array(24) } }), StoreError); assert.equal(typeof systemPorts().now(), "string"); });

test("sv4-positive", () => {
  const root = fresh(); const handle = open(root); const stderr = `${"e".repeat(10_000)}\nfatal: bad object 0123456789\n`;
  const done = handle.recordCommand({ command: "git", args: ["cat-file", "--batch-check"], cwd: "/work", result: failing(stderr), startedAt: "2026-10-19T00:59:59.000Z", durationMs: 12, environment: { PATH: "/bin", TOKEN: "s3cret" }, inputs: [{ name: "commit", id: "git:abc" }] });
  assert.equal(done.ok, false); assert.equal(done.exitCode, 128);
  assert.match(done.headline, /^git exited with status 128: fatal: bad object 0123456789$/u);
  const blob = done.blobs.find((b) => b.stream === "stderr"); assert.equal(blob.size, Buffer.byteLength(stderr)); assert.equal(Buffer.from(getBlob(root, blob.id)).toString(), stderr);
  assert.deepEqual(readTrace(root, handle.traceId).messages.map((m) => m.id), [done.address]);
  assert.equal(JSON.stringify(done.record).includes("s3cret"), false);
});
test("sv4-alternate", () => {
  const root = fresh(); const handle = open(root);
  const killed = handle.recordCommand({ command: "sleep", result: { status: null, signal: "SIGKILL", stdout: "", stderr: "Killed" } }); assert.equal(killed.signal, "SIGKILL"); assert.equal(killed.exitCode, null); assert.match(killed.headline, /killed by SIGKILL: Killed/u);
  const ok = handle.recordCommand({ command: "true", result: { status: 0, signal: null, stdout: "", stderr: "" } }); assert.equal(ok.ok, true); assert.equal(ok.record.channel, handle.channel.id);
  assert.equal(readTrace(root, handle.traceId).messages.length, 2);
});
test("sv4-refusal", () => {
  const root = fresh(); const handle = open(root);
  assert.throws(() => handle.recordCommand({ command: "x", result: undefined }), TypeError);
  const blocked = fresh(); const stuck = open(blocked); rmSync(blocked, { recursive: true, force: true }); writeFileSync(blocked, "a file where the store was");
  assert.throws(() => stuck.recordCommand({ command: "x", result: failing("e") }), (e) => typeof e.code === "string");
});

test("sv5-positive", () => {
  const root = fresh(); const handle = open(root); const second = openTelemetry({ root, service: { name: "composer" }, ports: ports({ TRACEPARENT: handle.traceparent }) });
  handle.recordCommand({ command: "git", result: failing("e") }); second.recordCommand({ command: "npm", result: failing("n", 1) });
  const run = spawnSync(process.execPath, [EXPORT, "--trace", handle.traceId, root], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr); const lines = run.stdout.trim().split("\n"); assert.equal(lines.length, 2);
  for (const text of lines) { const request = JSON.parse(text); const record = request.resourceLogs[0].scopeLogs[0].logRecords[0]; assert.equal(record.traceId, handle.traceId); assert.ok(request.resourceLogs[0].resource.attributes.some((a) => a.key === "service.name")); }
  assert.equal(exportTrace(root, handle.traceId).length, 2);
});
test("sv5-alternate", () => {
  const empty = fresh(); mkdirSync(join(empty, "data"), { recursive: true }); const run = spawnSync(process.execPath, [EXPORT, empty], { encoding: "utf8" }); assert.equal(run.status, 0); assert.equal(run.stdout, "");
  const root = fresh(); open(root).recordCommand({ command: "a", result: failing("e") }); open(root).recordCommand({ command: "b", result: failing("e") });
  assert.equal([...exportAll(root)].length, 2);
  assert.equal([...exportAll(root, { since: "2999-01-01T00:00:00Z" })].length, 0);
});
test("sv5-refusal", () => { const root = fresh(); open(root).recordCommand({ command: "a", result: failing("e") }); const run = spawnSync(process.execPath, [EXPORT, "--trace", "f".repeat(32), root], { encoding: "utf8" }); assert.equal(run.status, 1); assert.equal(run.stdout, ""); assert.match(run.stderr, /holds no trace/u); });

const TAP = "TAP version 13\nok 1 - passes\nnot ok 2 - fails here\n1..2\n";
test("sv6-positive", () => {
  const root = fresh(); const handle = open(root);
  const done = handle.recordTestRun({ format: "tap", command: "node", args: ["--test"], cwd: "/src", result: { status: 1, signal: null, stdout: TAP, stderr: "" }, suite: "receiving" });
  const keys = Object.fromEntries(readTrace(root, handle.traceId).messages[0].body.attributes.map((x) => [x.key, x.value]));
  assert.equal(keys["test.suite.run.status"].stringValue, "failure"); assert.equal(keys["test.suite.name"].stringValue, "receiving"); assert.equal(keys["semioverse.test.report.id"].stringValue, done.report.id);
  assert.equal(keys["semioverse.test.fail"].intValue, "1"); assert.equal(keys["semioverse.test.failures"].arrayValue.values[0].stringValue, "fails here");
  assert.equal(Buffer.from(getBlob(root, done.report.id)).toString(), TAP);
});
test("sv6-alternate", () => {
  const root = fresh(); const handle = open(root); const xml = '<testsuites><testcase name="a"/><testcase name="b"><failure message="m"/></testcase></testsuites>';
  const done = handle.recordTestRun({ format: "junit", report: xml, command: "node", result: { status: 1, signal: null, stdout: "", stderr: "" } });
  assert.deepEqual([done.report.summary.pass, done.report.summary.fail], [1, 1]); assert.equal(Buffer.from(getBlob(root, done.report.id)).toString(), xml);
});
test("sv6-refusal", () => {
  const root = fresh(); const handle = open(root);
  const done = handle.recordTestRun({ format: "tap", command: "node", result: { status: 0, signal: null, stdout: "segfault", stderr: "" } });
  const keys = Object.fromEntries(readTrace(root, handle.traceId).messages[0].body.attributes.map((x) => [x.key, x.value]));
  assert.equal(done.report.summary.ok, false); assert.equal(keys["test.suite.run.status"].stringValue, "aborted"); assert.equal(keys["semioverse.test.report.unreadable"].stringValue, "no TAP version line"); assert.equal(getChannel(root, handle.channel.id).name, "receiver");
});

test("sv6-completion: incomplete reports remain addressed, unreadable observations", () => {
  for (const [format, report] of [
    ["tap", "TAP version 13\nok 1 - only observed point\n"],
    ["tap", "TAP version 13\n1..2\nok 1 - only observed point\n"],
    ["junit", '<testsuites tests="2"><testsuite><testcase name="first"/>'],
  ]) {
    const root = fresh(), handle = open(root);
    const done = handle.recordTestRun({ format, report, command: "runner",
      result: { status: 0, signal: null, stdout: "", stderr: "" } });
    const observed = readTrace(root, handle.traceId).messages;
    assert.equal(observed.length, 1);
    assert.equal(observed[0].id, done.address);
    const keys = Object.fromEntries(observed[0].body.attributes.map(item => [item.key, item.value]));
    assert.equal(done.report.summary.ok, false);
    assert.equal(keys["test.suite.run.status"].stringValue, "aborted");
    assert.equal(keys["semioverse.test.report.id"].stringValue, done.report.id);
    assert.equal(typeof keys["semioverse.test.report.unreadable"].stringValue, "string");
    assert.equal(Object.hasOwn(keys, "semioverse.test.pass"), false);
    assert.equal(Object.hasOwn(keys, "semioverse.test.tests"), false);
    assert.equal(Buffer.from(getBlob(root, done.report.id)).toString(), report);
  }
});

test("sv6-producer: explicit JUnit count projection survives the native message", () => {
  const root = fresh(), handle = open(root);
  const report = '<testsuites tests="2"><testsuite tests="2"><testsuite tests="2"><testcase name="a"/><testcase name="b"/></testsuite></testsuite></testsuites>';
  const command = { command: "runner", result: { status: 0, signal: null, stdout: "", stderr: "" } };
  const withoutProjection = handle.recordTestRun({ format: "junit", report, ...command });
  assert.equal(withoutProjection.report.summary.ok, false);
  const received = handle.recordTestRun({ format: "junit", report, reportOptions: { junitCountBasis: "leaves" }, ...command });
  assert.equal(received.report.summary.ok, true);
  assert.equal(received.report.summary.tests, 2);
  assert.equal(received.report.summary.pass, 2);
  const observed = readTrace(root, handle.traceId).messages;
  const keys = Object.fromEntries(observed[1].body.attributes.map(item => [item.key, item.value]));
  assert.equal(keys["test.suite.run.status"].stringValue, "success");
  assert.equal(keys["semioverse.test.report.junit_count_basis"].stringValue, "leaves");
  assert.equal(received.report.id, withoutProjection.report.id, "reading options do not alter source bytes");
  assert.equal(Buffer.from(getBlob(root, received.report.id)).toString(), report);
});

test("sv6-byte-custody: invalid UTF-8 is retained exactly and cannot become a readable report", () => {
  const bytes = Buffer.concat([Buffer.from("TAP version 13\nok 1 - truncated name "), Buffer.from([0xc3])]);
  for (const explicit of [true, false]) {
    const root = fresh(), handle = open(root);
    const done = handle.recordTestRun({ format: "tap", ...(explicit ? { report: bytes } : {}), command: "runner",
      result: { status: 0, signal: null, stdout: explicit ? "" : bytes, stderr: "" } });
    assert.deepEqual(Buffer.from(getBlob(root, done.report.id)), bytes);
    assert.equal(done.report.id, putBlob(root, bytes));
    assert.deepEqual(done.report.summary, { ok: false, format: "tap", reason: "report is not valid UTF-8" });
    const keys = Object.fromEntries(readTrace(root, handle.traceId).messages[0].body.attributes.map(item => [item.key, item.value]));
    assert.equal(keys["test.suite.run.status"].stringValue, "aborted");
    assert.equal(Object.hasOwn(keys, "semioverse.test.tests"), false);
  }
});

test("sv6-attribute-custody: caller context cannot manufacture or contradict report observations", () => {
  const attributes = { "workflow.name": "receiving", "test.suite.run.status": "success",
    "semioverse.test.tests": 99, "semioverse.test.pass": 99, "semioverse.test.fail": 99,
    "semioverse.test.skipped": 99, "semioverse.test.failures": ["invented"],
    "semioverse.test.report.unreadable": "invented", "semioverse.test.report.junit_count_basis": "leaves" };
  const before = structuredClone(attributes);
  for (const complete of [false, true]) {
    const root = fresh(), handle = open(root);
    const report = "TAP version 13\nok 1 - observed\n" + (complete ? "1..1\n" : "");
    const done = handle.recordTestRun({ format: "tap", report, command: "runner", attributes,
      result: { status: 0, signal: null, stdout: "", stderr: "" } });
    const keys = Object.fromEntries(readTrace(root, handle.traceId).messages[0].body.attributes.map(item => [item.key, item.value]));
    assert.equal(keys["workflow.name"].stringValue, "receiving");
    assert.equal(keys["test.suite.run.status"].stringValue, complete ? "success" : "aborted");
    for (const key of ["semioverse.test.failures", "semioverse.test.report.junit_count_basis"]) assert.equal(Object.hasOwn(keys, key), false);
    if (complete) {
      assert.equal(keys["semioverse.test.tests"].intValue, "1");
      assert.equal(keys["semioverse.test.pass"].intValue, "1");
      assert.equal(keys["semioverse.test.fail"].intValue, "0");
      assert.equal(keys["semioverse.test.skipped"].intValue, "0");
      assert.equal(Object.hasOwn(keys, "semioverse.test.report.unreadable"), false);
    } else {
      for (const key of ["tests", "pass", "fail", "skipped"]) assert.equal(Object.hasOwn(keys, "semioverse.test." + key), false);
      assert.equal(keys["semioverse.test.report.unreadable"].stringValue, done.report.summary.reason);
    }
  }
  assert.deepEqual(attributes, before);
});

test("sv7-positive: generic event retains body, caller clock, trace and actual receipt", () => {
  const root = fresh(), handle = open(root);
  const body = { event: "observed", values: [1, true, "kept"] };
  const receipt = handle.recordEvent({ operation: "fixture.observation", body, attributes: { sequence: 0 } });
  body.values[2] = "changed";
  const held = readTrace(root, handle.traceId).messages;
  assert.equal(held.length, 1);
  assert.equal(held[0].id, receipt.address);
  assert.equal(receipt.record.id, receipt.address);
  assert.equal(held[0].body.eventName, "fixture.observation");
  assert.equal(held[0].body.traceId, handle.traceId);
  const values = held[0].body.body.kvlistValue.values.find(x => x.key === "values").value.arrayValue.values;
  assert.equal(values[2].stringValue, "kept");
  assert.equal(getChannel(root, held[0].channel).name, "receiver");
});
test("sv7-alternate: equal clocks retain causal order and JSON text can preserve null", () => {
  const root = fresh(), clock = "2026-10-19T01:00:00.000Z";
  const handle = openTelemetry({ root, service, ports: { ...ports(), now: () => clock } });
  const first = handle.recordEvent({ operation: "fixture.event", body: JSON.stringify({ value: null }), attributes: { sequence: 0 } });
  const second = handle.recordEvent({ operation: "fixture.event", body: "second", attributes: { sequence: 1 } });
  assert.equal(first.record.observedAt, clock);
  assert.equal(second.record.observedAt, clock);
  assert.deepEqual(second.record.causes, [first.address]);
  assert.deepEqual(JSON.parse(first.record.body.body.stringValue), { value: null });
  assert.notEqual(first.address, second.address);
});
test("sv7-refusal: invalid event, unsupported body and over-bound publication refuse once", () => {
  const root = fresh(); let observations = 0;
  const handle = openTelemetry({ root, service, ports: { ...ports(), now() { observations++; return "2026-10-19T01:00:00.000Z"; } } });
  assert.throws(() => handle.recordEvent({ body: "x" }), /operation/);
  assert.throws(() => handle.recordEvent({ operation: "event" }), TypeError);
  observations = 0;
  assert.throws(() => handle.recordEvent({ operation: "event", body: "x".repeat(70_000) }), error => error.code === "record-size");
  assert.equal(observations, 1, "one supplied observation, no retry or tail-reduction pass");
  assert.equal(readTrace(root, handle.traceId).messages.length, 0);
});
test("sv7-refusal: an unwritable store propagates instead of returning a receipt", () => {
  const root = fresh(), handle = open(root);
  rmSync(root, { recursive: true, force: true }); writeFileSync(root, "blocked");
  assert.throws(() => handle.recordEvent({ operation: "event", body: "observed" }), error => typeof error.code === "string");
});
