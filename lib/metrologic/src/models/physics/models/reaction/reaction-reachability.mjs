/**
 * models/reaction/reaction-reachability - finite firing paths and coverability.
 *
 * This captures `Obsmetrologia.Relational.Reaction.Reachability`: reflexive,
 * one-step, transitive reachability, mass preservation across reachable paths,
 * support over-approximation by Datalog steps, and coverability.
 */

import {
  reachIn,
  reactionNetwork,
  reactionStep,
  totalCount,

} from "./free-energy-descent.mjs";
import { reaction } from "./mass-action-rate.mjs";
import { balanced } from "./reaction-network.mjs";
import { ble, datalogStep, supp, supportFireLeDatalog } from "./support-projection.mjs";

function dominates(
  species,
  state,
  target,
) {
  return species.every((item) => target[item] <= state[item]);
}

export function reachConservesMass(
  reachability,
) {
  for (const r of reachability.network.reactions) balanced(reachability.network.species, r);
  const initialTotal = totalCount(reachability.network.species, reachability.initial);
  const finalTotal = totalCount(reachability.network.species, reachability.final);
  if (initialTotal !== finalTotal) throw new TypeError("reachConservesMass: total changed along reachability");
  return Object.freeze({
    kind: "relational.reaction.reachability.reach_conserves_mass:witness",
    reachability,
    initialTotal,
    finalTotal,
    conserved: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.reach_conserves_mass",
  });
}

export function stepSupportLeDatalog(
  step,
) {
  const fireBelow = supportFireLeDatalog(step.network.species, step.reaction, step.before);
  const below = ble(step.network.species, supp(step.network.species, step.after), datalogStep(step.network.species, step.reaction, supp(step.network.species, step.before)));
  if (!below || !fireBelow.below) throw new TypeError("stepSupportLeDatalog: support containment failed");
  return Object.freeze({
    kind: "relational.reaction.reachability.step_support_le_datalog:witness",
    step,
    reaction: step.reaction,
    below: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.step_support_le_datalog",
  });
}

export function reachImpCoverable(
  reachability,
  target,
) {
  if (!dominates(reachability.network.species, reachability.final, target)) {
    throw new TypeError("reachImpCoverable: target is not dominated by the reached state");
  }
  return Object.freeze({
    kind: "relational.reaction.reachability.coverable:witness",
    network: reachability.network,
    initial: reachability.initial,
    target,
    coveringState: reachability.final,
    coverable: true,
    leanDefinition: "Obsmetrologia.Relational.Reaction.Coverable",
  });
}

export function coverableSelf(
  network,
  state,
) {
  return Object.freeze({
    kind: "relational.reaction.reachability.coverable:witness",
    network,
    initial: state,
    target: state,
    coveringState: state,
    coverable: true,
    leanDefinition: "Obsmetrologia.Relational.Reaction.Coverable",
  });
}

export function reactionReachabilityReceipt() {
  const species = Object.freeze(["A", "B", "C"]);
  const combine = reaction(species, { A: 1, B: 1, C: 0 }, { A: 0, B: 0, C: 2 });
  const split = reaction(species, { A: 0, B: 0, C: 1 }, { A: 1, B: 0, C: 0 });
  const network = reactionNetwork(species, [combine, split]);
  const reach = reachIn(network, { A: 1, B: 1, C: 0 }, [combine]);
  const splitStep = reactionStep(network, split, { A: 0, B: 0, C: 1 });
  return Object.freeze({
    kind: "relational.reaction.reachability.receipt:witness",
    reach,
    massInvariant: reachConservesMass(reach),
    supportBelowDatalog: stepSupportLeDatalog(splitStep),
    coverable: reachImpCoverable(reach, { A: 0, B: 0, C: 1 }),
    selfCoverable: coverableSelf(network, { A: 1, B: 1, C: 0 }),
    capturedLeanModule: "Obsmetrologia.Relational.Reaction.Reachability",
  });
}
