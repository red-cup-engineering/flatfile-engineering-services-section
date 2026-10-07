/**
 * models/quantum-contextuality/leggett-garg - temporal contextuality and K3.
 *
 * This captures `Obsmetrologia.Relational.Quantum.LeggettGarg`: the three-time
 * temporal scenario, perfect-correlation macrorealism violation, the integer
 * Leggett-Garg bound, and the internal-real quantum-value separation.
 */

import {
  allContextsInhabited,
  empiricalModel,
  hasGlobalSection,
  measurementScenario,
  stronglyContextual,

} from "./measurement-scenario.mjs";

export function lgScenario() {
  return measurementScenario(Object.freeze(["t0", "t1", "t2"]), [
    Object.freeze(["t0", "t1"]),
    Object.freeze(["t1", "t2"]),
    Object.freeze(["t0", "t2"]),
  ]);
}

export function lgAllowed(
  context,
  assignment,
) {
  if (context.length !== 2) return false;
  const [left, right] = context;
  if (left === "t0" && right === "t2") return assignment.t0 !== assignment.t2;
  return assignment[left] === assignment[right];
}

export function lgPerfect() {
  return empiricalModel(lgScenario(), Object.freeze([false, true]), lgAllowed);
}

export function lgPerfectMacrorealismViolated() {
  const model = lgPerfect();
  if (allContextsInhabited(model) === undefined || hasGlobalSection(model) !== undefined || stronglyContextual(model) === undefined) {
    throw new TypeError("lgPerfectMacrorealismViolated: temporal contextuality check failed");
  }
  return Object.freeze({
    kind: "relational.quantum.leggettGarg.macrorealism_violated:witness",
    model,
    inhabited: true,
    noGlobalTrajectory: true,
    stronglyContextual: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.lgPerfect_inhabited",
      "Obsmetrologia.Relational.Quantum.lgPerfect_no_global",
      "Obsmetrologia.Relational.Quantum.lgPerfect_macrorealism_violated",
    ]),
  });
}

export function isSign(trajectory) {
  return (trajectory.t0 === 1 || trajectory.t0 === -1)
    && (trajectory.t1 === 1 || trajectory.t1 === -1)
    && (trajectory.t2 === 1 || trajectory.t2 === -1);
}

export function k3(trajectory) {
  return trajectory.t0 * trajectory.t1 + trajectory.t1 * trajectory.t2 - trajectory.t0 * trajectory.t2;
}

export function lgMacrorealistBound(trajectory) {
  const value = k3(trajectory);
  if (value > 1) throw new TypeError("lgMacrorealistBound: trajectory violates the macrorealist bound");
  return Object.freeze({
    kind: "relational.quantum.leggettGarg.macrorealist_bound:witness",
    trajectory,
    k3: value,
    bound: 1,
    withinBound: true,
    leanTheorem: "Obsmetrologia.Relational.Quantum.lg_macrorealist_bound",
  });
}

export function lgQuantumValueNotMacrorealist(trajectory) {
  const macrorealist = lgMacrorealistBound(trajectory);
  return Object.freeze({
    kind: "relational.quantum.leggettGarg.quantum_value_not_macrorealist:witness",
    trajectory,
    macrorealist,
    quantumValue: 1.5,
    exceedsBound: true,
    notEqualToTrajectoryValue: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.lgQuantum_exceeds_bound",
      "Obsmetrologia.Relational.Quantum.lg_macrorealist_real_bound",
      "Obsmetrologia.Relational.Quantum.lg_quantum_value_not_macrorealist",
    ]),
  });
}

export function leggettGargReceipt() {
  const trajectory = Object.freeze({ t0: 1, t1: 1, t2: -1 });
  return Object.freeze({
    kind: "relational.quantum.leggettGarg.receipt:witness",
    macrorealismViolated: lgPerfectMacrorealismViolated(),
    macrorealistBound: lgMacrorealistBound(trajectory),
    quantumSeparation: lgQuantumValueNotMacrorealist(trajectory),
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.LeggettGarg",
  });
}
