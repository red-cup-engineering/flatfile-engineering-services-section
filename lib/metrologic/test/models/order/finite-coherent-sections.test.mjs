import test from "node:test";
import assert from "node:assert/strict";
import {
  finitePreorder, admitUpperOpen, finiteCoherentSectionSpace,
  finitePrefixIncidenceFactors,
} from "../../../src/models/order/finite-preorder.mjs";

// Enumerate relations directly, and admit only reflexive/transitive ones.
// The oracle neither calls the graph reachability implementation nor counts
// components: it enumerates all assignments and checks pairwise coherence.
function threePointPreorders() {
  const relations = [];
  for (let bits = 0; bits < 1 << 9; bits++) {
    const le = (i, j) => (bits & (1 << (3 * i + j))) !== 0;
    if (![0, 1, 2].every(i => le(i, i))) continue;
    let transitive = true;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++)
        if (le(i, j) && le(j, k) && !le(i, k)) transitive = false;
    if (transitive) relations.push(le);
  }
  return relations;
}

function assignments(fibers, points) {
  let result = [[]];
  for (const point of points)
    result = result.flatMap(values => fibers[point].map(value => [...values, value]));
  return result;
}

test("coherent sections equal direct assignments on every three-point preorder and binary fiber", t => {
  const relations = threePointPreorders();
  let cases = 0;
  for (const le of relations) {
    const arrows = [0, 1, 2].flatMap(i => [0, 1, 2].filter(j => le(i, j)).map(j => [i, j]));
    const frame = finitePreorder(3, arrows);
    for (let mask = 0; mask < 8; mask++) {
      const points = [0, 1, 2].filter(i => (mask & (1 << i)) !== 0);
      const open = points.every(i => [0, 1, 2].every(j => !le(i, j) || points.includes(j)));
      if (!open) {
        assert.throws(() => admitUpperOpen(frame, points), /every admitted successor/);
        continue;
      }
      assert.deepEqual(admitUpperOpen(frame, points), points);
      for (let fiberBits = 0; fiberBits < 64; fiberBits++) {
        const fibers = [0, 1, 2].map(i => [0, 1].filter(v => (fiberBits & (1 << (2 * i + v))) !== 0));
        const expected = assignments(fibers, points).filter(values =>
          points.every((p, i) => points.every((q, j) => !le(p, q) || values[i] === values[j])));
        const actual = finiteCoherentSectionSpace(frame, fibers, points);
        assert.equal(actual.possibleSections, String(expected.length));
        assert.deepEqual(actual.pointIndices, points);
        cases++;
      }
    }
  }
  assert.equal(relations.length, 29);
  t.diagnostic(`${cases} finite cases; this is exhaustive for three points and two source coordinates only`);
});

test("empty regions, disconnected choices, and incompatible connected fibers retain distinct section counts", () => {
  assert.equal(finiteCoherentSectionSpace(finitePreorder(0), [], []).possibleSections, "1");
  const chain = finitePreorder(2, [[0, 1]]);
  assert.equal(finiteCoherentSectionSpace(chain, [[0], [1]], [0, 1]).possibleSections, "0");
  assert.equal(finiteCoherentSectionSpace(chain, [[0], [1]], [1]).possibleSections, "1");
  const isolated = finitePreorder(60);
  const result = finiteCoherentSectionSpace(isolated, Array.from({ length: 60 }, () => [0, 1]),
    Array.from({ length: 60 }, (_, i) => i));
  assert.equal(result.possibleSections, (2n ** 60n).toString());
  assert.equal(Object.isFrozen(result.components[0].sourcePairIndices), true);
});

test("section admission refuses unqualified frames, missing fibers and noncanonical source coordinates", () => {
  const frame = finitePreorder(2, [[0, 1]]);
  assert.throws(() => finiteCoherentSectionSpace({ size: 2 }, [[0], [0]], [0, 1]), /admit a frame/);
  assert.throws(() => finiteCoherentSectionSpace(frame, [[0]], [1]), /one fiber/);
  for (const invalid of [[1, 0], [0, 0], [-1], [0.5], [Number.MAX_SAFE_INTEGER + 1], [undefined], new Array(1)])
    assert.throws(() => finiteCoherentSectionSpace(frame, [invalid, [0]], [1]), /canonical sorted/);
  assert.throws(() => finiteCoherentSectionSpace(frame, new Array(2), []), /canonical sorted/);
  assert.throws(() => admitUpperOpen(frame, [0]), /every admitted successor/);
});

function words(alphabetSize, length) {
  let result = [[]];
  for (let i = 0; i < length; i++)
    result = result.flatMap(prefix => Array.from({ length: alphabetSize }, (_, k) => [...prefix, k]));
  return result;
}

test("prefix factors reconstruct every entry of independent small dense incidence tensors", t => {
  let cases = 0;
  for (let n = 1; n <= 5; n++) for (let p = 1; p <= 3; p++) for (const upper of words(n, p)) {
    const actual = finitePrefixIncidenceFactors(upper, n);
    let expectedNonzero = 0;
    for (let locus = 0; locus < p; locus++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const expected = Number(i <= upper[locus] && j <= upper[locus]);
      const reconstructed = actual.exactFiniteFactorization.reduce((sum, factor) => sum + Number(
        factor.pointIndices.includes(locus) && i < factor.sourcePrefixLength && j < factor.sourcePrefixLength), 0);
      assert.equal(reconstructed, expected);
      expectedNonzero += expected;
    }
    assert.equal(actual.nonzeroIncidences, String(expectedNonzero));
    assert.equal(actual.denseEquivalentPositions, String(p * n * n));
    assert.ok(actual.cpRankUpperBound <= Math.min(p, n));
    cases++;
  }
  t.diagnostic(`${cases} finite dense tensors; displayed terms are a rank upper bound, not a minimal-rank theorem`);
});

test("finite prefix carrier bounds and missing coordinates refuse instead of inventing source positions", () => {
  const maximal = finitePrefixIncidenceFactors(Array(512).fill(31), 32);
  assert.equal(maximal.nonzeroIncidences, "524288");
  assert.equal(maximal.displayedCpTerms, 1);
  assert.equal(Object.isFrozen(maximal.exactFiniteFactorization[0].pointIndices), true);
  for (const [upper, count] of [[[], 1], [[0], 0], [[0], 33], [[1], 1], [[-1], 1],
    [[0.5], 1], [Array(513).fill(0), 1], [[undefined], 1], [new Array(1), 1]])
    assert.throws(() => finitePrefixIncidenceFactors(upper, count), /finite prefix incidence/);
});
