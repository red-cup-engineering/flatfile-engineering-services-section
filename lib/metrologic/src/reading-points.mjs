// The four named points metrologic's knowledge-family readings are built from, named through the
// data layer's FOUR (four.mjs) by the order they are extremes of; no point is spelled here.
import { knowledgeBottom, knowledgeTop, truthBottom, truthTop } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** Told nothing: the knowledge order's bottom. */
export const KNOWLEDGE_BOTTOM = knowledgeBottom();
/** Told both ways: the knowledge order's top. */
export const KNOWLEDGE_TOP = knowledgeTop();
/** Told true only: the truth order's top. */
export const TRUTH_TOP = truthTop();
/** Told false only: the truth order's bottom. */
export const TRUTH_BOTTOM = truthBottom();
