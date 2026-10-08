import assert from "node:assert/strict";
import test from "node:test";

import * as associated from "../src/articulation/predicating/positing/settling/analysis/settling-associated-sheaf.mjs";
import * as harmonic from "../src/articulation/predicating/positing/settling/analysis/lawvere-harmonic-cohomology.mjs";
import * as hierarchy from "../src/articulation/predicating/positing/settling/analysis/algebra-hierarchy.mjs";
import * as fcaLambek from "../src/articulation/predicating/positing/settling/analysis/fca-lambek-circle.mjs";
import * as exactNumber from "@red-cup-engineering/exact-number-data-service/exact-number";
import { laws, twoBooleanResiduatedLattice } from "../src/articulation/predicating/positing/settling/analysis/residuated-lattice.mjs";
import { finiteSet, directedGraph, directedHandshakeReceipt, topologicalDagReceipt } from "../src/articulation/predicating/positing/settling/analysis/discrete-set-number-graph.mjs";
import { finitePoset, monotoneMap, topologyReceipt } from "../src/articulation/predicating/positing/settling/analysis/alexandrov-husainov.mjs";
import { completeLattice, booleanOrderSystem, distributiveLattice, booleanLatticeSystem, finitePreorderSystem, partialOrder } from "../src/articulation/predicating/positing/settling/analysis/order-infra.mjs";
import { graded, gradedAdd } from "@red-cup-engineering/exact-number-data-service/graded";
import { shannonEntropy, topologicalEntropy } from "../src/articulation/predicating/positing/settling/analysis/information.mjs";


test("associated sheaf support profiles agree with all four charge masks", () => {
  const s = associated;
  for (const [name, expected] of Object.entries({
    absurd: [false, false, false], potential: [true, true, false],
    active: [false, false, false], stable: [false, true, true],
  })) {
    const value = [s.readingCell("potential", name)];
    assert.deepEqual([s.dT(value), s.dK(value), s.dTop(value)].map((mask) => mask.cells.includes("potential")), expected);
  }
  assert.deepEqual(s.cochain([{cell:"__proto__",coefficient:2},{cell:"__proto__",coefficient:-1}]).coefficients, [{cell:"__proto__",coefficient:1}]);
});

test("harmonic receipts retain charge names and truth-firing counts", () => {
  const h = harmonic;
  for (const [name, count] of Object.entries({absurd:1,potential:1,active:0,stable:0})) {
    const seed = {kind:"flow.valuation",cells:["potential"],values:{potential:name}};
    const result = h.receipt(seed);
    assert.equal(result.seed, seed);
    assert.equal(result.h0TruthFiringCount, count);
    assert.equal(result.settled.values.potential, count ? "potential" : "stable");
  }
});

test("exact matrix arithmetic retains Smith factors, determinant and rank", () => {
  const exact = exactNumber;
  const matrix = exact.fromInts([[4, 0], [0, 6]]);
  assert.deepEqual(exact.smithNormalForm(matrix).map(exact.toInt), [2, 12]);
  assert.equal(exact.toInt(exact.determinant(matrix)), 24);
  assert.equal(exact.toCount(exact.rank(exact.fromInts([[2, 4], [4, 8]]))), 1);
  assert.throws(() => exact.fromCount(-1), RangeError);
});

test("algebra hierarchy retains witnesses", () => {
  assert.equal(hierarchy.algebraHierarchy().kind, "algebraHierarchy.receipt:witness");
});

test("FCA preserves closure and finite-size errors", () => {
  const fca = fcaLambek;
  const context = fca.workedContext;
  const closed = fca.closeExtent(context, ["a", "b"]);
  assert.deepEqual(fca.closeExtent(context, closed), closed);
  assert.equal(fca.circle(context, twoBooleanResiduatedLattice).kind, "fcaLambek.circle:witness");
  const receipt = fca.formalConceptAnalysisReceipt();
  assert.equal(receipt.closeAIdempotent, true);
  assert.equal(Object.isFrozen(receipt), true);
  const large = fca.finiteFcaContext(Array.from({ length: 17 }, (_, index) => ({ subject: String(index), predicate: "p" })));
  assert.throws(() => fca.circle(large, twoBooleanResiduatedLattice), { name: "RangeError", message: /finite context.*exceeds max size 16/u });
  assert.throws(() => fca.formalConceptAnalysisReceipt(large), { name: "RangeError", message: /finite context.*exceeds max size 16/u });
});


test("shared finite sets and graphs preserve exact string labels", () => {
  const universe = ["a\0b", "c", "a", "b\0c", "__proto__"];
  const set = finiteSet(universe, ["__proto__", "a"]);
  assert.equal(set.kind, "discrete.set.carrier");
  assert.deepEqual(set.members, ["a", "__proto__"]);
  const g = directedGraph(universe, [[universe[0], universe[1]], [universe[2], universe[3]]]);
  assert.equal(g.kind, "discrete.graph.directed.carrier");
  assert.equal(g.edges.length, 2);
  assert.equal(directedHandshakeReceipt(g).sumOutdegree, 2);
  const order = Object.fromEntries(universe.map((v, i) => [v, i]));
  assert.equal(topologicalDagReceipt(g, order).order.__proto__, 4);
  assert.throws(() => topologicalDagReceipt(g, Object.create(order)), TypeError);
  assert.throws(() => finiteSet(["a", "a"], []), TypeError);
});

test("shared Alexandrov operators preserve point tuples and reject inherited maps", () => {
  const points = ["a\0b", "c", "__proto__"];
  const p = finitePoset(points, [[points[0], points[1]]]);
  assert.equal(p.leq.length, 4);
  assert.ok(p.leq.every((pair) => pair.length === 2));
  const identity = Object.fromEntries(points.map((point) => [point, point]));
  assert.deepEqual(monotoneMap(p, p, identity).map, identity);
  assert.throws(() => monotoneMap(p, p, Object.create(identity)), TypeError);
  assert.equal(topologyReceipt(p).specializationRecoversOrder, true);
});

test("finite order and residuation retain witnesses and obstructions", () => {
  assert.equal(completeLattice(booleanOrderSystem).kind, "orderInfra.completeLattice:witness");
  assert.equal(distributiveLattice(booleanLatticeSystem).kind, "orderInfra.distributiveLattice:witness");
  const invalid = finitePreorderSystem(["a", "b"], [[true, true], [true, true]]);
  assert.equal(partialOrder(invalid).reason, "antisymmetry");
  assert.equal(laws(twoBooleanResiduatedLattice).kind, "residuatedLattice.laws:witness");
});

test("graded arithmetic rejects cross-sector sums and information preserves entropy", () => {
  const exact = exactNumber;
  const first = graded(exact.fromRatio(1, 2), "mass");
  assert.equal(exact.ratEqual(gradedAdd(first, first).value, exact.ratOne), true);
  assert.throws(() => gradedAdd(first, graded(exact.ratOne, "time")), /grade mismatch/u);
  assert.equal(shannonEntropy([1, 1]), 1);
  assert.equal(topologicalEntropy(exact.fromInts([[1, 0], [0, 1]])), 0);
});
