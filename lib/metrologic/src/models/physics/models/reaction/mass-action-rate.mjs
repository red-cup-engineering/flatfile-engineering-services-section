/**
 * models/reaction/mass-action-rate - finite real-valued reaction rates.
 *
 * This captures `Obsmetrologia.Relational.Reaction.MassActionRate`: natural
 * powers over real readouts, mass-action propensities, net stoichiometry, rate
 * vector fields, Euler steps, and equilibrium fixed points.
 */

const EPSILON = 1e-10;

const assertNat = (value, caller) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${caller}: expected a safe natural number`);
  return value;
};

const assertReal = (value, caller) => {
  if (!Number.isFinite(value)) throw new RangeError(`${caller}: expected a finite real readout`);
  return value;
};

const closeEnough = (left, right) => Math.abs(left - right) <= EPSILON;

function normalizeSpecies(species, caller) {
  const normalized = Object.freeze([...new Set(species.map((item) => {
    const trimmed = item.trim();
    if (trimmed.length === 0) throw new TypeError(`${caller}: species labels must be nonempty`);
    return trimmed;
  }))]);
  if (normalized.length === 0) throw new TypeError(`${caller}: expected at least one species`);
  return normalized;
}

function normalizeCountVector(
  species,
  vector,
  caller,
) {
  return Object.freeze(Object.fromEntries(species.map((item) => {
    if (!Object.hasOwn(vector, item)) throw new TypeError(`${caller}: missing count for ${item}`);
    return [item, assertNat(vector[item], caller)];
  })));
}

function normalizeConcentration(
  species,
  concentration,
  caller,
) {
  return Object.freeze(Object.fromEntries(species.map((item) => {
    if (!Object.hasOwn(concentration, item)) throw new TypeError(`${caller}: missing concentration for ${item}`);
    return [item, assertReal(concentration[item], caller)];
  })));
}

function sameConcentration(
  species,
  left,
  right,
) {
  return species.every((item) => closeEnough(left[item], right[item]));
}

export function reaction(
  species,
  reactant,
  product,
) {
  const admittedSpecies = normalizeSpecies(species, "reaction");
  return Object.freeze({
    kind: "relational.reaction.reaction",
    species: admittedSpecies,
    reactant: normalizeCountVector(admittedSpecies, reactant, "reaction.reactant"),
    product: normalizeCountVector(admittedSpecies, product, "reaction.product"),
  });
}

export function rpow(base, exponent) {
  const admittedBase = assertReal(base, "rpow");
  const admittedExponent = assertNat(exponent, "rpow");
  let result = 1;
  for (let index = 0; index < admittedExponent; index += 1) result *= admittedBase;
  return result;
}

export function rpowAdd(base, m, n) {
  const admittedM = assertNat(m, "rpowAdd");
  const admittedN = assertNat(n, "rpowAdd");
  const left = rpow(base, admittedM + admittedN);
  const right = rpow(base, admittedM) * rpow(base, admittedN);
  if (!closeEnough(left, right)) throw new TypeError("rpowAdd: natural-power product law failed");
  return Object.freeze({
    kind: "relational.reaction.massAction.rpow_add:witness",
    base,
    m: admittedM,
    n: admittedN,
    left,
    right,
    multiplicative: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.rpow_add",
  });
}

export const rnat = (n) => assertNat(n, "rnat");

export function rprod(
  species,
  valueAt,
) {
  return normalizeSpecies(species, "rprod").reduce((product, item) => product * assertReal(valueAt(item), "rprod"), 1);
}

export function propensity(
  species,
  rateConstant,
  r,
  concentration,
) {
  const admittedSpecies = normalizeSpecies(species, "propensity");
  const admittedConcentration = normalizeConcentration(admittedSpecies, concentration, "propensity");
  return assertReal(rateConstant, "propensity") * rprod(admittedSpecies, (item) =>
    rpow(admittedConcentration[item], r.reactant[item] ?? 0));
}

export function propensityZeroOfZeroRate(
  species,
  r,
  concentration,
) {
  const value = propensity(species, 0, r, concentration);
  if (!closeEnough(value, 0)) throw new TypeError("propensityZeroOfZeroRate: zero rate did not give zero propensity");
  return Object.freeze({
    kind: "relational.reaction.massAction.propensity_zero_of_zero_rate:witness",
    reaction: r,
    concentration: normalizeConcentration(r.species, concentration, "propensityZeroOfZeroRate"),
    propensity: 0,
    leanTheorem: "Obsmetrologia.Relational.Reaction.propensity_zero_of_zero_rate",
  });
}

export function propensityNonneg(
  species,
  rateConstant,
  r,
  concentration,
) {
  if (rateConstant < 0) throw new TypeError("propensityNonneg: rate constant must be nonnegative");
  const admittedConcentration = normalizeConcentration(r.species, concentration, "propensityNonneg");
  if (r.species.some((item) => admittedConcentration[item] < 0)) {
    throw new TypeError("propensityNonneg: concentrations must be nonnegative");
  }
  const value = propensity(species, rateConstant, r, admittedConcentration);
  if (value < -EPSILON) throw new TypeError("propensityNonneg: propensity is negative");
  return Object.freeze({
    kind: "relational.reaction.massAction.propensity_nonneg:witness",
    reaction: r,
    rateConstant,
    concentration: admittedConcentration,
    propensity: value,
    nonnegative: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.propensity_nonneg",
  });
}

export function netStoich(r) {
  return Object.freeze(Object.fromEntries(r.species.map((item) => [
    item,
    rnat(r.product[item]) - rnat(r.reactant[item]),
  ])));
}

export function massActionField(
  species,
  reactions,
  rateConstant,
  concentration,
) {
  const admittedSpecies = normalizeSpecies(species, "massActionField");
  const admittedConcentration = normalizeConcentration(admittedSpecies, concentration, "massActionField");
  const totals = Object.fromEntries(admittedSpecies.map((item) => [item, 0]));
  for (const r of reactions) {
    const p = propensity(admittedSpecies, rateConstant(r), r, admittedConcentration);
    const net = netStoich(r);
    for (const item of admittedSpecies) totals[item] += p * (net[item] ?? 0);
  }
  return Object.freeze(totals);
}

export function eulerStep(
  species,
  field,
  dt,
  concentration,
) {
  const admittedSpecies = normalizeSpecies(species, "eulerStep");
  const admittedConcentration = normalizeConcentration(admittedSpecies, concentration, "eulerStep");
  const vector = normalizeConcentration(admittedSpecies, field(admittedConcentration), "eulerStep.field");
  const admittedDt = assertReal(dt, "eulerStep");
  return Object.freeze(Object.fromEntries(admittedSpecies.map((item) => [
    item,
    admittedConcentration[item] + admittedDt * vector[item],
  ])));
}

export function isEquilibrium(
  species,
  field,
  concentration,
) {
  const admittedSpecies = normalizeSpecies(species, "isEquilibrium");
  const vector = normalizeConcentration(admittedSpecies, field(concentration), "isEquilibrium.field");
  return admittedSpecies.every((item) => closeEnough(vector[item], 0));
}

export function equilibriumIsFixed(
  species,
  field,
  dt,
  concentration,
) {
  const admittedConcentration = normalizeConcentration(species, concentration, "equilibriumIsFixed");
  if (!isEquilibrium(species, field, admittedConcentration)) throw new TypeError("equilibriumIsFixed: concentration is not an equilibrium");
  const next = eulerStep(species, field, dt, admittedConcentration);
  if (!sameConcentration(species, next, admittedConcentration)) {
    throw new TypeError("equilibriumIsFixed: equilibrium moved under Euler step");
  }
  return Object.freeze({
    kind: "relational.reaction.massAction.equilibrium_is_fixed:witness",
    concentration: admittedConcentration,
    dt,
    next,
    fixed: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.equilibrium_is_fixed",
  });
}

export function eulerStepZeroDt(
  species,
  field,
  concentration,
) {
  const admittedConcentration = normalizeConcentration(species, concentration, "eulerStepZeroDt");
  const next = eulerStep(species, field, 0, admittedConcentration);
  if (!sameConcentration(species, next, admittedConcentration)) {
    throw new TypeError("eulerStepZeroDt: zero timestep moved the concentration");
  }
  return Object.freeze({
    kind: "relational.reaction.massAction.eulerStep_zero_dt:witness",
    concentration: admittedConcentration,
    next,
    fixed: true,
    leanTheorem: "Obsmetrologia.Relational.Reaction.eulerStep_zero_dt",
  });
}

export function massActionRateReceipt() {
  const species = Object.freeze(["A", "B", "C"]);
  const combine = reaction(species, Object.freeze({ A: 1, B: 1, C: 0 }), Object.freeze({ A: 0, B: 0, C: 1 }));
  const concentration = Object.freeze({ A: 2, B: 3, C: 0 });
  const zeroField = (_c) =>
    Object.freeze({ A: 0, B: 0, C: 0 });
  return Object.freeze({
    kind: "relational.reaction.massAction.receipt:witness",
    rpowAdd: rpowAdd(2, 3, 4),
    zeroRate: propensityZeroOfZeroRate(species, combine, concentration),
    propensityNonneg: propensityNonneg(species, 0.5, combine, concentration),
    equilibriumFixed: equilibriumIsFixed(species, zeroField, 0.25, concentration),
    zeroDt: eulerStepZeroDt(species, (c) => massActionField(species, [combine], () => 0.5, c), concentration),
    capturedLeanModule: "Obsmetrologia.Relational.Reaction.MassActionRate",
  });
}
