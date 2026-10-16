import { readingAs } from "@red-cup-engineering/computer-data-engineering-services-section/four";
// wire — the JSON reading of a settling, so the section's scripts have data to move.
//
// A settling on the wire is a plain record `{ "<cell>": "<reading value name>" }`, the names being
// This package's own four: "absurd" (⊥), "potential" (t), "active" (f),
// "stable" (⊤). No second FOUR representation is introduced — `asReadingValueName` and
// `readingValue` are articulating's, and this module only turns its names into its values and back.
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
