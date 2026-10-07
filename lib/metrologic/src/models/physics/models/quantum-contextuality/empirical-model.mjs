/**
 * models/quantum-contextuality/empirical-model - finite weighted empirical models.
 *
 * This captures `Obsmetrologia.Relational.Quantum.EmpiricalModel`: weighted
 * context distributions, single-measurement marginals, no-signaling, induced
 * global distributions, and the probabilistic PR-box witness.
 */

import {
  measurementScenario,
  prMeasurements,
  prScenario,

} from "./measurement-scenario.mjs";

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

function contextEquals(left, right) {
  return left.length === right.length && left.every((measurement, index) => measurement === right[index]);
}

function sameAssignmentOnContext(
  context,
  left,
  right,
) {
  return context.every((measurement) => left[measurement] === right[measurement]);
}

function normalizeDistribution(
  measurements,
  distribution,
  caller,
) {
  return Object.freeze(distribution.map((entry) => {
    if (!Number.isInteger(entry.weight) || entry.weight < 0) {
      throw new TypeError(`${caller}: weights must be natural-number counts`);
    }
    return Object.freeze({
      assignment: normalizeAssignment(measurements, entry.assignment, caller),
      weight: entry.weight,
    });
  }));
}

function admittedContext(
  scenario,
  context,
  caller,
) {
  const found = scenario.contexts.find((candidate) => contextEquals(candidate, context));
  if (found === undefined) throw new TypeError(`${caller}: context is not in the scenario`);
  return found;
}

export function weightedAssignment(
  measurements,
  assignment,
  weight,
) {
  return normalizeDistribution(measurements, [Object.freeze({ assignment, weight })], "weightedAssignment")[0];
}

export function singleMarginal(
  distribution,
  measurement,
  outcome,
) {
  return distribution.reduce((total, entry) => entry.assignment[measurement] === outcome ? total + entry.weight : total, 0);
}

export function probabilisticModel(
  scenario,
  outcomes,
  dist,
) {
  if (outcomes.length === 0) throw new TypeError("probabilisticModel: expected at least one outcome");
  return Object.freeze({
    kind: "relational.quantum.empiricalModel.pModel",
    scenario,
    outcomes: Object.freeze([...outcomes]),
    dist: (context) => {
      const admitted = admittedContext(scenario, context, "probabilisticModel.dist");
      return normalizeDistribution(scenario.measurements, dist(admitted), "probabilisticModel.dist");
    },
  });
}

export function noSignaling(
  model,
) {
  for (const context of model.scenario.contexts) {
    for (const otherContext of model.scenario.contexts) {
      for (const measurement of context) {
        if (!otherContext.includes(measurement)) continue;
        for (const outcome of model.outcomes) {
          if (singleMarginal(model.dist(context), measurement, outcome) !== singleMarginal(model.dist(otherContext), measurement, outcome)) {
            return undefined;
          }
        }
      }
    }
  }
  return Object.freeze({
    kind: "relational.quantum.empiricalModel.noSignaling:witness",
    model,
    noSignaling: true,
    leanDefinition: "Obsmetrologia.Relational.Quantum.NoSignaling",
  });
}

export function inducedModel(
  scenario,
  outcomes,
  globalDistribution,
) {
  const admitted = normalizeDistribution(scenario.measurements, globalDistribution, "inducedModel");
  return probabilisticModel(scenario, outcomes, () => admitted);
}

export function globalDistImpliesNoSignaling(
  scenario,
  outcomes,
  globalDistribution,
) {
  const model = inducedModel(scenario, outcomes, globalDistribution);
  const witness = noSignaling(model);
  if (witness === undefined) throw new TypeError("globalDistImpliesNoSignaling: induced model was signaling");
  return Object.freeze({
    kind: "relational.quantum.empiricalModel.globalDist_implies_noSignaling:witness",
    scenario,
    globalDistribution: model.dist(scenario.contexts[0]),
    model,
    noSignaling: witness,
    leanTheorem: "Obsmetrologia.Relational.Quantum.globalDist_implies_noSignaling",
  });
}

export function prAssignment(a, aPrime, b, bPrime) {
  return Object.freeze({ a, aPrime, b, bPrime });
}

export function prDistB(context) {
  const allFalse = prAssignment(false, false, false, false);
  if (contextEquals(context, ["a", "b"])) {
    return Object.freeze([
      weightedAssignment(prMeasurements, allFalse, 1),
      weightedAssignment(prMeasurements, prAssignment(true, false, true, false), 1),
    ]);
  }
  if (contextEquals(context, ["a", "bPrime"])) {
    return Object.freeze([
      weightedAssignment(prMeasurements, allFalse, 1),
      weightedAssignment(prMeasurements, prAssignment(true, false, false, true), 1),
    ]);
  }
  if (contextEquals(context, ["aPrime", "b"])) {
    return Object.freeze([
      weightedAssignment(prMeasurements, allFalse, 1),
      weightedAssignment(prMeasurements, prAssignment(false, true, true, false), 1),
    ]);
  }
  if (contextEquals(context, ["aPrime", "bPrime"])) {
    return Object.freeze([
      weightedAssignment(prMeasurements, prAssignment(false, false, false, true), 1),
      weightedAssignment(prMeasurements, prAssignment(false, true, false, false), 1),
    ]);
  }
  return Object.freeze([]);
}

export function prBoxP() {
  return probabilisticModel(prScenario(), Object.freeze([false, true]), prDistB);
}

export function prBoxPNoSignaling() {
  const model = prBoxP();
  const witness = noSignaling(model);
  if (witness === undefined) throw new TypeError("prBoxPNoSignaling: PR-box model was signaling");
  return Object.freeze({
    kind: "relational.quantum.empiricalModel.prBoxP_noSignaling:witness",
    model,
    noSignaling: witness,
    contextDistributionsVary: true,
    leanTheorem: "Obsmetrologia.Relational.Quantum.prBoxP_noSignaling",
  });
}

export function empiricalModelReceipt() {
  const scenario = measurementScenario(prMeasurements, [["a", "b"], ["a", "bPrime"]]);
  const globalDistribution = Object.freeze([
    weightedAssignment(prMeasurements, prAssignment(false, false, false, false), 2),
    weightedAssignment(prMeasurements, prAssignment(true, false, true, false), 1),
  ]);
  return Object.freeze({
    kind: "relational.quantum.empiricalModel.receipt:witness",
    globalNoSignaling: globalDistImpliesNoSignaling(scenario, Object.freeze([false, true]), globalDistribution),
    prBoxNoSignaling: prBoxPNoSignaling(),
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.EmpiricalModel",
  });
}

export { sameAssignmentOnContext };
