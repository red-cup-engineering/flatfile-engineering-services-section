/**
 * analysis/scott-coalgebra - finite executable shadow of
 * RelMath.Closure.ScottContinuousClosure and SettlingCoalgebra.
 *
 * Lean proves the corpus Scott equation over the finite FOUR reading lattice by
 * showing every finite directed family attains its knowledge join. It also
 * packages the settling coalgebra as the unfolding dual of the closure algebra.
 * This module keeps exactly that runtime boundary: finite reading families,
 * explicit pointwise closure tables, finite valuation orbits, and honest
 * proof-side markers for arbitrary dcpos and genuine 2-categorical data.
 */
import { applyReadingClosure, readingClosureCarrier, closureMonadReceipt, knowledgeJoinClosure, liftClosure, valuationKnowledgeJoin, } from "../../closure-operator-fiber.mjs";
import { readValuationFiber, sameValuationFiber, valuationFiberCarrier, valuationLeqKnowledge } from "../../valuation-fiber-algebra.mjs";
import { readingFamilies, knowledgeJoinReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_BOTTOM, TRUTH_TOP } from "../../../../../reading-points.mjs";
const knowledgeLeqValue = (left, right) => knowledgeJoinReading(left, right) === right;
const knowledgeJoinValueName = (left, right) => knowledgeJoinReading(left, right);
const knowledgeSup = (values) => values.reduce((out, value) => knowledgeJoinValueName(out, value), KNOWLEDGE_BOTTOM);
const zeroIncrement = (points) => valuationFiberCarrier(points, Object.fromEntries(points.map((point) => [point, KNOWLEDGE_BOTTOM])));
function requireReading(value, caller) {
    if (!readingFamilies.knowledge.includes(value))
        throw new TypeError(`${caller}: ${value} is not a reading`);
}
function allValuations(points) {
    if (points.length > 4) {
        throw new RangeError("scottCoalgebra: exhaustive valuation checks are limited to at most 4 points");
    }
    const out = [];
    const go = (index, record) => {
        if (index === points.length) {
            out.push(valuationFiberCarrier(points, Object.freeze({ ...record })));
            return;
        }
        const point = points[index];
        for (const value of readingFamilies.knowledge) {
            record[point] = value;
            go(index + 1, record);
        }
        delete record[point];
    };
    go(0, {});
    return Object.freeze(out);
}
export function directedFamily(elems) {
    if (elems.length === 0)
        throw new RangeError("directedFamily: directed reading families must be nonempty");
    for (const value of elems)
        requireReading(value, "directedFamily");
    const sup = knowledgeSup(elems);
    const directed = elems.every((left) => elems.every((right) => elems.some((upper) => knowledgeLeqValue(left, upper) && knowledgeLeqValue(right, upper))));
    const supAttained = elems.includes(sup);
    if (!directed || !supAttained) {
        throw new TypeError("directedFamily: finite knowledge-directed families must attain their join");
    }
    return Object.freeze({
        kind: "scottCoalgebra.directedFamily.carrier",
        elems: Object.freeze([...elems]),
        sup,
        nonempty: true,
        directed: true,
        supAttained: true,
    });
}
export function scottContinuityReceipt(closure, family) {
    const left = applyReadingClosure(closure, family.sup);
    const right = knowledgeSup(family.elems.map((value) => applyReadingClosure(closure, value)));
    if (left !== right)
        throw new TypeError("scottContinuityReceipt: closure did not commute with directed join");
    return Object.freeze({
        kind: "scottCoalgebra.scottContinuity:witness",
        closure,
        family,
        left,
        right,
        commutesWithDirectedJoin: true,
        finiteCarrierForcesAttainment: true,
        finiteReadingClosureStrict: true,
    });
}
export function finiteAntecedentFire(antecedent, conclusion, value) {
    requireReading(antecedent, "finiteAntecedentFire");
    requireReading(conclusion, "finiteAntecedentFire");
    requireReading(value, "finiteAntecedentFire");
    return knowledgeLeqValue(antecedent, value) ? knowledgeJoinValueName(value, conclusion) : value;
}
export function finiteAntecedentScottReceipt(antecedent, conclusion, family) {
    const firesOnJoin = knowledgeLeqValue(antecedent, family.sup);
    const firesOnMember = family.elems.some((value) => knowledgeLeqValue(antecedent, value));
    const left = finiteAntecedentFire(antecedent, conclusion, family.sup);
    const right = knowledgeSup(family.elems.map((value) => finiteAntecedentFire(antecedent, conclusion, value)));
    if (firesOnJoin !== firesOnMember || left !== right) {
        throw new TypeError("finiteAntecedentScottReceipt: finite antecedent did not commute with directed join");
    }
    return Object.freeze({
        kind: "scottCoalgebra.finiteAntecedent:witness",
        antecedent,
        conclusion,
        family,
        firesOnJoinIffFiresOnMember: true,
        left,
        right,
        commutesWithDirectedJoin: true,
    });
}
export function settlingEndofunctor(closure, increment, carrier) {
    return valuationKnowledgeJoin(liftClosure(closure, carrier), increment);
}
export function coalgebraOrbit(closure, seed, steps) {
    const out = [seed];
    for (let step = 0; step < steps; step += 1)
        out.push(liftClosure(closure, out[out.length - 1]));
    return Object.freeze(out);
}
export function coalgebraOrbitLimit(orbit) {
    if (orbit.length === 0)
        throw new RangeError("coalgebraOrbitLimit: orbit must be nonempty");
    const points = orbit[0].points;
    let limit = zeroIncrement(points);
    for (const stage of orbit)
        limit = valuationKnowledgeJoin(limit, stage);
    const dominatesPriorOrbit = orbit.every((stage) => valuationLeqKnowledge(stage, limit));
    const leastUpperBound = allValuations(points).every((candidate) => !orbit.every((stage) => valuationLeqKnowledge(stage, candidate)) || valuationLeqKnowledge(limit, candidate));
    if (!dominatesPriorOrbit || !leastUpperBound) {
        throw new TypeError("coalgebraOrbitLimit: finite orbit limit failed join laws");
    }
    return Object.freeze({
        kind: "scottCoalgebra.orbitLimit:witness",
        limit,
        dominatesPriorOrbit: true,
        leastUpperBound: true,
    });
}
export function settlingCoalgebraReceipt(closure, carrier, increment) {
    const target = settlingEndofunctor(closure, increment, carrier);
    const zeroTarget = settlingEndofunctor(closure, zeroIncrement(carrier.points), carrier);
    const closed = liftClosure(closure, carrier);
    const orbit = coalgebraOrbit(closure, carrier, 4);
    const orbitLimit = coalgebraOrbitLimit(orbit);
    const all = allValuations(carrier.points);
    const coalgebraMapInflationary = valuationLeqKnowledge(carrier, target);
    const settlingEndofunctorMonotone = all.every((left) => all.every((right) => !valuationLeqKnowledge(left, right)
        || valuationLeqKnowledge(settlingEndofunctor(closure, increment, left), settlingEndofunctor(closure, increment, right))));
    const zeroIncrementRecoversClosure = sameValuationFiber(zeroTarget, closed);
    const orbitMonotone = orbit.every((left, leftIndex) => orbit.every((right, rightIndex) => leftIndex > rightIndex || valuationLeqKnowledge(left, right)));
    const fixed = orbit[orbit.length - 1];
    const quiescenceIsoAtZeroIncrement = sameValuationFiber(liftClosure(closure, fixed), fixed)
        && sameValuationFiber(settlingEndofunctor(closure, zeroIncrement(fixed.points), fixed), fixed);
    if (!coalgebraMapInflationary || !settlingEndofunctorMonotone || !zeroIncrementRecoversClosure || !orbitMonotone || !quiescenceIsoAtZeroIncrement) {
        throw new TypeError("settlingCoalgebraReceipt: finite settling-coalgebra laws failed");
    }
    return Object.freeze({
        kind: "scottCoalgebra.settlingCoalgebra:witness",
        closure,
        carrier,
        increment,
        target,
        orbit,
        orbitLimit,
        coalgebraMapInflationary: true,
        settlingEndofunctorMonotone: true,
        zeroIncrementRecoversClosure: true,
        orbitMonotone: true,
        algebraCoalgebraDualDirections: true,
        quiescenceIsoAtZeroIncrement: true,
        cclosedIffClosureAlgebra: true,
        finiteKzShadow: closureMonadReceipt(closure, readValuationFiber(increment, increment.points[0]), readValuationFiber(carrier, carrier.points[0])),
        higherCategoricalBoundary: "proof-side 2-categorical KZ/cofree coalgebra data",
    });
}
export function receipt() {
    const closure = knowledgeJoinClosure(TRUTH_TOP);
    const family = directedFamily([KNOWLEDGE_BOTTOM, TRUTH_TOP, KNOWLEDGE_TOP]);
    const cells = Object.freeze(["p", "q"]);
    const carrier = valuationFiberCarrier(cells, { p: KNOWLEDGE_BOTTOM, q: TRUTH_BOTTOM });
    const increment = valuationFiberCarrier(cells, { p: TRUTH_TOP, q: KNOWLEDGE_BOTTOM });
    return Object.freeze({
        kind: "scottCoalgebra.receipt:witness",
        scott: scottContinuityReceipt(closure, family),
        finiteAntecedent: finiteAntecedentScottReceipt(TRUTH_TOP, KNOWLEDGE_TOP, family),
        coalgebra: settlingCoalgebraReceipt(closure, carrier, increment),
        dcpoBoundary: "proof-side arbitrary directed-complete joins",
    });
}
export function invalidNonDirectedFamily() {
    return Object.freeze([TRUTH_TOP, TRUTH_BOTTOM]);
}
