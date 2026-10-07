/**
 * models/kinetic-theory/boltzmann-closure - finite collisions as closure rules.
 *
 * This is the MetroPlat realization of
 * `Obsmetrologia.Relational.Kinetic.BoltzmannClosure`: a collision contributes a
 * positive closure rule from its incoming pair cell to its outgoing pair cell,
 * and the closure-rule engine supplies the fixed-point/least-closed witness.
 */
import {
  antecedentHolds,
  closureRule,
  closureRuleReceipt,
  closureRuleSystem,
  firedRuleNames,
  tstep,
  valuation,

} from "../../../../articulation/predicating/positing/settling/analysis/closure-rule-system.mjs";
import { readValuationFiber } from "../../../../articulation/predicating/positing/valuation-fiber-algebra.mjs";
import {
  collision,
  evolutionConserves,

} from "./discrete-velocity-collision.mjs";

export const defaultPairCell = (left, right) =>
  `${left}:${right}`;

function uniqueCells(cells) {
  return Object.freeze([...new Set(cells)]);
}

function sameValuation(left, right) {
  return left.points.length === right.points.length
    && left.points.every((point, index) => point === right.points[index] && readValuationFiber(left, point) === readValuationFiber(right, point));
}

function findRule(
  ruleSystem,
  c,
) {
  const rule = ruleSystem.rules.find((candidate) => candidate.collision === c);
  if (rule === undefined) throw new TypeError("BoltzmannClosure: collision is not in the rule system");
  return rule;
}

export function boltzmannCollisionRule(
  pairCell,
  c,
) {
  const antecedentCell = pairCell(c.inL, c.inR);
  const consequentCell = pairCell(c.outL, c.outR);
  const rule = closureRule(
    `boltzmann:${antecedentCell}->${consequentCell}`,
    [Object.freeze({ cell: antecedentCell, atLeast: "potential" })],
    Object.freeze({ cell: consequentCell, reading: "potential" }),
  );
  return Object.freeze({
    kind: "relational.kinetic.boltzmannClosure.collisionRule:witness",
    collision: c,
    antecedentCell,
    consequentCell,
    rule,
    leanDefinition: "Obsmetrologia.Relational.Kinetic.collisionRule",
  });
}

export function boltzmannCollisionRuleSystem(
  pairCell,
  collisions,
) {
  if (collisions.length === 0) throw new TypeError("boltzmannCollisionRuleSystem: expected at least one collision");
  const rules = Object.freeze(collisions.map((c) => boltzmannCollisionRule(pairCell, c)));
  const cells = uniqueCells(rules.flatMap((rule) => [rule.antecedentCell, rule.consequentCell]));
  const system = closureRuleSystem(cells, rules.map((rule) => rule.rule));
  return Object.freeze({
    kind: "relational.kinetic.boltzmannClosure.collisionRuleSystem:witness",
    collisions: Object.freeze([...collisions]),
    rules,
    system,
    leanDefinition: "Obsmetrologia.Relational.Kinetic.collisionRuleSystem",
  });
}

export function collisionSeedValuation(
  ruleSystem,
  positiveCells,
) {
  return valuation(ruleSystem.system.cells, Object.fromEntries(positiveCells.map((cell) => [cell, "potential"])));
}

export function collisionAntecedent(
  pairCell,
  c,
  valuationValue,
) {
  const rule = boltzmannCollisionRule(pairCell, c).rule;
  return Object.freeze({
    kind: "relational.kinetic.boltzmannClosure.collisionAntecedent:witness",
    collision: c,
    cell: pairCell(c.inL, c.inR),
    positive: antecedentHolds(rule, valuationValue),
    leanDefinition: "Obsmetrologia.Relational.Kinetic.collisionAntecedent",
  });
}

export function collisionAntecedentMono(
  ruleSystem,
  c,
  seed,
  closed,
) {
  const rule = findRule(ruleSystem, c);
  if (!antecedentHolds(rule.rule, seed) || !antecedentHolds(rule.rule, closed)) {
    throw new TypeError("collisionAntecedentMono: antecedent did not remain positive");
  }
  return Object.freeze({
    kind: "relational.kinetic.boltzmannClosure.collisionAntecedent_mono:witness",
    collision: c,
    cell: rule.antecedentCell,
    seedPositive: true,
    closedPositive: true,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.collisionAntecedent_mono",
  });
}

export function finiteBoltzmannCollisionLfp(
  ruleSystem,
  seed,
) {
  const receipt = closureRuleReceipt(ruleSystem.system, seed);
  if (!sameValuation(tstep(ruleSystem.system, receipt.closed), receipt.closed)) {
    throw new TypeError("finiteBoltzmannCollisionLfp: closed valuation is not a fixed point");
  }
  return Object.freeze({
    kind: "relational.kinetic.boltzmannClosure.finite_boltzmann_collision_lfp:witness",
    ruleSystem,
    receipt,
    tstepFixed: true,
    seedBelowClosure: true,
    leastFixedPoint: true,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.finite_boltzmann_collision_lfp",
  });
}

export function closedCollisionOutputs(
  ruleSystem,
  lfp,
  c,
) {
  const rule = findRule(ruleSystem, c);
  if (!antecedentHolds(rule.rule, lfp.receipt.closed)) {
    throw new TypeError("closedCollisionOutputs: collision antecedent is not positive in the closed valuation");
  }
  if (readValuationFiber(lfp.receipt.closed, rule.consequentCell) !== "potential") {
    throw new TypeError("closedCollisionOutputs: outgoing pair is not positively asserted");
  }
  return Object.freeze({
    kind: "relational.kinetic.boltzmannClosure.closed_collision_outputs:witness",
    collision: c,
    antecedentCell: rule.antecedentCell,
    consequentCell: rule.consequentCell,
    antecedentPositive: true,
    outputPositive: true,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.closed_collision_outputs",
  });
}

export function finiteCollisionInvariantsPreserved(
  collisions,
  weight,
  initial,
  steps,
) {
  const evolution = evolutionConserves(collisions, weight, initial, steps);
  return Object.freeze({
    kind: "relational.kinetic.boltzmannClosure.finite_collision_invariants_preserved:witness",
    evolution,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.finite_collision_invariants_preserved",
  });
}

export function boltzmannClosureReceipt() {
  const c = collision("neg", "pos", "pos", "neg");
  const ruleSystem = boltzmannCollisionRuleSystem(defaultPairCell, [c]);
  const rule = ruleSystem.rules[0];
  const seed = collisionSeedValuation(ruleSystem, [rule.antecedentCell]);
  const antecedent = collisionAntecedent(defaultPairCell, c, seed);
  const lfp = finiteBoltzmannCollisionLfp(ruleSystem, seed);
  const antecedentMono = collisionAntecedentMono(ruleSystem, c, seed, lfp.receipt.closed);
  const closedOutput = closedCollisionOutputs(ruleSystem, lfp, c);
  const invariantsPreserved = finiteCollisionInvariantsPreserved([c], Object.freeze({ neg: -1, pos: 1 }), ["neg", "pos"], [
    Object.freeze({ collision: c, before: Object.freeze(["neg", "pos"]), after: Object.freeze(["pos", "neg"]) }),
  ]);
  if (!antecedent.positive || !firedRuleNames(ruleSystem.system, seed).includes(rule.rule.name)) {
    throw new TypeError("boltzmannClosureReceipt: seed did not fire the collision rule");
  }
  return Object.freeze({
    kind: "relational.kinetic.boltzmannClosure.receipt:witness",
    rule,
    ruleSystem,
    antecedent,
    antecedentMono,
    lfp,
    closedOutput,
    invariantsPreserved,
    capturedLeanModule: "Obsmetrologia.Relational.Kinetic.BoltzmannClosure",
  });
}
