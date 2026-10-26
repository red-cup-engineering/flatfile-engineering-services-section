import { readingAs } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { readingSettlement } from "./settlement.mjs";
// The pure wire interface to the original settling algebra.
//
// A settling on the wire is a plain record `{ "<cell>": "<reading value name>" }`, the names being
// the original Computer Data knowledge readings: "absurd" (⊥), "potential" (t),
// "active" (f), "stable" (⊤). Admission and joins use that original FOUR algebra.
// The schema for this shape is specifications/settling.schema.json.


/** Decode a wire settling (cell -> reading value name) into a settling of reading values. */
export function readSettling(wire) {
  if (!wire || typeof wire !== "object" || Array.isArray(wire)) {
    throw new TypeError("readSettling: a settling is a record of cell -> reading value name");
  }
  // Object.fromEntries defines own data properties even for "__proto__".
  // Assignment to {} invokes the prototype setter and loses a valid cell.
  return Object.fromEntries(Object.entries(wire).map(([cell, name]) =>
    [cell, readingAs("knowledge", name)]));
}

/** Encode a settling of reading values back to the wire record. */
export function writeSettling(settling) {
  // Preserve the complete marked fiber, including reserved JS property names.
  return Object.fromEntries(Object.entries(settling));
}

/** Decode a wire orbit (a list of reading value names for one cell) into reading values. */
export function readOrbit(wire) {
  if (!Array.isArray(wire)) throw new TypeError("readOrbit: an orbit is a list of reading value names");
  return wire.map((name) => readingAs("knowledge", name));
}

/** Fold wire settlings with the original pointwise knowledge join. */
export function mergeSetOfSettlings(wireSettlings) {
  if (!Array.isArray(wireSettlings)) throw new TypeError("merge-set-of-settlings: expected a list of settlings");
  return writeSettling(readingSettlement.mergeAll(wireSettlings.map(readSettling)));
}

/** Judge only the supplied finite orbit in the original knowledge order. */
export function checkSettlingOrbit(wireOrbit, { cell = "" } = {}) {
  const orbit = readOrbit(wireOrbit);
  const monotone = readingSettlement.orbitMonotone(orbit);
  return Object.freeze({ cell, length: orbit.length, monotone });
}
