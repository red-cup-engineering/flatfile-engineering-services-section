/**
 * models/reaction/reaction-entropy - reaction states through Boltzmann H.
 *
 * This captures `Obsmetrologia.Relational.Reaction.Entropy`: occupation
 * multisets, entropy H, permutation invariance, relaxation transport, and the
 * concrete A-to-B isomerization H-theorem witness.
 */

import {
  configH,
  configHPerm,
  equilibratingExchange,
  htheorem,
  htheoremEvolution,

} from "../kinetic-theory/boltzmann-entropy.mjs";
import { totalCount } from "./free-energy-descent.mjs";
import { reaction } from "./mass-action-rate.mjs";
import { enabled, fire } from "./support-projection.mjs";

export function occupation(
  species,
  state,
) {
  return Object.freeze(species.map((item) => state[item]));
}

export function occupationSum(
  species,
  state,
) {
  const occ = occupation(species, state);
  const occupationTotal = occ.reduce((total, count) => total + count, 0);
  const total = totalCount(species, state);
  if (occupationTotal !== total) throw new TypeError("occupationSum: occupation sum does not match total");
  return Object.freeze({
    kind: "relational.reaction.entropy.occupation_sum:witness",
    species,
    state,
    occupation: occ,
    occupationSum: occupationTotal,
    total,
    equal: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.occupation_sum",
  });
}

export function entropyH(species, state) {
  return configH(occupation(species, state));
}

export function entropyHPerm(
  leftSpecies,
  rightSpecies,
  state,
) {
  const perm = configHPerm(occupation(leftSpecies, state), occupation(rightSpecies, state));
  return Object.freeze({
    kind: "relational.reaction.entropy.entropyH_perm:witness",
    leftSpecies,
    rightSpecies,
    state,
    h: perm.h,
    permutationInvariant: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.entropyH_perm",
  });
}

export function entropyHLeOfRelaxes(
  species,
  before,
  after,
  exchanges,
) {
  const relaxation = htheoremEvolution(occupation(species, before), exchanges);
  const afterH = entropyH(species, after);
  if (Math.abs(afterH - relaxation.finalH) > 1e-10 || relaxation.finalH > relaxation.initialH + 1e-10) {
    throw new TypeError("entropyHLeOfRelaxes: relaxation did not land on after state or increased H");
  }
  return Object.freeze({
    kind: "relational.reaction.entropy.entropyH_le_of_relaxes:witness",
    species,
    before,
    after,
    relaxation,
    nonIncreasing: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.entropyH_le_of_relaxes",
  });
}

export function isoState(a, b) {
  return Object.freeze({ A: a + 1, B: b });
}

export function isoRxn() {
  return reaction(["A", "B"], { A: 1, B: 0 }, { A: 0, B: 1 });
}

export function isoEnabled(a, b) {
  return enabled(isoRxn(), isoState(a, b));
}

export function isoOccupationExchange(a, b) {
  return equilibratingExchange(a, b);
}

export function isoEntropyLe(a, b) {
  const before = isoState(a, b);
  const r = isoRxn();
  const after = fire(r, before);
  const exchange = isoOccupationExchange(a, b);
  const theorem = htheorem(exchange);
  if (entropyH(["A", "B"], after) > entropyH(["A", "B"], before) + 1e-10) {
    throw new TypeError("isoEntropyLe: isomerization increased H");
  }
  return Object.freeze({
    kind: "relational.reaction.entropy.iso_entropy_le:witness",
    reaction: r,
    before,
    after,
    exchange,
    hTheorem: theorem,
    nonIncreasing: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.iso_entropy_le",
  });
}

export function reactionEntropyReceipt() {
  const before = isoState(3, 1);
  const after = fire(isoRxn(), before);
  const exchange = isoOccupationExchange(3, 1);
  return Object.freeze({
    kind: "relational.reaction.entropy.receipt:witness",
    occupationSum: occupationSum(["A", "B"], before),
    entropyPerm: entropyHPerm(["A", "B"], ["B", "A"], before),
    relaxes: entropyHLeOfRelaxes(["A", "B"], before, after, [exchange]),
    isoEntropy: isoEntropyLe(3, 1),
    capturedLeanModule: "Obsmetrologia.Relational.Reaction.Entropy",
  });
}
