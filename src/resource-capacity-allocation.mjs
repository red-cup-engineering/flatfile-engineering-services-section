import { solveFiniteVectorCapacity } from "../lib/metrologic/src/number/finite-capacity.mjs";

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

/** Project the existing NI-typed portfolio through the shared pure solver.
 * No capacity reservation, right, money movement or job execution follows. */
export function allocateResourceCapacity(input = {}) {
  const { capacities, lots, available, requests } = admitResourceCapacityPortfolio(input);
  const allocation = solveFiniteVectorCapacity({
    capacities: available, requests, benefits: lots.map(lot => lot.benefit),
  });
  return Object.freeze({
    type: "MetrologicTypedResourceCapacityAllocation",
    exact: allocation.exact,
    funded: Object.freeze(allocation.selectedIndexes.map(index => lots[index].id)),
    considered: lots.length, totalBenefit: Number(allocation.totalBenefit),
    choiceBits: allocation.choiceBits,
    budget: Object.freeze(capacities.map((item, index) => Object.freeze({
      dimensionNi: item.dimensionNi,
      available: available[index].toString(), used: allocation.used[index].toString(),
      remaining: allocation.remaining[index].toString(),
    }))),
    activation: "requires-independently-verified-capacity-and-actor-authorization",
    monetaryClaim: null, reserveCommitted: false, jobsExecuted: false,
    theoremReceipt: null,
  });
}
