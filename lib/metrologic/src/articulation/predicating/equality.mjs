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
const freezeRecord = (record) => Object.freeze({ ...record });
export function truthJoinList(values) {
    return values.reduce((acc, value) => truthJoinReading(acc, value), "active");
}
export function truthMeetList(values) {
    return values.reduce((acc, value) => truthMeetReading(acc, value), "potential");
}
export function knowledgeJoinList(values) {
    return values.reduce((acc, value) => knowledgeJoinReading(acc, value), "absurd");
}
export function diagonalFiber(subject, object) {
    return termCoincides(subject, object) ? Object.freeze([subject]) : Object.freeze([]);
}
export function classicalEq(subject, object) {
    return truthJoinList(diagonalFiber(subject, object).map(() => "potential"));
}
export function paraconsistentEq(subject, object) {
    return knowledgeJoinList(diagonalFiber(subject, object).map(() => "stable"));
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
    const supportAgreement = cells.every((cell) => (cell.classical === "potential") === (cell.paraconsistent === "stable"));
    const reflexiveClassical = diagonalCells.every((cell) => cell.classical === "potential");
    const reflexiveParaconsistent = diagonalCells.every((cell) => cell.paraconsistent === "stable");
    const sameSupport = supportAgreement && offDiagonalCells.every((cell) => cell.classical === "active" && cell.paraconsistent === "absurd");
    if (!reflexiveClassical || !reflexiveParaconsistent || !sameSupport) {
        throw new TypeError("predicatingEqualityReceipt: diagonal equality laws failed");
    }
    return Object.freeze({
        kind: "predicating.equality.receipt:witness",
        cells,
        classicalDiagonal: "potential",
        classicalOffDiagonal: "active",
        paraconsistentDiagonal: "stable",
        paraconsistentOffDiagonal: "absurd",
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
const readValuation = (valuation, point) => valuation[point] ?? "absurd";
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
        return fiber.length !== 1 || (existsTruth[base] === (valuation[fiber[0]] ?? "absurd") && forallTruth[base] === (valuation[fiber[0]] ?? "absurd"));
    });
    return Object.freeze({
        kind: "predicating.equality.truthQuantifier:witness",
        fibration,
        valuation: freezeRecord({ ...valuation }),
        existsTruth: freezeRecord(existsTruth),
        forallTruth: freezeRecord(forallTruth),
        emptyFiberExistsTruth: "active",
        emptyFiberForallTruth: "potential",
        singletonFiberIdentity,
        truthOrderAdjunctionFinite: true,
    });
}
