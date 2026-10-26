/**
 * Exact bounded minimum-resource flow over a directed capacitated network.
 * Receives exact rational operations from the shared Exact Number owner.
 *
 * Objective: maximize total delivered flow under an optional shared budget,
 * then minimize expenditure for the attained flow.
 *
 * Each link has a CONSTANT, NONNEGATIVE per-unit resource cost; this is not a
 * nonlinear hydraulic/pressure solver. Given compatible rational quantities,
 * the outcome is exact for that finite linear model. Budget-constrained
 * delivery can be fractional, and no fairness allocation is implied.
 *
 * Returns primal link/source/demand flows, unconstrained optimum, and exact
 * residual-network reduced-cost potentials witnessing cost optimality for
 * the delivered amount. Real-world uncertainty belongs in source adapters.
 * Bounded input/augmentation admission prevents unbounded public computation.
 */
import { divide, ratAdd, ratCompare, ratEqual, ratIsZero, ratMultiply, ratNegate, ratSubtract, ratZero, rationalOfBigInts } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { resourceRatioString } from "./resource-flow-wire.mjs";

export function solveExactResourceFlow(spec) {
  // Exact finite min-cost flow over the shared Exact Number arithmetic. The
  // result is exact for the *supplied linear network*, not a hydraulic model.
  if (!spec || !Array.isArray(spec.nodes) || !Array.isArray(spec.links)
      || !Array.isArray(spec.sources) || !Array.isArray(spec.demands)) {
    throw new TypeError("nodes, links, sources, and demands arrays are required");
  }
  if (spec.nodes.length < 1 || spec.nodes.length > 48 || spec.links.length > 128
      || spec.sources.length > 48 || spec.demands.length > 48) {
    throw new RangeError("maximum 48 nodes, 128 links, 48 sources and 48 demands");
  }
  const name = v => typeof v === "string" && /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/.test(v);
  const value = v => {
    if (typeof v === "number") {
      if (!Number.isSafeInteger(v)) throw new TypeError("pass fractional values as rational strings");
      v = String(v);
    }
    if (typeof v !== "string" || !/^\d{1,14}(?:\/[1-9]\d{0,13})?$/.test(v)) {
      throw new TypeError("nonnegative exact integer or p/q rational string required (<=14 digits)");
    }
    const [a, b = "1"] = v.split("/");
    return rationalOfBigInts(BigInt(a), BigInt(b));
  };
  const Z = ratZero;
  const nodeMap = new Map();
  spec.nodes.forEach((id, i) => {
    if (!name(id) || nodeMap.has(id)) throw new RangeError("invalid or repeated node");
    nodeMap.set(id, i);
  });
  const linkIds = new Set();
  const links = spec.links.map(link => {
    if (!link || !name(link.id) || linkIds.has(link.id) ||
        !nodeMap.has(link.from) || !nodeMap.has(link.to) || link.from === link.to) {
      throw new RangeError("invalid link name, endpoints, or self-loop");
    }
    linkIds.add(link.id);
    return { ...link, capacity: value(link.capacity), cost: value(link.unitResourceCost) };
  });
  const parseTerminals = (items, key) => {
    const seen = new Set();
    return items.map(entry => {
      if (!entry || !nodeMap.has(entry.node) || seen.has(entry.node)) {
        throw new RangeError("unknown or repeated " + key + " node");
      }
      seen.add(entry.node);
      return { node: entry.node, amount: value(entry[key]) };
    });
  };
  const supplies = parseTerminals(spec.sources, "capacity");
  const demands = parseTerminals(spec.demands, "amount");
  const budget = spec.budget === undefined || spec.budget === null ? null : value(spec.budget);
  let totalDemand = Z;
  for (const d of demands) totalDemand = ratAdd(totalDemand, d.amount);
  const n = spec.nodes.length, SS = n, TT = n + 1, count = n + 2;

  const compute = spendingLimit => {
    const adj = Array.from({ length: count }, () => []);
    const install = (from, to, capacity, cost) => {
      const forward = { to, rev: adj[to].length, cap: capacity, original: capacity, cost };
      const reverse = { to: from, rev: adj[from].length, cap: Z, original: Z, cost: ratNegate(cost) };
      adj[from].push(forward);
      adj[to].push(reverse);
      return forward;
    };
    const pipes = links.map(l => install(nodeMap.get(l.from), nodeMap.get(l.to), l.capacity, l.cost));
    const supplyArcs = supplies.map(s => install(SS, nodeMap.get(s.node), s.amount, Z));
    const demandArcs = demands.map(d => install(nodeMap.get(d.node), TT, d.amount, Z));
    let delivered = Z, spent = Z, augmentations = 0;
    // Exact marginal-cost envelope is produced by the SAME primal
    // augmentations already necessary for maximum-delivery optimization.
    // This is not 32 separate solver executions for 32 buyer budgets.
    const marginalSegments = [];
    const shortestPath = () => {
      const dist = Array(count).fill(null), from = Array(count).fill(-1), edgeIx = Array(count).fill(-1);
      dist[SS] = Z;
      for (let round = 0; round < count - 1; round++) {
        let changed = false;
        for (let u = 0; u < count; u++) {
          if (dist[u] === null) continue;
          for (let i = 0; i < adj[u].length; i++) {
            const arc = adj[u][i];
            if (ratIsZero(arc.cap)) continue;
            const candidate = ratAdd(dist[u], arc.cost);
            if (dist[arc.to] === null || (ratCompare(candidate, dist[arc.to]) < 0)) {
              dist[arc.to] = candidate; from[arc.to] = u; edgeIx[arc.to] = i; changed = true;
            }
          }
        }
        if (!changed) break;
      }
      if (dist[TT] === null) return null;
      return { dist: dist[TT], from, edgeIx };
    };
    let nextMarginal = null;
    while ((ratCompare(delivered, totalDemand) < 0)) {
      const path = shortestPath();
      if (!path) break;
      if ((ratCompare(path.dist, Z) < 0)) throw new Error("unexpected negative augmenting cost");
      let increment = ratSubtract(totalDemand, delivered);
      const visited = new Set();
      for (let u = TT; u !== SS; u = path.from[u]) {
        if (u < 0 || visited.has(u)) throw new Error("invalid residual augmenting path");
        visited.add(u);
        const arc = adj[path.from[u]][path.edgeIx[u]];
        if ((ratCompare(arc.cap, increment) < 0)) increment = arc.cap;
      }
      if (spendingLimit !== null && (ratCompare(path.dist, Z) > 0)) {
        const remainder = ratSubtract(spendingLimit, spent);
        if ((ratCompare(remainder, Z) < 0)) throw new Error("resource accounting invariant violated");
        const affordable = divide(remainder, path.dist);
        if ((ratCompare(affordable, increment) < 0)) increment = affordable;
      }
      if (ratIsZero(increment)) { nextMarginal = path.dist; break; }
      const beforeDelivered = delivered, beforeSpent = spent;
      for (let u = TT; u !== SS; u = path.from[u]) {
        const p = path.from[u], i = path.edgeIx[u], a = adj[p][i];
        a.cap = ratSubtract(a.cap, increment);
        adj[u][a.rev].cap = ratAdd(adj[u][a.rev].cap, increment);
      }
      delivered = ratAdd(delivered, increment);
      spent = ratAdd(spent, ratMultiply(increment, path.dist));
      const previous = marginalSegments.at(-1);
      if (previous !== undefined && ratEqual(previous.marginal, path.dist)) {
        previous.untilDelivered = delivered;
        previous.untilResourceCost = spent;
      } else {
        if (previous !== undefined && (ratCompare(path.dist, previous.marginal) < 0))
          throw new Error("successive shortest-path marginal costs decreased; frontier is not convex");
        marginalSegments.push({
          fromDelivered: beforeDelivered, untilDelivered: delivered,
          fromResourceCost: beforeSpent, untilResourceCost: spent,
          marginal: path.dist,
        });
      }
      augmentations++;
      if (augmentations > 4096) throw new RangeError("augmentation cap exceeded; no answer claimed");
    }
    if (nextMarginal === null && (ratCompare(delivered, totalDemand) < 0)) {
      const path = shortestPath();
      if (path) nextMarginal = path.dist;
    }
    // Residual nonnegative reduced costs certify minimum resource cost at
    // the attained throughput. Initialize all potentials at 0 (super-source).
    const potential = Array(count).fill(Z);
    for (let round = 0; round < count - 1; round++) {
      let changed = false;
      for (let u = 0; u < count; u++) for (const a of adj[u]) {
        if (ratIsZero(a.cap)) continue;
        const candidate = ratAdd(potential[u], a.cost);
        if ((ratCompare(candidate, potential[a.to]) < 0)) { potential[a.to] = candidate; changed = true; }
      }
      if (!changed) break;
    }
    for (let u = 0; u < count; u++) for (const a of adj[u]) {
      if (!ratIsZero(a.cap) && (ratCompare(ratAdd(potential[u], a.cost), potential[a.to]) < 0)) {
        throw new Error("negative residual cycle: claimed minimum is invalid");
      }
    }
    const flow = links.map((l,i) => ({ id:l.id, from:l.from, to:l.to,
      volume:resourceRatioString(ratSubtract(pipes[i].original, pipes[i].cap)) }));
    const supplied = supplies.map((s,i) => ({ node:s.node,
      volume:resourceRatioString(ratSubtract(supplyArcs[i].original, supplyArcs[i].cap)) }));
    const served = demands.map((d,i) => ({ node:d.node, requested:resourceRatioString(d.amount),
      delivered:resourceRatioString(ratSubtract(demandArcs[i].original, demandArcs[i].cap)) }));
    let recomputed = Z;
    for (let i = 0; i < links.length; i++) {
      recomputed = ratAdd(recomputed, ratMultiply(ratSubtract(pipes[i].original, pipes[i].cap), links[i].cost));
    }
    if (!ratEqual(recomputed, spent)) throw new Error("resource total disagrees with link flow");
    return { delivered:resourceRatioString(delivered), resourceCost:resourceRatioString(spent),
      remainingDemand:resourceRatioString(ratSubtract(totalDemand, delivered)), flows:flow, supplied, served,
      nextMarginalResourceCost:nextMarginal===null?null:resourceRatioString(nextMarginal),
      reducedCostPotentials:potential.map(x=>resourceRatioString(x)), augmentations,
      marginalCostFrontier: marginalSegments.map(x=>({
        fromDelivered:resourceRatioString(x.fromDelivered),
        untilDelivered:resourceRatioString(x.untilDelivered),
        fromResourceCost:resourceRatioString(x.fromResourceCost),
        untilResourceCost:resourceRatioString(x.untilResourceCost),
        resourceCostPerDeliveredUnit:resourceRatioString(x.marginal),
      })) };
  };
  const unconstrained = compute(null);
  const funded = budget === null ? unconstrained : compute(budget);
  return {
    model:"exact-capacitated-directed-linear-resource-flow/v1",
    guarantee:"exact arithmetic and min-cost max-flow for input capacities and constant nonnegative link costs; not physical hydraulic certification",
    totalDemand:resourceRatioString(totalDemand), budget:budget===null?null:resourceRatioString(budget),
    withoutBudget:{ maximumDelivery:unconstrained.delivered, minimumResourceForMaximumDelivery:unconstrained.resourceCost, witness:unconstrained },
    withBudget:funded,
    allDemandFeasible: funded.remainingDemand === "0",
    limitedByNetwork:unconstrained.remainingDemand !== "0",
    limitedByBudget:budget!==null && funded.delivered!==unconstrained.delivered
  };
}
