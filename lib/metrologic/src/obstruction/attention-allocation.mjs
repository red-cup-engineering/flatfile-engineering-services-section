import { solveFiniteVectorCapacity } from "../number/finite-capacity.mjs";

/**
 * Pure scalar attention selection using the SAME finite-vector optimization
 * machinery as any other natural capacity problem. Lots and budget are data,
 * not an implementation-specific maximum. A caller can provide maxSearchNodes;
 * when omitted, this mathematical read can search exhaustively. Effects and
 * publicly accessible consumers must impose their own resource policy.
 *
 * Lean's AttentionAllocation and AllocationSolver specify feasibility and
 * optimality; a JavaScript result is NOT a kernel-issued theorem receipt.
 */
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isSafeNat(value) {
  return Number.isSafeInteger(value) && value > 0;
}

const EMPTY_RESULT = Object.freeze({
  funded: Object.freeze([]),
  totalCost: 0,
  totalBenefit: 0,
  consideredCount: 0,
  fundedCount: 0,
  choiceBits: 0,
  choiceBitsNat: 0,
  degeneracy: 1,
  exact: true,
});

// Density order gives a fractional-relaxation upper bound. Before a first
// non-fitting *individually affordable* lot, the complete prefix plus that
// lot's value upper-bounds any integral optimum. Taking the better of a
// greedy integral packing and the best affordable singleton therefore earns
// at least 1/2 of the optimum under exact arithmetic: max(P, v) >= (P+v)/2.
// The plain greedy packing alone lacks this multiplicative guarantee.
// This is an algorithmic bound, NOT a Lean solver theorem or WIT/ACK receipt.
function greedyAllocate(candidates, budget) {
  const affordable = candidates.filter((candidate) => candidate.cost <= budget);
  const ranked = [...affordable].sort((a, b) => (b.benefit / b.cost) - (a.benefit / a.cost));
  const funded = [];
  let totalCost = 0;
  let totalBenefit = 0;
  for (const candidate of ranked) {
    if (totalCost + candidate.cost > budget) continue;
    funded.push(candidate.id);
    totalCost += candidate.cost;
    totalBenefit += candidate.benefit;
  }
  // Strictly greater only: preserve the original density-greedy tie choice.
  const single = affordable.reduce((best, candidate) =>
    best === undefined || candidate.benefit > best.benefit ? candidate : best, undefined);
  if (single !== undefined && single.benefit > totalBenefit) {
    return Object.freeze({
      funded: Object.freeze([single.id]),
      totalCost: single.cost,
      totalBenefit: single.benefit,
      consideredCount: candidates.length,
      fundedCount: 1,
      choiceBits: null,
      choiceBitsNat: null,
      degeneracy: null,
      exact: false,
      theoremReceipt: null,
    });
  }
  return Object.freeze({
    funded: Object.freeze(funded),
    totalCost,
    totalBenefit,
    consideredCount: candidates.length,
    fundedCount: funded.length,
    choiceBits: null,
    choiceBitsNat: null,
    degeneracy: null,
    exact: false,
    theoremReceipt: null,
  });
}

export function allocateBudget(candidates, budget, { maxSearchNodes } = {}) {
  const positive = candidates.filter(c => c.cost > 0 && c.benefit > 0 &&
    Number.isFinite(c.cost) && Number.isFinite(c.benefit));
  if (!(budget > 0) || positive.length === 0) return EMPTY_RESULT;
  const natural = isSafeNat(budget) &&
    positive.every(c => isSafeNat(c.cost) && isSafeNat(c.benefit));
  const safeAggregate = natural &&
    positive.reduce((sum, c) => sum + c.benefit, 0) <= Number.MAX_SAFE_INTEGER;
  // Non-integral or inexact JS numeric measurements cannot be silently
  // converted into exact BigInt resource coordinates.
  if (!safeAggregate) return greedyAllocate(positive, budget);

  const allocation = solveFiniteVectorCapacity({
    capacities: [BigInt(budget)],
    requests: positive.map(c => [BigInt(c.cost)]),
    benefits: positive.map(c => c.benefit),
    ...(maxSearchNodes === undefined ? {} : { maxSearchNodes }),
  });
  const funded = Object.freeze(allocation.selectedIndexes.map(i => positive[i].id));
  return Object.freeze({
    funded,
    totalCost: allocation.used[0] === undefined ? 0 : Number(allocation.used[0]),
    // This legacy API accepts only safe JS-number benefit units, whereas the
    // mathematical source returns an exact Nat. The original domain admission
    // ensures its result is safely representable on this older readout.
    totalBenefit: Number(allocation.totalBenefit),
    consideredCount: positive.length,
    fundedCount: funded.length,
    choiceBits: allocation.choiceBits,
    choiceBitsNat: allocation.choiceBits === null ? null : Math.floor(allocation.choiceBits),
    degeneracy: allocation.tieCount === null ? null
      : allocation.tieCount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(allocation.tieCount) : allocation.tieCount,
    exact: allocation.exact,
    // No arbitrary claim that a B&B selection is a Lean-kernel receipt.
    theoremReceipt: null,
  });
}

export function computeAllocation({ budget, candidates, maxSearchNodes } = {}) {
  if (!isSafeNat(budget)) {
    throw new Error("not theorem-admissible attention allocation request: budget must be a positive finite number and safe integer settlement unit");
  }
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("not an admissible attention allocation request: candidates must be a non-empty list");
  }
  const seen = new Set();
  let benefitSum = 0;
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)
        || typeof candidate.id !== "string" || candidate.id.trim() === ""
        || !isSafeNat(candidate.cost) || !isSafeNat(candidate.benefit)) {
      throw new Error("not theorem-admissible attention allocation request: each candidate requires a non-empty id and positive finite cost and benefit safe integer settlement units");
    }
    if (seen.has(candidate.id)) {
      throw new Error(`not an admissible attention allocation request: duplicate candidate id ${candidate.id}`);
    }
    seen.add(candidate.id);
    if (benefitSum > Number.MAX_SAFE_INTEGER - candidate.benefit) {
      throw new RangeError("not theorem-admissible attention allocation request: aggregate benefits exceed exact JavaScript numeric representation");
    }
    benefitSum += candidate.benefit;
  }
  return allocateBudget(candidates, budget, { maxSearchNodes });
}

/**
 * The allocation read as an agent's worklist: obstructions [{id, cost, benefit}]
 * with non-negative integer cost and benefit under a non-negative integer budget.
 * Obstruction ids must be unique within the request so each funded id identifies
 * exactly one input obstruction in selected and readNext.
 * Free obstructions (zero cost) are always reconciled; the rest are allocated
 * exactly or greedily as above. readNext orders the selection by benefit density.
 */
const isCount = (value) => Number.isSafeInteger(value) && value >= 0;

/**
 * Admit the public attention-allocation carrier in linear time without
 * running the search, charging a buyer, or using caller-supplied compute.
 * A market's validate binding can invoke this SAME function before HTTP 402;
 * the actual execution host must independently grant a finite node budget.
 * A shape-only JSON Schema cannot distinguish unsafe JS integers, duplicate
 * obstruction IDs, or the aggregate overflow that invalidates a residual.
 */
/**
 * A consuming host's independent finite capacity policy. This does not
 * redefine ATT or the mathematical feasible subset: it bounds how much
 * exact-search work the host offers for one price. Never read it from the
 * buyer's body. Unbounded pure use remains possible without this argument.
 */
function attentionHostPolicy(policy) {
  if (policy === undefined) return undefined;
  if (!policy || typeof policy !== "object" || Array.isArray(policy) ||
      Object.keys(policy).some(key => key !== "maxSearchNodes" && key !== "maxObstructions") ||
      !Number.isSafeInteger(policy.maxSearchNodes) || policy.maxSearchNodes < 1 ||
      !Number.isSafeInteger(policy.maxObstructions) || policy.maxObstructions < 1)
    throw new TypeError("attention host policy needs positive safe maxSearchNodes and maxObstructions");
  return policy;
}

export function validateAttentionAllocationRequest(input = {}, hostPolicy) {
  const policy = attentionHostPolicy(hostPolicy);
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new TypeError("attention allocation requires a request object");
  const { obstructions, budget, maxSearchNodes } = input;
  if (!Array.isArray(obstructions) || !isCount(budget))
    throw new TypeError("obstructions and a non-negative integer budget are required");
  if (maxSearchNodes !== undefined &&
      (!Number.isSafeInteger(maxSearchNodes) || maxSearchNodes < 1))
    throw new TypeError("maxSearchNodes must be a positive exactly representable search budget");
  if (policy !== undefined && obstructions.length > policy.maxObstructions)
    throw new RangeError("attention request exceeds the provider's admitted obstruction capacity");
  const seen = new Set();
  let universeBenefit = 0;
  for (const o of obstructions) {
    if (typeof o?.id !== "string" || !isCount(o?.cost) || !isCount(o?.benefit))
      throw new TypeError("an obstruction needs a string id and non-negative integer cost and benefit");
    if (seen.has(o.id)) throw new TypeError(`duplicate obstruction id ${o.id}`);
    seen.add(o.id);
    if (universeBenefit > Number.MAX_SAFE_INTEGER - o.benefit)
      throw new RangeError("attention benefit aggregate exceeds safe integer units");
    universeBenefit += o.benefit;
  }
  return input;
}

export function allocateAttention(input = {}, hostPolicy) {
  const { obstructions, budget, maxSearchNodes } = validateAttentionAllocationRequest(input, hostPolicy);
  const policy = attentionHostPolicy(hostPolicy);
  // The buyer may request *less* exact work; never more than the source-owned
  // host authorizes. The original mathematical function is unbounded only
  // when no host policy is supplied by its calling environment.
  const searchLimit = policy === undefined ? maxSearchNodes
    : maxSearchNodes === undefined ? policy.maxSearchNodes
      : Math.min(maxSearchNodes, policy.maxSearchNodes);
  // This carrier is JS Number, not an arbitrary Nat. Every coordinate and
  // the aggregate benefit were admitted before any optimizer work begins.
  const universeBenefit = obstructions.reduce((sum, obstruction) => sum + obstruction.benefit, 0);
  const free = obstructions.filter((o) => o.cost === 0 && o.benefit > 0);
  const allocation = allocateBudget(obstructions.filter((o) => o.cost > 0), budget, { maxSearchNodes: searchLimit });
  const funded = new Set([...free.map((o) => o.id), ...allocation.funded]);
  const density = (o) => (o.cost === 0 ? Number.POSITIVE_INFINITY : o.benefit / o.cost);
  const selected = obstructions.filter((o) => funded.has(o.id))
    .sort((x, y) => density(y) - density(x) || y.benefit - x.benefit || x.id.localeCompare(y.id));
  const cost = selected.reduce((sum, o) => sum + o.cost, 0);
  const benefit = selected.reduce((sum, o) => sum + o.benefit, 0);
  return {
    type: "AttentionAllocation",
    budget,
    readNext: selected.map((o) => o.id),
    selected,
    cost,
    benefit,
    residual: universeBenefit - benefit,
    exact: allocation.exact,
    // Free positive-benefit lots belong to every optimum; zero-benefit lots
    // may enlarge the original tie-set even if the optimizer discards them.
    // Refuse a formal Nat.log2 claim when that degeneracy is unmeasured.
    choiceBits: allocation.choiceBits,
    choiceBitsNat: obstructions.every(o => o.benefit > 0) ? allocation.choiceBitsNat : null,
    degeneracy: obstructions.every(o => o.benefit > 0) ? allocation.degeneracy : null,
  };
}
