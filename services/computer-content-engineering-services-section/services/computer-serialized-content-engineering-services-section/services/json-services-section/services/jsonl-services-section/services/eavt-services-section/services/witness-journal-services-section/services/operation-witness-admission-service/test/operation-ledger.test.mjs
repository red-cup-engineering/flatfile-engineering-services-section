import assert from "node:assert/strict";
import test from "node:test";

import { admitOperationWitness } from "../src/operation-witness.mjs";
import { foldOperationWitnessEvents, projectOperationLedger } from "../src/operation-ledger.mjs";

test("folds both owned and legacy operation attributes from explicit EAVT rows", () => {
  const admitted = admitOperationWitness({ kind: "file-read", paths: ["src/a.mjs"], trace: "turn:1", evidence: ["test"] }, { at: "2026-08-30T00:00:00.000Z" });
  const legacy = Object.freeze(["legacy", "operations-manifold.operation.recorded", Object.freeze({ ...admitted.value, kind: "operations-manifold.operation.event", eventId: "legacy-event", event: "mcp-call" }), Object.freeze({ at: admitted.value.at })]);
  const snapshot = foldOperationWitnessEvents([admitted.event, legacy], { generatedAt: "2026-08-30T00:01:00.000Z" });
  assert.equal(snapshot.totals.entries, 2);
  assert.equal(snapshot.totals.fileReads, 1);
  assert.equal(snapshot.totals.mcpCalls, 1);
  assert.equal(snapshot.entries.filter((entry) => entry.event === "file-read")[0].paths[0], "src/a.mjs");
  assert.equal(projectOperationLedger(snapshot).entryCount, 2);
});
