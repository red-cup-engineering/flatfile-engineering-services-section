/**
 * models/quantum-contextuality/magic-square - Mermin-Peres parity contextuality.
 *
 * This captures `Obsmetrologia.Relational.Quantum.MagicSquare`: line parity,
 * odd total parity, local satisfiability, no global section, and the
 * state-independent strong contextuality witness.
 */

import {
  allContextsInhabited,
  empiricalModel,
  hasGlobalSection,
  measurementScenario,
  stronglyContextual,

} from "./measurement-scenario.mjs";

export const magicCells = Object.freeze(["m0", "m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8"]);

export function msLines() {
  return Object.freeze([
    Object.freeze(["m0", "m1", "m2"]),
    Object.freeze(["m3", "m4", "m5"]),
    Object.freeze(["m6", "m7", "m8"]),
    Object.freeze(["m0", "m3", "m6"]),
    Object.freeze(["m1", "m4", "m7"]),
    Object.freeze(["m2", "m5", "m8"]),
  ]);
}

function contextEquals(left, right) {
  return left.length === right.length && left.every((measurement, index) => measurement === right[index]);
}

export function lineXor(
  assignment,
  context,
) {
  return context.reduce((total, cell) => total !== assignment[cell], false);
}

export function msParity(context) {
  return contextEquals(context, ["m2", "m5", "m8"]);
}

export function msAllowed(
  context,
  assignment,
) {
  return lineXor(assignment, context) === msParity(context);
}

export function msScenario() {
  return measurementScenario(magicCells, msLines());
}

export function magicSquare() {
  return empiricalModel(msScenario(), Object.freeze([false, true]), msAllowed);
}

export function msParityTotalOdd() {
  return msLines().reduce((total, line) => total !== msParity(line), false);
}

export function magicSquareStronglyContextual() {
  const model = magicSquare();
  if (!msParityTotalOdd() || allContextsInhabited(model) === undefined || hasGlobalSection(model) !== undefined || stronglyContextual(model) === undefined) {
    throw new TypeError("magicSquareStronglyContextual: magic-square contextuality check failed");
  }
  return Object.freeze({
    kind: "relational.quantum.magicSquare.strongly_contextual:witness",
    model,
    parityTotalOdd: true,
    inhabited: true,
    noGlobalSection: true,
    stronglyContextual: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.msParity_total_odd",
      "Obsmetrologia.Relational.Quantum.magicSquare_inhabited",
      "Obsmetrologia.Relational.Quantum.magicSquare_no_global",
      "Obsmetrologia.Relational.Quantum.magicSquare_strongly_contextual",
    ]),
  });
}

export function magicSquareReceipt() {
  return Object.freeze({
    kind: "relational.quantum.magicSquare.receipt:witness",
    strong: magicSquareStronglyContextual(),
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.MagicSquare",
  });
}
