import test from 'node:test';
import assert from 'node:assert/strict';
import { fromCount, toCount, natAdd, natMultiply, natDivmod, fromInt, toInt, intDivmod, fromRatio, ratAdd, toNumber, fromInts, determinant, rank, charPoly } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { extensionOf } from '@red-cup-engineering/metrologic/number/natural-extension';

test('one number carrier supplies arithmetic and inspectable membership', () => {
  const three = fromCount(3), two = fromCount(2);
  assert.equal(toCount(natAdd(three, two)), 5);
  assert.equal(toCount(natMultiply(three, two)), 6);
  assert.deepEqual(Object.fromEntries(Object.entries(natDivmod(three, two)).map(([k, v]) => [k, toCount(v)])), { quotient: 1, remainder: 1 });
  assert.equal(extensionOf(three).length, 3);
  assert.equal(extensionOf(fromCount(0)).length, 0);
  assert.equal(toInt(intDivmod(fromInt(-7), fromInt(3)).remainder), -1);
  assert.equal(toNumber(ratAdd(fromRatio(1, 3), fromRatio(1, 6))), 0.5);
});

test('matrix consumers share exact determinant, rank, and characteristic polynomial', () => {
  const matrix = fromInts([[2, 1], [1, 2]]);
  assert.equal(toInt(determinant(matrix)), 3);
  assert.equal(toCount(rank(matrix)), 2);
  assert.deepEqual(charPoly(matrix).map(toInt), [3, -4, 1]);
});
