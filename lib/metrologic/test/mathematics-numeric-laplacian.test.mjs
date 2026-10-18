import test from "node:test";
import assert from "node:assert/strict";
import {
  copyConductanceMatrix, numericLaplacian, numericDirichletEnergy,
  symmetricEigenvalues, numericSpectralGap, numericRefusalBound,
} from "../src/articulation/predicating/positing/settling/analysis/numeric-laplacian.mjs";

const pair = weight => [[0, weight], [weight, 0]];
const close = (actual, expected, relative = 2e-13) =>
  assert.ok(Math.abs(actual - expected) <= relative * Math.abs(expected),
    String(actual) + " differs from " + String(expected));
const unresolved = error => error instanceof RangeError && error.code === "NUMERIC_SPECTRAL_GAP_UNRESOLVED";

test("two-vertex spectrum and refusal retain their analytic value across conductance scales", () => {
  for (const weight of [Number.MIN_VALUE, 1e-200, 1e-20, 1e-10, 1, 1e20, 1e200]) {
    const weights = pair(weight);
    assert.equal(numericDirichletEnergy(weights, [0, 1]), weight);
    assert.equal(numericSpectralGap(weights), 2 * weight);
    assert.deepEqual(symmetricEigenvalues(numericLaplacian(weights)), [0, 2 * weight]);
    assert.equal(numericRefusalBound(weights, [0, 1]), Math.SQRT1_2);
  }
});

test("path and triangle spectra follow independently known graph spectra", () => {
  for (const weight of [1e-200, 1, 1e200]) {
    const path = [[0, weight, 0], [weight, 0, weight], [0, weight, 0]];
    const triangle = [[0, weight, weight], [weight, 0, weight], [weight, weight, 0]];
    const pathSpectrum = symmetricEigenvalues(numericLaplacian(path));
    assert.ok(Math.abs(pathSpectrum[0]) < weight * 1e-13);
    close(pathSpectrum[1], weight);
    close(pathSpectrum[2], 3 * weight);
    close(numericSpectralGap(path), weight);
    close(numericSpectralGap(triangle), 3 * weight);
    // x=[1,0,-1] is the path's lambda=weight mode, with distance sqrt(2).
    close(numericRefusalBound(path, [1, 0, -1]), Math.SQRT2);
    // A different mode has distance sqrt(6), while sqrt(E/lambda+) is sqrt(18).
    close(numericRefusalBound(path, [1, -2, 1]), Math.sqrt(18));
  }
});

test("positive-edge components determine exact nullity, including isolated vertices", () => {
  const weights = [
    [0, 3, 0, 0, 0], [3, 0, 0, 0, 0], [0, 0, 0, 0.5, 0],
    [0, 0, 0.5, 0, 0], [0, 0, 0, 0, 0],
  ];
  close(numericSpectralGap(weights), 1);
  assert.equal(numericDirichletEnergy(weights, [7, 7, -2, -2, 100]), 0);
  assert.equal(numericRefusalBound(weights, [7, 7, -2, -2, 100]), 0);
  close(numericRefusalBound(weights, [1, 0, 0, 0, 100]), Math.sqrt(3));
  for (const empty of [[], [[0]], [[0, 0], [0, 0]]]) {
    const values = Array.from({ length: empty.length }, (_, i) => i);
    assert.equal(numericSpectralGap(empty), 0);
    assert.equal(numericRefusalBound(empty, values), 0);
  }
});

test("a weak connected bridge is refused instead of being deleted or skipped", () => {
  for (const scale of [1e-100, 1, 1e100]) {
    const weights = [[0, scale, 0], [scale, 0, scale * 1e-20], [0, scale * 1e-20, 0]];
    assert.throws(() => numericSpectralGap(weights), unresolved);
    assert.throws(() => numericRefusalBound(weights, [0, 0, 1]), unresolved);
    // Exact coherence is determined from edges even when the gap is unresolved.
    assert.equal(numericRefusalBound(weights, [5, 5, 5]), 0);
  }
});

test("edge energy stays nonnegative and preserves exact dyadic examples", () => {
  const weights = [[0, 2, 1], [2, 0, 0.5], [1, 0.5, 0]];
  for (const a of [-2, 0, 1, 2]) for (const b of [-2, 0, 1, 2]) for (const c of [-2, 0, 1, 2]) {
    const expected = 2 * (a - b) ** 2 + 0.5 * (b - c) ** 2 + (a - c) ** 2;
    assert.equal(numericDirichletEnergy(weights, [a, b, c]), expected);
  }
  assert.equal(numericDirichletEnergy(pair(1e300), [1, 1]), 0);
  assert.equal(numericDirichletEnergy(pair(0), [1e308, -1e308]), 0);
  close(numericDirichletEnergy(pair(1e-200), [0, 1e200]), 1e200);
  close(numericDirichletEnergy(pair(1e200), [0, 1e-200]), 1e-200);
  assert.ok(Number.isFinite(numericDirichletEnergy(pair(Number.MIN_VALUE), [1e308, -1e308])));
});

test("the quotient stays representable when raw energy or gap would not", () => {
  assert.throws(() => numericDirichletEnergy(pair(1), [0, 1e-200]), /finite numerical carrier/);
  assert.throws(() => numericDirichletEnergy(pair(1), [1e308, -1e308]), /finite numerical carrier/);
  assert.throws(() => numericSpectralGap(pair(1e308)), /finite numerical carrier/);
  close(numericRefusalBound(pair(1), [0, 1e-200]), Math.SQRT1_2 * 1e-200);
  close(numericRefusalBound(pair(1), [1e308, -1e308]), Math.SQRT2 * 1e308);
  assert.equal(numericRefusalBound(pair(1e308), [0, 1]), Math.SQRT1_2);
  assert.throws(() => numericLaplacian([[0, 1e308, 1e308], [1e308, 0, 0], [1e308, 0, 0]]), /degree is not finite/);
});

test("matrix and value admission reject malformed, nonfinite, signed and asymmetric carriers", () => {
  const malformed = [null, {}, new Float64Array(2), [[], []], Array(2), [[0, 1], [1]], [[0, 1], Array(2)]];
  for (const input of malformed) assert.throws(() => copyConductanceMatrix(input), /complete and square/);
  for (const weight of [-1, NaN, Infinity, -Infinity, "1"]) {
    assert.throws(() => numericLaplacian(pair(weight)), /finite, symmetric and nonnegative/);
    assert.throws(() => numericRefusalBound(pair(weight), [0, 1]), /finite, symmetric and nonnegative/);
  }
  assert.throws(() => numericDirichletEnergy([[0, 1], [2, 0]], [0, 1]), /finite, symmetric and nonnegative/);
  assert.throws(() => numericRefusalBound([[1, 0], [0, 0]], [0, 0]), /diagonal must be zero/);
  for (const values of [[], [0], [0, 1, 2], new Set([0, 1])])
    assert.throws(() => numericDirichletEnergy(pair(1), values), /assign every vertex/);
  for (const values of [Array(2), [0, NaN], [0, Infinity], [0, "1"], [0n, 1n]])
    assert.throws(() => numericRefusalBound(pair(1), values), /complete and finite/);
});

test("accepted typed rows and values are read without modifying caller state", () => {
  const weights = [new Float64Array([0, 2]), new Float64Array([2, 0])];
  const values = new Float64Array([0, 1]);
  const before = structuredClone({ weights, values });
  const copied = copyConductanceMatrix(weights);
  const L = numericLaplacian(weights);
  numericDirichletEnergy(weights, values);
  numericSpectralGap(weights);
  numericRefusalBound(weights, values);
  symmetricEigenvalues(L);
  copied[0][1] = 10;
  L[0][0] = 100;
  assert.deepEqual({ weights, values }, before);
});

test("symmetric solver handles general signs and refuses an unfinished solve", () => {
  assert.deepEqual(symmetricEigenvalues([[2, 1], [1, 2]]), [1, 3]);
  assert.deepEqual(symmetricEigenvalues([[-1, 2], [2, -1]]), [-3, 1]);
  assert.deepEqual(symmetricEigenvalues([[1, 0], [0, -2]], { maxSweeps: 0 }), [-2, 1]);
  assert.throws(() => symmetricEigenvalues([[2, 1], [1, 2]], { maxSweeps: 0 }), /did not converge/);
  assert.throws(() => numericRefusalBound(pair(1), [0, 1], { maxSweeps: 0 }), /did not converge/);
  assert.throws(() => symmetricEigenvalues([[1, 2], [3, 1]]), /finite and symmetric/);
  for (const maxSweeps of [-1, 1.5, Infinity, "64"])
    assert.throws(() => symmetricEigenvalues([[0]], { maxSweeps }), /nonnegative safe integer/);
});

test("normalization refuses a lost positive edge rather than manufacturing a new topology", () => {
  const weights = [[0, 1e308, 0], [1e308, 0, Number.MIN_VALUE], [0, Number.MIN_VALUE, 0]];
  assert.throws(() => numericSpectralGap(weights), /normalization underflows/);
  assert.throws(() => numericRefusalBound(weights, [0, 0, 1]), /normalization underflows/);
  assert.equal(numericRefusalBound(weights, [5, 5, 5]), 0);
});
