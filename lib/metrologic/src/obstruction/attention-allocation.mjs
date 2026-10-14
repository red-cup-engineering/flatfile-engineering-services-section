/**
 * Attention allocation: the demand side of reconciliation (Obsmetrologia's
 * Cohomology/AttentionAllocation.lean). A bounded agent has a finite budget and
 * many obstructions, each with a reconciliation cost and a benefit; a spend is
 * committed once and never refunded, so the budget is consumed monotonically,
 * feasibility is downward closed, and the residual (benefit left unreconciled)
 * falls as captured benefit rises.
 *
 * The selected subset is exactly optimal under the budget when the candidate
 * count is small enough for exhaustive search (Cohomology/AllocationSolver.lean's
 * solveL enumerates subsets the same way, tail subsets first, so ties break as it
 * does), and a Dantzig density greedy, within one item of optimal, otherwise.
 * When several selections reach the optimum the fold direction chooses between
 * them; the tie-set size is reported as choiceBits = log2(|tie-set|), zero exactly
 * when the optimum is unique. Lean has no runtime role: the theorems are cited as
 * provenance, and a receipt is attached only under their natural-number premises.
 */

// Static source citation for the AllocationSolver.lean theorem receipt
// below (solveL_feasible/solveL_optimal/solvers_agree_value/
// solveL_isOptimum): not a runtime hash, just the file this die's exact
// solver is provenanced from.
const ALLOCATION_SOLVER_SOURCE = Object.freeze({
  file: "ObsmetrologiaEconomics/AllocationSolver.lean",
});

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
  exact: true,
});

// 2^20 subsets (~1e6) is comfortably cheap per request; real candidate
// counts (items proposed in one solicitation) are expected far below this.
const MAX_EXACT_CANDIDATES = 20;

// The bit-reversal operation generates the same tail-first order as Lean
// solveL, with a caller-supplied n <= 20, without allocating subset arrays.
function reverseMask(ordinal, n) {
  let bits = ordinal;
  bits = ((bits >>> 1) & 0x55555555) | ((bits & 0x55555555) << 1);
  bits = ((bits >>> 2) & 0x33333333) | ((bits & 0x33333333) << 2);
  bits = ((bits >>> 4) & 0x0f0f0f0f) | ((bits & 0x0f0f0f0f) << 4);
  bits = ((bits >>> 8) & 0x00ff00ff) | ((bits & 0x00ff00ff) << 8);
  bits = (bits >>> 16) | (bits << 16);
  return bits >>> (32 - n);
}

function exactAllocate(candidates, budget, theoremEligible = false) {
  const n = candidates.length;
  let bestBenefit = -Infinity;
  let bestMask = 0;
  // The existing solveL tail-first enumeration orders n-bit masks by the
  // bit-reversal permutation of [0, 2^n). The exact n<=20 bound admits one
  // 32-bit reversal, no recursive generator frames and no allocated mask or
  // feasible-mask arrays. First-optimum chirality and tie multiplicity stay
  // identical to the old (materialized) powerset order.

  let tieSetSize = 0;
  for (let ordinal = 0; ordinal < 2 ** n; ordinal++) {
    const mask = reverseMask(ordinal, n);
    let cost = 0;
    let benefit = 0;
    for (let i = 0; i < n; i += 1) {
      if ((mask & (1 << i)) === 0) continue;
      cost += candidates[i].cost;
      benefit += candidates[i].benefit;
    }
    if (cost > budget) continue;
    if (benefit > bestBenefit) {
      bestBenefit = benefit;
      bestMask = mask;
      tieSetSize = 1;
    } else if (benefit === bestBenefit) {
      tieSetSize++;
    }
  }
  if (tieSetSize === 0) return EMPTY_RESULT;
  const funded = [];
  let totalCost = 0;
  for (let i = 0; i < n; i += 1) {
    if ((bestMask & (1 << i)) === 0) continue;
    funded.push(candidates[i].id);
    totalCost += candidates[i].cost;
  }
  return Object.freeze({
    funded: Object.freeze(funded),
    totalCost,
    totalBenefit: bestBenefit,
    consideredCount: n,
    fundedCount: funded.length,
    choiceBits: tieSetSize > 0 ? Math.log2(tieSetSize) : 0,
    exact: true,
    theoremReceipt: theoremEligible ? Object.freeze({ kind: "obsmetrologia.attention.solveL:witness", theorems: Object.freeze([
      "Obsmetrologia.Cohomology.Attention.solveL_feasible", "Obsmetrologia.Cohomology.Attention.solveL_optimal",
      "Obsmetrologia.Cohomology.Attention.solvers_agree_value", "Obsmetrologia.Cohomology.Attention.solveL_isOptimum",
    ]), source: ALLOCATION_SOLVER_SOURCE, premises: "safe natural settlement units; exhaustive powerset search" }) : null,
  });
}

// Classic fractional-relaxation greedy (Dantzig): sort by benefit/cost
// density, take whole items while they fit. Provably optimal for the
// fractional relaxation and within one item's value of optimal for 0/1 --
// a real, known bound, not an unqualified claim of exactness.
function greedyAllocate(candidates, budget) {
  const ranked = [...candidates].sort((a, b) => (b.benefit / b.cost) - (a.benefit / a.cost));
  const funded = [];
  let totalCost = 0;
  let totalBenefit = 0;
  for (const candidate of ranked) {
    if (totalCost + candidate.cost > budget) continue;
    funded.push(candidate.id);
    totalCost += candidate.cost;
    totalBenefit += candidate.benefit;
  }
  return Object.freeze({
    funded: Object.freeze(funded),
    totalCost,
    totalBenefit,
    consideredCount: candidates.length,
    fundedCount: funded.length,
    choiceBits: null,
    exact: false,
    theoremReceipt: null,
  });
}

export function allocateBudget(candidates, budget) {
  const positive = candidates.filter((c) => c.cost > 0 && c.benefit > 0 && Number.isFinite(c.cost) && Number.isFinite(c.benefit));
  if (!(budget > 0) || positive.length === 0) return EMPTY_RESULT;
  const theoremEligible = isSafeNat(budget) && positive.every((c) => isSafeNat(c.cost) && isSafeNat(c.benefit))
    && positive.reduce((sum, c) => sum + c.cost, 0) <= Number.MAX_SAFE_INTEGER
    && positive.reduce((sum, c) => sum + c.benefit, 0) <= Number.MAX_SAFE_INTEGER;
  return positive.length <= MAX_EXACT_CANDIDATES ? exactAllocate(positive, budget, theoremEligible) : greedyAllocate(positive, budget);
}

export function computeAllocation({ budget, candidates } = {}) {
  if (!isSafeNat(budget)) {
    throw new Error("not theorem-admissible attention allocation request: budget must be a positive finite number and safe integer settlement unit");
  }
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("not an admissible attention allocation request: candidates must be a non-empty list");
  }
  const seen = new Set();
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
  }
  return allocateBudget(candidates, budget);
}

/**
 * The allocation read as an agent's worklist: obstructions [{id, cost, benefit}]
 * with non-negative integer cost and benefit under a non-negative integer budget.
 * Obstruction ids must be unique within the request so each funded id identifies
 * exactly one input obstruction in selected and readNext.
 * Free obstructions (zero cost) are always reconciled; the rest are allocated
 * exactly or greedily as above. readNext orders the selection by benefit density.
 */
export function allocateAttention({ obstructions, budget } = {}) {
  const isCount = (value) => Number.isInteger(value) && value >= 0;
  if (!Array.isArray(obstructions) || !isCount(budget)) throw new TypeError("obstructions and a non-negative integer budget are required");
  const seen = new Set();
  for (const o of obstructions) {
    if (typeof o?.id !== "string" || !isCount(o?.cost) || !isCount(o?.benefit)) throw new TypeError("an obstruction needs a string id and non-negative integer cost and benefit");
    if (seen.has(o.id)) throw new TypeError(`duplicate obstruction id ${o.id}`);
    seen.add(o.id);
  }
  const free = obstructions.filter((o) => o.cost === 0 && o.benefit > 0);
  const allocation = allocateBudget(obstructions.filter((o) => o.cost > 0), budget);
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
    residual: obstructions.reduce((sum, o) => sum + o.benefit, 0) - benefit,
    exact: allocation.exact,
    choiceBits: allocation.choiceBits,
  };
}


/**
 * Exact bounded allocation over **nonfungible typed resource dimensions**.
 *
 * Each resource mark is the authoritative upstream NI of one *particular*
 * capacity class, unit, source/rights/terms/authority combination; two
 * incompatible resources are not interchangeable even when their physical
 * unit names agree. This pure function never verifies a source, transfers
 * capacity, records money, or executes a job. The effects owner must qualify
 * the budget observations and recheck the live resource before acting.
 *
 * Benefits are independently admitted ATTENTION units, not currency or
 * inferred expected revenue; total multi-resource optimality follows from
 * finite exhaustive enumeration and is NOT the scalar Lean solver theorem.
 *
 * @param {{capacities:{dimensionNi:string,quantity:string}[],
 * candidates:{id:string,benefit:number,resources:{dimensionNi:string,quantity:string}[]}[]}} input
 */
/** Linear-time, side-effect-free preflight for a NI-typed finite resource
 * portfolio. The effectful x402 border uses this before quoting; the exact
 * allocation reuses the SAME admitted carrier, never a second schema.
 */
export function admitResourceCapacityPortfolio({ capacities, candidates } = {}) {
  const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
  const NAT = /^(?:0|[1-9][0-9]*)$/u;
  const MAX = (1n << 256n) - 1n;
  function quantity(value) {
    if (typeof value !== "string" || !NAT.test(value) || value.length > 78) {
      throw new TypeError("resource quantities must be exact unsigned atomic-unit strings");
    }
    const n = BigInt(value);
    if (n > MAX) throw new RangeError("resource quantity exceeds uint256");
    return n;
  }
  if (!Array.isArray(capacities) || capacities.length < 1 || capacities.length > 6 ||
      !Array.isArray(candidates) || candidates.length < 1 || candidates.length > 16) {
    throw new RangeError("bounded capacity allocation admits 1..6 dimensions and 1..16 work lots");
  }
  const indices = new Map(), available = [];
  for (const item of capacities) {
    if (typeof item?.dimensionNi !== "string" || !NI.test(item.dimensionNi) ||
        indices.has(item.dimensionNi)) throw new TypeError("capacity needs one unique qualified resource NI");
    indices.set(item.dimensionNi, indices.size);
    available.push(quantity(item.quantity));
  }
  const seen = new Set(), lots = [], requests = [];
  let benefitSum = 0;
  for (const lot of candidates) {
    if (typeof lot?.id !== "string" || !NI.test(lot.id) || seen.has(lot.id) ||
        !Number.isSafeInteger(lot.benefit) || lot.benefit < 1) {
      throw new TypeError("work lot requires a unique content address and positive safe attention benefit");
    }
    seen.add(lot.id);
    benefitSum += lot.benefit;
    if (!Number.isSafeInteger(benefitSum)) throw new RangeError("attention benefit aggregate is unsafe");
    if (!Array.isArray(lot.resources) || !lot.resources.length ||
        lot.resources.length > indices.size) throw new TypeError("work lot needs a finite typed resource bundle");
    const used = new Set(), vector = Array.from({ length: available.length }, () => 0n);
    for (const resource of lot.resources) {
      const idx = indices.get(resource?.dimensionNi);
      if (idx === undefined || used.has(idx)) {
        throw new TypeError("work lot requires known, unique, exactly typed resource dimensions");
      }
      used.add(idx);
      vector[idx] = quantity(resource.quantity);
    }
    lots.push(lot);
    requests.push(vector);
  }
  return Object.freeze({
    capacities: Object.freeze(capacities.map(item=>Object.freeze({...item}))),
    lots: Object.freeze(lots.map(item=>Object.freeze(item))),
    available: Object.freeze(available),
    requests: Object.freeze(requests.map(vector=>Object.freeze(vector))),
  });
}

/** Exact optimization of an already-admitted nonfungible resource portfolio.
 * This derives no price, authorization, or rights permission. */
export function allocateResourceCapacity(input = {}) {
  const { capacities, lots, available, requests } = admitResourceCapacityPortfolio(input);
  // Use the already received scalar solver's exact tail-first/chiral mask
  // ordering. All six dimensions are compared independently with BigInt.
  let bestBenefit = 0, bestMask = 0, ties = 0;
  for (let ordinal = 0; ordinal < 2 ** lots.length; ordinal++) {
    const mask = reverseMask(ordinal, lots.length);
    let benefit = 0, valid = true;
    const cumulative = Array.from({ length: available.length }, () => 0n);
    for (let i = 0; i < lots.length; i++) {
      if (!(mask & (1 << i))) continue;
      benefit += lots[i].benefit;
      for (let d = 0; d < cumulative.length; d++) {
        cumulative[d] += requests[i][d];
        if (cumulative[d] > available[d]) { valid = false; break; }
      }
      if (!valid) break;
    }
    if (!valid) continue;
    if (benefit > bestBenefit) { bestBenefit = benefit; bestMask = mask; ties = 1; }
    else if (benefit === bestBenefit) ties++;
  }
  const used = Array.from({ length: available.length }, () => 0n), funded = [];
  for (let i = 0; i < lots.length; i++) {
    if (!(bestMask & (1 << i))) continue;
    funded.push(lots[i].id);
    for (let d = 0; d < used.length; d++) used[d] += requests[i][d];
  }
  return Object.freeze({
    type: "MetrologicTypedResourceCapacityAllocation",
    exact: true, funded: Object.freeze(funded),
    considered: lots.length, totalBenefit: bestBenefit,
    choiceBits: Math.log2(ties),
    budget: Object.freeze(capacities.map((item, i) => Object.freeze({
      dimensionNi: item.dimensionNi,
      available: available[i].toString(),
      used: used[i].toString(),
      remaining: (available[i] - used[i]).toString(),
    }))),
    activation: "requires-independently-verified-capacity-and-actor-authorization",
    monetaryClaim: null, reserveCommitted: false, jobsExecuted: false,
    theoremReceipt: null,
  });
}
