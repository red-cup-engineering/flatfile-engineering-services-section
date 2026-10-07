/**
 * models/quantum-contextuality/hardy-empirical-model - Hardy no-signaling empirical model.
 *
 * This captures `Obsmetrologia.Relational.Quantum.HardyEmpiricalModel`: the
 * weighted no-signaling Hardy distributions and the logical-not-strong
 * phenomenon in their possibilistic support.
 */

import {
  logicallyContextual,
} from "./contextual-obstruction.mjs";
import {
  noSignaling,
  prAssignment,
  probabilisticModel,
  weightedAssignment,

} from "./empirical-model.mjs";
import {
  hasGlobalSection,
  prMeasurements,
  prScenario,
  stronglyContextual,

} from "./measurement-scenario.mjs";
import {
  toSupport,
} from "./support-contextuality.mjs";

function contextEquals(left, right) {
  return left.length === right.length && left.every((measurement, index) => measurement === right[index]);
}

export function hardyDistB(context) {
  if (contextEquals(context, ["a", "b"])) {
    return Object.freeze([
      weightedAssignment(prMeasurements, prAssignment(false, false, true, false), 2),
      weightedAssignment(prMeasurements, prAssignment(true, false, false, false), 2),
    ]);
  }
  if (contextEquals(context, ["a", "bPrime"])) {
    return Object.freeze([
      weightedAssignment(prMeasurements, prAssignment(false, false, false, false), 2),
      weightedAssignment(prMeasurements, prAssignment(true, false, false, true), 2),
    ]);
  }
  if (contextEquals(context, ["aPrime", "b"])) {
    return Object.freeze([
      weightedAssignment(prMeasurements, prAssignment(false, false, false, false), 2),
      weightedAssignment(prMeasurements, prAssignment(false, true, true, false), 2),
    ]);
  }
  if (contextEquals(context, ["aPrime", "bPrime"])) {
    return Object.freeze([
      weightedAssignment(prMeasurements, prAssignment(false, false, false, false), 1),
      weightedAssignment(prMeasurements, prAssignment(false, false, false, true), 1),
      weightedAssignment(prMeasurements, prAssignment(false, true, false, false), 1),
      weightedAssignment(prMeasurements, prAssignment(false, true, false, true), 1),
    ]);
  }
  return Object.freeze([]);
}

export function hardyBoxP() {
  return probabilisticModel(prScenario(), Object.freeze([false, true]), hardyDistB);
}

export function hardyBoxPNoSignaling() {
  const model = hardyBoxP();
  const witness = noSignaling(model);
  if (witness === undefined) throw new TypeError("hardyBoxPNoSignaling: Hardy empirical model was signaling");
  return Object.freeze({
    kind: "relational.quantum.hardyEmpiricalModel.noSignaling:witness",
    model,
    noSignaling: witness,
    contextDistributionsVary: true,
    leanTheorem: "Obsmetrologia.Relational.Quantum.hardyBoxP_noSignaling",
  });
}

export function hardyBoxPSupportLogicalNotStrong() {
  const noSignalingWitness = hardyBoxPNoSignaling();
  const support = toSupport(noSignalingWitness.model).supportModel;
  const global = hasGlobalSection(support);
  if (global === undefined || logicallyContextual(support) === undefined || stronglyContextual(support) !== undefined) {
    throw new TypeError("hardyBoxPSupportLogicalNotStrong: Hardy support phenomenon check failed");
  }
  return Object.freeze({
    kind: "relational.quantum.hardyEmpiricalModel.support_logical_not_strong:witness",
    noSignaling: noSignalingWitness,
    supportGlobalSection: global,
    logicallyContextual: true,
    notStronglyContextual: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.hardyBoxP_support_hasGlobalSection",
      "Obsmetrologia.Relational.Quantum.hardyBoxP_support_not_stronglyContextual",
      "Obsmetrologia.Relational.Quantum.hardyBoxP_witness_support",
      "Obsmetrologia.Relational.Quantum.hardyBoxP_witness_not_extends",
      "Obsmetrologia.Relational.Quantum.hardyBoxP_support_logicallyContextual",
      "Obsmetrologia.Relational.Quantum.hardyBoxP_support_logical_not_strong",
    ]),
  });
}

export function hardyEmpiricalModelReceipt() {
  return Object.freeze({
    kind: "relational.quantum.hardyEmpiricalModel.receipt:witness",
    noSignaling: hardyBoxPNoSignaling(),
    supportPhenomenon: hardyBoxPSupportLogicalNotStrong(),
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.HardyEmpiricalModel",
  });
}
