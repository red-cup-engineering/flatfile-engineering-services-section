// One test per example of content/text/documents/specifications/2026-10-19-observability-seavt.md, named by its id.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { appendMessage, blobFile, exportAll, exportTrace, getBlob, getChannel, putBlob, putChannel, readTrace, traces } from "../src/telemetry-store.mjs";
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
