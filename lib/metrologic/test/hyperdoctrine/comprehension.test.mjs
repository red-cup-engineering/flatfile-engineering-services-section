// comprehension — Lawvere's adjunction `Ext ⊣ {·}`: `Ext(S) ≤ φ` iff `S ⊆ {i : φ(i)}`. Property-tested
// on RANDOM finite index sets, random supports, and random fibers at both orders — the proof witness
// voidmath's prove-predication-hyperdoctrine-comprehension.mjs stated over its predicate-category
// fibers, here stated directly over the hyperdoctrine's general finite fibration.
import { test } from "node:test";
import assert from "node:assert/strict";
import { KNOWLEDGE, TRUTH, designated } from "../../src/hyperdoctrine/order.mjs";
import { leqFiber } from "../../src/hyperdoctrine/adjoints.mjs";
import { comprehend, extend } from "../../src/hyperdoctrine/comprehension.mjs";
import { keys, randFiber, randInt } from "./_fixtures.mjs";

const N = 80;
const orders = [KNOWLEDGE, TRUTH];
const subsetOf = (all) => all.filter(() => randInt(2) === 0);

test("comprehension: Ext(S) ≤ φ  iff  S ⊆ {i : φ(i)}  (knowledge and truth)", () => {
  for (const order of orders) {
    for (let n = 0; n < N; n++) {
      const I = keys(2 + randInt(4), "i");
      const S = subsetOf(I);
      const phi = randFiber(I);

      const extended = extend(S, I, order);
      const locus = new Set(comprehend(phi, I, order));

      const holds = leqFiber(extended, phi, I, order);
      const subset = S.every((s) => locus.has(s));
      assert.equal(holds, subset, `order=${order}, S=${JSON.stringify(S)}`);
    }
  }
});

test("comprehend: selects exactly the cells reading at the order's designated value", () => {
  const I = keys(4, "i");
  const phi = randFiber(I);
  const locus = comprehend(phi, I, KNOWLEDGE);
  assert.ok(locus.every((k) => designated(phi.get(k), KNOWLEDGE)));
  assert.ok(I.filter((k) => !locus.includes(k)).every((k) => !designated(phi.get(k), KNOWLEDGE)));
});

test("extend: outside the support reads ⊥ (nothing witnessed there)", () => {
  const extended = extend(["i0"], ["i0", "i1"], KNOWLEDGE);
  assert.equal(extended.get("i0"), "stable"); // ⊤ — the designated value, witnessed
  assert.equal(extended.get("i1"), "absurd"); // ⊥ — not in the support
});

test("extend: rejects a support key outside the declared universe", () => {
  assert.throws(() => extend(["i2"], ["i0", "i1"], KNOWLEDGE), TypeError);
});
