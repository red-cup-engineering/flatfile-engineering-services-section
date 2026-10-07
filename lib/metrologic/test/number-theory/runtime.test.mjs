import assert from "node:assert/strict";
import test from "node:test";

import { recurringVerbSequences } from "../../src/number-theory/sequence-recurrence.mjs";

test("number-theory runtime realizes its public calculation surfaces", () => {
  const measurement = recurringVerbSequences([
    { actor: "agent", verb: "observe", argShape: [], validated: true },
    { actor: "agent", verb: "act", argShape: [], validated: true },
    { actor: "agent", verb: "observe", argShape: [], validated: true },
    { actor: "agent", verb: "act", argShape: [], validated: true },
  ]);
  assert.deepEqual(measurement.candidates[0]?.chain, ["observe", "act"]);
});
