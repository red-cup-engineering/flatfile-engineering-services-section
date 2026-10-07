/**
 * analysis/inverse-hull - constant Anderson-Putnam inverse hull receipts.
 *
 * Executable shadow of RelMath.Aperiodic.InverseHull for the constant H1Class
 * inverse system: every stage carries the same class, restrictions are
 * identity, and the seam reads the class at stage 0.
 */
import { aperiodicWitness, h1Class, h1Zero, } from "./aperiodic-classification.mjs";
function assertNat(value, caller) {
    if (!Number.isSafeInteger(value) || value < 0)
        throw new RangeError(`${caller}: expected a natural stage`);
}
function sameH1(left, right) {
    return left.coord === right.coord;
}
function uniqueSortedStages(stages) {
    for (const stage of stages)
        assertNat(stage, "constThread");
    return Object.freeze([...new Set(stages)].sort((left, right) => left - right));
}
export function constThread(clInv, sampleStages = [0, 1, 2, 3]) {
    const stages = uniqueSortedStages(sampleStages);
    return Object.freeze({
        kind: "aperiodic.inverseHull.constantThread",
        clInv,
        sampleStages: stages,
        values: Object.freeze(Object.fromEntries(stages.map((stage) => [String(stage), clInv]))),
        coherent: true,
    });
}
export function projAt(thread, stage) {
    assertNat(stage, "projAt");
    return thread.clInv;
}
export const seamMap = (thread) => projAt(thread, 0);
export function threadExtensional(left, right) {
    return sameH1(left.clInv, right.clInv);
}
export function hullSeparatedByStages(left, right, stages = [0, 1, 2, 3]) {
    const checkedStages = uniqueSortedStages(stages);
    const agreesAtStages = checkedStages.every((stage) => sameH1(projAt(left, stage), projAt(right, stage)));
    return !agreesAtStages || threadExtensional(left, right);
}
export function receipt(coord = 1) {
    const target = h1Class(coord);
    const thread = constThread(target);
    const seam = seamMap(thread);
    const witness = aperiodicWitness(1);
    const witnessThread = constThread(witness.clInv);
    const zeroThread = constThread(h1Zero);
    const oneThread = constThread(h1Class(1));
    const seamMapConstThread = sameH1(seam, target);
    const seamMapSurjective = sameH1(seamMap(constThread(target)), target);
    const extensional = threadExtensional(constThread(target, [0]), constThread(target, [2, 5]));
    const separated = hullSeparatedByStages(constThread(target), constThread(target, [4, 8]), [0, 1, 5]);
    const pairsClInv = sameH1(seamMap(witnessThread), witness.clInv) && !sameH1(seamMap(witnessThread), h1Zero);
    const distinctThreads = !threadExtensional(zeroThread, oneThread) && !sameH1(seamMap(zeroThread), seamMap(oneThread));
    if (!seamMapConstThread || !seamMapSurjective || !extensional || !separated || !pairsClInv || !distinctThreads) {
        throw new TypeError("inverseHull.receipt: finite constant-hull laws failed");
    }
    return Object.freeze({
        kind: "aperiodic.inverseHull.receipt:witness",
        thread,
        seam,
        witnessThread,
        zeroThread,
        oneThread,
        seamMapConstThread: true,
        seamMapSurjective: true,
        threadExtensional: true,
        hullSeparatedByStages: true,
        hullPairsClInv: true,
        apHullHasDistinctThreads: true,
        constantHullBoundary: "genuine Cantor hull and hullLeaf real accretion remain proof/frontier work",
    });
}
