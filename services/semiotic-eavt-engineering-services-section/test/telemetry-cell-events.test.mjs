import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { address, cell, knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { cellToCloudEvent, cellFromCloudEvent, cellEventOfMessage } from "@red-cup-engineering/signcell/cloud-events";
import { openTelemetry } from "../src/telemetry.mjs";
import { exportTrace, MESSAGE_TYPE, readMessage, readTrace } from "../src/telemetry-store.mjs";
import { each, readHead } from "../src/store-core.mjs";
import { HeadConflict } from "../src/layout.mjs";

const roots = [];
const fresh = () => { const root = mkdtempSync(join(tmpdir(), "seavt-cell-events-")); roots.push(root); return root; };
after(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });

const observedAt = "2026-10-26T19:00:00.000000001Z";
const eventAt = "2026-10-26T18:29:59.000001Z";
let entropyCalls = 0;
const ports = ({ env = {}, now = () => observedAt } = {}) => ({
  env, now,
  entropy: count => { const seed = ++entropyCalls; return Uint8Array.from({ length: count }, (_, index) => ((seed * 31 + index * 17) % 251) + 1); },
});
const open = (root, name, options) => openTelemetry({ root, service: { name }, ports: ports(options) });
const claim = () => cell("sensor", "observed", { value: 3, unit: "C" }, {
  for: [{ source: "sensor-a", revision: "r1" }],
  against: [{ source: "sensor-b", revision: "r2" }],
  value: "absurd",
});
const eventOf = (value = claim()) => cellToCloudEvent(value, { id: "occurrence-17", source: "urn:sensor:alpha", time: eventAt });
const attribute = (record, name) => record.attributes.find(item => item.key === name)?.value;
const wireRecords = requests => requests.flatMap(request => request.resourceLogs.flatMap(resource => resource.scopeLogs.flatMap(scope => scope.logRecords)));

test("sv14: an explicit journal frontier refuses a stale claim observation without adding evidence", () => {
  const root = fresh(), original = claim(), sender = open(root, "guarded-claims");
  const event = cellToCloudEvent(original, { id: "guarded-occurrence", source: "example://[v1.alpha]/sensor", time: eventAt });
  const first = sender.recordCellEvent({ event, expect: null });
  const cut = readTrace(root, sender.traceId), held = [...each(root, MESSAGE_TYPE, { strict: true })];
  assert.throws(() => sender.recordCellEvent({ event, expect: null }), HeadConflict);
  assert.deepEqual([...each(root, MESSAGE_TYPE, { strict: true })], held);
  assert.deepEqual(readTrace(root, sender.traceId), cut);

  const next = sender.recordCellEvent({ event, expect: cut.coverage.frontier });
  assert.deepEqual(next.record.causes, [first.address]);
  assert.throws(() => sender.recordCellEvent({ event, expect: cut.coverage.frontier }), HeadConflict);
  const received = readTrace(root, sender.traceId);
  assert.equal(received.coverage.status, "complete");
  assert.deepEqual(received.messages.map(item => item.id), [first.address, next.address]);
  for (const observed of received.messages) {
    const retained = cellEventOfMessage(observed);
    assert.deepEqual(retained, event);
    assert.deepEqual(cellFromCloudEvent(retained), original);
  }

  let invoked = 0;
  const accessor = { event, get expect() { invoked++; return [next.address]; } };
  assert.throws(() => sender.recordCellEvent(accessor), /enumerable data property/u);
  assert.equal(invoked, 0);
  const inherited = Object.assign(Object.create({ expect: [next.address] }), { event });
  assert.throws(() => sender.recordCellEvent(inherited), /enumerable data property/u);
  assert.deepEqual(readTrace(root, sender.traceId), received);
});

test("sv13-positive: repeated and forwarded claim events retain evidence through the actual journal and export", () => {
  const root = fresh(), original = claim();
  const event = {
    ...eventOf(original), tenant: "alpha", retry: 2,
    traceparent: "00-11111111111111111111111111111111-2222222222222222-01",
    tracestate: "vendor=domain",
  };
  let observations = 0;
  const now = () => { observations++; return observedAt; };
  const sender = open(root, "claim-sender", { now });
  const first = sender.recordCellEvent({ event });
  const second = sender.recordCellEvent({ event });
  const receiver = open(root, "claim-receiver", { now, env: { TRACEPARENT: sender.traceparent } });
  const third = receiver.recordCellEvent({ event });
  const receipts = [first, second, third];

  assert.equal(observations, 3, "one observation from the actual handle clock per append");
  assert.equal(receiver.traceId, sender.traceId);
  assert.notEqual(receiver.channel.id, sender.channel.id);
  assert.equal(new Set(receipts.map(receipt => receipt.address)).size, 3);
  assert.deepEqual(first.record.causes, []);
  assert.deepEqual(second.record.causes, [first.address]);
  assert.deepEqual(third.record.causes, [second.address]);

  for (const [index, receipt] of receipts.entries()) {
    const handle = index === 2 ? receiver : sender;
    assert.equal(Object.isFrozen(receipt), true);
    assert.deepEqual(Object.keys(receipt).sort(), ["address", "eventId", "eventSource", "record", "traceId"]);
    assert.equal(receipt.address, receipt.record.id);
    assert.equal(receipt.traceId, receipt.record.body.traceId);
    assert.equal(receipt.traceId, sender.traceId);
    assert.equal(receipt.eventId, event.id);
    assert.equal(receipt.eventSource, event.source);
    assert.equal(receipt.record.channel, handle.channel.id);
    assert.equal(receipt.record.observedAt, observedAt);
    assert.equal(receipt.record.body.spanId, handle.spanId);
    assert.equal(receipt.record.body.flags, handle.traceFlags);
    assert.notEqual(receipt.record.body.timeUnixNano, receipt.record.body.observedTimeUnixNano);
    assert.deepEqual(readMessage(root, receipt.address), receipt.record);
    const retained = cellEventOfMessage(receipt.record);
    assert.deepEqual(retained, event);
    const recovered = cellFromCloudEvent(retained);
    assert.deepEqual(recovered, original);
    assert.deepEqual(recovered.for, original.for);
    assert.deepEqual(recovered.against, original.against);
    assert.equal(recovered.value, "absurd", "recording does not replace the caller's explicit valuation");
    assert.equal(address(recovered), event.subject);
  }

  const reading = readTrace(root, sender.traceId);
  assert.equal(reading.coverage.status, "complete");
  assert.equal(reading.truncated, false);
  assert.deepEqual(reading.coverage.issues, []);
  assert.deepEqual(reading.coverage.frontier, [third.address]);
  assert.deepEqual(reading.messages, receipts.map(receipt => receipt.record));

  const requests = exportTrace(root, sender.traceId);
  assert.equal(requests.length, 2, "the original exporter groups the two actual channels");
  const exported = wireRecords(requests);
  assert.equal(exported.length, 3);
  assert.deepEqual(exported.map(record => attribute(record, "semioverse.message.id").stringValue).sort(), receipts.map(receipt => receipt.address).sort());
  for (const record of exported) {
    const receipt = receipts.find(item => item.address === attribute(record, "semioverse.message.id").stringValue);
    assert.deepEqual(record.body, receipt.record.body.body, "OTLP projection retains the complete original claim envelope");
    assert.equal(record.traceId, sender.traceId);
    assert.equal(attribute(record, "cloudevents.event_id").stringValue, event.id);
    assert.equal(attribute(record, "cloudevents.event_source").stringValue, event.source);
    assert.equal(attribute(record, "cloudevents.event_type").stringValue, event.type);
    assert.equal(attribute(record, "cloudevents.event_spec_version").stringValue, event.specversion);
    assert.equal(attribute(record, "cloudevents.event_subject").stringValue, event.subject);
    assert.deepEqual(attribute(record, "semioverse.message.cause_ids").arrayValue.values.map(item => item.stringValue), receipt.record.causes);
  }
});

test("sv13-alternate: custody adds neither witness nor event time and owns the retained input", () => {
  const root = fresh(), handle = open(root, "unwitnessed-claim");
  const original = cell("sensor", "may-observe", "unknown");
  const event = structuredClone(cellToCloudEvent(original, { id: "unasserted", source: "urn:source" }));
  const expected = structuredClone(event);
  const receipt = handle.recordCellEvent({ event });
  event.id = "changed-after-append";
  event.source = "urn:changed";
  const retained = cellEventOfMessage(readMessage(root, receipt.address));
  assert.deepEqual(retained, expected);
  assert.equal(receipt.eventId, expected.id);
  assert.equal(receipt.eventSource, expected.source);
  assert.equal(Object.hasOwn(retained, "time"), false);
  assert.equal(Object.hasOwn(receipt.record.body, "timeUnixNano"), false);
  const recovered = cellFromCloudEvent(retained);
  assert.deepEqual(recovered.for, []);
  assert.deepEqual(recovered.against, []);
  assert.equal(knowledgeReading(recovered), knowledgeReading(original));
  assert.deepEqual(recovered, original);
  assert.equal(Object.hasOwn(receipt, "ok"), false, "custody receipt does not assert the claim");
});

test("sv13-refusal: malformed claim envelopes and accessors leave the existing head unchanged", () => {
  const root = fresh(), handle = open(root, "invalid-claim"), event = eventOf();
  assert.throws(() => handle.recordCellEvent(), TypeError);
  assert.throws(() => handle.recordCellEvent({ event: { ...event, data_base64: "AA==" } }), TypeError);
  assert.equal(readHead(root, MESSAGE_TYPE, handle.traceId), undefined);
  const kept = handle.recordCellEvent({ event });
  const head = readHead(root, MESSAGE_TYPE, handle.traceId);
  for (const malformed of [
    { ...event, data_base64: "%%%" },
    { ...event, subject: address(cell("other", "p", "o")) },
    { ...event, time: "2026-02-30T00:00:00Z" },
    { ...event, traceparent: "not-a-traceparent" },
    { ...event, source: "urn:sensor:%" },
  ]) {
    assert.throws(() => handle.recordCellEvent({ event: malformed }), TypeError);
    assert.deepEqual(readHead(root, MESSAGE_TYPE, handle.traceId), head);
  }
  let calls = 0;
  assert.throws(() => handle.recordCellEvent({ get event() { calls++; return event; } }), TypeError);
  assert.throws(() => handle.recordCellEvent({ event: { ...event, get data_base64() { calls++; return event.data_base64; } } }), TypeError);
  assert.equal(calls, 0);
  assert.deepEqual(readHead(root, MESSAGE_TYPE, handle.traceId), head);
  const reading = readTrace(root, handle.traceId);
  assert.equal(reading.coverage.status, "complete");
  assert.deepEqual(reading.messages.map(message => message.id), [kept.address]);
});

test("sv13-refusal: over-bound claim events preserve the head and are not retried or shortened", () => {
  const root = fresh(); let observations = 0;
  const handle = open(root, "bounded-claim", { now: () => { observations++; return observedAt; } });
  const kept = handle.recordCellEvent({ event: eventOf() });
  const head = readHead(root, MESSAGE_TYPE, handle.traceId);
  const large = cellToCloudEvent(cell("s", "p", "x".repeat(70_000)), { id: "large", source: "urn:source" });
  observations = 0;
  assert.throws(() => handle.recordCellEvent({ event: large }), error => error.code === "record-size");
  assert.equal(observations, 1);
  assert.deepEqual(readHead(root, MESSAGE_TYPE, handle.traceId), head);
  assert.deepEqual(readTrace(root, handle.traceId).messages.map(message => message.id), [kept.address]);
});

test("sv13-refusal: an unwritable original store propagates without a receipt", () => {
  const root = fresh(), handle = open(root, "blocked-claim");
  rmSync(root, { recursive: true, force: true });
  writeFileSync(root, "blocked");
  assert.throws(() => handle.recordCellEvent({ event: eventOf() }), error => typeof error.code === "string");
});
