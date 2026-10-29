// SV5 and SV8–SV10: wire export, source-cut integrity, causal reading and honest OTLP receiving.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { channel, message, MESSAGE_KIND, packet } from "@red-cup-engineering/signcell/signal";
import { otlpLogRecord } from "@red-cup-engineering/signcell/observability";
import { put, writeHead } from "../src/store-core.mjs";
import { headFile, recordFile, StoreCorruption } from "../src/layout.mjs";
import { appendMessage, CHANNEL_TYPE, exportTrace, getChannel, MESSAGE_TYPE,
  putChannel, readMessage, readTrace } from "../src/telemetry-store.mjs";

const roots = [];
const fresh = () => { const root = mkdtempSync(join(tmpdir(), "seavt-trace-integrity-")); roots.push(root); return root; };
after(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });
const traceId = "1234567890abcdef1234567890abcdef";
const otherTrace = "abcdef1234567890abcdef1234567890";
const instant = "2026-10-26T15:00:00.000Z";
const absent = "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const makeChannel = (name = "events") => channel({ name, resource: { "service.name": name } });
const body = (text, at = instant, trace = traceId) => otlpLogRecord({ observedAt: at, body: text, traceContext: { traceId: trace } });
const save = (root, value) => {
  const { id, ...record } = value;
  assert.equal(put(root, MESSAGE_TYPE, record), id);
  return value;
};
const publish = (root, frontier, trace = traceId) => writeHead(root, MESSAGE_TYPE, trace, { frontier, at: instant });
const attribute = (record, key) => record.attributes.find(item => item.key === key)?.value;
const messageIds = request => request.resourceLogs.flatMap(resource => resource.scopeLogs.flatMap(scope => scope.logRecords.map(record => attribute(record, "semioverse.message.id").stringValue)));
const editRecord = (root, type, address, transform) => {
  const file = recordFile(root, type, address);
  const lines = readFileSync(file, "utf8").trimEnd().split("\n").map(text => JSON.parse(text));
  writeFileSync(file, lines.map(line => JSON.stringify(line.id === address ? transform(line) : line)).join("\n") + "\n");
};
const incompleteExport = (root, options) => assert.throws(() => exportTrace(root, traceId, options), error => error.code === "incomplete-trace" && error.coverage.status === "incomplete");

test("sv5-wire-flags: retained uint32 evidence stays readable while reserved outbound bits refuse", () => {
  const root = fresh(), on = makeChannel("received-flags"); putChannel(root, on);
  // An admitted incoming LogRecord can carry a wider word than a new OTLP request may emit.
  const incoming = Object.freeze({ ...body("retained incoming flags"), spanId: "1234567890abcdef", flags: 0x80000181 });
  const retained = appendMessage(root, { channel: on.id, traceId, observedAt: instant, body: incoming });
  const reading = readTrace(root, traceId);
  assert.equal(reading.coverage.status, "complete");
  assert.equal(reading.messages.length, 1);
  assert.equal(reading.messages[0].id, retained.id);
  assert.equal(reading.messages[0].body.flags, 0x80000181);
  const recordPath = recordFile(root, MESSAGE_TYPE, retained.id), headPath = headFile(root, MESSAGE_TYPE, traceId);
  const recordBytes = readFileSync(recordPath), headBytes = readFileSync(headPath);

  assert.throws(() => exportTrace(root, traceId), { name: "TypeError", message: /reserved high 24 bits/u });
  assert.deepEqual(readMessage(root, retained.id), retained);
  assert.deepEqual(readTrace(root, traceId), reading);
  assert.deepEqual(readFileSync(recordPath), recordBytes);
  assert.deepEqual(readFileSync(headPath), headBytes);
  assert.equal(incoming.flags, 0x80000181, "export refusal does not rewrite incoming evidence");

  const low = appendMessage(root, { channel: on.id, traceId: otherTrace, observedAt: instant,
    body: { ...body("retained low-byte flags", instant, otherTrace), spanId: "abcdef1234567890", flags: 0x81 } });
  const request = exportTrace(root, otherTrace)[0];
  assert.deepEqual(messageIds(request), [low.id]);
  assert.equal(request.resourceLogs[0].scopeLogs[0].logRecords[0].flags, 0x81);
});

test("sv8-positive: shared ancestors and fan-in retain causal order despite backward clocks", () => {
  const root = fresh(), on = makeChannel(); putChannel(root, on);
  const first = save(root, message({ channel: on, observedAt: "2026-10-26T15:00:04Z", body: body("root") }));
  const left = save(root, message({ channel: on, observedAt: "2026-10-26T15:00:03Z", causes: [first.id], body: body("left") }));
  const right = save(root, message({ channel: on, observedAt: "2026-10-26T15:00:02Z", causes: [first.id], body: body("right") }));
  const tip = save(root, message({ channel: on, observedAt: "2026-10-26T15:00:01Z", causes: [left.id, right.id], body: body("tip") }));
  publish(root, [tip.id, left.id]);
  const reading = readTrace(root, traceId);
  assert.equal(reading.coverage.status, "complete");
  assert.deepEqual(reading.coverage.issues, []);
  assert.equal(reading.messages.length, 4, "shared causes are received once");
  const positions = new Map(reading.messages.map((item, index) => [item.id, index]));
  for (const item of reading.messages) for (const cause of item.causes)
    assert.ok(positions.get(cause) < positions.get(item.id), "every source cause precedes its effect");
  assert.equal(reading.messages[0].id, first.id);
  assert.equal(reading.messages.at(-1).id, tip.id);
  const request = exportTrace(root, traceId)[0];
  assert.deepEqual(messageIds(request), reading.messages.map(item => item.id));
  const nativePacket = packet({ channel: on, messages: reading.messages });
  for (const record of request.resourceLogs[0].scopeLogs[0].logRecords) {
    const source = reading.messages.find(item => item.id === attribute(record, "semioverse.message.id").stringValue);
    assert.equal(attribute(record, "semioverse.packet.id").stringValue, nativePacket.id);
    assert.deepEqual(record.body, source.body.body);
  }
});

test("sv8-alternate: multiple channels retain each channel's causal export order", () => {
  const root = fresh(), firstChannel = makeChannel("one"), secondChannel = makeChannel("two");
  putChannel(root, firstChannel); putChannel(root, secondChannel);
  const rows = [firstChannel, secondChannel, firstChannel, secondChannel].map((on, index) =>
    appendMessage(root, { channel: on.id, traceId, observedAt: `2026-10-26T15:00:0${4 - index}Z`, body: body(String(index)) }));
  assert.deepEqual(readTrace(root, traceId).messages.map(item => item.id), rows.map(item => item.id));
  const requests = exportTrace(root, traceId);
  assert.equal(requests.length, 2);
  for (const request of requests) {
    const ids = messageIds(request);
    assert.deepEqual(ids, rows.filter(row => ids.includes(row.id)).map(row => row.id));
  }
});

test("sv8-refusal: an unresolved cause is explicit and cannot become a complete export", () => {
  const root = fresh(), on = makeChannel(); putChannel(root, on);
  const tip = save(root, message({ channel: on, observedAt: instant, causes: [absent], body: body("effect") }));
  publish(root, [tip.id]);
  const reading = readTrace(root, traceId);
  assert.equal(reading.coverage.status, "incomplete");
  assert.deepEqual(reading.messages.map(item => item.id), [tip.id]);
  assert.ok(reading.coverage.issues.some(issue => issue.code === "unavailable-record" && issue.address === absent));
  assert.deepEqual(reading.coverage.frontier, [tip.id]);
  incompleteExport(root);
});

test("sv8-refusal: a hash-invalid cause is unavailable evidence, not an omitted success", () => {
  const root = fresh(), on = makeChannel(); putChannel(root, on);
  const first = appendMessage(root, { channel: on.id, traceId, observedAt: instant, body: body("first") });
  appendMessage(root, { channel: on.id, traceId, observedAt: instant, body: body("second") });
  editRecord(root, MESSAGE_TYPE, first.id, line => ({ ...line, record: { ...line.record, observedAt: "2026-10-25T15:00:00Z" } }));
  assert.throws(() => readMessage(root, first.id), StoreCorruption);
  const reading = readTrace(root, traceId);
  assert.equal(reading.coverage.status, "incomplete");
  assert.ok(reading.coverage.issues.some(issue => issue.code === "unavailable-record" && issue.address === first.id));
  incompleteExport(root);
});

test("sv9-positive: a bounded read reports its cut and never exports a silently truncated trace", () => {
  const root = fresh(), on = makeChannel(); putChannel(root, on);
  const first = appendMessage(root, { channel: on.id, traceId, observedAt: instant, body: body("first") });
  const last = appendMessage(root, { channel: on.id, traceId, observedAt: instant, body: body("last") });
  const reading = readTrace(root, traceId, { limit: 1 });
  assert.equal(reading.truncated, true);
  assert.equal(reading.coverage.status, "incomplete");
  assert.deepEqual(reading.coverage.frontier, [last.id]);
  assert.deepEqual(reading.messages.map(item => item.id), [last.id]);
  assert.ok(reading.coverage.issues.some(issue => issue.code === "unresolved-cause" && issue.address === first.id));
  incompleteExport(root, { limit: 1 });
  assert.equal(readTrace(root, traceId, { limit: 2 }).coverage.status, "complete");
  assert.equal(exportTrace(root, traceId, { limit: 2 }).length, 1);
});

test("sv9-alternate: an absent trace differs from an admitted empty frontier", () => {
  const root = fresh();
  assert.equal(readTrace(root, traceId).coverage.status, "absent");
  assert.throws(() => exportTrace(root, traceId), error => error.code === "incomplete-trace" && error.coverage.status === "absent");
  assert.throws(() => readTrace(root, traceId, { limit: 0 }), error => error.code === "walk");
  publish(root, []);
  assert.equal(readTrace(root, traceId).coverage.status, "complete");
  assert.deepEqual(exportTrace(root, traceId), []);
});

test("sv9-refusal: foreign typed heads and causes cannot impersonate telemetry messages", () => {
  const root = fresh(), on = makeChannel(); putChannel(root, on);
  const external = put(root, "fixture-receipt", { kind: "receipt", causes: [] });
  publish(root, [{ type: "fixture-receipt", id: external }]);
  const foreign = readTrace(root, traceId);
  assert.deepEqual(foreign.messages, []);
  assert.ok(foreign.coverage.issues.some(issue => issue.code === "foreign-record" && issue.type === "fixture-receipt" && issue.address === external));
  incompleteExport(root);
  const malformed = put(root, MESSAGE_TYPE, { kind: "signcell.message", channel: on.id, observedAt: instant, body: body("claimed effect"), causes: [{ type: "fixture-receipt", id: external }] });
  publish(root, [malformed]);
  const reading = readTrace(root, traceId);
  assert.deepEqual(reading.messages, []);
  assert.ok(reading.coverage.issues.some(issue => issue.code === "invalid-message" && issue.address === malformed));
  assert.ok(reading.coverage.issues.some(issue => issue.code === "foreign-record" && issue.address === external));
  incompleteExport(root);
});

test("sv9-refusal: malformed causal reference and non-Message records remain explicit", () => {
  const root = fresh(), on = makeChannel(); putChannel(root, on);
  const badCause = put(root, MESSAGE_TYPE, { kind: "signcell.message", channel: on.id, observedAt: instant, body: body("bad cause"), causes: [7] });
  publish(root, [badCause]);
  assert.equal(readTrace(root, traceId).coverage.issues[0].code, "invalid-causal-reference");
  incompleteExport(root);
  const otherKind = put(root, MESSAGE_TYPE, { kind: "receipt", causes: [] });
  publish(root, [otherKind]);
  const reading = readTrace(root, traceId);
  assert.deepEqual(reading.messages, []);
  assert.ok(reading.coverage.issues.some(issue => issue.code === "invalid-message" && issue.address === otherKind));
  incompleteExport(root);
});

test("sv10-positive: source readmission owns nested message and channel data", () => {
  const root = fresh(), on = makeChannel(); putChannel(root, on);
  const saved = appendMessage(root, { channel: on.id, traceId, observedAt: instant, body: body("kept") });
  const received = readTrace(root, traceId).messages[0];
  assert.equal(received.id, saved.id);
  assert.ok(Object.isFrozen(received.body));
  assert.ok(Object.isFrozen(getChannel(root, on.id).resource));
  assert.throws(() => { received.body.body.stringValue = "changed"; }, TypeError);
  assert.equal(readMessage(root, saved.id).body.body.stringValue, "kept");
});

test("sv10-refusal: missing or malformed channel is incomplete source custody", () => {
  const root = fresh();
  const orphan = save(root, message({ channel: absent, observedAt: instant, body: body("no channel") }));
  publish(root, [orphan.id]);
  assert.ok(readTrace(root, traceId).coverage.issues.some(issue => issue.code === "unavailable-channel" && issue.address === absent));
  incompleteExport(root);
  const badChannel = put(root, CHANNEL_TYPE, { kind: "receipt", name: "not a channel", resource: {} });
  const invalid = save(root, message({ channel: badChannel, observedAt: instant, body: body("bad channel") }));
  publish(root, [invalid.id]);
  assert.throws(() => getChannel(root, badChannel), StoreCorruption);
  assert.ok(readTrace(root, traceId).coverage.issues.some(issue => issue.code === "invalid-channel" && issue.address === badChannel));
  incompleteExport(root);
});

test("sv10-refusal: foreign trace context and invalid source clock do not become observations", () => {
  const root = fresh(), on = makeChannel(); putChannel(root, on);
  const foreign = save(root, message({ channel: on, observedAt: instant, body: body("another trace", instant, otherTrace) }));
  publish(root, [foreign.id]);
  assert.ok(readTrace(root, traceId).coverage.issues.some(issue => issue.code === "trace-context-mismatch" && issue.address === foreign.id));
  incompleteExport(root);
  const impossible = { kind: MESSAGE_KIND, channel: on.id, observedAt: "2026-02-30T00:00:00Z", causes: [], body: body("impossible date") };
  assert.throws(() => message(impossible), TypeError, "the native constructor refuses an impossible observation");
  // Persist malformed source bytes through the low-level store to exercise
  // receiving corruption that the SignCell constructor itself cannot produce.
  const impossibleId = put(root, MESSAGE_TYPE, impossible);
  publish(root, [impossibleId]);
  assert.throws(() => readMessage(root, impossibleId), StoreCorruption);
  assert.ok(readTrace(root, traceId).coverage.issues.some(issue => issue.code === "invalid-message" && issue.address === impossibleId));
  incompleteExport(root);
});

test("sv10-refusal: invalid caller fields are rejected before advancing a trace", () => {
  const root = fresh(), on = makeChannel(); putChannel(root, on);
  for (const input of [
    { observedAt: "2026-02-30T00:00:00Z", body: body("bad date") },
    { observedAt: instant, body: "not a LogRecord" },
    { observedAt: instant, body: body("foreign", instant, otherTrace) },
  ]) assert.throws(() => appendMessage(root, { channel: on.id, traceId, ...input }));
  assert.equal(readTrace(root, traceId).coverage.status, "absent");
  const valid = appendMessage(root, { channel: on.id, traceId, observedAt: instant, body: body("valid") });
  assert.deepEqual(readTrace(root, traceId).messages.map(item => item.id), [valid.id]);
});

test("sv10-refusal: unreadable heads and genuine filesystem errors remain errors", () => {
  const root = fresh(); publish(root, []);
  writeFileSync(headFile(root, MESSAGE_TYPE, traceId), "not-json\n");
  assert.throws(() => readTrace(root, traceId));
  const blocked = fresh(); rmSync(blocked, { recursive: true }); writeFileSync(blocked, "not a store directory");
  assert.throws(() => readTrace(blocked, traceId), error => error.code === "ENOTDIR");
});
