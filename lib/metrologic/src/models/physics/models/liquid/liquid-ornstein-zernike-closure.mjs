/**
 * models/liquid/liquid-ornstein-zernike-closure - OZ as Tarski closure.
 *
 * This captures `Obsmetrologia.Relational.Liquid.OrnsteinZernikeClosure`:
 * direct-correlation seeds, positive bin couplings, settled total correlation,
 * direct domination, OZ consistency, leastness, and fixed-image equivalence.
 */

function normalizeBoolRecord(bins, value) {
  return Object.freeze(Object.fromEntries(bins.map((bin) => [bin, value[bin] === true])));
}

export function ozSystem(
  bins,
  direct,
  couplings,
) {
  const admitted = Object.freeze([...new Set(bins)]);
  const known = new Set(admitted);
  for (const coupling of couplings) {
    if (!known.has(coupling.from) || !known.has(coupling.to)) throw new TypeError("ozSystem: coupling mentions unknown bin");
  }
  return Object.freeze({
    kind: "relational.liquid.oz.system",
    bins: admitted,
    direct: normalizeBoolRecord(admitted, direct),
    couplings: Object.freeze(couplings.map((coupling) => Object.freeze({ ...coupling }))),
  });
}

export function totalCorrelation(system) {
  const total = { ...system.direct };
  for (;;) {
    let changed = false;
    for (const coupling of system.couplings) {
      if (total[coupling.from] && !total[coupling.to]) {
        total[coupling.to] = true;
        changed = true;
      }
    }
    if (!changed) return Object.freeze({ ...total });
  }
}

export function ozConsistent(system, field) {
  const admitted = normalizeBoolRecord(system.bins, field);
  return system.couplings.every((coupling) => !admitted[coupling.from] || admitted[coupling.to]);
}

export function ornsteinZernikeClosure(system) {
  const total = totalCorrelation(system);
  const dominates = system.bins.every((bin) => !system.direct[bin] || total[bin]);
  const consistent = ozConsistent(system, total);
  const idempotent = system.bins.every((bin) => totalCorrelation({ ...system, direct: total })[bin] === total[bin]);
  if (!dominates || !consistent || !idempotent) throw new TypeError("ornsteinZernikeClosure: closure checks failed");
  return Object.freeze({
    kind: "relational.liquid.oz.closure:witness",
    system,
    totalCorrelation: total,
    dominatesDirect: true,
    consistent: true,
    least: true,
    fixedIffImage: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Liquid.total_dominates_direct",
      "Obsmetrologia.Relational.Liquid.oz_consistent",
      "Obsmetrologia.Relational.Liquid.oz_least",
      "Obsmetrologia.Relational.Liquid.oz_image_iff_fixed",
    ]),
  });
}

export function liquidOrnsteinZernikeClosureReceipt() {
  const system = ozSystem(["near", "mid", "far"], { near: true, mid: false, far: false }, [
    { from: "near", to: "mid" },
    { from: "mid", to: "far" },
  ]);
  return Object.freeze({
    kind: "relational.liquid.oz.receipt:witness",
    closure: ornsteinZernikeClosure(system),
    capturedLeanModule: "Obsmetrologia.Relational.Liquid.OrnsteinZernikeClosure",
  });
}
