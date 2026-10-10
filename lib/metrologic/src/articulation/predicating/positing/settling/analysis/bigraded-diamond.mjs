/**
 * analysis/bigraded-diamond - finite executable shadow of
 * RelMath.Positing.BigradedDiamond and the FOUR instance of
 * RelMath.Positing.NucleusAndCommutingNuclei.
 *
 * Lean proves that the reading knowledge order is a Heyting algebra, that
 * raising by knowledge-join toward a reading is a nucleus, that any two such
 * nuclei commute, and that the true/false two-fiber family varies. This module
 * turns those finite FOUR facts into carrier receipts.
 */
import { crossOrderNotKnowledgeNucleus, } from "../../valuation-fiber-algebra.mjs";
import { readingAs, readingFamilies, readingOfSides, samePoint, sidesOfReading, knowledgeJoinReading, knowledgeMeetReading, knowledgeLeqReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_BOTTOM, TRUTH_TOP } from "../../../../../reading-points.mjs";
const readingNames = readingFamilies.knowledge;
const k4Grades = Object.freeze(["id", "neg", "conf", "negConf"]);
const freezeNames = (names) => Object.freeze([...names]);
const readingMap = (f) => Object.freeze(Object.fromEntries(readingNames.map((name) => [name, f(name)])));
const pairs = () => Object.freeze(readingNames.flatMap((a) => readingNames.map((b) => Object.freeze([a, b]))));
const triples = () => Object.freeze(readingNames.flatMap((a) => readingNames.flatMap((b) => readingNames.map((c) => Object.freeze([a, b, c])))));
const nameOf = (value) => value;
const sameName = (left, right) => samePoint(left, right);
const meetK = (left, right) => nameOf(knowledgeMeetReading(left, right));
const joinK = (left, right) => nameOf(knowledgeJoinReading(left, right));
const leK = (left, right) => knowledgeLeqReading(left, right);
const readingAtCoordinates = (truth, falsity) => readingOfSides("knowledge", truth, falsity);
const coordinatesOf = sidesOfReading;
export function knowledgeImplication(antecedentInput, consequentInput) {
    const antecedent = readingAs("knowledge", antecedentInput);
    const consequent = readingAs("knowledge", consequentInput);
    const [aTruth, aFalsity] = coordinatesOf(antecedent);
    const [cTruth, cFalsity] = coordinatesOf(consequent);
    return readingAtCoordinates((!aTruth) || cTruth, (!aFalsity) || cFalsity);
}
export const knowledgeNucleusToward = (poleInput, valueInput) => {
    const pole = readingAs("knowledge", poleInput);
    const value = readingAs("knowledge", valueInput);
    return joinK(pole, value);
};
const checkEndomapNucleus = (j) => {
    const inflationary = readingNames.every((a) => leK(a, j(a)));
    const idempotent = readingNames.every((a) => sameName(j(j(a)), j(a)));
    const meetPreserving = pairs().every(([a, b]) => sameName(j(meetK(a, b)), meetK(j(a), j(b))));
    const monotone = pairs().every(([a, b]) => !leK(a, b) || leK(j(a), j(b)));
    const fixedImplicationClosed = pairs().every(([a, b]) => !sameName(j(b), b) || sameName(j(knowledgeImplication(a, b)), knowledgeImplication(a, b)));
    const topFixed = sameName(j(KNOWLEDGE_TOP), KNOWLEDGE_TOP);
    return Object.freeze([inflationary, idempotent, meetPreserving, monotone, fixedImplicationClosed, topFixed]);
};
export function knowledgeHeytingReceipt() {
    const meetCommutative = pairs().every(([a, b]) => sameName(meetK(a, b), meetK(b, a)));
    const meetAssociative = triples().every(([a, b, c]) => sameName(meetK(meetK(a, b), c), meetK(a, meetK(b, c))));
    const meetIdempotent = readingNames.every((a) => sameName(meetK(a, a), a));
    const implicationAdjunction = triples().every(([a, b, c]) => leK(meetK(b, a), c) === leK(b, knowledgeImplication(a, c)));
    const modusPonens = pairs().every(([a, c]) => leK(meetK(knowledgeImplication(a, c), a), c));
    if (!meetCommutative || !meetAssociative || !meetIdempotent || !implicationAdjunction || !modusPonens) {
        throw new TypeError("knowledgeHeytingReceipt: FOUR knowledge-Heyting laws failed");
    }
    return Object.freeze({
        kind: "bigradedDiamond.knowledgeHeyting:witness",
        carrier: freezeNames(readingNames),
        bottom: KNOWLEDGE_BOTTOM,
        top: KNOWLEDGE_TOP,
        meetCommutative: true,
        meetAssociative: true,
        meetIdempotent: true,
        implicationAdjunction: true,
        modusPonens: true,
    });
}
export function knowledgeNucleusReceipt(poleInput) {
    const pole = readingAs("knowledge", poleInput);
    const j = (value) => knowledgeNucleusToward(pole, value);
    const [inflationary, idempotent, meetPreserving, monotone, fixedImplicationClosed, topFixed] = checkEndomapNucleus(j);
    if (!inflationary || !idempotent || !meetPreserving || !monotone || !fixedImplicationClosed || !topFixed) {
        throw new TypeError(`knowledgeNucleusReceipt: ${pole} is not a FOUR knowledge nucleus`);
    }
    return Object.freeze({
        kind: "bigradedDiamond.knowledgeNucleus:witness",
        pole,
        action: readingMap(j),
        fixed: freezeNames(readingNames.filter((name) => sameName(j(name), name))),
        inflationary: true,
        idempotent: true,
        meetPreserving: true,
        monotone: true,
        fixedImplicationClosed: true,
        topFixed: true,
    });
}
export function nuclearSquareReceipt(leftPoleInput, rightPoleInput) {
    const leftPole = readingAs("knowledge", leftPoleInput);
    const rightPole = readingAs("knowledge", rightPoleInput);
    const j1 = (value) => knowledgeNucleusToward(leftPole, value);
    const j2 = (value) => knowledgeNucleusToward(rightPole, value);
    const pi = (value) => j1(j2(value));
    const commutes = readingNames.every((a) => sameName(j1(j2(a)), j2(j1(a))));
    const [piInflationary, piIdempotent, piMeetPreserving, piMonotone, piFixedImplicationClosed, piTopFixed] = checkEndomapNucleus(pi);
    const compositeIsNucleus = piInflationary && piIdempotent && piMeetPreserving && piMonotone && piFixedImplicationClosed && piTopFixed;
    const fixPiIffFixBoth = readingNames.every((a) => sameName(pi(a), a) === (sameName(j1(a), a) && sameName(j2(a), a)));
    if (!commutes || !compositeIsNucleus || !fixPiIffFixBoth) {
        throw new TypeError("nuclearSquareReceipt: FOUR knowledge nuclei failed to form a nuclear square");
    }
    const cornerFns = Object.freeze({
        [TRUTH_TOP]: (value) => value,
        [TRUTH_BOTTOM]: j1,
        [KNOWLEDGE_TOP]: j2,
        [KNOWLEDGE_BOTTOM]: pi,
    });
    const corners = Object.freeze([TRUTH_TOP, TRUTH_BOTTOM, KNOWLEDGE_TOP, KNOWLEDGE_BOTTOM].map((corner) => Object.freeze({
        corner,
        action: readingMap(cornerFns[corner]),
        imageAtKnowledgeBottom: cornerFns[corner](KNOWLEDGE_BOTTOM),
    })));
    return Object.freeze({
        kind: "bigradedDiamond.nuclearSquare:witness",
        leftPole,
        rightPole,
        left: knowledgeNucleusReceipt(leftPole),
        right: knowledgeNucleusReceipt(rightPole),
        piAction: readingMap(pi),
        jointFixed: freezeNames(readingNames.filter((name) => sameName(pi(name), name))),
        corners,
        cornerCount: 4,
        commutes: true,
        compositeIsNucleus: true,
        fixPiIffFixBoth: true,
    });
}
export function varyingFamilyReceipt() {
    const trueFiber = nuclearSquareReceipt(TRUTH_TOP, TRUTH_BOTTOM);
    const falseFiber = nuclearSquareReceipt(KNOWLEDGE_TOP, TRUTH_BOTTOM);
    const leftValue = trueFiber.left.action[KNOWLEDGE_BOTTOM];
    const rightValue = falseFiber.left.action[KNOWLEDGE_BOTTOM];
    if (leftValue !== TRUTH_TOP || rightValue !== KNOWLEDGE_TOP) {
        throw new TypeError("varyingFamilyReceipt: expected the Lean true/false fibers to differ at kBot");
    }
    return Object.freeze({
        kind: "bigradedDiamond.varyingFamily:witness",
        fibers: Object.freeze({
            true: trueFiber,
            false: falseFiber,
        }),
        varies: true,
        witness: Object.freeze({
            leftFiber: "true",
            rightFiber: "false",
            differingNucleus: "j1",
            at: KNOWLEDGE_BOTTOM,
            leftValue: TRUTH_TOP,
            rightValue: KNOWLEDGE_TOP,
        }),
    });
}
export function receipt() {
    return Object.freeze({
        kind: "bigradedDiamond.receipt:witness",
        heyting: knowledgeHeytingReceipt(),
        family: varyingFamilyReceipt(),
        finiteNuclearQuartetDischarged: true,
    });
}
export const knowledgeBit = (grade) => grade === "neg" || grade === "negConf";
export const truthBit = (grade) => grade === "conf" || grade === "negConf";
export function toFourCorner(grade) {
    return Object.freeze([knowledgeBit(grade), truthBit(grade)]);
}
export function ofFourCorner(corner) {
    const [knowledgeAxis, truthAxis] = corner;
    if (knowledgeAxis && truthAxis)
        return "negConf";
    if (knowledgeAxis)
        return "neg";
    if (truthAxis)
        return "conf";
    return "id";
}
export function fourCornerToCorner(corner) {
    const [knowledgeAxis, truthAxis] = corner;
    if (knowledgeAxis && truthAxis)
        return KNOWLEDGE_BOTTOM;
    if (knowledgeAxis)
        return TRUTH_BOTTOM;
    if (truthAxis)
        return KNOWLEDGE_TOP;
    return TRUTH_TOP;
}
export function gradePoles(grade) {
    switch (grade) {
        case "id": return Object.freeze([KNOWLEDGE_BOTTOM, KNOWLEDGE_BOTTOM]);
        case "neg": return Object.freeze([TRUTH_TOP, KNOWLEDGE_BOTTOM]);
        case "conf": return Object.freeze([TRUTH_BOTTOM, KNOWLEDGE_BOTTOM]);
        case "negConf": return Object.freeze([KNOWLEDGE_TOP, KNOWLEDGE_BOTTOM]);
    }
}
const gradeToGaugeElement = (grade) => {
    switch (grade) {
        case "id": return "id";
        case "neg": return "negation";
        case "conf": return "conflation";
        case "negConf": return "double";
    }
};
const mulK4 = (left, right) => ofFourCorner(Object.freeze([
    knowledgeBit(left) !== knowledgeBit(right),
    truthBit(left) !== truthBit(right),
]));
function gradeReceipt(grade) {
    const fourCorner = toFourCorner(grade);
    const [leftPole, rightPole] = gradePoles(grade);
    return Object.freeze({
        grade,
        gaugeElement: gradeToGaugeElement(grade),
        knowledgeAxis: fourCorner[0],
        truthAxis: fourCorner[1],
        fourCorner,
        corner: fourCornerToCorner(fourCorner),
        leftPole,
        rightPole,
        square: nuclearSquareReceipt(leftPole, rightPole),
    });
}
export function towerReceipt() {
    const grades = Object.freeze(k4Grades.map(gradeReceipt));
    const axesAssemble = k4Grades.every((grade) => ofFourCorner(toFourCorner(grade)) === grade);
    const axesIndependent = k4Grades.every((grade) => knowledgeBit(mulK4("neg", grade)) !== knowledgeBit(grade)
        && truthBit(mulK4("neg", grade)) === truthBit(grade)
        && knowledgeBit(mulK4("conf", grade)) === knowledgeBit(grade)
        && truthBit(mulK4("conf", grade)) !== truthBit(grade));
    const everyGradeSameOrderSquare = grades.every((grade) => grade.square.leftPole === grade.leftPole && grade.square.rightPole === grade.rightPole);
    const everyGradeFixPiIff = grades.every((grade) => grade.square.fixPiIffFixBoth);
    if (!axesAssemble || !axesIndependent || !everyGradeSameOrderSquare || !everyGradeFixPiIff) {
        throw new TypeError("towerReceipt: K4 bigraded diamond tower laws failed");
    }
    return Object.freeze({
        kind: "bigradedDiamond.tower:witness",
        grades,
        gradeCount: 4,
        cornerCount: 4,
        axesAssemble: true,
        axesIndependent: true,
        everyGradeSameOrderSquare: true,
        everyGradeFixPiIff: true,
        crossOrderForbidsCoNucleus: crossOrderNotKnowledgeNucleus(["tower"]),
    });
}
