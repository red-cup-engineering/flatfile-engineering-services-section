import { samePoint } from "@red-cup-engineering/computer-data-services-section/four";
// adjoints — property tests for the quantifier-adjunction on RANDOM finite morphisms and fibers, at
// both orders. `reindex ⊣ existsAlong` and `forallAlong ⊣ reindex` are the defining property of a
// hyperdoctrine's quantifiers; each check runs many random trials over random-sized index sets and
// random-valued fibers and passes only if the adjunction holds on all of them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { KNOWLEDGE, TRUTH } from "../../src/hyperdoctrine/order.mjs";
import { reindex, existsAlong, forallAlong, leqFiber } from "../../src/hyperdoctrine/adjoints.mjs";
import { keys, randFiber, randMorphism, randInt } from "./_fixtures.mjs";

const N = 60;
const orders = [KNOWLEDGE, TRUTH];
const trial = () => {
  const J = keys(2 + randInt(3), "j"), I = keys(2 + randInt(3), "i");
  const u = randMorphism(J, I);
  return { J, I, u, w: randFiber(J), v: randFiber(I) };
};

test("adjoint: exists_u(w) ≤ v  iff  w ≤ u*(v)  (knowledge and truth)", () => {
  for (const order of orders) {
    for (let n = 0; n < N; n++) {
      const { J, I, u, w, v } = trial();
      const forward = leqFiber(existsAlong(u, w, order), v, I, order);
      const backward = leqFiber(w, reindex(u, v), J, order);
      assert.equal(forward, backward, `order=${order}`);
    }
  }
});

test("adjoint: v ≤ forall_u(w)  iff  u*(v) ≤ w  (knowledge and truth)", () => {
  for (const order of orders) {
    for (let n = 0; n < N; n++) {
      const { J, I, u, w, v } = trial();
      const forward = leqFiber(v, forallAlong(u, w, order), I, order);
      const backward = leqFiber(reindex(u, v), w, J, order);
      assert.equal(forward, backward, `order=${order}`);
    }
  }
});

test("reindex: pullback lands exactly on target's values along u", () => {
  for (let n = 0; n < N; n++) {
    const { J, I, u, v } = trial();
    const pulled = reindex(u, v);
    assert.ok(J.every((j) => {
      const p = pulled.get(j), t = v.get(u.map(j));
      return samePoint(p, t);
    }));
  }
});

test("existsAlong/forallAlong: a target key with no preimage reads ⊥/⊤ respectively", () => {
  const u = { source: ["j0"], target: ["i0", "i1"], map: () => "i0" };
  const w = new Map([["j0", "potential"]]);
  const ex = existsAlong(u, w, KNOWLEDGE);
  const fa = forallAlong(u, w, KNOWLEDGE);
  assert.equal(ex.get("i1"), "absurd"); // ⊥ — nothing witnessed at the unhit target key
  assert.equal(fa.get("i1"), "stable"); // ⊤ — vacuously
});
