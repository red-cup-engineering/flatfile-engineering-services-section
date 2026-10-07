/**
 * models/reaction/free-energy-descent - reaction-regime Lyapunov descent.
 *
 * This captures `Obsmetrologia.Relational.Reaction.FreeEnergyDescent`: for a
 * catabolic reaction network, total particle count is a natural-valued free
 * energy that strictly decreases at every firing and bounds reachability length.
 */
import { } from "./mass-action-rate.mjs";
import { enabled, fire } from "./support-projection.mjs";

const assertNat = (value, caller) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${caller}: expected a safe natural number`);
  return value;
};

function normalizeSpecies(species, caller) {
  const normalized = Object.freeze([...new Set(species.map((item) => {
    const trimmed = item.trim();
    if (trimmed.length === 0) throw new TypeError(`${caller}: species labels must be nonempty`);
    return trimmed;
  }))]);
  if (normalized.length === 0) throw new TypeError(`${caller}: expected at least one species`);
  return normalized;
}

function normalizeState(
  species,
  state,
  caller,
) {
  return Object.freeze(Object.fromEntries(species.map((item) => {
    if (!Object.hasOwn(state, item)) throw new TypeError(`${caller}: missing count for ${item}`);
    return [item, assertNat(state[item], caller)];
  })));
}

function sameState(
  species,
  left,
  right,
) {
  return species.every((item) => left[item] === right[item]);
}

export function reactionNetwork(
  species,
  reactions,
) {
  const admittedSpecies = normalizeSpecies(species, "reactionNetwork");
  if (reactions.length === 0) throw new TypeError("reactionNetwork: expected at least one reaction");
  return Object.freeze({
    kind: "relational.reaction.network",
    species: admittedSpecies,
    reactions: Object.freeze([...reactions]),
  });
}

export function totalCount(
  species,
  state,
) {
  const admitted = normalizeState(species, state, "totalCount");
  return species.reduce((total, item) => total + admitted[item], 0);
}

export function totalFireAdd(
  species,
  r,
  state,
) {
  const admitted = normalizeState(species, state, "totalFireAdd");
  if (!enabled(r, admitted)) throw new TypeError("totalFireAdd: reaction is not enabled");
  const fired = fire(r, admitted);
  const left = totalCount(species, fired) + totalCount(species, r.reactant);
  const right = totalCount(species, admitted) + totalCount(species, r.product);
  if (left !== right) throw new TypeError("totalFireAdd: firing bookkeeping identity failed");
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.total_fire_add:witness",
    reaction: r,
    state: admitted,
    fired,
    left,
    right,
    balancedBookkeeping: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.total_fire_add",
  });
}

export function catabolic(network) {
  const ok = network.reactions.every((r) =>
    totalCount(network.species, r.product) < totalCount(network.species, r.reactant));
  if (!ok) throw new TypeError("catabolic: every reaction must strictly reduce total count");
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.catabolic:witness",
    network,
    decreasesEveryReaction: true,
    leanDefinition: "Obsmetrologia.Relational.Reaction.Catabolic",
  });
}

export function reactionStep(
  network,
  r,
  before,
) {
  if (!network.reactions.includes(r)) throw new TypeError("reactionStep: reaction is not in the network");
  const admitted = normalizeState(network.species, before, "reactionStep");
  if (!enabled(r, admitted)) throw new TypeError("reactionStep: reaction is not enabled");
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.step:witness",
    network,
    reaction: r,
    before: admitted,
    after: fire(r, admitted),
    enabled: true,
    leanDefinition: "Obsmetrologia.Relational.Reaction.Step",
  });
}

export function stepStrictDecrease(
  catabolicNetwork,
  step,
) {
  if (step.network !== catabolicNetwork.network) throw new TypeError("stepStrictDecrease: step is for a different network");
  const beforeTotal = totalCount(step.network.species, step.before);
  const afterTotal = totalCount(step.network.species, step.after);
  if (!(afterTotal < beforeTotal)) throw new TypeError("stepStrictDecrease: catabolic step did not strictly decrease total");
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.step_strict_decrease:witness",
    step,
    beforeTotal,
    afterTotal,
    strictlyDecreases: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.step_strict_decrease",
  });
}

export function reachIn(
  network,
  initial,
  reactions,
) {
  let current = normalizeState(network.species, initial, "reachIn");
  const steps = [];
  for (const r of reactions) {
    const step = reactionStep(network, r, current);
    steps.push(step);
    current = step.after;
  }
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.reachIn:witness",
    network,
    initial: normalizeState(network.species, initial, "reachIn"),
    final: current,
    steps: Object.freeze(steps),
    length: steps.length,
    leanDefinition: "Obsmetrologia.Relational.Reaction.ReachIn",
  });
}

export function catabolicDescent(
  catabolicNetwork,
  reachability,
) {
  if (reachability.network !== catabolicNetwork.network) throw new TypeError("catabolicDescent: reachability is for a different network");
  for (const step of reachability.steps) stepStrictDecrease(catabolicNetwork, step);
  const initialTotal = totalCount(reachability.network.species, reachability.initial);
  const finalTotal = totalCount(reachability.network.species, reachability.final);
  if (reachability.length + finalTotal > initialTotal) {
    throw new TypeError("catabolicDescent: length plus final total exceeds initial total");
  }
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.catabolic_descent:witness",
    reachability,
    initialTotal,
    finalTotal,
    length: reachability.length,
    lengthPlusFinalBelowInitial: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.catabolic_descent",
  });
}

export function catabolicStepsBounded(
  catabolicNetwork,
  reachability,
) {
  const descent = catabolicDescent(catabolicNetwork, reachability);
  if (descent.length > descent.initialTotal) throw new TypeError("catabolicStepsBounded: length exceeds initial total");
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.catabolic_steps_bounded:witness",
    reachability,
    initialTotal: descent.initialTotal,
    length: descent.length,
    bounded: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.catabolic_steps_bounded",
  });
}

export function terminalOfTotalZero(
  catabolicNetwork,
  state,
) {
  const admitted = normalizeState(catabolicNetwork.network.species, state, "terminalOfTotalZero");
  if (totalCount(catabolicNetwork.network.species, admitted) !== 0) {
    throw new TypeError("terminalOfTotalZero: state total is not zero");
  }
  const enabledReaction = catabolicNetwork.network.reactions.find((r) => enabled(r, admitted));
  if (enabledReaction !== undefined) throw new TypeError("terminalOfTotalZero: a catabolic reaction is enabled at total zero");
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.terminal_of_total_zero:witness",
    network: catabolicNetwork.network,
    state: admitted,
    total: 0,
    terminal: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.terminal_of_total_zero",
  });
}

export function freeEnergyDescentReceipt() {
  const species = Object.freeze(["A", "B", "C"]);
  const combine = Object.freeze({
    kind: "relational.reaction.reaction",
    species,
    reactant: Object.freeze({ A: 1, B: 1, C: 0 }),
    product: Object.freeze({ A: 0, B: 0, C: 1 }),
  });
  const decayC = Object.freeze({
    kind: "relational.reaction.reaction",
    species,
    reactant: Object.freeze({ A: 0, B: 0, C: 1 }),
    product: Object.freeze({ A: 0, B: 0, C: 0 }),
  });
  const network = reactionNetwork(species, [combine, decayC]);
  const catabolicNetwork = catabolic(network);
  const initial = Object.freeze({ A: 1, B: 1, C: 0 });
  const firstStep = reactionStep(network, combine, initial);
  const reachability = reachIn(network, initial, [combine, decayC]);
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.receipt:witness",
    totalFireAdd: totalFireAdd(species, combine, initial),
    catabolic: catabolicNetwork,
    strictDecrease: stepStrictDecrease(catabolicNetwork, firstStep),
    descent: catabolicDescent(catabolicNetwork, reachability),
    bounded: catabolicStepsBounded(catabolicNetwork, reachability),
    terminal: terminalOfTotalZero(catabolicNetwork, Object.freeze({ A: 0, B: 0, C: 0 })),
    capturedLeanModule: "Obsmetrologia.Relational.Reaction.FreeEnergyDescent",
  });
}
