/**
 * Predicating equality: a conditional read of an OBSERVED diagonal, not a
 * primitive comparison of Marks or a content-addressed comparison of payloads.
 *
 * Obsmetrologia's Mark-identification law requires a retained equivalence
 * witness relative to an explicit trace and test family (Quot.sound). An
 * observed separation requires its obstruction. The caller supplies those
 * measurements; this mathematical layer neither hashes a Mark nor assumes
 * that absence of identification establishes inequality.
 *
 * Truth/knowledge projections are downstream readings of that admitted
 * diagonal, not proofs that relationlessness itself created the tests.
 */
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
/** Read one caller-admitted comparison, never a Mark payload or its NI digest.
 * Even a Boolean verdict is insufficient: we require the measured trace/test
 * context and either an identification witness or a separating obstruction.
 * Unknown comparisons cannot silently become off-diagonal refutations.
 */
function observedDiagonal(subject, object, observe) {
    if (typeof observe !== "function")
        throw new TypeError("predicating equality requires an observational comparison");
    const result = observe(subject, object);
    if (!result || typeof result !== "object" ||
        typeof result.traceId !== "string" || !result.traceId ||
        typeof result.testFamilyId !== "string" || !result.testFamilyId)
        throw new TypeError("predicating equality requires a trace and test-family reading");
    if (result.relation === "identified" && result.witness != null) return true;
    if (result.relation === "separated" && result.obstruction != null) return false;
    throw new TypeError("predicating equality is unresolved without identification witness or separating obstruction");
}
export function diagonalFiber(subject, object, observe) {
    return observedDiagonal(subject, object, observe) ? Object.freeze([subject]) : Object.freeze([]);
}
export function classicalEq(subject, object, observe) {
    return truthJoinList(diagonalFiber(subject, object, observe).map(() => TRUTH_TOP));
}
export function paraconsistentEq(subject, object, observe) {
    return knowledgeJoinList(diagonalFiber(subject, object, observe).map(() => KNOWLEDGE_TOP));
}
export function equalityCell(subject, object, observe) {
    const diagonal = observedDiagonal(subject, object, observe);
    return Object.freeze({
        kind: "predicating.equality.cell",
        subject, object, diagonal,
        classical: truthJoinList(diagonal ? [TRUTH_TOP] : []),
        paraconsistent: knowledgeJoinList(diagonal ? [KNOWLEDGE_TOP] : []),
    });
}
export function predicatingEqualityReceipt(entities, observe) {
    const cells = Object.freeze(entities.flatMap((subject) => entities.map((object) => equalityCell(subject, object, observe))));
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
        derivedFromObservedDiagonal: true,
        quotientAdmission: "relative to the supplied trace, tests and source observations",
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
