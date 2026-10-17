/**
 * One exact finite-subset selection kernel for pure mathematical optimizers.
 *
 * A source-derived ordered family of n distinguishable alternatives has
 * 2^n subsets. The callback reads only a mask and returns its numeric value
 * or null when infeasible. Enumeration is tail-first, matching Obsmetrologia
 * Cohomology.Attention.subs / solveL; benefit ties retain the first feasible
 * optimum. A selector cannot assert external authority, money, settlement,
 * or the truth of a witness by returning a number.
 *
 * Float score comparisons are strict JS numeric comparisons; proofs over
 * natural numbers must be attached by a *qualified caller*, not here.
 */
const reverseMask = (ordinal, n) => {
  let bits = ordinal;
  bits = ((bits >>> 1) & 0x55555555) | ((bits & 0x55555555) << 1);
  bits = ((bits >>> 2) & 0x33333333) | ((bits & 0x33333333) << 2);
  bits = ((bits >>> 4) & 0x0f0f0f0f) | ((bits & 0x0f0f0f0f) << 4);
  bits = ((bits >>> 8) & 0x00ff00ff) | ((bits & 0x00ff00ff) << 8);
  bits = (bits >>> 16) | (bits << 16);
  return bits >>> (32 - n);
};

export function maximizeFiniteSubsets(count, measure) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 20)
    throw new RangeError("finite-subset selection requires 1..20 candidates");
  if (typeof measure !== "function")
    throw new TypeError("finite-subset selection requires a pure feasibility/value function");
  let value = -Infinity, mask = 0, tieCount = 0;
  for (let ordinal = 0; ordinal < 2 ** count; ordinal++) {
    const candidate = reverseMask(ordinal, count);
    const score = measure(candidate);
    if (score === null) continue;
    if (typeof score !== "number" || !Number.isFinite(score))
      throw new TypeError("finite-subset measure must return finite value or null");
    if (score > value) {
      value = score;
      mask = candidate;
      tieCount = 1;
    } else if (score === value) {
      tieCount++;
    }
  }
  if (tieCount === 0)
    throw new RangeError("finite-subset selection has no feasible subset");
  return Object.freeze({
    mask,
    value,
    tieCount,
    choiceBits: Math.log2(tieCount),
  });
}
