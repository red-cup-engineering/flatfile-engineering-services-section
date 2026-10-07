import assert from "node:assert/strict";
import test from "node:test";

import { choose } from "../src/articulation/predicating/positing/settling/analysis/number-theory.mjs";
import { step } from "../src/articulation/predicating/positing/settling/analysis/collatz.mjs";

test("number-theory runtime realizes its public calculation surfaces", () => {
  assert.equal(step(3), 5);
  assert.equal(choose(5, 2), 10);
});
