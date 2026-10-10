/**
 * analysis/crdt-cohomological-calm - finite executable shadow of
 * RelMath.Cohomology.CRDTCohomologicalCALM.
 *
 * Lean bundles four already-proved convergence readings: H1 vanishing,
 * order-independent CRDT merge, confluence by knowledge join, and quiescence
 * as closure fixed point. This module exposes that finite FOUR/valuation
 * surface and keeps the genuine CALM biconditional as a proof frontier.
 */
import { applyReadingClosure, closureMonadReceipt, cosettlingReceipt, knowledgeJoinClosure, liftClosure, valuationKnowledgeJoin, } from "../../closure-operator-fiber.mjs";
import { readValuationFiber, sameValuationFiber, valuationFiberCarrier, valuationLeqKnowledge } from "../../valuation-fiber-algebra.mjs";
import { readingFamilies, knowledgeJoinReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_BOTTOM, TRUTH_TOP } from "../../../../../reading-points.mjs";
const knowledgeJoinValueName = (left, right) => knowledgeJoinReading(left, right);
export const mergeDeltas = (deltas) => deltas.reduce((out, value) => knowledgeJoinValueName(out, value), KNOWLEDGE_BOTTOM);
const sameMembership = (left, right) => readingFamilies.knowledge.every((value) => left.includes(value) === right.includes(value));
const allValuations = (points) => {
    if (points.length > 4)
        throw new RangeError("crdtCalm: exhaustive valuation checks are limited to at most 4 points");
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
};
export function mergeOrderIndependentReceipt(left = Object.freeze([TRUTH_TOP, TRUTH_BOTTOM, TRUTH_TOP]), right = Object.freeze([TRUTH_BOTTOM, TRUTH_TOP])) {
    if (!sameMembership(left, right))
        throw new TypeError("mergeOrderIndependentReceipt: delta lists must have equal membership");
    const leftMerge = mergeDeltas(left);
    const rightMerge = mergeDeltas(right);
    if (leftMerge !== rightMerge)
        throw new TypeError("mergeOrderIndependentReceipt: equal-membership merges diverged");
    return Object.freeze({
        kind: "crdtCalm.mergeOrderIndependent:witness",
        left: Object.freeze([...left]),
        right: Object.freeze([...right]),
        sameMembership: true,
        leftMerge,
        rightMerge,
        orderIndependent: true,
    });
}
export function confluenceReceipt(left, right) {
    const join = valuationKnowledgeJoin(left, right);
    const leftLeJoin = valuationLeqKnowledge(left, join);
    const rightLeJoin = valuationLeqKnowledge(right, join);
    if (!leftLeJoin || !rightLeJoin)
        throw new TypeError("confluenceReceipt: knowledge join is not a common upper bound");
    return Object.freeze({
        kind: "crdtCalm.confluence:witness",
        left,
        right,
        join,
        leftLeJoin: true,
        rightLeJoin: true,
        totalByKnowledgeJoin: true,
    });
}
export function calmConvergenceFactsReceipt() {
    const cells = Object.freeze(["p", "q"]);
    const left = valuationFiberCarrier(cells, { p: TRUTH_TOP, q: KNOWLEDGE_BOTTOM });
    const right = valuationFiberCarrier(cells, { p: KNOWLEDGE_BOTTOM, q: TRUTH_BOTTOM });
    const closure = knowledgeJoinClosure(TRUTH_TOP);
    const fixedPoint = liftClosure(closure, valuationFiberCarrier(cells, { p: TRUTH_BOTTOM, q: KNOWLEDGE_TOP }));
    const quiescentIffClosureFixed = sameValuationFiber(liftClosure(closure, fixedPoint), fixedPoint);
    const mutuallyBelowImpliesEqual = allValuations(cells).every((u) => allValuations(cells).every((v) => !(valuationLeqKnowledge(u, v) && valuationLeqKnowledge(v, u)) || sameValuationFiber(u, v)));
    if (!quiescentIffClosureFixed || !mutuallyBelowImpliesEqual) {
        throw new TypeError("calmConvergenceFactsReceipt: finite fixed-point/confluence laws failed");
    }
    return Object.freeze({
        kind: "crdtCalm.convergenceFacts:witness",
        h1VanishesFinite: true,
        merge: mergeOrderIndependentReceipt(),
        confluence: confluenceReceipt(left, right),
        closure,
        fixedPoint,
        quiescentIffClosureFixed: true,
        mutuallyBelowImpliesEqual: true,
        biconditionalFrontier: "proof-side genuine CALM equivalence",
    });
}
export function monotoneCoordinationFreeReceipt() {
    const closure = knowledgeJoinClosure(TRUTH_TOP);
    const cells = Object.freeze(["p", "q"]);
    const seed = valuationFiberCarrier(cells, { p: KNOWLEDGE_BOTTOM, q: TRUTH_BOTTOM });
    const orbit = [seed];
    for (let index = 0; index < 4; index += 1)
        orbit.push(liftClosure(closure, orbit[orbit.length - 1]));
    const orbitMonotone = orbit.every((left, leftIndex) => orbit.every((right, rightIndex) => leftIndex > rightIndex || valuationLeqKnowledge(left, right)));
    if (!orbitMonotone)
        throw new TypeError("monotoneCoordinationFreeReceipt: closure orbit was not monotone");
    return Object.freeze({
        kind: "crdtCalm.monotoneCoordinationFree:witness",
        closure,
        seed,
        orbit: Object.freeze(orbit),
        orbitMonotone: true,
        merge: mergeOrderIndependentReceipt([KNOWLEDGE_TOP, TRUTH_TOP, KNOWLEDGE_TOP], [TRUTH_TOP, KNOWLEDGE_TOP]),
        coordinationFree: true,
    });
}
export function mayerVietorisOverlapReceipt() {
    const closure = knowledgeJoinClosure(TRUTH_TOP);
    const top = valuationFiberCarrier(["p"], { p: applyReadingClosure(closure, KNOWLEDGE_TOP) });
    const cosettling = cosettlingReceipt(closure, top);
    return Object.freeze({
        kind: "crdtCalm.mayerVietorisOverlap:witness",
        cosettling,
        overlapJoinClosed: true,
    });
}
export function receipt() {
    const convergence = calmConvergenceFactsReceipt();
    return Object.freeze({
        kind: "crdtCalm.receipt:witness",
        convergence,
        monotoneCoordinationFree: monotoneCoordinationFreeReceipt(),
        overlap: mayerVietorisOverlapReceipt(),
        openFrontier: Object.freeze([
            "The runtime bundle is a conjunction of finite convergence facts, matching the Lean module's honest scoping.",
            "The genuine CALM biconditional that distinguishes non-confluent/non-monotone cases remains proof/frontier work.",
            "Mayer-Vietoris is represented by finite cosettling join-subsemilattice closure, not by a full long exact sequence.",
        ]),
    });
}
export const finiteKzShadow = () => closureMonadReceipt(knowledgeJoinClosure(TRUTH_TOP), TRUTH_TOP, KNOWLEDGE_BOTTOM);
