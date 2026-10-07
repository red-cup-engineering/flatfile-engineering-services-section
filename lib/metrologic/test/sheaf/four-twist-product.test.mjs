// Proves `fourTwistProduct` against articulating's REAL, already-proven semiotic
// charge algebra (devDependency, test-only) — the exact algebra articulating's
// own former hardcoded copy of this checker verified — rather than a hand-rolled
// synthetic bilattice this test would have to independently get right.
import assert from "node:assert/strict";
import test from "node:test";
import {
  fusionReading,
  knowledgeJoinReading,
  knowledgeMeetReading,
  linearUnit,
  negateReading,
  readingFamilies,
  residuumReading,
  samePoint,
  truthJoinReading,
  truthMeetReading,
} from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { fourTwistProduct } from "../../src/sheaf/order/four-twist-product.mjs";

const SEMIOTIC_NAMES = Object.freeze({ bottom: "absurd", positiveOnly: "potential", negativeOnly: "active", top: "stable" });

const semioticAlgebra = Object.freeze({
  names: SEMIOTIC_NAMES,
  readings: readingFamilies.knowledge,
  knowledgeJoin: knowledgeJoinReading,
  truthJoin: truthJoinReading,
  knowledgeMeet: knowledgeMeetReading,
  truthMeet: truthMeetReading,
  negate: negateReading,
  samePoint,
  fuse: fusionReading,
  unit: linearUnit("knowledge"),
  residuum: residuumReading,
});

test("fourTwistProduct(semioticAlgebra) reproduces articulating's own former hardcoded witness exactly", () => {
  const receipt = fourTwistProduct(semioticAlgebra);
  assert.equal(receipt.kind, "twistProduct.four:witness", receipt.kind === "twistProduct.four-obstruction" ? JSON.stringify(receipt) : undefined);
  assert.equal(receipt.knowledgeBottom, "absurd");
  assert.equal(receipt.knowledgeTop, "stable");
  assert.equal(receipt.truthBottom, "active");
  assert.equal(receipt.truthTop, "potential");
  assert.deepEqual([...receipt.consistentFragment].sort(), ["absurd", "active", "potential"]);
  assert.equal(receipt.elements.length, 4);
});

test("fourTwistProduct reports an obstruction, not a false witness, when a supplied algebra breaks a law", () => {
  const brokenAlgebra = Object.freeze({ ...semioticAlgebra, negate: (value) => value });
  const receipt = fourTwistProduct(brokenAlgebra);
  assert.equal(receipt.kind, "twistProduct.four-obstruction");
  assert.equal(receipt.reason, "negation");
});
