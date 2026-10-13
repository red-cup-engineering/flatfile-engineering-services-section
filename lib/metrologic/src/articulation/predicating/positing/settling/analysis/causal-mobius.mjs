/**
 * Finite causal-order Möbius inversion on an already settled strict
 * transitive closure (NOT a direct-edge graph).
 *
 * Incidence recurrence: mu(a,a)=1; mu(a,b)=-sum_{a<=z<b}mu(a,z).
 * The older CHL runtime recursively enumerated every chain: exponential
 * recomputation on long orders. This finite iterative dynamic program is
 * quadratic in interval size plus the size of the supplied closure.
 * Nothing here asserts a Lorentzian metric or physical spacetime.
 *
 * The upstream causal settlement validates acyclicity and computes closure.
 * BigInt preserves exact arithmetic; returned numeric values must be safe.
 */
export function mobiusOfFiniteCausalClosure(events, closure, from, to) {
  if (!Array.isArray(events) || !Array.isArray(closure) ||
      new Set(events).size !== events.length ||
      events.some(event => typeof event !== "string" || event.length === 0))
    throw new TypeError("causal Möbius needs distinct finite event names and closure edges");
  const next = new Map(events.map(event => [event, new Set()]));
  for (const edge of closure) {
    if (!edge || !next.has(edge.from) || !next.has(edge.to) ||
        edge.from === edge.to)
      throw new TypeError("causal Möbius needs a strict relation on listed events");
    next.get(edge.from).add(edge.to);
  }
  // Incidence inversion is defined only on a strict transitive order.
  // Validate the supplied closure before computing even diagonal identities:
  // cycles and missing implied edges are not admissible causal observations.
  for (const [a, successors] of next) {
    for (const b of successors) {
      const later = next.get(b);
      if (later.has(a))
        throw new RangeError("causal Möbius refuses cyclic event order");
      for (const c of later)
        if (!successors.has(c))
          throw new RangeError("causal Möbius requires complete transitive closure");
    }
  }
  if (!next.has(from) || !next.has(to))
    throw new RangeError("causal Möbius endpoint is outside the carrier");
  if (from === to) return 1;
  if (!next.get(from).has(to)) return 0;

  const between = events.filter(event =>
    event === from || event === to ||
    (next.get(from).has(event) && next.get(event).has(to)));
  const rank = new Map(between.map(event => [event,
    between.reduce((count, earlier) =>
      count + (next.get(earlier).has(event) ? 1 : 0), 0)]));
  const index = new Map(events.map((event, i) => [event, i]));
  between.sort((left, right) => rank.get(left) - rank.get(right) ||
    index.get(left) - index.get(right));

  // Strict transitive ancestry implies strictly increasing ancestor counts,
  // hence all the proper predecessors of a node have already been visited.
  const mu = new Map();
  for (const event of between) {
    if (event === from) {
      mu.set(event, 1n);
      continue;
    }
    let sum = 0n;
    for (const predecessor of between)
      if (mu.has(predecessor) && next.get(predecessor).has(event))
        sum += mu.get(predecessor);
    mu.set(event, -sum);
  }
  const exact = mu.get(to);
  if (exact === undefined ||
      exact > BigInt(Number.MAX_SAFE_INTEGER) ||
      exact < -BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("causal Möbius value exceeds exact safe integer range");
  return Number(exact);
}
