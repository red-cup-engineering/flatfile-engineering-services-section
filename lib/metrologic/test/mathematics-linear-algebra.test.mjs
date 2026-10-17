import assert from "node:assert/strict";
import test from "node:test";

import { squareMatrixInvariants } from "../src/articulation/predicating/positing/settling/analysis/linear-algebra.mjs";
import { laplacianOfWeights, isHarmonicOfWeights, componentCountOfWeights, treeCountOfWeights } from "../src/articulation/predicating/positing/settling/analysis/laplacian.mjs";
import { fromInts, toCount, toInt } from "@red-cup-engineering/exact-number-data-service/exact-number";

test("linear-algebra runtime returns finite matrix receipts", () => {
  const matrix = fromInts([[1, 0], [0, 1]]);
  const receipt = squareMatrixInvariants(matrix);
  assert.equal(toInt(receipt.determinant), 1);
  assert.equal(toCount(receipt.rank), 2);
  assert.deepEqual(receipt.characteristicPolynomial.map(toInt), [1, -2, 1]);
});

test("reflexive adjacency does not produce artificial Laplacian mass", () => {
  // From the source-owned law Lf(x) = sum_y w(x,y)(f(x)-f(y)),
  // a reflexive incidence has zero boundary and zero contribution.
  const withLoops = fromInts([[5, 2], [2, 3]]);
  const withoutLoops = fromInts([[0, 2], [2, 0]]);
  const integers = matrix => matrix.map(row => row.map(toInt));
  assert.deepEqual(integers(laplacianOfWeights(withLoops)), [[2, -2], [-2, 2]]);
  assert.deepEqual(integers(laplacianOfWeights(withLoops)), integers(laplacianOfWeights(withoutLoops)));
  assert.equal(isHarmonicOfWeights(withLoops, fromInts([[7, 7]])[0]), true);
  assert.equal(toCount(componentCountOfWeights(withLoops)), 1);
  assert.equal(toInt(treeCountOfWeights(withLoops)), 2);

  // Reflexive links cannot turn two isolated cells into a connected pair.
  const isolatedLoops = fromInts([[5, 0], [0, 3]]);
  assert.deepEqual(integers(laplacianOfWeights(isolatedLoops)), [[0, 0], [0, 0]]);
  assert.equal(toCount(componentCountOfWeights(isolatedLoops)), 2);
  assert.equal(toInt(treeCountOfWeights(isolatedLoops)), 0);
});
