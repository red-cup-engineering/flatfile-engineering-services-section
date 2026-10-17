import assert from "node:assert/strict";
import test from "node:test";
import {
  OMEGA, omegaGrade, omegaCompare, omegaEvidence, checkedOmegaEvidence,
  omegaChain, omegaTwist, omegaSupportReading, omegaBinary, omegaLinearNot,
  omegaWithin, omegaFold,
} from "../src/ordinal-evidence.mjs";
import {
  readingFamilies, readingOfSides, sidesOfReading, knowledgeJoinReading,
  truthJoinReading, knowledgeMeetReading, truthMeetReading,
  fusionReading, residuumReading, linearNegationReading, parReading,
  knowledgeImplyReading, truthImplyReading, samePoint,
} from "../src/four.mjs";

test("omega+1 has exact unbounded finite grades and a genuinely infinite endpoint", () => {
  assert.equal(omegaGrade("0"), "0");
  assert.equal(omegaGrade(OMEGA), OMEGA);
  const huge = "1" + "0".repeat(100);
  assert.equal(omegaCompare(huge, OMEGA), -1);
  assert.equal(omegaCompare(huge, "2"), 1);
  assert.equal(omegaChain.imply("12", "7"), "7");
  assert.equal(omegaChain.imply("7", "12"), OMEGA);
  assert.equal(omegaChain.fuse("5", OMEGA), "5");
  assert.deepEqual(omegaEvidence("2", OMEGA), ["2", OMEGA]);
  assert.throws(() => omegaGrade(2), /canonical/u);
  for (const invalid of ["", "00", "01", "-1", "+1", "1.0", "Omega", "Infinity", "ω+1", "1e3"]) {
    assert.throws(() => omegaGrade(invalid), /canonical/u);
  }
  assert.throws(() => checkedOmegaEvidence(["1"]), /two-coordinate/u);
  assert.throws(() => checkedOmegaEvidence({ positive: "1", negative: OMEGA }), /two-coordinate/u);
});

test("the endpoint subalgebra is EXACTLY FOUR for each additive, linear and implication connective", () => {
  const fourNames = readingFamilies.knowledge;
  const asGraded = (name) => omegaEvidence(...sidesOfReading(name).map((v) => v ? OMEGA : "0"));
  for (const a of fourNames) {
    const g = asGraded(a);
    assert.equal(omegaSupportReading(g), a);
    assert.equal(omegaSupportReading(omegaLinearNot(g)), linearNegationReading(a));
    for (const b of fourNames) {
      const h = asGraded(b);
      const cases = [
        ["join", "knowledge", knowledgeJoinReading],
        ["meet", "knowledge", knowledgeMeetReading],
        ["join", "truth", truthJoinReading],
        ["meet", "truth", truthMeetReading],
        ["imply", "knowledge", knowledgeImplyReading],
        ["imply", "truth", truthImplyReading],
        ["tensor", undefined, fusionReading],
        ["lollipop", undefined, residuumReading],
        ["par", undefined, parReading],
      ];
      for (const [operator, order, known] of cases) {
        const actual = omegaBinary(operator, g, h, order);
        assert.equal(omegaSupportReading(actual), known(a, b),
          "FOUR endpoint reduction: " + operator + "/" + String(order));
      }
    }
  }
});

test("genuine intermediate grades distinguish meanings that FOUR collapses", () => {
  const affirmed = omegaEvidence("2", "0"), denied = omegaEvidence("0", OMEGA);
  assert.deepEqual(omegaBinary("join", affirmed, denied, "knowledge"), ["2", OMEGA]);
  assert.deepEqual(omegaBinary("join", affirmed, denied, "truth"), ["2", "0"]);
  assert.deepEqual(omegaBinary("meet", affirmed, denied, "knowledge"), ["0", "0"]);
  assert.deepEqual(omegaBinary("meet", affirmed, denied, "truth"), ["0", OMEGA]);
  assert.equal(omegaSupportReading(omegaEvidence("2", OMEGA)), "stable");
  assert.equal(omegaSupportReading(omegaEvidence("999999999999999999", "0")), "potential");
  // Forgetting finite grades can lose an implication distinction: the
  // support projection is not an unrestricted Heyting-homomorphism.
  const oppositeGrades = omegaBinary("imply",
    omegaEvidence("0", "1"), omegaEvidence("0", "2"), "truth");
  assert.equal(oppositeGrades[1], "2");
  assert.equal(omegaSupportReading(oppositeGrades), "stable");
  assert.equal(truthImplyReading("active", "active"), "potential",
    "we must not claim the forgetful support read commutes with every operator");
});

test("residuated linear tensor is right-adjoint to its residual in the truth order", () => {
  const samples = ["0", "1", "2", "3", OMEGA];
  const points = samples.flatMap((p) => samples.map((n) => omegaEvidence(p, n)));
  for (const a of points) {
    assert.deepEqual(omegaLinearNot(omegaLinearNot(a)), a);
    assert.deepEqual(omegaBinary("tensor", a, omegaEvidence(OMEGA, OMEGA)), a);
    for (const b of points) for (const c of points) {
      assert.equal(
        omegaWithin("truth", omegaBinary("tensor", a, b), c),
        omegaWithin("truth", a, omegaBinary("lollipop", b, c)),
        "tensor/residuum adjunction fails: " + JSON.stringify([a,b,c]));
    }
  }
});

test("two Heyting implications are adjoint to their own meets, not to tensor", () => {
  const samples = ["0", "1", "2", OMEGA];
  const points = samples.flatMap(p => samples.map(n => omegaEvidence(p,n)));
  for (const order of ["knowledge", "truth"]) {
    for (const a of points) for (const b of points) for (const c of points) {
      assert.equal(
        omegaWithin(order, omegaBinary("meet", a, b, order), c),
        omegaWithin(order, a, omegaBinary("imply", b, c, order)),
        "Heyting adjunction failed on " + order);
    }
  }
});

test("quantification remains non-explosive and rejects unsupported claims", () => {
  const conflict = omegaEvidence("2", OMEGA);
  const unrelated = omegaEvidence();
  assert.deepEqual(omegaFold("some", "knowledge", [conflict, unrelated]), conflict);
  assert.deepEqual(omegaFold("all", "truth", [conflict, unrelated]), ["0", OMEGA]);
  assert.deepEqual(omegaFold("some", "knowledge", [unrelated, unrelated]), unrelated);
  assert.throws(() => omegaFold("all", "truth", []), /nonempty/u);
  assert.throws(() => omegaBinary("tensor", conflict, conflict, "truth"), /additional/u);
  assert.throws(() => omegaBinary("imply", conflict, conflict), /declared/u);
  assert.throws(() => omegaWithin("invalid", conflict, unrelated), /order/u);
  assert.throws(() => omegaBinary("shuffle", conflict, unrelated, "truth"), /unknown/u);
});
