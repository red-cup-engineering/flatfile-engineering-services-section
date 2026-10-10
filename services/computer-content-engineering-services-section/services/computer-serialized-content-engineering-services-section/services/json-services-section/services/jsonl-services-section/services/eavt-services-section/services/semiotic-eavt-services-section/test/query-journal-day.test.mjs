import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { recordSemanticRecord } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { queryJournalDay } from "@red-cup-engineering/semiotic-eavt-services-section/query-journal-day";

const HELD = { for: true, against: false };
const machine = (t, name) => {
  const root = mkdtempSync(join(tmpdir(), `one-log-${name}-`));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
};
const transaction = {
  objectKind: "561-group.clearing.transaction", category: "settlement", recordedAt: "2026-10-10T01:00:00.000Z", told: HELD,
  record: { type: "ClearingSettlement", payer: "enterprise:inference", payee: "enterprise:research", amount: { numerator: 51, denominator: 1, unit: "credit-milliquanta" } },
};
const message = {
  objectKind: "561-group.message", category: "utterance", recordedAt: "2026-10-10T02:00:00.000Z", told: HELD,
  record: { type: "Message", from: "party:emsenn", to: "office:ledger", text: "one log" },
};
const channelEvent = {
  objectKind: "561-group.channel", category: "joined", recordedAt: "2026-10-10T03:00:00.000Z", told: HELD,
  record: { type: "ChannelEvent", channel: "channel:clearing", actor: "enterprise:research" },
};

test("a transaction, a message and a channel event of one day come back from one record query", (t) => {
  const root = machine(t, "bare-cedar-fog");
  for (const entry of [channelEvent, transaction, message]) recordSemanticRecord({ root, ...entry });
  recordSemanticRecord({ root, ...message, recordedAt: "2026-10-11T00:00:00.000Z", record: { ...message.record, text: "next day" } });

  const day = queryJournalDay({ roots: [root], date: "2026-10-10" });
  assert.deepEqual(day.map((entry) => entry.record.type), ["ClearingSettlement", "Message", "ChannelEvent"]);
  assert.deepEqual(day.map((entry) => entry.feed), ["561-group.clearing.transaction", "561-group.message", "561-group.channel"]);
  assert.ok(day.every((entry) => entry.told.for && !entry.told.against && entry.event.startsWith("ni:///sha-256;")));
  assert.deepEqual(queryJournalDay({ roots: [root], date: "2026-10-10", feeds: ["561-group.message"] }).map((entry) => entry.record.text), ["one log"]);
  assert.deepEqual(queryJournalDay({ roots: [root], date: "2026-10-11" }).map((entry) => entry.record.text), ["next day"]);
  assert.deepEqual(queryJournalDay({ roots: [root], date: "2026-10-09" }), []);
});

test("the logs of two machines read as one log, a record both hold once", (t) => {
  const first = machine(t, "bare-cedar-fog");
  const second = machine(t, "cold-red-gate");
  recordSemanticRecord({ root: first, ...transaction, origin: "machine:bare-cedar-fog" });
  recordSemanticRecord({ root: first, ...message, origin: "machine:bare-cedar-fog" });
  // The counterparty books the same settlement witness (federated by exchange) and its own channel event.
  recordSemanticRecord({ root: second, ...transaction, origin: "machine:bare-cedar-fog" });
  recordSemanticRecord({ root: second, ...channelEvent, origin: "machine:cold-red-gate" });

  const day = queryJournalDay({ roots: [first, second], date: "2026-10-10" });
  assert.deepEqual(day.map((entry) => entry.record.type), ["ClearingSettlement", "Message", "ChannelEvent"]);
  assert.deepEqual(day[0].roots.length, 2);
  assert.deepEqual(day.map((entry) => entry.origin), ["machine:bare-cedar-fog", "machine:bare-cedar-fog", "machine:cold-red-gate"]);
  assert.deepEqual(queryJournalDay({ roots: [second, first], date: "2026-10-10" }).map((entry) => entry.event), day.map((entry) => entry.event));
});

test("refuses a query without roots or a date", () => {
  assert.throws(() => queryJournalDay({ roots: [], date: "2026-10-10" }), TypeError);
  assert.throws(() => queryJournalDay({ roots: ["/tmp"], date: "10/10/2026" }), TypeError);
});

test("a settlement store keeps a chain: each record cites the one before it", async (t) => {
  const { createSettlementStore } = await import("@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record");
  const root = machine(t, "desk");
  const store = createSettlementStore({ settlementRoot: root, objectKind: "561-group.test-venue.desk.v1", actor: "enterprise:desk" });
  const decision = store.record({ category: "decision", recordedAt: "2026-10-10T01:00:00.000Z", record: { type: "Decision", id: "d1" } });
  const intent = store.record({ category: "order-intent", recordedAt: "2026-10-10T01:00:01.000Z", record: { type: "OrderIntent", decision: "d1" }, causes: [decision.events[0]] });
  const fill = store.record({ category: "fill", recordedAt: "2026-10-10T01:00:02.000Z", record: { type: "Fill", amountAtomic: "51" }, causes: [intent.events[0]], origin: "machine:cold-red-gate" });
  const day = queryJournalDay({ roots: [root], date: "2026-10-10" });
  assert.deepEqual(day.map((entry) => [entry.category, entry.causes]), [["decision", []], ["order-intent", [decision.events[0]]], ["fill", [intent.events[0]]]]);
  assert.equal(day[2].origin, "machine:cold-red-gate");
  assert.deepEqual(store.records("fill"), [{ type: "Fill", amountAtomic: "51" }]);
});
