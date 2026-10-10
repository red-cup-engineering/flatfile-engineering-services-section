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
