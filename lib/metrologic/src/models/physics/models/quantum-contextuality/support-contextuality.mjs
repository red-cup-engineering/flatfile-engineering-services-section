/**
 * models/quantum-contextuality/support-contextuality - probabilistic support weld.
 *
 * This captures `Obsmetrologia.Relational.Quantum.SupportContextuality`: the
 * forgetful map from weighted empirical models to possibilistic support, and
 * the PR-box support's strong-contextuality witness.
 */

import {
  allContextsInhabited,
  empiricalModel,
  hasGlobalSection,
  stronglyContextual,

} from "./measurement-scenario.mjs";
import {
  prBoxP,
  sameAssignmentOnContext,

} from "./empirical-model.mjs";

export function toSupport(
  model,
) {
  const supportModel = empiricalModel(model.scenario, model.outcomes, (context, assignment) =>
    model.dist(context).some((entry) =>
      entry.weight > 0 && sameAssignmentOnContext(context, entry.assignment, assignment)));
  return Object.freeze({
    kind: "relational.quantum.supportContextuality.toSupport:witness",
    probabilisticModel: model,
    supportModel,
    leanDefinition: "Obsmetrologia.Relational.Quantum.toSupport",
  });
}

export function prBoxPToSupportStronglyContextual() {
  const support = toSupport(prBoxP());
  const inhabited = allContextsInhabited(support.supportModel);
  const global = hasGlobalSection(support.supportModel);
  const strong = stronglyContextual(support.supportModel);
  if (inhabited === undefined || global !== undefined || strong === undefined) {
    throw new TypeError("prBoxPToSupportStronglyContextual: support contextuality check failed");
  }
  return Object.freeze({
    kind: "relational.quantum.supportContextuality.prBoxP_toSupport:witness",
    support,
    inhabited: true,
    noGlobalSection: true,
    stronglyContextual: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.prBoxP_toSupport_inhabited",
      "Obsmetrologia.Relational.Quantum.prBoxP_toSupport_no_global",
      "Obsmetrologia.Relational.Quantum.prBoxP_support_strongly_contextual",
    ]),
  });
}

export function supportContextualityReceipt() {
  return Object.freeze({
    kind: "relational.quantum.supportContextuality.receipt:witness",
    prSupport: prBoxPToSupportStronglyContextual(),
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.SupportContextuality",
  });
}
