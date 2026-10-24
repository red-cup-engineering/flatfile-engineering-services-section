import test from "node:test";
import assert from "node:assert/strict";
import { fromInts, fromInt, toInt, toCount } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { colimStructure, substitutionDual, stepNInvariant } from "../src/models/dynamics/substitution/index.mjs";
import { mutuallyLocallyDerivable } from "../src/models/dynamics/substitution/mld.mjs";
import { hullSeam } from "../src/models/dynamics/substitution/hull.mjs";

test("diag(2,3) preserves its presentation and withholds determinant localization", () => {
  const matrix = [[fromInt(2), fromInt(0)], [fromInt(0), fromInt(3)]];
  const result = colimStructure(matrix);
  assert.equal(toCount(result.rank), 2);
  assert.equal(toInt(result.det), 6);
  assert.deepEqual(result.smith.map(toInt), [1, 6]);
  assert.equal(result.module.kind, "substitution.dynamics.moduleClassification-obstruction");
  assert.equal(result.module.reason, "unsupported-stationary-direct-limit");
  assert.equal(result.module.invertedPrimes, undefined);
  assert.deepEqual(result.presentation.matrix.map(row => row.map(toInt)), [[2, 0], [0, 3]]);
  matrix[0][0] = fromInt(7);
  assert.equal(toInt(result.presentation.matrix[0][0]), 2);
  assert.ok(Object.isFrozen(result.presentation.matrix[0]));
  // The exact witness is arithmetic, not a finite attempt to prove an infinite
  // absence: 2*n is even and 3^k is odd for every integer n and natural k.
  // Thus (0,1) has no half in Z[1/2] + Z[1/3], unlike Z[1/6]^2.
});

test("named unimodular and rank-one examples retain their justified modules", () => {
  const cases = [
    ["fibonacci", [[1, 1], [1, 0]], 2, []],
    ["padovan", [[0, 1, 1], [1, 0, 0], [0, 1, 0]], 3, []],
    ["tribonacci", [[1, 1, 1], [1, 0, 0], [0, 1, 0]], 3, []],
    ["tetranacci", [[1, 1, 1, 1], [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]], 4, []],
    ["thue-morse", [[1, 1], [1, 1]], 1, [2]],
    ["nilpotent", [[0, 1], [0, 0]], 0, []],
  ];
  for (const [name, input, rank, primes] of cases) {
    const matrix = fromInts(input), result = colimStructure(matrix);
    assert.equal(result.module.kind, "substitution.dynamics.localizedIntegerModule", name);
    assert.equal(toCount(result.module.rank), rank, name);
    assert.deepEqual(result.module.invertedPrimes.map(toInt), primes, name);
    assert.equal(substitutionDual(matrix).duality.kind, "substitution.dynamics.colimDuality:witness", name);
    assert.equal(mutuallyLocallyDerivable(matrix, matrix).kind, "substitution.dynamics.mld:witness", name);
  }
});

test("unknown classification propagates through duality, finite comparison and hull seam", () => {
  const matrix = fromInts([[2, 0], [0, 3]]);
  const dual = substitutionDual(matrix);
  assert.equal(dual.duality.kind, "substitution.dynamics.colimDuality-obstruction");
  assert.equal(dual.duality.reason, "unsupported-stationary-direct-limit");
  const comparison = mutuallyLocallyDerivable(matrix, matrix);
  assert.equal(comparison.kind, "substitution.dynamics.mld-obstruction");
  assert.equal(comparison.reason, "unsupported-stationary-direct-limit");
  assert.equal(stepNInvariant(matrix).module.kind, "substitution.dynamics.moduleClassification-obstruction");
  assert.deepEqual(hullSeam(matrix).presentation.matrix.map(row => row.map(toInt)), [[2, 0], [0, 3]]);
});
