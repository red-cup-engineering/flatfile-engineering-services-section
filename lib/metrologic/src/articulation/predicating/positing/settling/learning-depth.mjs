import { regimeCost } from "@red-cup-engineering/computer-data-engineering-services-section/closure-regime";
import { closureRegimeName } from "./closure.mjs";
import { classifyRegime } from "./value-category.mjs";
/** All learning-depth names in regime order. */
export const learningDepthNames = Object.freeze([
    "rote",
    "automatization",
    "conceptual-change",
    "adaptive-expertise",
]);
const learningReadings = Object.freeze([
    "finite-practice",
    "limit-practice",
    "post-limit-restructuring",
    "open-ended-adaptation",
]);
/** Read a closure regime as its learning-depth carrier: the depth at the regime's place in
 * completion-cost order. */
export function learningDepthOfRegime(regime) {
    const closureOrdinalRegime = closureRegimeName(regime);
    const height = regimeCost(closureOrdinalRegime);
    return Object.freeze({
        kind: "learning.depth",
        name: learningDepthNames[height],
        regime,
        closureOrdinalRegime,
        learningReading: learningReadings[height],
    });
}
/** Classify admitted closure-regime data and read it as a learning depth. */
export const learningDepthOfRegimeData = (data) => learningDepthOfRegime(classifyRegime(data));
