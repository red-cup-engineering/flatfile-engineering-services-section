import { maximizeFiniteSubsets } from "./finite-subset.mjs";

/**
 * Finite-vector capacity selection over independent natural-number coordinates.
 *
 * This knows no content addresses, source rights, currency, actors, transport,
 * execution effects or institution. Each coordinate is a mathematical natural.
 * At <=16 lots the exact tail-first subset solver gives the complete tie set.
 * Above that, an all-fitting strictly beneficial universe is uniquely optimal;
 * otherwise a bounded branch-and-bound search either proves the optimum or
 * returns a feasible incumbent with exact:false and UNKNOWN tie entropy.
 *
 * No externally supplied work is authorized by being selected here.
 */
const MAX_EXHAUSTIVE = 16;
const MAX_WORK_LOTS = 512;
const MAX_DIMENSIONS = 24;
const DEFAULT_SEARCH_NODES = 100_000;
const MAX_ALLOWED_SEARCH_NODES = 1_000_000;

function admit({ capacities, requests, benefits, maxSearchNodes = DEFAULT_SEARCH_NODES } = {}) {
  if (!Array.isArray(capacities) || capacities.length < 1 || capacities.length > MAX_DIMENSIONS ||
      !Array.isArray(requests) || requests.length < 1 || requests.length > MAX_WORK_LOTS ||
      !Array.isArray(benefits) || requests.length !== benefits.length)
    throw new RangeError("finite vector capacity requires 1..24 dimensions and 1..512 aligned lots");
  const natural = value => typeof value === "bigint" && value >= 0n;
  if (!capacities.every(natural) || !requests.every(row =>
      Array.isArray(row) && row.length === capacities.length && row.every(natural)))
    throw new TypeError("finite vector capacity requires nonnegative BigInt coordinate amounts");
  if (!Number.isSafeInteger(maxSearchNodes) || maxSearchNodes < 1 || maxSearchNodes > MAX_ALLOWED_SEARCH_NODES)
    throw new RangeError("finite vector search budget must be 1..1000000 nodes");
  let benefitSum = 0;
  for (const value of benefits) {
    if (!Number.isSafeInteger(value) || value < 0 ||
        benefitSum > Number.MAX_SAFE_INTEGER - value)
      throw new RangeError("finite vector capacity requires safe natural benefits and aggregate");
    benefitSum += value;
  }
  return { capacities, requests, benefits, maxSearchNodes };
}

function exactSmall(capacities, requests, benefits) {
  const optimum = maximizeFiniteSubsets(benefits.length, mask => {
    const used = capacities.map(() => 0n);
    let benefit = 0;
    for (let i = 0; i < benefits.length; i++) {
      if ((mask & (1 << i)) === 0) continue;
      benefit += benefits[i];
      for (let d = 0; d < capacities.length; d++) {
        used[d] += requests[i][d];
        if (used[d] > capacities[d]) return null;
      }
    }
    return benefit;
  });
  return {
    selected: benefits.flatMap((_, i) => (optimum.mask & (1 << i)) !== 0 ? [i] : []),
    benefit: optimum.value,
    exact: true,
    ties: optimum.tieCount,
    visitedNodes: 2 ** benefits.length,
    searchTruncated: false,
  };
}

function searchLarge(capacities, requests, benefits, maxSearchNodes) {
  const n = benefits.length;
  const affordable = benefits.flatMap((benefit, i) =>
    benefit > 0 && requests[i].every((amount, d) => amount <= capacities[d]) ? [i] : []);
  const allFit = capacities.every((capacity, d) =>
    requests.reduce((sum, vector) => sum + vector[d], 0n) <= capacity);

  if (allFit) {
    return { selected: affordable, benefit: benefits.reduce((sum, value) => sum + value, 0),
      exact: true, ties: affordable.length === n ? 1 : null,
      visitedNodes: 0, searchTruncated: false };
  }
  if (affordable.length === 0) {
    return { selected: [], benefit: 0, exact: true,
      ties: benefits.every(value => value > 0) ? 1 : null,
      visitedNodes: 0, searchTruncated: false };
  }

  // Exact branch-and-bound until a finite work budget. Benefit-sorted
  // traversal finds a useful incumbent early. Unlike a greedy-only choice,
  // completing this search proves optimum value. A truncated search never
  // borrows solveL's theorem or invents its unseen tie multiplicity.
  const ordered = [...affordable].sort((a, b) => benefits[b] - benefits[a] || a - b);
  const suffix = Array(ordered.length + 1).fill(0);
  for (let i = ordered.length - 1; i >= 0; i--)
    suffix[i] = suffix[i+1] + benefits[ordered[i]];
  let bestBenefit = 0, best = [], nodes = 0, truncated = false;
  const chosen = [];
  function visit(position, remaining, gained) {
    if (nodes >= maxSearchNodes) { truncated = true; return; }
    nodes++;
    if (gained + suffix[position] <= bestBenefit) return;
    if (position === ordered.length) {
      if (gained > bestBenefit) { bestBenefit = gained; best = [...chosen]; }
      return;
    }
    const index = ordered[position], vector = requests[index];
    if (vector.every((amount,d) => amount <= remaining[d])) {
      chosen.push(index);
      visit(position + 1, remaining.map((amount,d) => amount - vector[d]),
        gained + benefits[index]);
      chosen.pop();
    }
    if (!truncated) visit(position + 1, remaining, gained);
  }
  visit(0, capacities, 0);
  return {
    selected: best, benefit: bestBenefit,
    exact: !truncated, ties: null,
    visitedNodes: nodes, searchTruncated: truncated,
  };
}

export function solveFiniteVectorCapacity(source = {}) {
  const { capacities, requests, benefits, maxSearchNodes } = admit(source);
  const result = requests.length <= MAX_EXHAUSTIVE && 2 ** requests.length <= maxSearchNodes
    ? exactSmall(capacities, requests, benefits)
    : searchLarge(capacities, requests, benefits, maxSearchNodes);
  const selectedIndexes = Object.freeze([...result.selected].sort((a,b)=>a-b));
  const used = capacities.map(() => 0n);
  for (const index of selectedIndexes)
    for (let d = 0; d < capacities.length; d++)
      used[d] += requests[index][d];
  return Object.freeze({
    selectedIndexes,
    used: Object.freeze(used),
    remaining: Object.freeze(capacities.map((amount,d) => amount-used[d])),
    totalBenefit: result.benefit,
    exact: result.exact,
    tieCount: result.ties,
    choiceBits: result.ties === null ? null : Math.log2(result.ties),
    visitedNodes: result.visitedNodes,
    searchLimitNodes: maxSearchNodes,
    searchTruncated: result.searchTruncated,
  });
}
