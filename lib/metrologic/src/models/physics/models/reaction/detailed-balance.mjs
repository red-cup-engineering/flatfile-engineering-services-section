/**
 * models/reaction/detailed-balance - reversible reactions as fixed points.
 *
 * This captures `Obsmetrologia.Relational.Reaction.DetailedBalance`:
 * reverse reactions, canceling stoichiometry, forward/backward propensities,
 * net flux, detailed balance, and Euler fixedness at equilibrium.
 */

import {
  equilibriumIsFixed,
  netStoich,
  propensity,
  reaction,

} from "./mass-action-rate.mjs";

const EPSILON = 1e-10;
const closeEnough = (left, right) => Math.abs(left - right) <= EPSILON;

export function reverseReaction(r) {
  return reaction(r.species, r.product, r.reactant);
}

export function reversibleReaction(
  fwd,
  kf,
  kb,
) {
  return Object.freeze({
    kind: "relational.reaction.detailedBalance.reversible",
    fwd,
    kf,
    kb,
  });
}

export function stoichSumReverse(
  r,
  species,
) {
  const forwardNet = netStoich(r)[species];
  const reverseNet = netStoich(reverseReaction(r))[species];
  if (!closeEnough(forwardNet + reverseNet, 0)) throw new TypeError("stoichSumReverse: net stoichiometries did not cancel");
  return Object.freeze({
    kind: "relational.reaction.detailedBalance.stoich_sum_reverse:witness",
    reaction: r,
    species,
    forwardNet,
    reverseNet,
    sum: 0,
    leanTheorem: "Obsmetrologia.Relational.Reaction.stoich_sum_reverse",
  });
}

export function forwardProp(
  reversible,
  concentration,
) {
  return propensity(reversible.fwd.species, reversible.kf, reversible.fwd, concentration);
}

export function backwardProp(
  reversible,
  concentration,
) {
  const reverse = reverseReaction(reversible.fwd);
  return propensity(reversible.fwd.species, reversible.kb, reverse, concentration);
}

export function netFlux(
  reversible,
  concentration,
) {
  return forwardProp(reversible, concentration) - backwardProp(reversible, concentration);
}

export function pairField(
  reversible,
) {
  return (concentration) => {
    const forward = forwardProp(reversible, concentration);
    const backward = backwardProp(reversible, concentration);
    const net = netStoich(reversible.fwd);
    const reverseNet = netStoich(reverseReaction(reversible.fwd));
    return Object.freeze(Object.fromEntries(reversible.fwd.species.map((item) => [
      item,
      forward * net[item] + backward * reverseNet[item],
    ])));
  };
}

export function detailedBalance(
  reversible,
  concentration,
) {
  return closeEnough(forwardProp(reversible, concentration), backwardProp(reversible, concentration));
}

export function proceedsForward(
  reversible,
  concentration,
) {
  const forward = forwardProp(reversible, concentration);
  const backward = backwardProp(reversible, concentration);
  const flux = netFlux(reversible, concentration);
  if (!(backward < forward) || !(flux > 0)) throw new TypeError("proceedsForward: flux is not strictly forward");
  return Object.freeze({
    kind: "relational.reaction.detailedBalance.proceeds_forward:witness",
    reversible,
    concentration,
    forward,
    backward,
    netFlux: flux,
    proceedsForward: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.proceeds_forward",
  });
}

export function detailedBalanceIffNetFluxZero(
  reversible,
  concentration,
) {
  if (!detailedBalance(reversible, concentration) || !closeEnough(netFlux(reversible, concentration), 0)) {
    throw new TypeError("detailedBalanceIffNetFluxZero: detailed balance/net-flux equivalence failed");
  }
  return Object.freeze({
    kind: "relational.reaction.detailedBalance.netFlux_zero:witness",
    reversible,
    concentration,
    detailedBalance: true,
    netFluxZero: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.detailedBalance_iff_netFlux_zero",
  });
}

export function detailedBalanceEulerFixed(
  reversible,
  concentration,
  dt,
) {
  detailedBalanceIffNetFluxZero(reversible, concentration);
  const fixed = equilibriumIsFixed(reversible.fwd.species, pairField(reversible), dt, concentration);
  if (!fixed.fixed) throw new TypeError("detailedBalanceEulerFixed: equilibrium moved");
  return Object.freeze({
    kind: "relational.reaction.detailedBalance.euler_fixed:witness",
    reversible,
    concentration,
    dt,
    fixed: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Reaction.detailedBalance_is_equilibrium",
      "Obsmetrologia.Relational.Reaction.detailedBalance_euler_fixed",
    ]),
  });
}

export function detailedBalanceReceipt() {
  const species = Object.freeze(["A", "B"]);
  const fwd = reaction(species, { A: 1, B: 0 }, { A: 0, B: 1 });
  const balancedPair = reversibleReaction(fwd, 2, 2);
  const forwardPair = reversibleReaction(fwd, 3, 1);
  const concentration = Object.freeze({ A: 1, B: 1 });
  return Object.freeze({
    kind: "relational.reaction.detailedBalance.receipt:witness",
    stoichCancel: stoichSumReverse(fwd, "A"),
    proceedsForward: proceedsForward(forwardPair, concentration),
    netFluxZero: detailedBalanceIffNetFluxZero(balancedPair, concentration),
    eulerFixed: detailedBalanceEulerFixed(balancedPair, concentration, 0.25),
    capturedLeanModule: "Obsmetrologia.Relational.Reaction.DetailedBalance",
  });
}
