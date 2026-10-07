/**
 * models/quantum-contextuality/measurement-scenario - finite possibilistic contextuality.
 *
 * This captures `Obsmetrologia.Relational.Quantum.MeasurementScenario`: finite
 * measurement covers, support-level empirical models, global sections,
 * deterministic non-contextuality, compatible families, and the PR-box strong
 * contextuality witness.
 */

const normalizeMeasurements = (
  measurements,
  caller,
) => {
  const normalized = Object.freeze([...new Set(measurements.map((item) => {
    const trimmed = item.trim();
    if (trimmed.length === 0) throw new TypeError(`${caller}: measurement names must be nonempty`);
    return trimmed;
  }))]);
  if (normalized.length === 0) throw new TypeError(`${caller}: expected at least one measurement`);
  return normalized;
};

function normalizeAssignment(
  measurements,
  assignment,
  caller,
) {
  return Object.freeze(Object.fromEntries(measurements.map((measurement) => {
    if (!Object.hasOwn(assignment, measurement)) throw new TypeError(`${caller}: missing outcome for ${measurement}`);
    return [measurement, assignment[measurement]];
  })));
}

/** Every outcome assignment over the given measurements — the finite section space. */
export function assignments(
  measurements,
  outcomes,
) {
  if (measurements.length === 0) return Object.freeze([Object.freeze({})]);
  const [head, ...tail] = measurements;
  const tailAssignments = assignments(tail, outcomes);
  return Object.freeze(outcomes.flatMap((outcome) =>
    tailAssignments.map((tailAssignment) => Object.freeze({
      [head]: outcome,
      ...tailAssignment,
    }))));
}

export function measurementScenario(
  measurements,
  contexts,
) {
  const admittedMeasurements = normalizeMeasurements(measurements, "measurementScenario");
  if (contexts.length === 0) throw new TypeError("measurementScenario: expected at least one context");
  const known = new Set(admittedMeasurements);
  const admittedContexts = Object.freeze(contexts.map((context) => {
    const admitted = normalizeMeasurements(context, "measurementScenario.context");
    for (const measurement of admitted) {
      if (!known.has(measurement)) throw new TypeError(`measurementScenario: unknown measurement ${measurement}`);
    }
    return admitted;
  }));
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.scenario",
    measurements: admittedMeasurements,
    contexts: admittedContexts,
  });
}

export function empiricalModel(
  scenario,
  outcomes,
  support,
) {
  if (outcomes.length === 0) throw new TypeError("empiricalModel: expected at least one outcome");
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.model",
    scenario,
    outcomes: Object.freeze([...outcomes]),
    support,
  });
}

export function hasGlobalSection(
  model,
) {
  const found = assignments(model.scenario.measurements, model.outcomes).find((assignment) =>
    model.scenario.contexts.every((context) => model.support(context, assignment)));
  if (found === undefined) return undefined;
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.hasGlobalSection:witness",
    model,
    assignment: found,
    leanDefinition: "Obsmetrologia.Relational.Quantum.HasGlobalSection",
  });
}

export function allContextsInhabited(
  model,
) {
  const all = assignments(model.scenario.measurements, model.outcomes);
  const localWitnesses = [];
  for (const context of model.scenario.contexts) {
    const found = all.find((assignment) => model.support(context, assignment));
    if (found === undefined) return undefined;
    localWitnesses.push(found);
  }
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.allContextsInhabited:witness",
    model,
    localWitnesses: Object.freeze(localWitnesses),
    leanDefinition: "Obsmetrologia.Relational.Quantum.AllContextsInhabited",
  });
}

export function globalSectionInhabits(
  globalSection,
) {
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.allContextsInhabited:witness",
    model: globalSection.model,
    localWitnesses: Object.freeze(globalSection.model.scenario.contexts.map(() => globalSection.assignment)),
    leanDefinition: "Obsmetrologia.Relational.Quantum.AllContextsInhabited",
  });
}

export function stronglyContextual(
  model,
) {
  const inhabited = allContextsInhabited(model);
  if (inhabited === undefined || hasGlobalSection(model) !== undefined) return undefined;
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.stronglyContextual:witness",
    inhabited,
    hasNoGlobalSection: true,
    leanTheorem: "Obsmetrologia.Relational.Quantum.stronglyContextual_iff",
  });
}

export function noncontextualNotStronglyContextual(
  globalSection,
) {
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.noncontextual_not_stronglyContextual:witness",
    globalSection,
    excludesStrongContextuality: true,
    leanTheorem: "Obsmetrologia.Relational.Quantum.noncontextual_not_stronglyContextual",
  });
}

export function compatibleFamily(
  scenario,
  family,
) {
  if (family.length !== scenario.contexts.length) throw new TypeError("compatibleFamily: expected one section per context");
  const compatible = scenario.contexts.every((context, i) =>
    scenario.contexts.every((otherContext, j) =>
      context.every((measurement) =>
        !otherContext.includes(measurement) || family[i][measurement] === family[j][measurement])));
  if (!compatible) throw new TypeError("compatibleFamily: family does not agree on context overlaps");
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.compatibleFamily:witness",
    scenario,
    family: Object.freeze(family.map((assignment) => normalizeAssignment(scenario.measurements, assignment, "compatibleFamily"))),
    compatible: true,
    leanDefinition: "Obsmetrologia.Relational.Quantum.CompatibleFamily",
  });
}

export function globalSectionRestrictsCompatible(
  scenario,
  global,
) {
  const admittedGlobal = normalizeAssignment(scenario.measurements, global, "globalSectionRestrictsCompatible");
  const family = compatibleFamily(scenario, scenario.contexts.map(() => admittedGlobal));
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.globalSection_restricts_compatible:witness",
    scenario,
    global: admittedGlobal,
    family,
    leanTheorem: "Obsmetrologia.Relational.Quantum.globalSection_restricts_compatible",
  });
}

export function deterministicModel(
  scenario,
  outcomes,
  hidden,
) {
  const admittedHidden = normalizeAssignment(scenario.measurements, hidden, "deterministicModel");
  return empiricalModel(scenario, outcomes, (context, assignment) =>
    context.every((measurement) => assignment[measurement] === admittedHidden[measurement]));
}

export function deterministicNotStronglyContextual(
  scenario,
  outcomes,
  hidden,
) {
  const model = deterministicModel(scenario, outcomes, hidden);
  const globalSection = hasGlobalSection(model);
  if (globalSection === undefined) throw new TypeError("deterministicNotStronglyContextual: deterministic model had no global section");
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.deterministic_not_stronglyContextual:witness",
    model,
    globalSection,
    notStronglyContextual: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.deterministic_hasGlobalSection",
      "Obsmetrologia.Relational.Quantum.deterministic_not_stronglyContextual",
    ]),
  });
}

export const prMeasurements = Object.freeze(["a", "aPrime", "b", "bPrime"]);

export function primed(measurement) {
  return measurement === "aPrime" || measurement === "bPrime";
}

export function prScenario() {
  return measurementScenario(prMeasurements, [
    Object.freeze(["a", "b"]),
    Object.freeze(["a", "bPrime"]),
    Object.freeze(["aPrime", "b"]),
    Object.freeze(["aPrime", "bPrime"]),
  ]);
}

export function prAllowed(
  context,
  assignment,
) {
  if (context.length !== 2) return false;
  const [left, right] = context;
  return (assignment[left] !== assignment[right]) === (primed(left) && primed(right));
}

export function prBox() {
  return empiricalModel(prScenario(), Object.freeze([false, true]), prAllowed);
}

export function prBoxStronglyContextual() {
  const model = prBox();
  const inhabited = allContextsInhabited(model);
  if (inhabited === undefined || hasGlobalSection(model) !== undefined) {
    throw new TypeError("prBoxStronglyContextual: PR box contextuality check failed");
  }
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.prBox_strongly_contextual:witness",
    scenario: model.scenario,
    model,
    inhabited,
    noGlobalSection: true,
    stronglyContextual: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.prBox_inhabited",
      "Obsmetrologia.Relational.Quantum.prBox_no_global",
      "Obsmetrologia.Relational.Quantum.prBox_strongly_contextual",
    ]),
  });
}

export function measurementScenarioReceipt() {
  const scenario = prScenario();
  const hidden = Object.freeze({ a: false, aPrime: false, b: false, bPrime: false });
  const deterministic = deterministicNotStronglyContextual(scenario, Object.freeze([false, true]), hidden);
  const globalSection = deterministic.globalSection;
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.receipt:witness",
    globalSection,
    globalInhabits: globalSectionInhabits(globalSection),
    noncontextualExcludesStrong: noncontextualNotStronglyContextual(globalSection),
    compatibleFamily: globalSectionRestrictsCompatible(scenario, hidden),
    deterministicBaseline: deterministic,
    prBox: prBoxStronglyContextual(),
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.MeasurementScenario",
  });
}
