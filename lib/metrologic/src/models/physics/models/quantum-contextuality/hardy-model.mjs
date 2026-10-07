/**
 * models/quantum-contextuality/hardy-model - logical contextuality without strong contextuality.
 *
 * This captures `Obsmetrologia.Relational.Quantum.HardyModel`: Hardy support,
 * the global section that prevents strong contextuality, the local witness that
 * fails to extend, and the strict logical-not-strong phenomenon.
 */

import {
  extendsLocalSection,
  logicallyContextual,

} from "./contextual-obstruction.mjs";
import {
  empiricalModel,
  hasGlobalSection,
  prScenario,
  stronglyContextual,

} from "./measurement-scenario.mjs";

export function hardyAllowed(
  context,
  assignment,
) {
  if (context.length !== 2) return false;
  const [left, right] = context;
  if (left === "a" && right === "b") return !(assignment.a && assignment.b);
  if (left === "a" && right === "bPrime") return !(!assignment.a && assignment.bPrime);
  if (left === "aPrime" && right === "b") return !(assignment.aPrime && !assignment.b);
  if (left === "aPrime" && right === "bPrime") return true;
  return false;
}

export function hardyBox() {
  return empiricalModel(prScenario(), Object.freeze([false, true]), hardyAllowed);
}

export function hardyWitness() {
  return Object.freeze({ a: false, aPrime: true, b: false, bPrime: true });
}

export function hardyBoxHasGlobalSection() {
  const model = hardyBox();
  const globalSection = hasGlobalSection(model);
  if (globalSection === undefined) throw new TypeError("hardyBoxHasGlobalSection: Hardy model had no global section");
  return Object.freeze({
    kind: "relational.quantum.hardyModel.hasGlobalSection:witness",
    model,
    globalSection,
    leanTheorem: "Obsmetrologia.Relational.Quantum.hardyBox_hasGlobalSection",
  });
}

export function hardyWitnessNotExtends() {
  const model = hardyBox();
  const context = Object.freeze(["aPrime", "bPrime"]);
  const localSection = hardyWitness();
  if (!model.support(context, localSection) || extendsLocalSection(model, context, localSection) !== undefined) {
    throw new TypeError("hardyWitnessNotExtends: Hardy local witness check failed");
  }
  return Object.freeze({
    kind: "relational.quantum.hardyModel.witness_not_extends:witness",
    model,
    context,
    localSection,
    supportedLocally: true,
    extendsToNoGlobalSection: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.hardy_witness_support",
      "Obsmetrologia.Relational.Quantum.hardy_witness_not_extends",
    ]),
  });
}

export function hardyBoxLogicalNotStrong() {
  const globalSection = hardyBoxHasGlobalSection();
  const logical = logicallyContextual(globalSection.model);
  if (logical === undefined || stronglyContextual(globalSection.model) !== undefined) {
    throw new TypeError("hardyBoxLogicalNotStrong: Hardy phenomenon check failed");
  }
  return Object.freeze({
    kind: "relational.quantum.hardyModel.logical_not_strong:witness",
    globalSection,
    logical,
    notStronglyContextual: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.hardyBox_logicallyContextual",
      "Obsmetrologia.Relational.Quantum.hardyBox_logical_not_strong",
    ]),
  });
}

export function hardyModelReceipt() {
  return Object.freeze({
    kind: "relational.quantum.hardyModel.receipt:witness",
    globalSection: hardyBoxHasGlobalSection(),
    witnessNotExtends: hardyWitnessNotExtends(),
    logicalNotStrong: hardyBoxLogicalNotStrong(),
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.HardyModel",
  });
}
