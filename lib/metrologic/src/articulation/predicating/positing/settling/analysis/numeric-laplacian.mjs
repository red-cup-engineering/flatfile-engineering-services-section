/**
 * Pure finite conductance mathematics in binary64; integer indices only.
 * Exact integer/rational Laplacians remain in ./laplacian.mjs.
 *
 * These are numerical deductions, not proof receipts. In particular the
 * spectral quotient bounds distance to componentwise constants; it does not
 * identify that distance in general. See specifications/numeric-laplacian.md.
 */
const finite = value => typeof value === "number" && Number.isFinite(value);
const vector = value => Array.isArray(value) ||
  (ArrayBuffer.isView(value) && !(value instanceof DataView));

function copySymmetricMatrix(matrix, conductance = false) {
  if (!Array.isArray(matrix)) throw new TypeError("numerical matrix must be complete and square");
  const n = matrix.length;
  const copy = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    const row = matrix[i];
    if (!Object.hasOwn(matrix, i) || !vector(row) || row.length !== n)
      throw new TypeError("numerical matrix must be complete and square");
    for (let j = 0; j < n; j++) {
      if (!Object.hasOwn(row, j)) throw new TypeError("numerical matrix must be complete and square");
      const value = row[j];
      if (!finite(value) || (conductance && value < 0))
        throw new RangeError(conductance ? "conductance edge must be finite, symmetric and nonnegative" :
          "numerical matrix must be finite and symmetric");
      copy[i][j] = value;
    }
  }
  for (let i = 0; i < n; i++) {
    if (conductance && copy[i][i] !== 0) throw new RangeError("conductance diagonal must be zero");
    for (let j = i + 1; j < n; j++) if (copy[i][j] !== copy[j][i])
      throw new RangeError(conductance ? "conductance edge must be finite, symmetric and nonnegative" :
        "numerical matrix must be finite and symmetric");
  }
  return copy;
}

/** Admit and snapshot a finite, undirected, nonnegative adjacency matrix. */
export function copyConductanceMatrix(weights) {
  return copySymmetricMatrix(weights, true);
}

function copyValues(values, n) {
  if (!vector(values) || values.length !== n)
    throw new TypeError("numerical values must assign every vertex");
  const copy = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (!Object.hasOwn(values, i) || !finite(values[i]))
      throw new RangeError("numerical values must be complete and finite");
    copy[i] = values[i];
  }
  return copy;
}

function laplacianOfAdmitted(weights) {
  const n = weights.length;
  const result = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    let degree = 0;
    for (let j = 0; j < n; j++) if (i !== j) {
      degree += weights[i][j];
      result[i][j] = weights[i][j] === 0 ? 0 : -weights[i][j];
    }
    if (!finite(degree)) throw new RangeError("conductance Laplacian degree is not finite");
    result[i][i] = degree;
  }
  return result;
}

/** L = diag(W 1) - W, with finite Float64Array rows. */
export function numericLaplacian(weights) {
  return laplacianOfAdmitted(copyConductanceMatrix(weights));
}

function energyOfAdmitted(weights, values) {
  let total = 0, compensation = 0;
  for (let i = 0; i < weights.length; i++) for (let j = i + 1; j < weights.length; j++) {
    const weight = weights[i][j];
    if (weight === 0 || values[i] === values[j]) continue;
    const difference = values[i] - values[j];
    // This multiplication order preserves ordinary dyadic examples and does
    // not square a large difference before a small weight can reduce it.
    let term = weight * difference * difference;
    if (!finite(difference)) {
      const root = Math.sqrt(weight);
      const scaled = root * values[i] - root * values[j];
      term = scaled * scaled;
    }
    if (!finite(term) || term === 0)
      throw new RangeError("disagreement energy left the finite numerical carrier");
    const adjusted = term - compensation;
    const next = total + adjusted;
    compensation = (next - total) - adjusted;
    total = next;
    if (!finite(total)) throw new RangeError("disagreement energy left the finite numerical carrier");
  }
  return total;
}

/** E = sum_(i<j) W[i,j] (x[i]-x[j])^2, without cancellation through x^T L x. */
export function numericDirichletEnergy(weights, values) {
  const admitted = copyConductanceMatrix(weights);
  return energyOfAdmitted(admitted, copyValues(values, admitted.length));
}

function sweepBudget(options) {
  const maxSweeps = options?.maxSweeps ?? 64;
  if (!Number.isSafeInteger(maxSweeps) || maxSweeps < 0)
    throw new RangeError("Jacobi maxSweeps must be a nonnegative safe integer");
  return maxSweeps;
}

function normOf(matrix, offDiagonal = false) {
  let norm = 0;
  for (let i = 0; i < matrix.length; i++) for (let j = 0; j < matrix.length; j++)
    if (!offDiagonal || i !== j) norm = Math.hypot(norm, matrix[i][j]);
  return norm;
}

function scaledResult(value, scale) {
  const result = value * scale;
  if (!finite(result) || (value !== 0 && result === 0))
    throw new RangeError("numerical spectrum left the finite numerical carrier");
  return result === 0 ? 0 : result;
}

// Called only with a private admitted snapshot. Residuals are measured against
// the original normalized matrix, never the almost-diagonal working copy.
function jacobi(matrix, maxSweeps) {
  const n = matrix.length;
  let scale = 0;
  for (const row of matrix) for (const value of row) scale = Math.max(scale, Math.abs(value));
  if (scale === 0) return { values: Array(n).fill(0), resolution: 0 };
  const original = matrix.map(row => Float64Array.from(row, value => {
    const normalized = value / scale;
    if (value !== 0 && normalized === 0)
      throw new RangeError("numerical matrix normalization underflows binary64");
    return normalized;
  }));
  const A = original.map(row => row.slice());
  const Q = Array.from({ length: n }, (_, i) => Float64Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
  const norm = normOf(original);
  const target = 8 * Number.EPSILON * n * norm;
  let sweep = 0;
  while (normOf(A, true) > target) {
    if (sweep++ >= maxSweeps) throw new RangeError("numerical symmetric eigensolver did not converge");
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      const off = A[p][q];
      if (off === 0) continue;
      const halfDifference = (A[q][q] - A[p][p]) / 2;
      const denominator = halfDifference + (halfDifference < 0 ? -1 : 1) * Math.hypot(halfDifference, off);
      const t = off / denominator;
      const c = 1 / Math.hypot(1, t), s = t * c;
      const pp = A[p][p], qq = A[q][q];
      for (let k = 0; k < n; k++) {
        if (k !== p && k !== q) {
          const kp = A[k][p], kq = A[k][q];
          A[k][p] = A[p][k] = c * kp - s * kq;
          A[k][q] = A[q][k] = s * kp + c * kq;
        }
        const kp = Q[k][p], kq = Q[k][q];
        Q[k][p] = c * kp - s * kq;
        Q[k][q] = s * kp + c * kq;
      }
      A[p][p] = pp - t * off;
      A[q][q] = qq + t * off;
      A[p][q] = A[q][p] = 0;
    }
  }
  let residual = 0, orthogonality = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    let product = 0, inner = 0;
    for (let k = 0; k < n; k++) {
      product += original[i][k] * Q[k][j];
      inner += Q[k][i] * Q[k][j];
    }
    residual = Math.hypot(residual, product - Q[i][j] * A[j][j]);
    orthogonality = Math.hypot(orthogonality, inner - (i === j ? 1 : 0));
  }
  // A conservative numerical admission estimate, not an interval proof.
  const resolution = residual + norm * orthogonality + 32 * Number.EPSILON * n * norm;
  return {
    values: Array.from({ length: n }, (_, i) => scaledResult(A[i][i], scale)).sort((a, b) => a - b),
    resolution: resolution * scale,
  };
}

/** Ascending numerical eigenvalues of a finite symmetric matrix. */
export function symmetricEigenvalues(matrix, options) {
  return jacobi(copySymmetricMatrix(matrix), sweepBudget(options)).values;
}

function normalizedGraph(weights) {
  const n = weights.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const root = value => {
    while (parent[value] !== value) { parent[value] = parent[parent[value]]; value = parent[value]; }
    return value;
  };
  let scale = 0, components = n;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const weight = weights[i][j];
    if (weight > 0) {
      scale = Math.max(scale, weight);
      const left = root(i), right = root(j);
      if (left !== right) { parent[left] = right; components--; }
    }
  }
  const normalized = weights.map(row => Float64Array.from(row, weight => {
    const value = scale === 0 ? 0 : weight / scale;
    if (weight !== 0 && value === 0) throw new RangeError("conductance normalization underflows binary64");
    return value;
  }));
  return { weights: normalized, scale, components };
}

function gapOfNormalized(graph, maxSweeps) {
  const n = graph.weights.length;
  if (graph.components === n) return 0;
  const spectrum = jacobi(laplacianOfAdmitted(graph.weights), maxSweeps);
  const gap = spectrum.values[graph.components];
  const nullsResolved = spectrum.values.slice(0, graph.components).every(value => Math.abs(value) <= spectrum.resolution);
  if (!nullsResolved || !(gap > spectrum.resolution)) {
    const error = new RangeError("positive spectral gap unresolved at binary64 precision");
    error.code = "NUMERIC_SPECTRAL_GAP_UNRESOLVED";
    throw error;
  }
  return gap;
}

/** Least positive eigenvalue; zero only for a graph with no positive edges. */
export function numericSpectralGap(weights, options) {
  const graph = normalizedGraph(copyConductanceMatrix(weights));
  return scaledResult(gapOfNormalized(graph, sweepBudget(options)), graph.scale);
}

/**
 * Numerical sqrt(E/lambda+), an upper bound on Euclidean distance to the
 * componentwise-constant subspace in real arithmetic. Uniform conductance
 * scale cancels before any energy or gap is materialized in original units.
 */
export function numericRefusalBound(weights, values, options) {
  const admitted = copyConductanceMatrix(weights);
  const x = copyValues(values, admitted.length);
  const maxSweeps = sweepBudget(options);
  let differenceScale = 0;
  for (let i = 0; i < admitted.length; i++) for (let j = i + 1; j < admitted.length; j++) {
    if (admitted[i][j] === 0) continue;
    const difference = Math.abs(x[i] - x[j]);
    differenceScale = Math.max(differenceScale, finite(difference) ? difference : Math.max(Math.abs(x[i]), Math.abs(x[j])));
  }
  // This is a structural kernel test on the admitted original graph, not an
  // energy tolerance or an inference from unresolved numerical eigenvalues.
  if (differenceScale === 0) return 0;
  const graph = normalizedGraph(admitted);
  const gap = gapOfNormalized(graph, maxSweeps);
  let energy = 0, compensation = 0;
  for (let i = 0; i < x.length; i++) for (let j = i + 1; j < x.length; j++) {
    if (admitted[i][j] === 0 || x[i] === x[j]) continue;
    const difference = x[i] - x[j];
    const normalized = finite(difference) ? difference / differenceScale : x[i] / differenceScale - x[j] / differenceScale;
    const term = graph.weights[i][j] * normalized * normalized;
    if (!(term > 0) || !finite(term)) throw new RangeError("normalized disagreement energy left the finite numerical carrier");
    const adjusted = term - compensation, next = energy + adjusted;
    compensation = (next - energy) - adjusted;
    energy = next;
  }
  const result = differenceScale * Math.sqrt(energy / gap);
  if (!(result > 0) || !finite(result)) throw new RangeError("refusal bound left the finite numerical carrier");
  return result;
}
