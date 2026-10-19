/**
 * Finite principal-past measured walls and Euclidean-angle shadows.
 *
 * Read ONLY an already generated finite strict order. An Obsmetrologia-derived
 * causal-diamond K(C) is one qualified source; bare input here is not proof of
 * source authority. No metric, clock, entanglement, spacetime, or angle is
 * postulated upstream of articulation and settling.
 *
 * P(x) = {z | z <= x}. The characteristic-vector map x -> 1_{P(x)} embeds the
 * finite generated order in a Hamming cube. Its squared Euclidean length is
 * |P(x) symmetric_difference P(y)|, also the unit past-wall metric.
 * This measure is a CHOICE of unit walls; a physical interpretation requires
 * independent information that this pure mathematical module cannot supply.
 */
const MAX_POINTS = 496; // max |K(C)| with 32 source causal events

function popcount32(bits) {
  bits -= (bits >>> 1) & 0x55555555;
  bits = (bits & 0x33333333) + ((bits >>> 2) & 0x33333333);
  return (((bits + (bits >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/**
 * Recover the unit principal-past wall metric on a topologically indexed
 * finite order. Precedence MUST be the full strict TRANSITIVE closure, not a
 * sparse cover relation. Cycles, duplicated, missing implied, and out-of-range
 * edges refuse instead of silently fabricating relation. All returned counts
 * are exact nonnegative JSON-safe integers; no physical unit is inferred.
 */
export function finitePastWallMetricOf({ pointCount, precedence } = {}) {
  if (!Number.isSafeInteger(pointCount) || pointCount < 0 || pointCount > MAX_POINTS)
    throw new RangeError("finite past-wall geometry requires 0.." + MAX_POINTS + " points");
  if (!Array.isArray(precedence) || precedence.length > pointCount * (pointCount - 1) / 2)
    throw new TypeError("finite past-wall geometry requires a bounded strict precedence array");
  const words = Math.ceil(pointCount / 32);
  const successors = new Uint32Array(pointCount * words);
  const pasts = new Uint32Array(pointCount * words);
  for (let i = 0; i < pointCount; i++)
    pasts[i * words + (i >>> 5)] |= 1 << (i & 31);
  for (const edge of precedence) {
    const { parent, child } = edge ?? {};
    if (!Number.isSafeInteger(parent) || !Number.isSafeInteger(child) ||
        parent < 0 || child >= pointCount || parent >= child)
      throw new TypeError("past-wall precedence must be a strict topological point pair");
    const offset = parent * words + (child >>> 5);
    const bit = 1 << (child & 31);
    if (successors[offset] & bit)
      throw new TypeError("duplicate finite past-wall precedence edge");
    successors[offset] |= bit;
    pasts[child * words + (parent >>> 5)] |= 1 << (parent & 31);
  }
  // A relation is transitively closed iff, for each a < b, Succ(b) ⊆ Succ(a).
  // This containment check deliberately does not invent a second closure.
  for (const { parent, child } of precedence)
    for (let word = 0; word < words; word++)
      if (successors[child * words + word] & ~successors[parent * words + word])
        throw new RangeError("past-wall precedence is not transitively closed");
  const principalPastPointIndices = Object.freeze(Array.from({ length: pointCount }, (_, i) => {
    const members = [];
    for (let z = 0; z < pointCount; z++)
      if (pasts[i * words + (z >>> 5)] & (1 << (z & 31))) members.push(z);
    return Object.freeze(members);
  }));
  const distanceCounts = Array.from({ length: pointCount }, () => Array(pointCount).fill(0));
  for (let i = 0; i < pointCount; i++) for (let j = i + 1; j < pointCount; j++) {
    let distance = 0;
    for (let word = 0; word < words; word++)
      distance += popcount32(pasts[i * words + word] ^ pasts[j * words + word]);
    distanceCounts[i][j] = distanceCounts[j][i] = distance;
  }
  return Object.freeze({
    kind: "metrologic.finitePastWallMetric.v1",
    pointCount,
    unit: "principal-past-separating-wall-count",
    principalPastPointIndices,
    distanceCounts: Object.freeze(distanceCounts.map(row => Object.freeze(row))),
  });
}

/**
 * Recover conventional Euclidean-angle cosine as a SHADOW of generated
 * cut incidence, NOT a physical or holographic angle. In the chosen Hamming
 * embedding, polarization gives the exact integer dot product:
 *   (d(v,a)+d(v,b)-d(a,b))/2.
 * Squared arm lengths and the rational cosine-squared numerator/denominator
 * are retained exactly; floating point is an OPTIONAL readout only.
 */
export function finitePastWallAngleOf(order, { vertex, first, second } = {}) {
  const metric = finitePastWallMetricOf(order);
  const n = metric.pointCount;
  for (const index of [vertex, first, second])
    if (!Number.isSafeInteger(index) || index < 0 || index >= n)
      throw new RangeError("past-wall angle references an unknown point");
  const squaredFirstArm = metric.distanceCounts[vertex][first];
  const squaredSecondArm = metric.distanceCounts[vertex][second];
  if (squaredFirstArm === 0 || squaredSecondArm === 0)
    throw new RangeError("past-wall angle requires two nonzero arms");
  const twiceDot = squaredFirstArm + squaredSecondArm - metric.distanceCounts[first][second];
  if (twiceDot % 2 !== 0)
    throw new Error("past-wall incidence polarization must have an integral dot product");
  const dotProduct = twiceDot / 2;
  const denominator = squaredFirstArm * squaredSecondArm;
  return Object.freeze({
    kind: "metrologic.finitePastWallEuclideanAngle.v1",
    vertex, first, second, dotProduct,
    squaredFirstArm, squaredSecondArm,
    cosineSquaredNumerator: dotProduct * dotProduct,
    cosineSquaredDenominator: denominator,
    cosineSign: Math.sign(dotProduct),
    cosineApproximation: dotProduct / Math.sqrt(denominator),
  });
}
