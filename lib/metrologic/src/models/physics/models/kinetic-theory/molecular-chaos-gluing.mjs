/**
 * models/kinetic-theory/molecular-chaos-gluing - finite molecular-chaos obstruction.
 *
 * This is the MetroPlat realization of
 * `Obsmetrologia.Relational.Kinetic.MolecularChaosGluing`: finite integer
 * two-particle joints, separated gluing, connected-correlation minors, and the
 * concrete EPR obstruction to factorization.
 */

const assertInt = (value, caller) => {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${caller}: expected a safe integer`);
  return value;
};

function normalizeStates(states, caller) {
  const normalized = Object.freeze([...new Set(states.map((state) => {
    const trimmed = state.trim();
    if (trimmed.length === 0) throw new TypeError(`${caller}: states must be nonempty strings`);
    return trimmed;
  }))]);
  if (normalized.length === 0) throw new TypeError(`${caller}: expected at least one finite state`);
  return normalized;
}

function normalizeSection(
  states,
  section,
  caller,
) {
  return Object.freeze(Object.fromEntries(states.map((state) => {
    if (!Object.hasOwn(section, state)) throw new TypeError(`${caller}: missing section value for ${state}`);
    return [state, assertInt(section[state], caller)];
  })));
}

export function jointDistribution(
  states,
  valueAt,
) {
  const admittedStates = normalizeStates(states, "jointDistribution");
  const entries = Object.freeze(admittedStates.flatMap((left) =>
    admittedStates.map((right) => Object.freeze({
      left,
      right,
      value: assertInt(valueAt(left, right), "jointDistribution"),
    }))));
  return Object.freeze({
    kind: "relational.kinetic.joint",
    states: admittedStates,
    entries,
  });
}

export function jointValue(
  joint,
  left,
  right,
) {
  const entry = joint.entries.find((candidate) => candidate.left === left && candidate.right === right);
  if (entry === undefined) throw new TypeError(`jointValue: missing joint entry ${left},${right}`);
  return entry.value;
}

export function glue(
  states,
  leftSection,
  rightSection,
) {
  const admittedStates = normalizeStates(states, "glue");
  const left = normalizeSection(admittedStates, leftSection, "glue");
  const right = normalizeSection(admittedStates, rightSection, "glue");
  return jointDistribution(admittedStates, (v, w) => left[v] * right[w]);
}

export function factorizes(
  joint,
  leftSection,
  rightSection,
) {
  const left = normalizeSection(joint.states, leftSection, "factorizes");
  const right = normalizeSection(joint.states, rightSection, "factorizes");
  const ok = joint.states.every((v) => joint.states.every((w) => jointValue(joint, v, w) === left[v] * right[w]));
  if (!ok) return undefined;
  return Object.freeze({
    kind: "relational.kinetic.factorizes:witness",
    joint,
    leftSection: left,
    rightSection: right,
    factorizes: true,
    leanDefinition: "Obsmetrologia.Relational.Kinetic.Factorizes",
  });
}

export function corr(
  joint,
  a,
  b,
  c,
  d,
) {
  return assertInt(
    jointValue(joint, a, c) * jointValue(joint, b, d) - jointValue(joint, a, d) * jointValue(joint, b, c),
    "corr",
  );
}

export function decorrelated(
  joint,
) {
  const ok = joint.states.every((a) => joint.states.every((b) =>
    joint.states.every((c) => joint.states.every((d) => corr(joint, a, b, c, d) === 0))));
  if (!ok) return undefined;
  return Object.freeze({
    kind: "relational.kinetic.decorrelated:witness",
    joint,
    allCorrelationMinorsVanish: true,
    leanDefinition: "Obsmetrologia.Relational.Kinetic.Decorrelated",
  });
}

export function factorizesImpDecorrelated(
  factorization,
) {
  const decorrelation = decorrelated(factorization.joint);
  if (decorrelation === undefined) {
    throw new TypeError("factorizesImpDecorrelated: factorized joint has a nonzero correlation minor");
  }
  return Object.freeze({
    kind: "relational.kinetic.factorizes_imp_decorrelated:witness",
    factorization,
    decorrelated: decorrelation,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.factorizes_imp_decorrelated",
  });
}

export function corrSwapParticles(
  joint,
  a,
  b,
  c,
  d,
) {
  const value = corr(joint, a, b, c, d);
  const swapped = corr(joint, b, a, c, d);
  if (value !== -swapped) throw new TypeError("corrSwapParticles: correlation minor is not antisymmetric");
  return Object.freeze({
    kind: "relational.kinetic.corr_swap_particles:witness",
    joint,
    a,
    b,
    c,
    d,
    corr: value,
    swapped,
    antisymmetric: true,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.corr_swap_particles",
  });
}

export function glueFactorizes(
  states,
  leftSection,
  rightSection,
) {
  const joint = glue(states, leftSection, rightSection);
  const witness = factorizes(joint, leftSection, rightSection);
  if (witness === undefined) throw new TypeError("glueFactorizes: separated gluing did not factorize");
  return Object.freeze({
    ...witness,
    kind: "relational.kinetic.glue_factorizes:witness",
    leanTheorem: "Obsmetrologia.Relational.Kinetic.glue_factorizes",
  });
}

export function eprJoint() {
  return jointDistribution(Object.freeze(["0", "1"]), (left, right) => left === right ? 1 : 0);
}

export function eprCorrOne() {
  const joint = eprJoint();
  const value = corr(joint, "0", "1", "0", "1");
  if (value !== 1) throw new TypeError("eprCorrOne: expected EPR correlation minor to equal one");
  return Object.freeze({
    kind: "relational.kinetic.epr_corr_one:witness",
    joint,
    corr: 1,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.epr_corr_one",
  });
}

export function eprNotFactorizes() {
  const obstruction = eprCorrOne();
  const decorrelation = decorrelated(obstruction.joint);
  if (decorrelation !== undefined) throw new TypeError("eprNotFactorizes: EPR joint unexpectedly decorrelated");
  return Object.freeze({
    kind: "relational.kinetic.epr_not_factorizes:witness",
    joint: obstruction.joint,
    obstruction,
    notFactorizes: true,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.epr_not_factorizes",
  });
}

export function molecularChaosGluingReceipt() {
  const states = Object.freeze(["0", "1"]);
  const left = Object.freeze({ "0": 2, "1": 3 });
  const right = Object.freeze({ "0": 5, "1": 7 });
  const glued = glueFactorizes(states, left, right);
  const factorizedIsDecorrelated = factorizesImpDecorrelated(glued);
  const corrSwap = corrSwapParticles(eprJoint(), "0", "1", "0", "1");
  const eprCorrelation = eprCorrOne();
  const eprObstruction = eprNotFactorizes();
  return Object.freeze({
    kind: "relational.kinetic.molecularChaosGluing.receipt:witness",
    glueFactorizes: glued,
    factorizedIsDecorrelated,
    corrSwap,
    eprCorrelation,
    eprNotFactorizes: eprObstruction,
    capturedLeanModule: "Obsmetrologia.Relational.Kinetic.MolecularChaosGluing",
  });
}
