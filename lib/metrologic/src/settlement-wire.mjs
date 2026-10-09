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
  const out = {};
  for (const [cell, name] of Object.entries(wire)) out[cell] = readingAs("knowledge", name);
  return out;
}

/** Encode a settling of reading values back to the wire record. */
export function writeSettling(settling) {
  const out = {};
  for (const [cell, value] of Object.entries(settling)) out[cell] = value;
  return out;
}

/** Decode a wire orbit (a list of reading value names for one cell) into reading values. */
export function readOrbit(wire) {
  if (!Array.isArray(wire)) throw new TypeError("readOrbit: an orbit is a list of reading value names");
  return wire.map((name) => readingAs("knowledge", name));
}
