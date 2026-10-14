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

function exactAllocate(candidates, budget, theoremEligible = false) {
  const n = candidates.length;
  let bestBenefit = -Infinity;
  let bestMask = 0;
  // Preserve Lean solveL's tail-first subset order without allocating a
  // 2^n-element mask list. The exact-bound n <= 20 ensures bit shifts remain
  // safe JS integers. Feasible-mask storage was another O(2^n) allocation,
  // unnecessary when optimum and tie multiplicity share one streaming fold.
  function* masks(length) {
    if (length === 0) { yield 0; return; }
    for (const tail of masks(length - 1)) yield tail << 1;
    for (const tail of masks(length - 1)) yield (tail << 1) | 1;
  }
  let tieSetSize = 0;
  // This order gives the original first optimum its deterministic chirality.
  for (const mask of masks(n)) {
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
