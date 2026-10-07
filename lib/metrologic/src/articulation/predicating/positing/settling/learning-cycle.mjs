import { learningDepthOfRegime } from "./learning-depth.mjs";
const ascentStep = (index, previous, current) => Object.freeze({
    kind: "learning.cycle.observedAscentStep",
    index,
    previous,
    current,
});
const observedReturn = (firstIndex, returnIndex, first, returned) => Object.freeze({
    kind: "learning.cycle.observedReturn",
    firstIndex,
    returnIndex,
    first,
    returned,
});
/** Read consecutive ascent from the finite orbit recorded by a closure carrier. */
export function observedLearningAscent(closure) {
    const steps = [];
    for (let index = 1; index < closure.orbit.length; index += 1) {
        const previous = closure.orbit[index - 1];
        const current = closure.orbit[index];
        const step = ascentStep(index, previous, current);
        if (!closure.process.lattice.leq(previous.value, current.value)) {
            return Object.freeze({ kind: "learning.cycle.observedAscent-obstruction", failed: step });
        }
        steps.push(step);
    }
    return Object.freeze({ kind: "learning.cycle.observedAscent:witness", steps: Object.freeze(steps) });
}
/**
 * Read whether the finite orbit contains a nontrivial return.
 *
 * A return is judged over the recorded orbit only. The closure workbench stops
 * before appending the repeated fixed point, so a returned point here is a real
 * finite-cycle observation, not merely the final plateau.
 */
export function observedLearningNontrivialReturn(closure) {
    for (let returnIndex = 1; returnIndex < closure.orbit.length; returnIndex += 1) {
        const returned = closure.orbit[returnIndex];
        for (let firstIndex = 0; firstIndex < returnIndex; firstIndex += 1) {
            const first = closure.orbit[firstIndex];
            if (closure.process.lattice.eq(first.value, returned.value)) {
                return Object.freeze({
                    kind: "learning.cycle.nontrivialReturn-obstruction",
                    return: observedReturn(firstIndex, returnIndex, first, returned),
                });
            }
        }
    }
    return Object.freeze({
        kind: "learning.cycle.nontrivialReturn:witness",
        inspectedPoints: closure.orbit.length,
    });
}
/** Read a closure carrier as the package's current observed learning cycle. */
export function learningCycleOfClosureCarrier(closure) {
    const depth = closure.search.kind === "ordinal.closure.stabilizationSearch:witness"
        ? learningDepthOfRegime(closure.search.regime)
        : null;
    return Object.freeze({
        kind: "learning.cycle.observedClosureTrace",
        closure,
        ascent: observedLearningAscent(closure),
        nontrivialReturn: observedLearningNontrivialReturn(closure),
        stabilization: closure.stabilization,
        depth,
    });
}

/** Witness that the recorded orbit has no nontrivial return. */
export const observedLearningNoNontrivialReturnWitnessSchema = {
  $id: "metroplat/closure/learning-cycle/observed-learning-no-nontrivial-return-witness",
  type: "object",
  required: ["kind", "inspectedPoints"],
  properties: {
    kind: { const: "learning.cycle.nontrivialReturn:witness" },
    inspectedPoints: { type: "number" },
  },
  additionalProperties: false,
  title: "ObservedLearningNoNontrivialReturnWitness",
  description: "The recorded finite orbit shows no nontrivial return to an earlier point.",
};

