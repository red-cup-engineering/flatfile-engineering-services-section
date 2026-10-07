// Frobenius reciprocity — the theorem that follows from `reindex ⊣ existsAlong`:
//   ∃_u(u*(v) ⊓ w) = v ⊓ ∃_u(w)
// for any fiber `v` over `u`'s target and `w` over `u`'s source. Property-tested on RANDOM finite
// morphisms and fibers at both orders — the proof witness voidmath's
// prove-predication-fiber-frobenius.mjs stated over its predicate-category fibers, here stated directly
// over the hyperdoctrine's general finite fibration.
import { test } from "node:test";
import assert from "node:assert/strict";
import { KNOWLEDGE, TRUTH, sameValue } from "../../src/hyperdoctrine/order.mjs";
import { reindex, existsAlong, meetFiber } from "../../src/hyperdoctrine/adjoints.mjs";
import { keys, randFiber, randMorphism, randInt } from "./_fixtures.mjs";

const N = 60;
const orders = [KNOWLEDGE, TRUTH];
const sameFiber = (a, b, ks) => ks.every((k) => sameValue(a.get(k), b.get(k)));

test("Frobenius reciprocity: exists_u(u*(v) ⊓ w) = v ⊓ exists_u(w)  (knowledge and truth)", () => {
  for (const order of orders) {
    for (let n = 0; n < N; n++) {
      const J = keys(2 + randInt(3), "j"), I = keys(2 + randInt(3), "i");
      const u = randMorphism(J, I);
      const v = randFiber(I), w = randFiber(J);

      const lhs = existsAlong(u, meetFiber(reindex(u, v), w, J, order), order);
      const rhs = meetFiber(v, existsAlong(u, w, order), I, order);

      assert.ok(sameFiber(lhs, rhs, I), `order=${order}`);
    }
  }
});
