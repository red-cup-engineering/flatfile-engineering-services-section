// Exhaustive finite qualification of the existing FOUR hyperdoctrine.
// These are finite counterexample-search receipts, not universal Lean proofs.
import test from "node:test";
import assert from "node:assert/strict";
import { readingFamilies, samePoint } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { KNOWLEDGE, TRUTH } from "../../src/hyperdoctrine/order.mjs";
import { finiteIndexMorphismFromTable } from "../../src/hyperdoctrine/morphism.mjs";
import { reindex, existsAlong, forallAlong, meetFiber, leqFiber, pullbackSquare } from "../../src/hyperdoctrine/adjoints.mjs";

const choices = (values, length) => length === 0 ? [[]]
  : choices(values, length - 1).flatMap(prefix => values.map(value => [...prefix, value]));
const valuations = keys => choices(readingFamilies.knowledge, keys.length)
  .map(values => new Map(keys.map((key, i) => [key, values[i]])));
const morphisms = (source, target) => choices(target, source.length)
  .map(images => finiteIndexMorphismFromTable(source, target,
    Object.fromEntries(source.map((key, i) => [key, images[i]]))));
const sameFiber = (a, b, keys) => keys.every(key => samePoint(a.get(key), b.get(key)));
const J = ["j\u0000p", "j"], I = ["q", "p\u0000q"], L = ["t0", "t1"];
const orders = [KNOWLEDGE, TRUTH];

test("all source/target carriers through two positions satisfy both FOUR adjunctions and Frobenius", () => {
  let configurations = 0;
  for (const order of orders)
  for (let sourceSize = 0; sourceSize <= 2; sourceSize++)
  for (let targetSize = 0; targetSize <= 2; targetSize++) {
    const source = J.slice(0, sourceSize), target = I.slice(0, targetSize);
    for (const u of morphisms(source, target))
    for (const phi of valuations(source))
    for (const psi of valuations(target)) {
      const pulled = reindex(u, psi);
      const existential = existsAlong(u, phi, order);
      const universal = forallAlong(u, phi, order);
      assert.equal(leqFiber(existential, psi, target, order),
        leqFiber(phi, pulled, source, order), "exists is left adjoint");
      assert.equal(leqFiber(pulled, phi, source, order),
        leqFiber(psi, universal, target, order), "forall is right adjoint");
      const lhs = existsAlong(u, meetFiber(pulled, phi, source, order), order);
      const rhs = meetFiber(psi, existential, target, order);
      assert.ok(sameFiber(lhs, rhs, target), "Frobenius reciprocity");
      configurations++;
    }
  }
  assert.equal(configurations, 2506);
});

test("all two-position pullback squares preserve both FOUR quantifiers, including empty fibers and NUL names", () => {
  let configurations = 0;
  for (const order of orders)
  for (let sourceSize = 0; sourceSize <= 2; sourceSize++)
  for (let otherSize = 0; otherSize <= 2; otherSize++)
  for (let targetSize = 0; targetSize <= 2; targetSize++) {
    const source = J.slice(0, sourceSize);
    const other = I.slice(0, otherSize);
    const target = L.slice(0, targetSize);
    for (const f of morphisms(source, target))
    for (const g of morphisms(other, target)) {
      const { K, p, q } = pullbackSquare(f, g);
      assert.equal(new Set(K).size, K.length, "every ordered original pair has a distinct local key");
      for (const position of K)
        assert.equal(f.map(p.map(position)), g.map(q.map(position)), "original pullback commutes");
      for (const phi of valuations(other)) {
        const local = reindex(q, phi);
        assert.ok(sameFiber(existsAlong(p, local, order),
          reindex(f, existsAlong(g, phi, order)), source), "Beck–Chevalley exists");
        assert.ok(sameFiber(forallAlong(p, local, order),
          reindex(f, forallAlong(g, phi, order)), source), "Beck–Chevalley forall");
        configurations++;
      }
    }
  }
  assert.equal(configurations, 1150);
});
