/**
 * models/order/quantale — commutative quantales: the cost structure of the theory of work.
 *
 * A commutative quantale (Q, ⊗, e, ≤) is a commutative monoid with a complete order whose
 * joins ⊗ distributes over. The theory of work (agency-services-section,
 * what-is-the-theory-of-work.md) takes its cost sort to be one: costs compose by ⊗, the empty
 * act costs e, the cheapest of several ways is their meet, and "forbidden" is the top.
 *
 * `quantale` builds one from its operations; `quantaleLaws` checks the laws over a finite
 * sample and answers a witness or the first obstruction. `costQuantale` is the one-resource
 * quantale [0, ∞] under + (the Lawvere quantale read with more cost higher);
 * `productQuantale` is several resources at once, ordered and composed pointwise.
 */

/** A commutative quantale from its order, tensor, unit, binary join and meet, top and equality. */
export function quantale({ le, tensor, unit, join, meet, top, eq = (a, b) => le(a, b) && le(b, a), name = "quantale" }) {
  for (const [key, value] of Object.entries({ le, tensor, join, meet, eq })) {
    if (typeof value !== "function") throw new TypeError(`quantale: ${key} must be a function`);
  }
  return Object.freeze({
    kind: "metrologic.quantale",
    name,
    le,
    tensor,
    unit,
    join,
    meet,
    top,
    eq,
    lt: (a, b) => le(a, b) && !eq(a, b),
    tensorAll: (values) => values.reduce(tensor, unit),
    meetAll: (values) => values.reduce(meet, top),
  });
}

function obstruction(Q, law, points) {
  return Object.freeze({ kind: "metrologic.quantale.law-obstruction", quantale: Q.name, law, points: Object.freeze([...points]) });
}

/** Check the commutative-quantale laws over a finite sample: ⊗ associative, commutative and
 *  unital; ≤ a partial order; join and meet are least upper and greatest lower bounds; top is
 *  greatest; ⊗ monotone and distributive over joins. */
export function quantaleLaws(Q, sample) {
  const points = [...sample, Q.unit, Q.top];
  for (const a of points) {
    if (!Q.eq(Q.tensor(a, Q.unit), a)) return obstruction(Q, "unit", [a]);
    if (!Q.le(a, a)) return obstruction(Q, "reflexive", [a]);
    if (!Q.le(a, Q.top)) return obstruction(Q, "top", [a]);
    for (const b of points) {
      if (!Q.eq(Q.tensor(a, b), Q.tensor(b, a))) return obstruction(Q, "commutative", [a, b]);
      if (Q.le(a, b) && Q.le(b, a) && !Q.eq(a, b)) return obstruction(Q, "antisymmetric", [a, b]);
      const j = Q.join(a, b);
      const m = Q.meet(a, b);
      if (!Q.le(a, j) || !Q.le(b, j)) return obstruction(Q, "join-upper", [a, b]);
      if (!Q.le(m, a) || !Q.le(m, b)) return obstruction(Q, "meet-lower", [a, b]);
      for (const c of points) {
        if (!Q.eq(Q.tensor(Q.tensor(a, b), c), Q.tensor(a, Q.tensor(b, c)))) return obstruction(Q, "associative", [a, b, c]);
        if (Q.le(a, b) && Q.le(b, c) && !Q.le(a, c)) return obstruction(Q, "transitive", [a, b, c]);
        if (Q.le(a, c) && Q.le(b, c) && !Q.le(j, c)) return obstruction(Q, "join-least", [a, b, c]);
        if (Q.le(c, a) && Q.le(c, b) && !Q.le(c, m)) return obstruction(Q, "meet-greatest", [a, b, c]);
        if (Q.le(a, b) && !Q.le(Q.tensor(a, c), Q.tensor(b, c))) return obstruction(Q, "monotone", [a, b, c]);
        if (!Q.eq(Q.tensor(a, Q.join(b, c)), Q.join(Q.tensor(a, b), Q.tensor(a, c)))) return obstruction(Q, "distributive", [a, b, c]);
      }
    }
  }
  return Object.freeze({ kind: "metrologic.quantale.laws:witness", quantale: Q.name, sample: Object.freeze([...sample]) });
}

const admitCost = (value, caller) => {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) throw new RangeError(`${caller}: a cost is a number in [0, ∞]`);
  return value;
};

/** The one-resource cost quantale [0, ∞]: costs add, nothing costs 0, more cost is higher,
 *  the cheapest of two is their minimum, and ∞ is forbidden. */
export const costQuantale = quantale({
  name: "cost",
  le: (a, b) => admitCost(a, "costQuantale") <= admitCost(b, "costQuantale"),
  tensor: (a, b) => admitCost(a, "costQuantale") + admitCost(b, "costQuantale"),
  unit: 0,
  join: Math.max,
  meet: Math.min,
  top: Infinity,
  eq: (a, b) => a === b,
});

/** Several resources at once (time, tokens, money, legitimacy…), each its own quantale,
 *  composed and ordered pointwise. A cost is a record naming a value for every resource;
 *  `costOf` fills unnamed resources with their unit. */
export function productQuantale(components, name = "product") {
  const names = Object.keys(components).sort();
  if (names.length === 0) throw new TypeError("productQuantale: at least one resource is required");
  const pointwise = (op) => (a, b) => Object.freeze(Object.fromEntries(names.map((k) => [k, components[k][op](a[k], b[k])])));
  const Q = quantale({
    name,
    le: (a, b) => names.every((k) => components[k].le(a[k], b[k])),
    tensor: pointwise("tensor"),
    unit: Object.freeze(Object.fromEntries(names.map((k) => [k, components[k].unit]))),
    join: pointwise("join"),
    meet: pointwise("meet"),
    top: Object.freeze(Object.fromEntries(names.map((k) => [k, components[k].top]))),
    eq: (a, b) => names.every((k) => components[k].eq(a[k], b[k])),
  });
  return Object.freeze({
    ...Q,
    resources: Object.freeze(names),
    costOf: (partial = {}) => Object.freeze(Object.fromEntries(names.map((k) => [k, partial[k] ?? components[k].unit]))),
  });
}

/** Receipt: the cost quantale and a two-resource product satisfy the laws on a sample. */
export function quantaleReceipt() {
  const two = productQuantale({ time: costQuantale, legitimacy: costQuantale }, "time-legitimacy");
  return Object.freeze({
    kind: "metrologic.quantale.receipt:witness",
    cost: quantaleLaws(costQuantale, [0, 1, 2.5, 7]),
    product: quantaleLaws(two, [two.costOf({ time: 1 }), two.costOf({ legitimacy: 2 }), two.costOf({ time: 3, legitimacy: 1 })]),
  });
}
