import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bilatticeLawReceipt,
  fusionReading,
  gauge,
  gaugeElementNames,
  gaugeMul,
  knowledgeBottom,
  knowledgeJoinReading,
  knowledgeLeqReading,
  knowledgeTop,
  kleinFourGaugeReceipt,
  linearUnit,
  readingAs,
  readingFamilies,
  readingOfSides,
  readingOfWire,
  residuationHolds,
  sidesOfReading,
  symmetricEvidenceDifferenceReading,
  negateReading,
  samePoint,
  truthBottom,
  truthLeqReading,
  truthTop,
  wireOfReading,
} from "../src/four.mjs";

// Conformance against Obsmetrologia/Language/Positing/Charge.lean:
// Charge.ofSlots, kBot/tTop/tBot/kTop, joinK, leK, leT, negate and
// fuse_leT_iff. This tests every value/combination of the actual FOUR
// carrier, not a random sample. It does not assert a compiled Lean ↔ JS proof.
const CORNERS = Object.freeze([
  ["absurd", false, false, "neither"],
  ["potential", true, false, "true"],
  ["active", false, true, "false"],
  ["stable", true, true, "both"],
]);

const points = readingFamilies.knowledge;

test("FOUR's complete value table has exactly the four Lean Charge corners", () => {
  assert.deepEqual(points, CORNERS.map(([name]) => name));
  for (const [name, positive, negative, truthName] of CORNERS) {
    assert.deepEqual(sidesOfReading(name), [positive, negative]);
    assert.equal(readingOfSides("knowledge", positive, negative), name);
    assert.equal(readingAs("truth", name), truthName);
    assert.equal(readingOfWire(wireOfReading(name)), truthName);
  }
  assert.equal(knowledgeBottom(), "absurd");
  assert.equal(knowledgeTop(), "stable");
  assert.equal(truthTop(), "potential");
  assert.equal(truthBottom(), "active");
});

test("FOUR knowledge join is commutative, idempotent, and preserves conflict", () => {
  assert.equal(knowledgeJoinReading("absurd", "potential"), "potential");
  assert.equal(knowledgeJoinReading("potential", "active"), "stable");
  for (const a of points) {
    assert.equal(knowledgeJoinReading(a, a), a);
    for (const b of points) {
      assert.equal(knowledgeJoinReading(a, b), knowledgeJoinReading(b, a));
      assert.equal(knowledgeLeqReading(a, knowledgeJoinReading(a, b)), true);
      assert.equal(knowledgeLeqReading(b, knowledgeJoinReading(a, b)), true);
    }
  }
});

test("all asserted lattice laws hold exhaustively, including the truth order", () => {
  const { kind, ...laws } = bilatticeLawReceipt();
  assert.equal(kind, "four.bilatticeLaws:witness");
  assert.ok(Object.keys(laws).length >= 20);
  for (const [name, holds] of Object.entries(laws)) {
    assert.equal(holds, true, `FOUR law violated: ${name}`);
  }
  for (const a of points) {
    assert.equal(truthLeqReading(truthBottom(), a), true);
    assert.equal(truthLeqReading(a, truthTop()), true);
    for (const b of points) {
      for (const c of points) {
        assert.equal(residuationHolds(a, b, c), true, `residuation failed: ${a} ${b} ${c}`);
      }
    }
    assert.equal(fusionReading(a, linearUnit()), a);
  }
});

test("the Klein-four gauge is a genuine action on all FOUR points", () => {
  const { kind, ...receipt } = kleinFourGaugeReceipt();
  assert.equal(kind, "four.kleinFourGauge:witness");
  for (const law of ["closure", "associative", "identity", "selfInverse", "abelian", "actionHomomorphism"]) {
    assert.equal(receipt[law], true, law);
  }
  for (const a of gaugeElementNames) {
    for (const b of gaugeElementNames) {
      for (const value of points) {
        assert.equal(gauge(gaugeMul(a, b), value), gauge(a, gauge(b, value)));
      }
    }
  }
});


test("natural evidence tallies refuse lossy IEEE-754 integer arithmetic", async () => {
  const { record, recordAdd, attestationRecord } = await import("../src/four.mjs");
  const limit = Number.MAX_SAFE_INTEGER;

  assert.deepEqual(record(limit, 0), { pos: limit, neg: 0 });
  assert.deepEqual(recordAdd(record(2, 3), record(4, 5)), record(6, 8));
  assert.deepEqual(attestationRecord([2, 1]), record(1, 1));

  assert.throws(() => record(limit + 1, 0), TypeError);
  assert.throws(() => recordAdd(record(limit, 0), record(1, 0)), TypeError);
  assert.throws(() => attestationRecord([limit + 1]), TypeError);
  assert.throws(() => attestationRecord([limit, 2]), TypeError);
});

test("FOUR symmetric evidence difference is exactly the pinned Chu defect zero test", () => {
  const vals=readingFamilies.knowledge;
  for(const a of vals)for(const b of vals){
    const defect=symmetricEvidenceDifferenceReading(a,b);
    assert.equal(defect===knowledgeBottom(),samePoint(a,b),
      "zero evidence defect iff the two FOUR points agree");
    assert.equal(defect,symmetricEvidenceDifferenceReading(b,a),
      "a disagreement has no arbitrary scalar direction");
    assert.equal(symmetricEvidenceDifferenceReading(negateReading(a),negateReading(b)),
      negateReading(defect), "FOUR negation transports the two evidence slots");
  }
  assert.equal(symmetricEvidenceDifferenceReading("absurd","potential"),"potential");
  assert.equal(symmetricEvidenceDifferenceReading("absurd","active"),"active");
  assert.equal(symmetricEvidenceDifferenceReading("potential","active"),"stable");
  assert.equal(symmetricEvidenceDifferenceReading("stable","stable"),"absurd");
  assert.throws(()=>symmetricEvidenceDifferenceReading("true","potential"),/different families/u);
});

test("a finite ChuCandidate pairing is lawful exactly when all FOUR defects vanish", () => {
  const points=["alice","bob"],states=["reads","writes"];
  const C={alice:{reads:"potential",writes:"absurd"},
           bob:{reads:"active",writes:"stable"}};
  const D={alice:{...C.alice},bob:{...C.bob}};
  const fwd=a=>a,bwd=y=>y;
  const observed=(a,y)=>symmetricEvidenceDifferenceReading(D[fwd(a)][y],C[a][bwd(y)]);
  assert.ok(points.every(a=>states.every(y=>observed(a,y)===knowledgeBottom())));
  D.bob.writes="potential";
  const failures=points.flatMap(a=>states.filter(y=>observed(a,y)!==knowledgeBottom()).map(y=>[a,y,observed(a,y)]));
  assert.deepEqual(failures,[["bob","writes","active"]],
    "positive/negative mismatch stays a typed FOUR defect, not an invented distance");
});
