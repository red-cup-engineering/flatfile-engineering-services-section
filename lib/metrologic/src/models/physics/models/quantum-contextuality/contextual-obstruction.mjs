/**
 * models/quantum-contextuality/contextual-obstruction - logical contextuality hierarchy.
 *
 * This captures `Obsmetrologia.Relational.Quantum.ContextualObstruction`:
 * extension of local sections, logical contextuality, possibilistic
 * noncontextuality, strong-to-logical contextuality, and the PR-box rung.
 */

import {
  assignments,
  prBox,
  stronglyContextual,

} from "./measurement-scenario.mjs";

function agreesOnContext(
  context,
  left,
  right,
) {
  return context.every((measurement) => left[measurement] === right[measurement]);
}

export function extendsLocalSection(
  model,
  context,
  localSection,
) {
  const global = assignments(model.scenario.measurements, model.outcomes).find((candidate) =>
    agreesOnContext(context, candidate, localSection)
      && model.scenario.contexts.every((candidateContext) => model.support(candidateContext, candidate)));
  if (global === undefined) return undefined;
  return Object.freeze({
    kind: "relational.quantum.contextualObstruction.extends:witness",
    model,
    context,
    localSection,
    globalSection: global,
    agreesOnContext: true,
    leanDefinition: "Obsmetrologia.Relational.Quantum.Extends",
  });
}

export function logicallyContextual(
  model,
) {
  const all = assignments(model.scenario.measurements, model.outcomes);
  for (const context of model.scenario.contexts) {
    for (const localSection of all) {
      if (!model.support(context, localSection)) continue;
      if (extendsLocalSection(model, context, localSection) !== undefined) continue;
      return Object.freeze({
        kind: "relational.quantum.contextualObstruction.logicallyContextual:witness",
        model,
        context,
        localSection,
        supportedLocally: true,
        extendsToNoGlobalSection: true,
        leanDefinition: "Obsmetrologia.Relational.Quantum.LogicallyContextual",
      });
    }
  }
  return undefined;
}

export function possibilisticallyNoncontextual(
  model,
) {
  const all = assignments(model.scenario.measurements, model.outcomes);
  const extensions = [];
  for (const context of model.scenario.contexts) {
    for (const localSection of all) {
      if (!model.support(context, localSection)) continue;
      const extension = extendsLocalSection(model, context, localSection);
      if (extension === undefined) return undefined;
      extensions.push(extension);
    }
  }
  return Object.freeze({
    kind: "relational.quantum.contextualObstruction.possibilisticallyNoncontextual:witness",
    model,
    extensions: Object.freeze(extensions),
    everyLocalSectionExtends: true,
    leanDefinition: "Obsmetrologia.Relational.Quantum.PossibilisticallyNoncontextual",
  });
}

export function noncontextualImpNotLogicallyContextual(
  noncontextual,
) {
  return Object.freeze({
    kind: "relational.quantum.contextualObstruction.noncontextual_imp_not_logicallyContextual:witness",
    noncontextual,
    notLogicallyContextual: true,
    leanTheorem: "Obsmetrologia.Relational.Quantum.noncontextual_imp_not_logicallyContextual",
  });
}

export function stronglyContextualImpLogicallyContextual(
  strong,
) {
  const logical = logicallyContextual(strong.inhabited.model);
  if (logical === undefined) throw new TypeError("stronglyContextualImpLogicallyContextual: strong model had no logical witness");
  return Object.freeze({
    kind: "relational.quantum.contextualObstruction.stronglyContextual_imp_logicallyContextual:witness",
    strong,
    logical,
    leanTheorem: "Obsmetrologia.Relational.Quantum.stronglyContextual_imp_logicallyContextual",
  });
}

export function prBoxLogicallyContextual() {
  const strong = stronglyContextual(prBox());
  if (strong === undefined) throw new TypeError("prBoxLogicallyContextual: PR box was not strongly contextual");
  return Object.freeze({
    kind: "relational.quantum.contextualObstruction.prBox_logicallyContextual:witness",
    logical: stronglyContextualImpLogicallyContextual(strong).logical,
    leanTheorem: "Obsmetrologia.Relational.Quantum.prBox_logicallyContextual",
  });
}

export function contextualObstructionReceipt() {
  return Object.freeze({
    kind: "relational.quantum.contextualObstruction.receipt:witness",
    prBoxLogical: prBoxLogicallyContextual(),
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.ContextualObstruction",
  });
}
