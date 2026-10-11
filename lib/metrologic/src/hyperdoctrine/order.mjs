import { samePoint, knowledgeJoinReading, knowledgeLeqReading, knowledgeMeetReading, truthJoinReading, truthLeqReading, truthMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_BOTTOM, TRUTH_TOP } from "../reading-points.mjs";

/** @typedef {string} Reading a knowledge-family reading name */

export const KNOWLEDGE = "knowledge";
export const TRUTH = "truth";


/**
 * @typedef {{ join: (a: Reading, b: Reading) => Reading, meet: (a: Reading, b: Reading) => Reading,
 *   leq: (a: Reading, b: Reading) => boolean, bottom: Reading, top: Reading }} OrderOps
 */

const OPS = {
  // knowledge: ⊥ = absurd [F,F] (the join identity), ⊤ = stable [T,T] (the meet identity).
  [KNOWLEDGE]: Object.freeze({
    join: knowledgeJoinReading, meet: knowledgeMeetReading, leq: knowledgeLeqReading,
    bottom: KNOWLEDGE_BOTTOM, top: KNOWLEDGE_TOP,
  }),
  // truth: bottom = F [F,T] (the join/∨_t identity), top = T [T,F] (the meet/∧_t identity, "designated true").
  [TRUTH]: Object.freeze({
    join: truthJoinReading, meet: truthMeetReading, leq: truthLeqReading,
    bottom: TRUTH_BOTTOM, top: TRUTH_TOP,
  }),
};

/**
 * Look up an order's operation bundle by tag. Throws on anything but `KNOWLEDGE`/`TRUTH` — an order tag
 * is a closed choice, not an open string.
 * @param {string} order @returns {OrderOps}
 */
export function orderOps(order) {
  const ops = OPS[order];
  if (!ops) throw new TypeError(`orderOps: unknown order "${order}" — expected KNOWLEDGE or TRUTH`);
  return ops;
}

/** The order's name, for messages/labels ("knowledge" | "truth"). */
export const orderKind = (order) => { orderOps(order); return order; };

/** Is `reading` at the order's designated (top) element? The Lawvere comprehension predicate. */
export const designated = (reading, order) => samePoint(reading, orderOps(order).top);

/** Whether two readings name the same point of FOUR. */
export const sameValue = samePoint;
