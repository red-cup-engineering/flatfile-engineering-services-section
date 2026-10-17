/**
 * Pure finite-vector allocation over exact natural-number resource coordinates.
 *
 * The number of dimensions and lots is determined by the caller's data, not
 * by library policy. Search cost is independently supplied as maxSearchNodes:
 * an optional POSITIVE safe integer budget of explored decision-tree nodes.
 * Omitted means exhaustive mathematical search, which a network/execution
 * boundary must never offer to arbitrary callers without its own budget.
 *
 * Search always starts with a feasible value-positive packing. A completed
 * search establishes the optimum and all optimal choices' multiplicity;
 * a partially explored search has unknown multiplicity and never claims a
 * theorem/receipt/authorization. No NI, provider, money or office rules live here.
 *
 * The benefit representation is exact while it fits a JavaScript safe integer;
 * callers needing larger naturals should supply a BigInt benefit to an exact-Nat
 * API, rather than passing a rounded JavaScript number as purported evidence.
 */
function admit({ capacities, requests, benefits, maxSearchNodes } = {}) {
  if (!Array.isArray(capacities) || capacities.length === 0 ||
      !Array.isArray(requests) || requests.length === 0 ||
      !Array.isArray(benefits) || requests.length !== benefits.length)
    throw new TypeError("finite vector allocation requires aligned nonempty capacity, request and benefit arrays");
  const natural = n => typeof n === "bigint" && n >= 0n;
  if (!capacities.every(natural) ||
      !requests.every(row => Array.isArray(row) && row.length === capacities.length && row.every(natural)))
    throw new TypeError("finite vector allocation requires nonnegative BigInt resource coordinates");
  if (maxSearchNodes !== undefined &&
      (!Number.isSafeInteger(maxSearchNodes) || maxSearchNodes < 1))
    throw new TypeError("maxSearchNodes must be a positive exactly representable search budget");
  let sum = 0;
  for (const value of benefits) {
    if (!Number.isSafeInteger(value) || value < 0 || sum > Number.MAX_SAFE_INTEGER - value)
      throw new TypeError("benefits must be exact nonnegative safe integers (no rounded values)");
    sum += value;
  }
  return { capacities, requests, benefits, maxSearchNodes };
}

/* Tail-first chirality: among value ties prefer an unselected earlier lot.
   Original mathematical subset order is fixed by input position, not by the
   benefit-sorted traversal order used to find high-value incumbents quickly. */
function earlierTailFirst(candidate, incumbent, count) {
  const chosen = new Set(candidate), held = new Set(incumbent);
  for (let i = 0; i < count; i++) {
    if (chosen.has(i) !== held.has(i)) return !chosen.has(i);
  }
  return false;
}

export function solveFiniteVectorCapacity(input = {}) {
  const { capacities, requests, benefits, maxSearchNodes } = admit(input);
  const numberOfLots = benefits.length;
  const available = capacities.map((capacity, index) =>
    requests.reduce((sum, vector) => sum + vector[index], 0n) <= capacity);

  // If every lot fits, the optimum is immediate; zero-value lots are
  // optional and change tie multiplicity without changing benefit.
  if (available.every(Boolean)) {
    const selectedIndexes = Object.freeze(benefits.flatMap((value, i) => value > 0 ? [i] : []));
    const used = capacities.map((_, d) =>
      selectedIndexes.reduce((sum, i) => sum + requests[i][d], 0n));
    const totalBenefit = benefits.reduce((sum, x) => sum + x, 0);
    return Object.freeze({
      selectedIndexes, used: Object.freeze(used),
      remaining: Object.freeze(capacities.map((capacity, d) => capacity - used[d])),
      totalBenefit, exact: true,
      tieCount: benefits.every(x => x > 0) ? 1 : null,
      choiceBits: benefits.every(x => x > 0) ? 0 : null,
      visitedNodes: 0, searchLimitNodes: maxSearchNodes ?? null, searchTruncated: false,
    });
  }

  const affordable = benefits.flatMap((value, i) =>
    value > 0 && requests[i].every((amount, d) => amount <= capacities[d]) ? [i] : []);
  if (affordable.length === 0) {
    return Object.freeze({
      selectedIndexes: Object.freeze([]), used: Object.freeze(capacities.map(() => 0n)),
      remaining: Object.freeze([...capacities]), totalBenefit: 0, exact: true,
      tieCount: benefits.every(value => value > 0) ? 1 : null,
      choiceBits: benefits.every(value => value > 0) ? 0 : null,
      visitedNodes: 0, searchLimitNodes: maxSearchNodes ?? null, searchTruncated: false,
    });
  }
  const ordered = [...affordable].sort((a, b) => benefits[b] - benefits[a] || a - b);
  const suffix = Array(ordered.length + 1).fill(0);
  for (let i = ordered.length - 1; i >= 0; i--)
    suffix[i] = suffix[i + 1] + benefits[ordered[i]];

  let remainder = [...capacities], best = [], bestValue = 0;
  for (const index of ordered) {
    if (!requests[index].every((quantity, dimension) => quantity <= remainder[dimension])) continue;
    remainder = remainder.map((quantity, dimension) => quantity - requests[index][dimension]);
    best.push(index);
    bestValue += benefits[index];
  }

  // Explicit stack: the old recursive search silently imposed a host call-
  // stack depth limit even when the caller supplied enough computation budget.
  const work = [{ position: 0, remaining: [...capacities], value: 0, selected: [] }];
  let visitedNodes = 0, truncated = false, ties = 0;
  while (work.length > 0) {
    if (maxSearchNodes !== undefined && visitedNodes >= maxSearchNodes) {
      truncated = true;
      break;
    }
    const state = work.pop();
    visitedNodes++;
    if (state.value + suffix[state.position] < bestValue) continue;

    if (state.position === ordered.length) {
      if (state.value > bestValue) {
        bestValue = state.value;
        best = state.selected;
        ties = 1;
      } else if (state.value === bestValue) {
        ties++;
        if (earlierTailFirst(state.selected, best, numberOfLots)) best = state.selected;
      }
      continue;
    }
    const index = ordered[state.position];
    // Stack is LIFO: examine including this lot before excluding it, but
    // select the tail-first best separately from traversal order.
    work.push({
      position: state.position + 1, remaining: state.remaining,
      value: state.value, selected: state.selected,
    });
    const requested = requests[index];
    if (requested.every((quantity, d) => quantity <= state.remaining[d])) {
      work.push({
        position: state.position + 1,
        remaining: state.remaining.map((quantity, d) => quantity - requested[d]),
        value: state.value + benefits[index],
        selected: [...state.selected, index],
      });
    }
  }

  const selectedIndexes = Object.freeze([...best].sort((a, b) => a - b));
  const used = capacities.map(() => 0n);
  for (const i of selectedIndexes)
    for (let d = 0; d < capacities.length; d++)
      used[d] += requests[i][d];
  const tieCount = !truncated && benefits.every(x => x > 0) ? ties : null;
  return Object.freeze({
    selectedIndexes, used: Object.freeze(used),
    remaining: Object.freeze(capacities.map((capacity, d) => capacity - used[d])),
    totalBenefit: bestValue, exact: !truncated,
    tieCount, choiceBits: tieCount === null ? null : Math.log2(tieCount),
    visitedNodes, searchLimitNodes: maxSearchNodes ?? null, searchTruncated: truncated,
  });
}
