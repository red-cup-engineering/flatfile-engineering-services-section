import {
  conflateReading,
  isReading,
  knowledgeJoinReading,
  knowledgeMeetReading,
  negateReading,
  readingAs,
  readingFamilies,
  readingOfSides,
  samePoint,
  sidesOfReading,
  truthJoinReading,
  truthMeetReading,
} from "@red-cup-engineering/computer-data-services-section/four";
// laws — property tests for the bilattice value-ops, on RANDOM charges run through the real morphisms. These
// assert algebraic LAWS that must hold for every input (lattice axioms, involutions, the σ-conjugation, evidence
// monotonicity) — not hand-built inputs forcing a chosen output. Each check runs many random trials and passes
// only if the law holds on all of them.
//
// Ported from @561/development.active.math-kernel's tests/laws.mjs (25 checks), retargeted at
// @red-cup-engineering/metrologic/bilattice's named exports (../src/charge.mjs) instead of the kernel's one-morphism-per-file
// scripts/, and reshaped from the kernel's `check(name, pass)` accumulator into discrete node:test cases so
// `node --test` reports each law on its own line. The math is unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const N = 80;
const V = (reading) => sidesOfReading(reading).map(Number).join(""); // the FOUR value, as a 2-bit string
const rbool = () => (randomBytes(1)[0] & 1) === 1;
const rand = () => readingOfSides("knowledge", rbool(), rbool());
const times = (n, f) => { for (let i = 0; i < n; i++) f(); };
const jk = knowledgeJoinReading, mk = knowledgeMeetReading, jt = truthJoinReading, mt = truthMeetReading;
const sigma = (reading) => {
  const [forTold, againstTold] = sidesOfReading(reading);
  return readingOfSides("knowledge", forTold, !againstTold);
}; // the order-swap (flip the negative side)

const ops = [["joinK", jk], ["meetK", mk], ["joinT", jt], ["meetT", mt]];

for (const [nm, op] of ops) {
  test(`law: ${nm} commutative (value)`, () => {
    times(N, () => { const a = rand(), b = rand(); assert.equal(V(op(a, b)), V(op(b, a))); });
  });
  test(`law: ${nm} associative (value)`, () => {
    times(N, () => { const a = rand(), b = rand(), c = rand(); assert.equal(V(op(op(a, b), c)), V(op(a, op(b, c)))); });
  });
  test(`law: ${nm} idempotent (value)`, () => {
    times(N, () => { const a = rand(); assert.equal(V(op(a, a)), V(a)); });
  });
}

test("law: knowledge absorption joinK(a, meetK(a,b)) = a (value)", () => {
  times(N, () => { const a = rand(), b = rand(); assert.equal(V(jk(a, mk(a, b))), V(a)); });
});
test("law: truth absorption joinT(a, meetT(a,b)) = a (value)", () => {
  times(N, () => { const a = rand(), b = rand(); assert.equal(V(jt(a, mt(a, b))), V(a)); });
});

test("law: negate is an involution", () => {
  times(N, () => { const a = rand(); assert.equal(V(negateReading(negateReading(a))), V(a)); });
});
test("law: conflate is an involution (value)", () => {
  times(N, () => { const a = rand(); assert.equal(V(conflateReading(conflateReading(a))), V(a)); });
});
test("law: negate & conflate commute (Klein four)", () => {
  times(N, () => { const a = rand(); assert.equal(V(negateReading(conflateReading(a))), V(conflateReading(negateReading(a)))); });
});
test("law: conflate reverses ≤_k — swaps absurd↔stable, fixes potential/active", () => {
  times(N, () => {
    const a = rand(), c = conflateReading(a);
    const want = sidesOfReading(a).slice().reverse().map((side) => !side);
    assert.equal(V(c), `${+want[0]}${+want[1]}`);
  });
});

test("law: joinT = σ∘joinK∘σ (value)", () => {
  times(N, () => { const a = rand(), b = rand(); assert.equal(V(jt(a, b)), V(sigma(jk(sigma(a), sigma(b))))); });
});
test("law: meetT = σ∘meetK∘σ (value)", () => {
  times(N, () => { const a = rand(), b = rand(); assert.equal(V(mt(a, b)), V(sigma(mk(sigma(a), sigma(b))))); });
});

test("reading admission accepts exactly the knowledge-family names", () => {
  for (const name of readingFamilies.knowledge) assert.equal(isReading(name, "knowledge"), true);
  for (const value of [null, undefined, false, 0, "potential"]) {
    assert.equal(isReading(value, value === "potential" ? "truth" : "knowledge"), false);
  }
});

// notation vocabulary bridge — relation-model-notation names the same FOUR bilattice points the
// Belnap way (unknown/held/denied/contested); these two functions are the one place a caller
// crosses between that vocabulary and this module's own (absurd/potential/active/stable).
const NOTATION_TO_CHARGE_VALUE_NAME = Object.freeze({
  unknown: "absurd",
  held: "potential",
  denied: "active",
  contested: "stable",
});

for (const [notationName, name] of Object.entries(NOTATION_TO_CHARGE_VALUE_NAME)) {
  test(`readingAs: ${notationName} -> ${name}`, () => {
    assert.equal(readingAs("knowledge", notationName), name);
  });
  test(`readingAs: ${name} -> ${notationName}`, () => {
    assert.equal(readingAs("extremal", name), notationName);
  });
}

test("readingAs rejects anything outside the four reading families", () => {
  for (const value of ["absurd", "potential", "active", "stable", "", "Held", 0, null, undefined]) {
    if (!readingFamilies.knowledge.includes(value)) assert.throws(() => readingAs("knowledge", value), TypeError);
  }
  for (const value of ["unknown", "held", "denied", "contested", "", "Potential", 0, null, undefined]) {
    if (!readingFamilies.extremal.includes(value)) assert.throws(() => readingAs("extremal", value), TypeError);
  }
});

test("readingAs round-trips knowledge and extremal names", () => {
  for (const [notationName, name] of Object.entries(NOTATION_TO_CHARGE_VALUE_NAME)) {
    assert.ok(samePoint(readingAs("extremal", readingAs("knowledge", notationName)), notationName));
    assert.ok(samePoint(readingAs("knowledge", readingAs("extremal", name)), name));
  }
});
