import assert from "node:assert/strict";
import { test } from "node:test";
import {
  querySettlementRecords,
  recordSettlementRecord,
} from "../src/witness-journal-document.mjs";
import { startWitnessJournalProviderProcess } from "../src/test-provider.mjs";

test("records round-trip through the network boundary without RDF or A2A", async (t) => {
  const provider = await startWitnessJournalProviderProcess();
  t.after(() => provider.close());
  await recordSettlementRecord({
    agentUrl: provider.agentCardUrl,
    settlement: "eip155:1:0x0000000000000000000000000000000000000001",
    actor: "urn:ame:test",
    category: "test-record",
    recordedAt: "2026-08-15T00:00:00.000Z",
    record: { answer: 42 },
  });
  assert.deepEqual(await querySettlementRecords("test-record", { agentUrl: provider.agentCardUrl }), [{ answer: 42 }]);
});

test("direct capability injection follows the same document law", async () => {
  const provider = await startWitnessJournalProviderProcess();
  try {
    await recordSettlementRecord({
      ...provider.binding,
      settlement: "eip155:1:0x0000000000000000000000000000000000000001",
      actor: "urn:ame:test",
      category: "direct-record",
      recordedAt: "2026-08-15T00:00:00.000Z",
      record: { mode: "direct" },
    });
    assert.deepEqual(await querySettlementRecords("direct-record", provider.binding), [{ mode: "direct" }]);
  } finally {
    await provider.close();
  }
});
