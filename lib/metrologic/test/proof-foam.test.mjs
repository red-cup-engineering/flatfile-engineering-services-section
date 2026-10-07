import assert from "node:assert/strict";
import test from "node:test";
import { observeProofFoam, observeProofKinetics, proofIncarnation, responseConstraintPair } from "../src/articulation/predicating/positing/settling/analysis/proof-foam.mjs";

test("response deficiency and redundancy remain an ordered pair", () => {
  assert.deepEqual(responseConstraintPair({
    requiredOpponentMoves: ["candidate"],
    admittedOpponentMoves: [],
    playerMoves: Array.from({ length: 16 }, (_, index) => `dispatch-${index}`),
  }), { deficiency: "1", redundancy: "15" });
});

test("incarnation dries duplicate dispatch ballast while retaining visited pores", () => {
  const events = [
    { transitionKey: "d1", transition: "supplier-demanded", design: "frontier" },
    { transitionKey: "d2", transition: "supplier-demanded", design: "frontier" },
    { transitionKey: "r1", transition: "supplier-delivered", design: "frontier", candidate: "candidate" },
    { transitionKey: "a1", transition: "assay-admitted", candidate: "candidate" },
  ];
  const dried = proofIncarnation(events), observed = observeProofFoam(events);
  assert.ok(dried.ballast.some(({ transitionKey }) => transitionKey === "d2"));
  assert.equal(observed.responseConstraints.deficiency, "0");
  assert.equal(observed.responseConstraints.redundancy, "1");
});

test("unassayed supplier work remains ballast relative to the verifier class", () => {
  const events = [
    { transitionKey: "d1", transition: "supplier-demanded", design: "frontier" },
    { transitionKey: "r1", transition: "supplier-delivered", design: "frontier", candidate: "candidate" },
  ];
  assert.equal(proofIncarnation(events).material.length, 0);
  assert.equal(proofIncarnation(events).ballast.length, 2);
});

test("proof kinetics reports an exact purchaser-relative Deborah fraction", () => {
  const events = [
    { transition: "supplier-demanded", observedAt: "2026-07-25T00:00:00.000Z" },
    { transition: "assay-admitted", observedAt: "2026-07-25T00:00:03.000Z" },
  ];
  assert.deepEqual(observeProofKinetics(events), {
    disposition: "unclassified",
    glueTime: { numerator: "3000", denominator: "1", unit: "millisecond" },
    observationWindow: null,
    proofingDeborah: null,
  });
  assert.deepEqual(observeProofKinetics(events, {
    observationWindow: { numerator: "2000", denominator: "1", unit: "millisecond" },
  }).proofingDeborah, { numerator: "3", denominator: "2" });
  assert.equal(observeProofKinetics(events, {
    observationWindow: { numerator: "2000", denominator: "1", unit: "millisecond" },
  }).disposition, "kinetic-obstruction");
});
