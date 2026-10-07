import { test } from "node:test";
import assert from "node:assert/strict";
import { knowledgeJoinReading, truthMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { existsF, forallF, finitePredicatingFibration, predicatingQuantifyingReceipt, reindexF } from "../src/articulation/predicating/quantifying.mjs";

// Three rooms sampled onto two cells: a and b share cell x, c is alone in y, and z is empty.
const fibration = finitePredicatingFibration(["a", "b", "c"], ["x", "y", "z"], { a: "x", b: "x", c: "y" });
const valuation = { a: "active", b: "potential", c: "active" };

test("∃ along the base map is the knowledge join over each fiber", () => {
  const exists = existsF(fibration, valuation, "knowledge");
  assert.equal(exists.x, knowledgeJoinReading("active", "potential"));
  assert.equal(exists.y, "active");
  assert.equal(exists.z, "absurd");
});

test("∀ along the base map is the meet over each fiber, in the order asked", () => {
  const forall = forallF(fibration, valuation, "truth");
  assert.equal(forall.x, truthMeetReading("active", "potential"));
  assert.equal(forall.y, "active");
});

test("pullback after ∃ repeats a cell's value across its fiber and gives back singleton fibers", () => {
  const reconstructed = reindexF(fibration, existsF(fibration, valuation, "knowledge"));
  assert.equal(reconstructed.c, valuation.c);
  assert.equal(reconstructed.a, reconstructed.b);
});

test("the quantifying receipt checks its finite adjunctions without throwing", () => {
  const receipt = predicatingQuantifyingReceipt(fibration, valuation);
  assert.equal(receipt.knowledgeAdjunctionFinite, true);
  assert.equal(receipt.singletonFiberIdentityKnowledge, true);
});
