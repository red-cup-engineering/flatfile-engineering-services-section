/**
 * models/reaction/reaction-network - counted reaction network invariants.
 *
 * This captures `Obsmetrologia.Relational.Reaction.Network`: count-vector markings,
 * enabled firing, mass balance/conservation, non-monotone consumption,
 * catalysis as a fixed coordinate, and mass-conserving network steps.
 */

import {
  reactionNetwork,
  reactionStep,
  totalCount,

} from "./free-energy-descent.mjs";
import { reaction } from "./mass-action-rate.mjs";
import { enabled, fire } from "./support-projection.mjs";

function addMarkings(
  species,
  left,
  right,
) {
  return Object.freeze(Object.fromEntries(species.map((item) => [item, left[item] + right[item]])));
}

export function totalAdd(
  species,
  left,
  right,
) {
  const summed = addMarkings(species, left, right);
  const totalSum = totalCount(species, summed);
  const sumOfTotals = totalCount(species, left) + totalCount(species, right);
  if (totalSum !== sumOfTotals) throw new TypeError("totalAdd: coordinatewise-add total law failed");
  return Object.freeze({
    kind: "relational.reaction.network.total_add:witness",
    species,
    left,
    right,
    totalSum,
    sumOfTotals,
    additive: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.total_add",
  });
}

export function balanced(
  species,
  r,
) {
  const reactantTotal = totalCount(species, r.reactant);
  const productTotal = totalCount(species, r.product);
  if (reactantTotal !== productTotal) throw new TypeError("balanced: reaction is not mass-balanced");
  return Object.freeze({
    kind: "relational.reaction.network.balanced:witness",
    species,
    reaction: r,
    reactantTotal,
    productTotal,
    balanced: true,
    leanDefinition: "Obsmetrologia.Relational.Reaction.Balanced",
  });
}

export function massConserved(
  species,
  r,
  marking,
) {
  balanced(species, r);
  if (!enabled(r, marking)) throw new TypeError("massConserved: reaction is not enabled");
  const fired = fire(r, marking);
  const beforeTotal = totalCount(species, marking);
  const afterTotal = totalCount(species, fired);
  if (beforeTotal !== afterTotal) throw new TypeError("massConserved: total changed");
  return Object.freeze({
    kind: "relational.reaction.network.mass_conserved:witness",
    reaction: r,
    marking,
    fired,
    beforeTotal,
    afterTotal,
    conserved: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.mass_conserved",
  });
}

export function fireNotMonotone() {
  const r = reaction(["A", "B"], { A: 1, B: 0 }, { A: 0, B: 0 });
  const marking = Object.freeze({ A: 1, B: 0 });
  const fired = fire(r, marking);
  if (!(fired.A < marking.A)) throw new TypeError("fireNotMonotone: witness did not decrease A");
  return Object.freeze({
    kind: "relational.reaction.network.fire_not_monotone:witness",
    reaction: r,
    marking,
    species: "A",
    before: 1,
    after: 0,
    strictlyDecreased: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.fire_not_monotone",
  });
}

export function catalystIsFixed(
  r,
  marking,
  species,
) {
  if (r.reactant[species] !== r.product[species]) throw new TypeError("catalystIsFixed: species is not catalytic");
  if (r.reactant[species] > marking[species]) throw new TypeError("catalystIsFixed: catalyst count underflows");
  const fired = fire(r, marking);
  if (fired[species] !== marking[species]) throw new TypeError("catalystIsFixed: catalytic coordinate changed");
  return Object.freeze({
    kind: "relational.reaction.network.catalyst_is_fixed:witness",
    reaction: r,
    marking,
    species,
    before: marking[species],
    after: fired[species],
    fixed: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.catalyst_is_fixed",
  });
}

export function stepConservesMass(
  network,
  step,
) {
  for (const r of network.reactions) balanced(network.species, r);
  const beforeTotal = totalCount(network.species, step.before);
  const afterTotal = totalCount(network.species, step.after);
  if (beforeTotal !== afterTotal) throw new TypeError("stepConservesMass: total changed");
  return Object.freeze({
    kind: "relational.reaction.network.step_conserves_mass:witness",
    network,
    step,
    beforeTotal,
    afterTotal,
    conserved: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.step_conserves_mass",
  });
}

export function reactionNetworkReceipt() {
  const species = Object.freeze(["A", "B", "C"]);
  const combine = reaction(species, { A: 1, B: 1, C: 0 }, { A: 0, B: 0, C: 2 });
  const catalytic = reaction(species, { A: 1, B: 0, C: 1 }, { A: 0, B: 1, C: 1 });
  const network = reactionNetwork(species, [combine]);
  const marking = Object.freeze({ A: 1, B: 1, C: 0 });
  const step = reactionStep(network, combine, marking);
  return Object.freeze({
    kind: "relational.reaction.network.receipt:witness",
    totalAdd: totalAdd(species, { A: 1, B: 0, C: 2 }, { A: 0, B: 3, C: 1 }),
    massConserved: massConserved(species, combine, marking),
    fireNotMonotone: fireNotMonotone(),
    catalystFixed: catalystIsFixed(catalytic, { A: 1, B: 0, C: 3 }, "C"),
    stepConserved: stepConservesMass(network, step),
    capturedLeanModule: "Obsmetrologia.Relational.Reaction.Network",
  });
}
