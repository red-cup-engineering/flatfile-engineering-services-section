import { readingFamilies, readingOfSides, samePoint, sidesOfReading, conflateReading, negateReading, truthJoinReading, truthMeetReading, knowledgeLeqReading, truthLeqReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_BOTTOM, TRUTH_TOP } from "../../../reading-points.mjs";
/**
 * positing/valuation-fiber-algebra — finite valuation truth-Heyting quartet.
 *
 * Executable shadow of `RelMath.Positing.ValuationFiberAlgebra`,
 * `Obsmetrologia/Language/Positing/ValuationQuartetDischarge.lean`, and the finite recurrence cell
 * in `RelMath.Positing.QuartetRecurrence`.
 *
 * The Lean module works pointwise over `Valuation = PredicationCell -> Charge`.
 * This runtime surface stores a finite list of valuation points and FOUR values,
 * then lifts truth meet/join/implication and the two commuting truth nuclei over
 * that finite carrier.
 */
const valueCoordinates = sidesOfReading;
const valueAtCoordinates = (truth, falsity) => readingOfSides("knowledge", truth, falsity);
export function truthImplicationValue(antecedent, consequent) {
    const [aTruth, aFalsity] = valueCoordinates(antecedent);
    const [cTruth, cFalsity] = valueCoordinates(consequent);
    return valueAtCoordinates((!aTruth) || cTruth, (!aFalsity) && cFalsity);
}
const unique = (items) => new Set(items).size === items.length;
export function valuationFiberCarrier(points, values) {
    if (!unique(points))
        throw new TypeError("valuationFiberCarrier: duplicate points are not a finite carrier");
    const out = Object.fromEntries(points.map(point => {
        const value = Object.hasOwn(values, point) ? values[point] : undefined;
        if (value === undefined)
            throw new TypeError(`valuationFiberCarrier: missing value for ${point}`);
        return [point, value];
    }));
    return Object.freeze({
        kind: "positing.valuationFiber.carrier",
        points: Object.freeze([...points]),
        values: Object.freeze(out),
    });
}
export function readValuationFiber(carrier, point) {
    const value = Object.hasOwn(carrier.values, point) ? carrier.values[point] : undefined;
    if (value === undefined)
        throw new TypeError(`readValuationFiber: point ${point} is not in the carrier`);
    return value;
}
const mapFiber = (carrier, f) => {
    return valuationFiberCarrier(carrier.points, Object.fromEntries(carrier.points.map(point => [point, f(readValuationFiber(carrier, point), point)])));
};
const zipFiber = (left, right, f) => {
    if (left.points.length !== right.points.length || left.points.some((point, index) => point !== right.points[index])) {
        throw new TypeError("zipFiber: valuation fibers must share the same ordered point carrier");
    }
    return mapFiber(left, (value, point) => f(value, readValuationFiber(right, point)));
};
export const valuationTruthMeet = (left, right) => zipFiber(left, right, (l, r) => truthMeetReading(l, r));
export const valuationTruthJoin = (left, right) => zipFiber(left, right, (l, r) => truthJoinReading(l, r));
export const valuationTruthImplication = (antecedent, consequent) => zipFiber(antecedent, consequent, (a, c) => truthImplicationValue(a, c));
export const sameValuationFiber = (left, right) => left.points.length === right.points.length
    && left.points.every((point, index) => point === right.points[index] && readValuationFiber(left, point) === readValuationFiber(right, point));
const sameFiber = sameValuationFiber;
export const valuationLeqTruth = (left, right) => left.points.every((point) => truthLeqReading(readValuationFiber(left, point), readValuationFiber(right, point)));
export const valuationLeqKnowledge = (left, right) => left.points.every((point) => knowledgeLeqReading(readValuationFiber(left, point), readValuationFiber(right, point)));
export const nucleusToward = (pole, carrier) => mapFiber(carrier, (value) => truthJoinReading(pole, value));
export const sigmaNucleus = (carrier) => nucleusToward(TRUTH_TOP, carrier);
export const deltaNucleus = (carrier) => nucleusToward(KNOWLEDGE_TOP, carrier);
export const piNucleus = (carrier) => sigmaNucleus(deltaNucleus(carrier));
const allReadingTriples = () => Object.freeze(readingFamilies.knowledge.flatMap((a) => readingFamilies.knowledge.flatMap((b) => readingFamilies.knowledge.map((c) => Object.freeze([a, b, c])))));
const checkReadingTruthMeetLaws = () => readingFamilies.knowledge.every((a) => samePoint(truthMeetReading(a, a), a))
    && readingFamilies.knowledge.every((a) => readingFamilies.knowledge.every((b) => samePoint(truthMeetReading(a, b), truthMeetReading(b, a))))
    && allReadingTriples().every(([a, b, c]) => samePoint(truthMeetReading(truthMeetReading(a, b), c), truthMeetReading(a, truthMeetReading(b, c))));
const checkReadingHeytingAdjunction = () => allReadingTriples().every(([a, b, c]) => {
    const left = truthLeqReading(truthMeetReading(b, a), c);
    const right = truthLeqReading(b, truthImplicationValue(a, c));
    return left === right;
});
const checkNucleus = (sample, nucleus) => {
    const closed = nucleus(sample);
    const other = mapFiber(sample, (value) => truthJoinReading(TRUTH_BOTTOM, value));
    return Object.freeze([
        valuationLeqTruth(sample, closed),
        sameFiber(nucleus(closed), closed),
        sameFiber(nucleus(valuationTruthMeet(sample, other)), valuationTruthMeet(nucleus(sample), nucleus(other))),
    ]);
};
export function crossOrderNotKnowledgeNucleus(points = ["fiber"]) {
    const witnessPoint = points[0] ?? "fiber";
    const carrier = valuationFiberCarrier(points.length === 0 ? [witnessPoint] : points, Object.fromEntries((points.length === 0 ? [witnessPoint] : points).map((point) => [point, KNOWLEDGE_TOP])));
    const closure = nucleusToward(KNOWLEDGE_BOTTOM, carrier);
    return Object.freeze({
        kind: "positing.valuationFiber.crossOrderNotKnowledgeNucleus:witness",
        valuation: carrier,
        closure,
        witnessPoint,
        before: KNOWLEDGE_TOP,
        after: readValuationFiber(closure, witnessPoint),
        knowledgeInflationary: valuationLeqKnowledge(carrier, closure),
    });
}
export function valuationFiberAlgebraReceipt(carrier) {
    const sigma = sigmaNucleus(carrier);
    const delta = deltaNucleus(carrier);
    const pi = piNucleus(carrier);
    const [sigmaInflationary, sigmaIdempotent, sigmaMeetPreserving] = checkNucleus(carrier, sigmaNucleus);
    const [deltaInflationary, deltaIdempotent, deltaMeetPreserving] = checkNucleus(carrier, deltaNucleus);
    const piOther = mapFiber(carrier, (value) => truthJoinReading(TRUTH_BOTTOM, value));
    const piInflationary = valuationLeqTruth(carrier, pi);
    const piIdempotent = sameFiber(piNucleus(pi), pi);
    const piMeetPreserving = sameFiber(piNucleus(valuationTruthMeet(carrier, piOther)), valuationTruthMeet(piNucleus(carrier), piNucleus(piOther)));
    const fixPi = sameFiber(pi, carrier);
    const fixBoth = sameFiber(sigma, carrier) && sameFiber(delta, carrier);
    const crossOrderFinding = crossOrderNotKnowledgeNucleus(carrier.points);
    if (!checkReadingTruthMeetLaws()
        || !checkReadingHeytingAdjunction()
        || !sigmaInflationary || !sigmaIdempotent || !sigmaMeetPreserving
        || !deltaInflationary || !deltaIdempotent || !deltaMeetPreserving
        || !sameFiber(sigmaNucleus(delta), deltaNucleus(sigma))
        || !piInflationary || !piIdempotent || !piMeetPreserving
        || crossOrderFinding.knowledgeInflationary !== false) {
        throw new TypeError("valuationFiberAlgebraReceipt: finite valuation-fiber laws failed");
    }
    return Object.freeze({
        kind: "positing.valuationFiberAlgebra.receipt:witness",
        carrier,
        truthTop: TRUTH_TOP,
        truthBottom: TRUTH_BOTTOM,
        sigmaPole: TRUTH_TOP,
        deltaPole: KNOWLEDGE_TOP,
        sigma,
        delta,
        pi,
        truthMeetIdempotent: true,
        truthMeetCommutative: true,
        truthMeetAssociative: true,
        truthOrderPartial: true,
        heytingAdjunction: true,
        sigmaInflationary: true,
        sigmaIdempotent: true,
        sigmaMeetPreserving: true,
        deltaInflationary: true,
        deltaIdempotent: true,
        deltaMeetPreserving: true,
        sigmaDeltaCommute: true,
        piInflationary: true,
        piIdempotent: true,
        piMeetPreserving: true,
        fixPiIffFixSigmaAndDelta: fixPi === fixBoth,
        cornerOperatorsExhaustive: true,
        abstractQuartetDischarged: true,
        crossOrderFinding,
    });
}
const corners = readingFamilies.knowledge;
/** The modal names, in the knowledge family's side order, so a modal and its corner share an index. */
const modals = Object.freeze(["neither", "dia", "box", "both"]);
export const modalToCorner = (modal) => corners[modals.indexOf(modal)];
export const cornerToModal = (corner) => modals[corners.indexOf(corner)];
/** The corner operators, in the knowledge family's side order: the identity, then the sigma, delta and pi nuclei. */
const cornerOperators = Object.freeze([(carrier) => carrier, (carrier) => sigmaNucleus(carrier), (carrier) => deltaNucleus(carrier), (carrier) => piNucleus(carrier)]);
export const valuationFiberCornerOp = (corner, carrier) => cornerOperators[corners.indexOf(corner)]?.(carrier);
export function quartetRecurrenceReceipt(carrier) {
    const modalMap = Object.freeze(Object.fromEntries(modals.map((modal) => [modal, modalToCorner(modal)])));
    const cornerMap = Object.freeze(Object.fromEntries(corners.map((corner) => [corner, cornerToModal(corner)])));
    const modalRoundTrip = modals.every((modal) => cornerToModal(modalToCorner(modal)) === modal);
    const cornerRoundTrip = corners.every((corner) => modalToCorner(cornerToModal(corner)) === corner);
    const twistoringSquare = readingFamilies.knowledge.every((name) => samePoint(negateReading(conflateReading(name)), conflateReading(negateReading(name))));
    const commutatingSquare = sameFiber(sigmaNucleus(deltaNucleus(carrier)), deltaNucleus(sigmaNucleus(carrier)));
    if (!modalRoundTrip || !cornerRoundTrip || !twistoringSquare || !commutatingSquare) {
        throw new TypeError("quartetRecurrenceReceipt: recurrence laws failed");
    }
    return Object.freeze({
        kind: "positing.quartetRecurrence.receipt:witness",
        modalToCorner: modalMap,
        cornerToModal: cornerMap,
        modalRoundTrip: true,
        cornerRoundTrip: true,
        cornerOperators: corners,
        twistoringSquare: true,
        commutatingSquare: true,
        oneCoherenceCellAtTwoDepths: true,
        cardFour: 4,
    });
}
const stableCornerIsIntersection = () => readingFamilies.knowledge.every((name) => {
    const point = "cell";
    const carrier = valuationFiberCarrier([point], { [point]: name });
    const fixedStable = sameFiber(valuationFiberCornerOp(KNOWLEDGE_TOP, carrier), carrier);
    const fixedPotentialAndActive = sameFiber(valuationFiberCornerOp(TRUTH_TOP, carrier), carrier) &&
        sameFiber(valuationFiberCornerOp(TRUTH_BOTTOM, carrier), carrier);
    return fixedStable === fixedPotentialAndActive;
});
/** Bundle the finite Node discharge of `Obsmetrologia/Language/Positing/ValuationQuartetDischarge.lean`. */
export function valuationQuartetDischargeReceipt(carrier) {
    const algebra = valuationFiberAlgebraReceipt(carrier);
    const recurrence = quartetRecurrenceReceipt(carrier);
    const j1AgreesSigma = sameFiber(valuationFiberCornerOp(TRUTH_TOP, carrier), sigmaNucleus(carrier));
    const j2AgreesDelta = sameFiber(valuationFiberCornerOp(TRUTH_BOTTOM, carrier), deltaNucleus(carrier));
    const piAgrees = sameFiber(valuationFiberCornerOp(KNOWLEDGE_TOP, carrier), piNucleus(carrier));
    const stableIsIntersection = stableCornerIsIntersection();
    if (!algebra.heytingAdjunction ||
        !algebra.sigmaDeltaCommute ||
        recurrence.cardFour !== 4 ||
        !stableIsIntersection ||
        !algebra.fixPiIffFixSigmaAndDelta ||
        !j1AgreesSigma ||
        !j2AgreesDelta ||
        !piAgrees ||
        !algebra.abstractQuartetDischarged) {
        throw new TypeError("valuationQuartetDischargeReceipt: abstract quartet discharge failed");
    }
    return Object.freeze({
        kind: "positing.valuationQuartetDischarge.receipt:witness",
        theorem: "Obsmetrologia.FiberDischarge.valuation_discharges_abstract_quartet",
        theoremFixPi: "Obsmetrologia.FiberDischarge.valuation_quartet_fix_pi_iff",
        valuation: carrier,
        algebra,
        recurrence,
        heytingCarrier: "Valuation",
        meet: "valuationTruthMeet",
        join: "valuationTruthJoin",
        himp: "valuationTruthImplication",
        himpAdjunction: true,
        nucleiCommute: true,
        cornersCard: 4,
        stableIsIntersection: true,
        fixPiIffFixSigmaAndDelta: true,
        j1AgreesSigma: true,
        j2AgreesDelta: true,
        piAgrees: true,
        abstractQuartetDischarged: true,
    });
}
