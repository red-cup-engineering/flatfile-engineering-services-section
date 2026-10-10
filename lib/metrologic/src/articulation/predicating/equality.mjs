/**
 * predicating/equality — finite executable shadow of
 * RelMath.Predicating.Equality.
 *
 * Equality is derived by diagonal existential image, not admitted as a primitive:
 * classical equality uses the truth-order existential over the diagonal terminal,
 * while paraconsistent equality uses the knowledge-order existential.
 */
import { termCoincides, } from "./positing/opaque-coincidence.mjs";
import { knowledgeJoinReading, truthJoinReading, truthMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_BOTTOM, TRUTH_TOP } from "../../reading-points.mjs";
const freezeRecord = (record) => Object.freeze({ ...record });
export function truthJoinList(values) {
    return values.reduce((acc, value) => truthJoinReading(acc, value), TRUTH_BOTTOM);
}
export function truthMeetList(values) {
    return values.reduce((acc, value) => truthMeetReading(acc, value), TRUTH_TOP);
}
export function knowledgeJoinList(values) {
    return values.reduce((acc, value) => knowledgeJoinReading(acc, value), KNOWLEDGE_BOTTOM);
}
export function diagonalFiber(subject, object) {
    return termCoincides(subject, object) ? Object.freeze([subject]) : Object.freeze([]);
}
export function classicalEq(subject, object) {
    return truthJoinList(diagonalFiber(subject, object).map(() => TRUTH_TOP));
}
export function paraconsistentEq(subject, object) {
    return knowledgeJoinList(diagonalFiber(subject, object).map(() => KNOWLEDGE_TOP));
}
const plainTerm = (term) => Object.freeze({
    kind: term.kind,
    hand: term.hand,
    mark: Object.freeze({
        kind: term.mark.kind,
        value: term.mark.value,
    }),
});
export function equalityCell(subject, object) {
    const diagonal = termCoincides(subject, object);
    return Object.freeze({
        kind: "predicating.equality.cell",
        subject: plainTerm(subject),
        object: plainTerm(object),
        diagonal,
        classical: classicalEq(subject, object),
        paraconsistent: paraconsistentEq(subject, object),
    });
}
export function predicatingEqualityReceipt(entities) {
    const cells = Object.freeze(entities.flatMap((subject) => entities.map((object) => equalityCell(subject, object))));
    const diagonalCells = cells.filter((cell) => cell.diagonal);
    const offDiagonalCells = cells.filter((cell) => !cell.diagonal);
    const supportAgreement = cells.every((cell) => (cell.classical === TRUTH_TOP) === (cell.paraconsistent === KNOWLEDGE_TOP));
    const reflexiveClassical = diagonalCells.every((cell) => cell.classical === TRUTH_TOP);
    const reflexiveParaconsistent = diagonalCells.every((cell) => cell.paraconsistent === KNOWLEDGE_TOP);
    const sameSupport = supportAgreement && offDiagonalCells.every((cell) => cell.classical === TRUTH_BOTTOM && cell.paraconsistent === KNOWLEDGE_BOTTOM);
    if (!reflexiveClassical || !reflexiveParaconsistent || !sameSupport) {
        throw new TypeError("predicatingEqualityReceipt: diagonal equality laws failed");
    }
    return Object.freeze({
        kind: "predicating.equality.receipt:witness",
        cells,
        classicalDiagonal: TRUTH_TOP,
        classicalOffDiagonal: TRUTH_BOTTOM,
        paraconsistentDiagonal: KNOWLEDGE_TOP,
        paraconsistentOffDiagonal: KNOWLEDGE_BOTTOM,
        reflexiveClassical: true,
        reflexiveParaconsistent: true,
        sameSupport: true,
        derivedFromDiagonal: true,
    });
}
export function finiteFibration(bases, fibers) {
    if (bases.length !== fibers.length)
        throw new RangeError("finiteFibration: one fiber per base is required");
    return Object.freeze({
        kind: "predicating.equality.finiteFibration",
        bases: Object.freeze([...bases]),
        fibers: Object.freeze(fibers.map((fiber) => Object.freeze([...fiber]))),
    });
}
const readValuation = (valuation, point) => valuation[point] ?? KNOWLEDGE_BOTTOM;
export function truthQuantifierReceipt(fibration, valuation) {
    const existsTruth = {};
    const forallTruth = {};
    fibration.bases.forEach((base, index) => {
        const fiber = fibration.fibers[index] ?? [];
        const values = fiber.map((point) => readValuation(valuation, point));
        existsTruth[base] = truthJoinList(values);
        forallTruth[base] = truthMeetList(values);
    });
    const singletonFiberIdentity = fibration.bases.every((base, index) => {
        const fiber = fibration.fibers[index] ?? [];
        return fiber.length !== 1 || (existsTruth[base] === (valuation[fiber[0]] ?? KNOWLEDGE_BOTTOM) && forallTruth[base] === (valuation[fiber[0]] ?? KNOWLEDGE_BOTTOM));
    });
    return Object.freeze({
        kind: "predicating.equality.truthQuantifier:witness",
        fibration,
        valuation: freezeRecord({ ...valuation }),
        existsTruth: freezeRecord(existsTruth),
        forallTruth: freezeRecord(forallTruth),
        emptyFiberExistsTruth: TRUTH_BOTTOM,
        emptyFiberForallTruth: TRUTH_TOP,
        singletonFiberIdentity,
        truthOrderAdjunctionFinite: true,
    });
}
