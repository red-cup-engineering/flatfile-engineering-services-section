import { twistProduct } from "@red-cup-engineering/computer-data-engineering-services-section/four";
const booleanPoint = (positive, negative) => Object.freeze({
    kind: "twistProduct.booleanPoint",
    positive,
    negative,
    label: `${positive ? "1" : "0"}${negative ? "1" : "0"}`,
});
export const booleanTwistPoints = Object.freeze([
    booleanPoint(false, false),
    booleanPoint(true, false),
    booleanPoint(false, true),
    booleanPoint(true, true),
]);
/** The twist product of the two-element lattice, built by the data layer's constructor: the one FOUR. */
const two = twistProduct({ bottom: false, top: true, one: true, leq: (a, b) => !a || b, meet: (a, b) => a && b, join: (a, b) => a || b, fuse: (a, b) => a && b, imply: (a, b) => !a || b });
const pairOf = (point) => two.value(point.positive, point.negative);
const pointOfPair = ([positive, negative]) => booleanPoint(positive, negative);
const onPoints = (operation) => (left, right) => operation({ left: pairOf(left), right: pairOf(right) });
function readingOfBooleanPoint(point, algebra) {
    if (point.positive && point.negative)
        return algebra.names.top;
    if (point.positive)
        return algebra.names.positiveOnly;
    if (point.negative)
        return algebra.names.negativeOnly;
    return algebra.names.bottom;
}
function booleanPointOfReading(value, algebra) {
    const { names } = algebra;
    if (value === names.bottom)
        return booleanPoint(false, false);
    if (value === names.positiveOnly)
        return booleanPoint(true, false);
    if (value === names.negativeOnly)
        return booleanPoint(false, true);
    if (value === names.top)
        return booleanPoint(true, true);
    throw new TypeError(`four-twist-product: reading ${JSON.stringify(value)} is outside the supplied FourValuedNames`);
}
const samePoint = (left, right) => left.positive === right.positive && left.negative === right.negative;
const leK = onPoints(two.leqKnowledge);
const leT = onPoints(two.leqTruth);
const meetK = (left, right) => pointOfPair(onPoints(two.meetKnowledge)(left, right));
const joinK = (left, right) => pointOfPair(onPoints(two.joinKnowledge)(left, right));
const meetT = (left, right) => pointOfPair(onPoints(two.meetTruth)(left, right));
const joinT = (left, right) => pointOfPair(onPoints(two.joinTruth)(left, right));
const neg = (point) => pointOfPair(two.negate(pairOf(point)));
const obstruct = (reason, left, right, bound, observed, expected) => Object.freeze({
    kind: "twistProduct.four-obstruction",
    reason,
    left,
    right,
    bound,
    observed,
    expected,
});
/** Exhaustive finite receipt for `FOUR = Two^twist` and truth-order residuation, over `algebra`. */
export function fourTwistProduct(algebra) {
    const { names, readings, knowledgeJoin, truthJoin, knowledgeMeet, truthMeet, negate, samePoint: sameReading, fuse: fuseReadings, unit: linearUnit, residuum } = algebra;
    const fromReadingOp = (op) => (left, right) => booleanPointOfReading(op(readingOfBooleanPoint(left, algebra), readingOfBooleanPoint(right, algebra)), algebra);
    const fuse = fromReadingOp(fuseReadings);
    const imp = fromReadingOp(residuum);
    const readingLeK = (left, right) => sameReading(knowledgeJoin(left, right), right);
    const readingLeT = (left, right) => sameReading(truthJoin(left, right), right);
    for (const point of booleanTwistPoints) {
        const reading = readingOfBooleanPoint(point, algebra);
        if (!samePoint(booleanPointOfReading(reading, algebra), point))
            return obstruct("bijection", reading);
    }
    for (const reading of readings) {
        if (!sameReading(readingOfBooleanPoint(booleanPointOfReading(reading, algebra), algebra), reading))
            return obstruct("bijection", reading);
    }
    for (const left of booleanTwistPoints) {
        for (const right of booleanTwistPoints) {
            const leftReading = readingOfBooleanPoint(left, algebra);
            const rightReading = readingOfBooleanPoint(right, algebra);
            if (leK(left, right) !== readingLeK(leftReading, rightReading))
                return obstruct("knowledgeOrder", leftReading, rightReading);
            if (leT(left, right) !== readingLeT(leftReading, rightReading))
                return obstruct("truthOrder", leftReading, rightReading);
            if (!sameReading(readingOfBooleanPoint(neg(left), algebra), negate(leftReading)))
                return obstruct("negation", leftReading);
            const knowledgeOps = [
                [readingOfBooleanPoint(meetK(left, right), algebra), knowledgeMeet(leftReading, rightReading)],
                [readingOfBooleanPoint(joinK(left, right), algebra), knowledgeJoin(leftReading, rightReading)],
            ];
            for (const [observed, expected] of knowledgeOps) {
                if (!sameReading(observed, expected))
                    return obstruct("knowledgeLattice", leftReading, rightReading, undefined, observed, expected);
            }
            const truthOps = [
                [readingOfBooleanPoint(meetT(left, right), algebra), truthMeet(leftReading, rightReading)],
                [readingOfBooleanPoint(joinT(left, right), algebra), truthJoin(leftReading, rightReading)],
            ];
            for (const [observed, expected] of truthOps) {
                if (!sameReading(observed, expected))
                    return obstruct("truthLattice", leftReading, rightReading, undefined, observed, expected);
            }
            if (!samePoint(fuse(left, right), fuse(right, left)))
                return obstruct("fusionCommutative", leftReading, rightReading);
            const unitPoint = booleanPointOfReading(linearUnit, algebra);
            if (!samePoint(fuse(left, unitPoint), left) || !samePoint(fuse(unitPoint, left), left))
                return obstruct("fusionUnit", leftReading);
            for (const bound of booleanTwistPoints) {
                const boundReading = readingOfBooleanPoint(bound, algebra);
                if (leT(fuse(left, right), bound) !== leT(left, imp(right, bound))) {
                    return obstruct("truthResiduation", leftReading, rightReading, boundReading);
                }
            }
        }
    }
    const unit = linearUnit;
    const truthTop = names.positiveOnly;
    if (sameReading(unit, truthTop))
        return obstruct("unitNonIntegral", unit, truthTop);
    return Object.freeze({
        kind: "twistProduct.four:witness",
        elements: Object.freeze(booleanTwistPoints.map((point) => Object.freeze({
            point,
            reading: readingOfBooleanPoint(point, algebra),
        }))),
        knowledgeBottom: names.bottom,
        knowledgeTop: names.top,
        truthBottom: names.negativeOnly,
        truthTop: names.positiveOnly,
        fusionUnit: unit,
        consistentFragment: Object.freeze([names.bottom, names.positiveOnly, names.negativeOnly]),
        bijection: true,
        knowledgeOrderMatches: true,
        truthOrderMatches: true,
        negationMatches: true,
        knowledgeLatticeMatches: true,
        truthLatticeMatches: true,
        truthResiduation: true,
        fusionCommutative: true,
        fusionUnitLaw: true,
        unitNonIntegral: true,
    });
}
