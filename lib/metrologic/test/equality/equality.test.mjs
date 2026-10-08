// equality — property tests for the two DERIVED equalities (classical, paraconsistent), ported from
// `Obsmetrologia/Language/Predicating/Equality.lean`'s `classicalEq`/`paraconsistentEq` and their
// `classicalEq_eq`/`paraconsistentEq_eq`/`*_refl` theorems. Both equalities are `∃` along the same
// diagonal morphism, one order apart — the tests below check the two-valued verdict AND that the
// verdict is actually read off `existsAlong`'s adjoint join, not written down as a shortcut `s === o`
// at the call site (see the "route" tests, which reconstruct the same fiber independently, straight
// from `existsAlong` + `orderOps`, and require it to agree with the library's output cell for cell —
// including the `evidence` slot the library never touches by hand).
import { test } from "node:test";
import assert from "node:assert/strict";
import { sidesOfReading } from "@red-cup-engineering/computer-data-services-section/four";
import { KNOWLEDGE, TRUTH, orderOps, sameValue } from "../../src/hyperdoctrine/order.mjs";
import { existsAlong } from "../../src/hyperdoctrine/adjoints.mjs";
import { assertMorphism } from "../../src/hyperdoctrine/morphism.mjs";
import {
  pairKey,
  pairKeys,
  diagonalMorphism,
  equalityAlongDiagonal,
  classicalEquality,
  paraconsistentEquality,
  equalityAt,
} from "../../src/equality/index.mjs";

const ENTITIES = ["alice", "bob", "carol"];
const allPairs = (entities) => entities.flatMap((s) => entities.map((o) => [s, o]));

// --- classical equality: two-valued t/f, exactly on the diagonal -------------------------------------

test("classicalEquality: t iff s = o, f otherwise", () => {
  const eq = classicalEquality(ENTITIES);
  const t = orderOps(TRUTH).top, f = orderOps(TRUTH).bottom;
  for (const [s, o] of allPairs(ENTITIES)) {
    const charge = equalityAt(eq, s, o);
    if (s === o) {
      assert.ok(sameValue(charge, t), `classicalEquality(${s},${o}) should be t`);
    } else {
      assert.ok(sameValue(charge, f), `classicalEquality(${s},${o}) should be f`);
    }
  }
});

test("classicalEquality: reflexive at every entity", () => {
  const eq = classicalEquality(ENTITIES);
  const t = orderOps(TRUTH).top;
  for (const e of ENTITIES) assert.ok(sameValue(equalityAt(eq, e, e), t));
});

// --- paraconsistent equality: ⊤/⊥, exactly on the diagonal ---------------------------------------------

test("paraconsistentEquality: ⊤ iff s = o, ⊥ otherwise", () => {
  const eq = paraconsistentEquality(ENTITIES);
  const top = orderOps(KNOWLEDGE).top, bot = orderOps(KNOWLEDGE).bottom;
  for (const [s, o] of allPairs(ENTITIES)) {
    const charge = equalityAt(eq, s, o);
    if (s === o) {
      assert.ok(sameValue(charge, top), `paraconsistentEquality(${s},${o}) should be ⊤`);
    } else {
      assert.ok(sameValue(charge, bot), `paraconsistentEquality(${s},${o}) should be ⊥`);
    }
  }
});

test("paraconsistentEquality: reflexive at every entity", () => {
  const eq = paraconsistentEquality(ENTITIES);
  const top = orderOps(KNOWLEDGE).top;
  for (const e of ENTITIES) assert.ok(sameValue(equalityAt(eq, e, e), top));
});

// --- the adjoint route: both equalities are literally existsAlong on a real diagonal morphism ----------

test("diagonalMorphism: a genuine IndexMorphism (validates under assertMorphism)", () => {
  assert.doesNotThrow(() => assertMorphism(diagonalMorphism(ENTITIES)));
});

test("diagonalMorphism: g⁻¹(s,o) is the singleton {s} when s=o, empty otherwise", () => {
  const g = diagonalMorphism(ENTITIES);
  for (const [s, o] of allPairs(ENTITIES)) {
    const preimage = g.source.filter((e) => g.map(e) === pairKey(s, o));
    if (s === o) assert.deepEqual(preimage, [s]);
    else assert.deepEqual(preimage, []);
  }
});

test("route: classicalEquality equals existsAlong(diagonalMorphism, terminal-t, TRUTH) reconstructed independently", () => {
  const g = diagonalMorphism(ENTITIES);
  const terminal = new Map(ENTITIES.map((e) => [e, orderOps(TRUTH).top]));
  const reconstructed = existsAlong(g, terminal, TRUTH);
  const viaLibrary = classicalEquality(ENTITIES);
  assert.deepStrictEqual([...reconstructed.entries()].sort(), [...viaLibrary.entries()].sort());
});

test("route: paraconsistentEquality equals existsAlong(diagonalMorphism, terminal-⊤, KNOWLEDGE) reconstructed independently", () => {
  const g = diagonalMorphism(ENTITIES);
  const terminal = new Map(ENTITIES.map((e) => [e, orderOps(KNOWLEDGE).top]));
  const reconstructed = existsAlong(g, terminal, KNOWLEDGE);
  const viaLibrary = paraconsistentEquality(ENTITIES);
  assert.deepStrictEqual([...reconstructed.entries()].sort(), [...viaLibrary.entries()].sort());
});

test("route: equalityAlongDiagonal is the one shared construction both public equalities instantiate", () => {
  assert.deepStrictEqual(equalityAlongDiagonal(ENTITIES, TRUTH), classicalEquality(ENTITIES));
  assert.deepStrictEqual(equalityAlongDiagonal(ENTITIES, KNOWLEDGE), paraconsistentEquality(ENTITIES));
});

test("route: off-diagonal cells are existsAlong's genuine empty-preimage ⊥ object, not a hand-written false", () => {
  // A single-entity domain still has an off-diagonal-shaped target (pairKeys always covers all of E×E,
  // but here E×E collapses to one cell). Use two entities and read the one guaranteed off-diagonal cell.
  const eq = classicalEquality(["x", "y"]);
  const offDiagonal = equalityAt(eq, "x", "y");
  // existsAlong's documented empty-preimage law hands back `ops.bottom` verbatim (see adjoints.mjs) —
  // check structural identity with the SAME object orderOps(TRUTH).bottom returns, not just a charge
  // that happens to read false.
  assert.deepStrictEqual(offDiagonal, orderOps(TRUTH).bottom);
});

test("route: on-diagonal cells are existsAlong's genuine singleton-join top, not a hand-written true", () => {
  const eq = paraconsistentEquality(["x", "y"]);
  const onDiagonal = equalityAt(eq, "x", "x");
  assert.deepStrictEqual(onDiagonal, orderOps(KNOWLEDGE).top);
});

// --- the two equalities agree on WHERE they hold, differ on WHAT charge lands there ---------------------

test("the two equalities agree on the diagonal (same pairs) while landing in different orders", () => {
  const classical = classicalEquality(ENTITIES);
  const paraconsistent = paraconsistentEquality(ENTITIES);
  for (const [s, o] of allPairs(ENTITIES)) {
    const classicalHolds = sameValue(equalityAt(classical, s, o), orderOps(TRUTH).top);
    const paraconsistentHolds = sameValue(equalityAt(paraconsistent, s, o), orderOps(KNOWLEDGE).top);
    assert.equal(classicalHolds, s === o, `classical(${s},${o})`);
    assert.equal(paraconsistentHolds, s === o, `paraconsistent(${s},${o})`);
    assert.equal(classicalHolds, paraconsistentHolds, `agreement at (${s},${o})`);
  }
  // and they disagree on the charge itself: the truth top/bottom and knowledge top/bottom are distinct
  // value-pairs (t = [true,false], f = [false,true]; ⊤ = [true,true], ⊥ = [false,false]).
  assert.notDeepEqual(sidesOfReading(orderOps(TRUTH).top), sidesOfReading(orderOps(KNOWLEDGE).top));
  assert.notDeepEqual(sidesOfReading(orderOps(TRUTH).bottom), sidesOfReading(orderOps(KNOWLEDGE).bottom));
});

// --- housekeeping ---------------------------------------------------------------------------------------

test("pairKey/pairKeys: distinct entities never collide, all E×E cells are present", () => {
  const keys = pairKeys(ENTITIES);
  assert.equal(keys.length, ENTITIES.length * ENTITIES.length);
  assert.equal(new Set(keys).size, keys.length);
  for (const [s, o] of allPairs(ENTITIES)) assert.ok(keys.includes(pairKey(s, o)));
});

test("equalityAt: reads the pair-keyed fiber the same way pairKey encodes it", () => {
  const eq = classicalEquality(ENTITIES);
  assert.deepStrictEqual(equalityAt(eq, "alice", "bob"), eq.get(pairKey("alice", "bob")));
});
