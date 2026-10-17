import test from "node:test";
import assert from "node:assert/strict";

import {
  warpAlt as weaveAlternation,
  warpPath,
  crossingReading,
} from "../src/articulation/predicating/positing/settling/analysis/weave-draft.mjs";
import {
  warpAlt as beadAlternation,
  holeTransition,
  legalThreadPass,
  threadPass,
} from "../src/articulation/predicating/positing/settling/analysis/port-graph.mjs";

test("weave crossings and bead-hole passes compose the identical source-owned law", () => {
  assert.equal(beadAlternation, weaveAlternation);
  for (const entry of [false, true]) for (const exit of [false, true]) {
    const legal = weaveAlternation(entry, exit);
    assert.equal(holeTransition(entry, exit), legal);
    assert.equal(legalThreadPass(threadPass("bead-1", entry, exit)), legal);
    assert.equal(warpPath([entry, exit]).kind === "sofic.path:witness", legal);
  }
});

test("FOUR retains unset, definite, and contested port states separately", () => {
  assert.equal(crossingReading(false, false), "absurd");
  assert.equal(crossingReading(true, false), "potential");
  assert.equal(crossingReading(false, true), "active");
  assert.equal(crossingReading(true, true), "stable");
});
