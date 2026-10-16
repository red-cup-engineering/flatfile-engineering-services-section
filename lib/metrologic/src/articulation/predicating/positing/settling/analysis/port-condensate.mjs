/**
 * The single-hole bead's LOCAL occupation-to-FOUR law, shared by
 * port-graph receipts and actual port-walk routing. Read through the data
 * layer's owning FOUR values; do not duplicate the algebra in consumers.
 *
 * This is an abstract information reading, not proof of a physical
 * Bose-Einstein condensate, contact rigidity, or thread tension.
 */
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_TOP } from "../../../../../reading-points.mjs";

export function condensate(occupation) {
  if (!Number.isSafeInteger(occupation) || occupation < 0)
    throw new RangeError("condensate: occupation must be a natural number");
  if (occupation === 0) return KNOWLEDGE_BOTTOM;
  if (occupation === 1) return TRUTH_TOP;
  return KNOWLEDGE_TOP;
}
