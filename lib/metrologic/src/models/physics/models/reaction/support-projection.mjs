/**
 * models/reaction/support-projection - Boolean support of counted reactions.
 *
 * This captures `Obsmetrologia.Relational.Reaction.SupportProjection`: support
 * forgets counts, Datalog support steps are monotone/inflationary, actual firing
 * sits below the Datalog step, and their gap is exactly full consumption.
 */
import { reaction } from "./mass-action-rate.mjs";

const assertNat = (value, caller) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${caller}: expected a safe natural number`);
  return value;
};

function normalizeMarking(
  species,
  marking,
  caller,
) {
  return Object.freeze(Object.fromEntries(species.map((item) => {
    if (!Object.hasOwn(marking, item)) throw new TypeError(`${caller}: missing count for ${item}`);
    return [item, assertNat(marking[item], caller)];
  })));
}

function normalizeSupport(
  species,
  support,
  caller,
) {
  return Object.freeze(Object.fromEntries(species.map((item) => {
    if (!Object.hasOwn(support, item)) throw new TypeError(`${caller}: missing support for ${item}`);
    return [item, support[item] === true];
  })));
}

function supportEquals(
  species,
  left,
  right,
) {
  return species.every((item) => left[item] === right[item]);
}

export { reaction as supportReaction };

export function enabled(r, marking) {
  const admitted = normalizeMarking(r.species, marking, "enabled");
  return r.species.every((item) => r.reactant[item] <= admitted[item]);
}

export function fire(r, marking) {
  const admitted = normalizeMarking(r.species, marking, "fire");
  return Object.freeze(Object.fromEntries(r.species.map((item) => [
    item,
    Math.max(0, admitted[item] - r.reactant[item]) + r.product[item],
  ])));
}

export function supp(species, marking) {
  const admitted = normalizeMarking(species, marking, "supp");
  return Object.freeze(Object.fromEntries(species.map((item) => [item, admitted[item] > 0])));
}

export function ble(
  species,
  left,
  right,
) {
  const admittedLeft = normalizeSupport(species, left, "ble.left");
  const admittedRight = normalizeSupport(species, right, "ble.right");
  return species.every((item) => !admittedLeft[item] || admittedRight[item]);
}

export function bleWitness(
  species,
  left,
  right,
) {
  const admittedLeft = normalizeSupport(species, left, "bleWitness.left");
  const admittedRight = normalizeSupport(species, right, "bleWitness.right");
  if (!ble(species, admittedLeft, admittedRight)) throw new TypeError("bleWitness: left support is not below right support");
  return Object.freeze({
    kind: "relational.reaction.supportProjection.ble:witness",
    left: admittedLeft,
    right: admittedRight,
    below: true,
    leanDefinition: "Obsmetrologia.Relational.Reaction.ble",
  });
}

export function rAnt(
  species,
  r,
  support,
) {
  const admitted = normalizeSupport(species, support, "rAnt");
  return species.every((item) => r.reactant[item] <= 0 || admitted[item]);
}

export function datalogStep(
  species,
  r,
  support,
) {
  const admitted = normalizeSupport(species, support, "datalogStep");
  const antecedent = rAnt(species, r, admitted);
  return Object.freeze(Object.fromEntries(species.map((item) => [
    item,
    admitted[item] || (antecedent && r.product[item] > 0),
  ])));
}

export function datalogStepInfl(
  species,
  r,
  support,
) {
  const admitted = normalizeSupport(species, support, "datalogStepInfl");
  const stepped = datalogStep(species, r, admitted);
  if (!ble(species, admitted, stepped)) throw new TypeError("datalogStepInfl: support step is not inflationary");
  return Object.freeze({
    kind: "relational.reaction.supportProjection.datalogStep_infl:witness",
    support: admitted,
    stepped,
    inflationary: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.datalogStep_infl",
  });
}

export function datalogStepMono(
  species,
  r,
  left,
  right,
) {
  const admittedLeft = normalizeSupport(species, left, "datalogStepMono.left");
  const admittedRight = normalizeSupport(species, right, "datalogStepMono.right");
  if (!ble(species, admittedLeft, admittedRight)) throw new TypeError("datalogStepMono: left support is not below right support");
  const steppedLeft = datalogStep(species, r, admittedLeft);
  const steppedRight = datalogStep(species, r, admittedRight);
  if (!ble(species, steppedLeft, steppedRight)) throw new TypeError("datalogStepMono: stepped supports are not ordered");
  return Object.freeze({
    kind: "relational.reaction.supportProjection.datalogStep_mono:witness",
    left: admittedLeft,
    right: admittedRight,
    steppedLeft,
    steppedRight,
    monotone: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.datalogStep_mono",
  });
}

export function rAntOfEnabled(
  species,
  r,
  marking,
) {
  const admitted = normalizeMarking(species, marking, "rAntOfEnabled");
  if (!enabled(r, admitted) || !rAnt(species, r, supp(species, admitted))) {
    throw new TypeError("rAntOfEnabled: enabled reaction did not fire the support antecedent");
  }
  return Object.freeze({
    kind: "relational.reaction.supportProjection.rAnt_of_enabled:witness",
    reaction: r,
    marking: admitted,
    antecedent: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.rAnt_of_enabled",
  });
}

export function supportFireLeDatalog(
  species,
  r,
  marking,
) {
  const admitted = normalizeMarking(species, marking, "supportFireLeDatalog");
  if (!enabled(r, admitted)) throw new TypeError("supportFireLeDatalog: reaction is not enabled");
  const fired = fire(r, admitted);
  const fireSupport = supp(species, fired);
  const datalogSupport = datalogStep(species, r, supp(species, admitted));
  if (!ble(species, fireSupport, datalogSupport)) {
    throw new TypeError("supportFireLeDatalog: fire support is not below Datalog support");
  }
  return Object.freeze({
    kind: "relational.reaction.supportProjection.support_fire_le_datalog:witness",
    reaction: r,
    marking: admitted,
    fired,
    fireSupport,
    datalogSupport,
    below: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.support_fire_le_datalog",
  });
}

export function consumptionIsTheGap(
  species,
  r,
  marking,
  x,
) {
  const witness = supportFireLeDatalog(species, r, marking);
  if (!witness.datalogSupport[x] || witness.fireSupport[x]) {
    throw new TypeError("consumptionIsTheGap: selected species is not in the Datalog/fire support gap");
  }
  if (!(witness.marking[x] > 0 && witness.marking[x] === r.reactant[x] && r.product[x] === 0)) {
    throw new TypeError("consumptionIsTheGap: gap is not full consumption");
  }
  return Object.freeze({
    kind: "relational.reaction.supportProjection.consumption_is_the_gap:witness",
    species: x,
    markingCount: witness.marking[x],
    reactantCount: r.reactant[x],
    productCount: 0,
    presentBefore: true,
    fullyConsumed: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.consumption_is_the_gap",
  });
}

export function supportFireEqDatalogOfNoConsumption(
  species,
  r,
  marking,
) {
  const admitted = normalizeMarking(species, marking, "supportFireEqDatalogOfNoConsumption");
  if (!enabled(r, admitted)) throw new TypeError("supportFireEqDatalogOfNoConsumption: reaction is not enabled");
  const noConsumption = species.every((item) =>
    r.reactant[item] <= 0 || r.reactant[item] < admitted[item] || r.product[item] > 0);
  if (!noConsumption) throw new TypeError("supportFireEqDatalogOfNoConsumption: some reactant is fully consumed");
  const fireSupport = supp(species, fire(r, admitted));
  const datalogSupport = datalogStep(species, r, supp(species, admitted));
  if (!supportEquals(species, fireSupport, datalogSupport)) {
    throw new TypeError("supportFireEqDatalogOfNoConsumption: supports differ despite no full consumption");
  }
  return Object.freeze({
    kind: "relational.reaction.supportProjection.support_fire_eq_datalog_of_no_consumption:witness",
    reaction: r,
    marking: admitted,
    fireSupport,
    datalogSupport,
    equal: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.support_fire_eq_datalog_of_no_consumption",
  });
}

export function supportProjectionReceipt() {
  const species = Object.freeze(["A", "B", "C"]);
  const consume = reaction(species, Object.freeze({ A: 1, B: 1, C: 0 }), Object.freeze({ A: 0, B: 0, C: 1 }));
  const catalytic = reaction(species, Object.freeze({ A: 1, B: 1, C: 0 }), Object.freeze({ A: 1, B: 1, C: 1 }));
  const marking = Object.freeze({ A: 1, B: 2, C: 0 });
  const catalyticMarking = Object.freeze({ A: 1, B: 1, C: 0 });
  const baseSupport = supp(species, marking);
  return Object.freeze({
    kind: "relational.reaction.supportProjection.receipt:witness",
    rAntEnabled: rAntOfEnabled(species, consume, marking),
    infl: datalogStepInfl(species, consume, baseSupport),
    mono: datalogStepMono(species, consume, Object.freeze({ A: true, B: false, C: false }), baseSupport),
    fireBelowDatalog: supportFireLeDatalog(species, consume, marking),
    gap: consumptionIsTheGap(species, consume, marking, "A"),
    catalyticEquality: supportFireEqDatalogOfNoConsumption(species, catalytic, catalyticMarking),
    capturedLeanModule: "Obsmetrologia.Relational.Reaction.SupportProjection",
  });
}
