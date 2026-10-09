/**
 * analysis/twist-product - articulating's own semiotic-charge binding of the
 * canonical, algebra-generic finite executable shadow of
 * RelMath.Order.TwistProductResiduation.
 *
 * Canonicalized 2026-09-11 to
 * `@lenticule-science/sheaf-mathematics-services-section/order/four-twist-product`
 * (moved out because this checker's law-checking logic has nothing semiotic-
 * specific about it, and had been hand-copied, relabeled, into
 * `@red-cup-engineering/feltos` as a second, independently drifting
 * implementation). This file supplies articulating's OWN semiotic reading
 * algebra (absurd/potential/active/stable) as the one parameter the canonical
 * checker needs — a binding, not a duplicate: the ~80-line law-checking body
 * lives once, in the canonical package.
 */
import { fourTwistProduct as fourTwistProductGeneric, booleanTwistPoints, } from "@red-cup-engineering/metrologic/sheaf/order/four-twist-product";
import { readingFamilies, readingOfSides, samePoint, fusionReading, knowledgeJoinReading, knowledgeMeetReading, linearUnit, negateReading, residuumReading, truthJoinReading, truthMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
export { booleanTwistPoints };
const SEMIOTIC_NAMES = Object.freeze({ bottom: readingOfSides("knowledge", false, false), positiveOnly: readingOfSides("knowledge", true, false), negativeOnly: readingOfSides("knowledge", false, true), top: readingOfSides("knowledge", true, true) });
const semioticAlgebra = Object.freeze({
    names: SEMIOTIC_NAMES,
    readings: readingFamilies.knowledge,
    knowledgeJoin: knowledgeJoinReading,
    truthJoin: truthJoinReading,
    knowledgeMeet: knowledgeMeetReading,
    truthMeet: truthMeetReading,
    negate: negateReading,
    samePoint,
    fuse: fusionReading,
    unit: linearUnit("knowledge"),
    residuum: residuumReading,
});
/** Exhaustive finite receipt for `FOUR = Two^twist` and truth-order residuation, over SignChain's readings. */
export function fourTwistProduct() {
    return fourTwistProductGeneric(semioticAlgebra);
}
