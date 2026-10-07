import assert from "node:assert/strict";
import test from "node:test";

import { squareMatrixInvariants } from "../src/articulation/predicating/positing/settling/analysis/linear-algebra.mjs";
import { fromInts, toCount, toInt } from "@red-cup-engineering/computer-data-engineering-services-section/number/exact-number";

test("linear-algebra runtime returns finite matrix receipts", () => {
  const matrix = fromInts([[1, 0], [0, 1]]);
  const receipt = squareMatrixInvariants(matrix);
  assert.equal(toInt(receipt.determinant), 1);
  assert.equal(toCount(receipt.rank), 2);
  assert.deepEqual(receipt.characteristicPolynomial.map(toInt), [1, -2, 1]);
});
