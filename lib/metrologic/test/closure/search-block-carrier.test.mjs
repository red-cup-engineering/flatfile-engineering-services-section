import assert from "node:assert/strict";
import test from "node:test";
import { fromCount, toCount } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { closureSearchBlocks, closureStabilizationSearchHorizon, finiteOrdinalJudgment, zeroOrdinal, closureProcess, closeOrdinalProcess, closureReadout } from "../../src/articulation/predicating/positing/settling/closure.mjs";

for (const count of [0, 1, 3]) {
  test(`closure search admits the genuine natural carrier with ${count} limit blocks`, () => {
    const finiteStages = fromCount(2);
    const limitBlocks = fromCount(count);
    assert.equal(Object.hasOwn(limitBlocks, "members"), false);
    const horizon = closureStabilizationSearchHorizon(finiteStages, limitBlocks);
    const blocks = closureSearchBlocks(horizon);
    assert.equal(blocks.length, count + 1);
    assert.ok(Object.isFrozen(blocks));
    assert.equal(blocks[0].base, zeroOrdinal);
    for (const block of blocks) {
      assert.ok(Object.isFrozen(block));
      assert.equal(block.finiteStages, finiteStages);
    }
    for (let index = 1; index < blocks.length; index++) {
      assert.equal(blocks[index].base.kind, "ordinal.closure.ordinal.limit");
      let ordinal = blocks[index].base;
      for (let k = index; k > 1; k--) ordinal = ordinal.fundamentalSequence(fromCount(0));
      const finite = finiteOrdinalJudgment(ordinal.fundamentalSequence(fromCount(2)));
      assert.equal(finite.kind, "ordinal.closure.finiteOrdinal:witness");
      assert.equal(toCount(finite.value), 2);
    }
    assert.equal(toCount(horizon.limitBlocks), count);
    assert.equal(toCount(horizon.finiteStages), 2);
  });
}

for (const limitBlocks of [0, 1]) {
  for (const scottContinuous of [false, true]) {
    test(`post-finite search with ${limitBlocks} limit blocks and continuity=${scottContinuous}`, () => {
      let supCalls = 0;
      // For this finite chain and capped successor, these four samples exhaust
      // the possible values. This is not a supremum for arbitrary sequences.
      const lattice = {
        bottom: 0,
        leq: (a, b) => a <= b,
        join: Math.max,
        eq: (a, b) => a === b,
        sup: (sequence) => {
          supCalls++;
          return Math.max(...[0, 1, 2, 3].map(n => sequence(fromCount(n))));
        },
      };
      const process = closureProcess(lattice, n => Math.min(3, n + 1),
        closureStabilizationSearchHorizon(fromCount(1), fromCount(limitBlocks)), scottContinuous);
      const result = closeOrdinalProcess(process);
      assert.deepEqual(result.orbit.map(point => point.value), [0, 1]);
      assert.ok(supCalls > 0);
      assert.equal(result.search.kind, "ordinal.closure.stabilizationSearch:witness");
      assert.equal(result.value, 3);
      assert.equal(result.stabilization.successor, 3);
      const readout = closureReadout(result);
      assert.equal(readout.stabilization, "witness");
      assert.equal(readout.stage, null);
      assert.equal(readout.regime, scottContinuous ? "scott" : "transfinite-bounded");
    });
  }
}
