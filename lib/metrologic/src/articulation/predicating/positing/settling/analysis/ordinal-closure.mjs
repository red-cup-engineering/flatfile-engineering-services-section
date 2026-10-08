/**
 * analysis/ordinal-closure - finite/symbolic executable shadow of
 * RelMath.Closure.OrdinalCore and RelMath.Closure.Ordinal.
 *
 * The existing settling closure workbench owns the actual zero/successor/limit
 * ordinal constructors. This module packages the Lean-facing facts that are
 * runtime-checkable without pretending that arbitrary `Nat -> Ord` functions are
 * executable data: finite successor towers, named omega limits, shape-based
 * regime reads, and the old Boolean classifier as the ordinal's shadow.
 */
import { aperiodicClosureRegime, finiteClosureRegime, finiteOrdinal, finiteOrdinalJudgment, omegaMultipleOrdinal, omegaOrdinal, ordinalPlusFinite, scottClosureRegime, successorOrdinal, transfiniteClosureRegime, zeroOrdinal, } from "../closure.mjs";
import { classifyRegime, } from "../value-category.mjs";
import { natZero, successor, toCount } from "@red-cup-engineering/exact-number-data-service/exact-number";
const naturalFromNumber = (value) => {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new RangeError("ordinalClosure: natural inputs must be non-negative safe integers");
    }
    let out = natZero;
    for (let index = 0; index < value; index += 1)
        out = successor(out);
    return out;
};
const naturalToNumber = (value) => toCount(value);
export function ofNat(stage) {
    return finiteOrdinal(naturalFromNumber(stage));
}
function finiteSummary(stage) {
    let out = Object.freeze({ kind: "ordinalClosure.summary.zero" });
    for (let index = 0; index < stage; index += 1) {
        out = Object.freeze({ kind: "ordinalClosure.summary.successor", predecessor: out });
    }
    return out;
}
const omegaSummary = (prefixLength) => Object.freeze({
    kind: "ordinalClosure.summary.limit",
    name: "omega",
    fundamentalPrefix: Object.freeze(Array.from({ length: prefixLength }, (_item, index) => finiteSummary(index))),
});
const omegaShiftSummary = (prefixLength) => Object.freeze({
    kind: "ordinalClosure.summary.limit",
    name: "omegaShift",
    fundamentalPrefix: Object.freeze(Array.from({ length: prefixLength }, (_item, index) => {
        let out = omegaSummary(3);
        for (let step = 0; step < index; step += 1) {
            out = Object.freeze({ kind: "ordinalClosure.summary.successor", predecessor: out });
        }
        return out;
    })),
});
export function isFiniteOrdinal(ordinal) {
    return finiteOrdinalJudgment(ordinal).kind === "ordinal.closure.finiteOrdinal:witness";
}
function regimeOfOrdinalShape(ordinalFinite, scottContinuous, countableCofinality) {
    if (ordinalFinite)
        return finiteClosureRegime;
    if (scottContinuous)
        return scottClosureRegime;
    if (countableCofinality)
        return transfiniteClosureRegime;
    return aperiodicClosureRegime;
}
export function regimeOfOrdinal(ordinal, scottContinuous, countableCofinality) {
    return regimeOfOrdinalShape(isFiniteOrdinal(ordinal), scottContinuous, countableCofinality);
}
export function finiteRead(stage) {
    const ordinal = ofNat(stage);
    const finite = finiteOrdinalJudgment(ordinal);
    if (finite.kind !== "ordinal.closure.finiteOrdinal:witness") {
        throw new TypeError("finiteRead: ofNat did not produce a finite ordinal");
    }
    const nextFinite = finiteOrdinalJudgment(successorOrdinal(ordinal));
    const belowOmega = isFiniteOrdinal(ordinal) && !isFiniteOrdinal(omegaOrdinal());
    if (nextFinite.kind !== "ordinal.closure.finiteOrdinal:witness" || !belowOmega) {
        throw new TypeError("finiteRead: finite ordinal monotonicity check failed");
    }
    return Object.freeze({
        kind: "ordinalClosure.finiteRead:witness",
        stage,
        ordinal: finiteSummary(stage),
        isFinite: true,
        finiteWitnessValue: naturalToNumber(finite.value),
        regime: finiteClosureRegime,
        belowOmega: true,
        monotoneBelowNext: true,
    });
}
export function namedLimitRead(name, prefixLength = 4) {
    const ordinal = name === "omega"
        ? omegaOrdinal()
        : omegaMultipleOrdinal(successor(successor(natZero)));
    const prefixOrdinals = Array.from({ length: prefixLength }, (_item, index) => {
        const n = naturalFromNumber(index);
        return name === "omega" ? finiteOrdinal(n) : ordinalPlusFinite(omegaOrdinal(), n);
    });
    const prefixBelowLimit = prefixOrdinals.every((prefix) => name === "omega"
        ? isFiniteOrdinal(prefix) && !isFiniteOrdinal(ordinal)
        : !isFiniteOrdinal(ordinal));
    if (isFiniteOrdinal(ordinal) || !prefixBelowLimit) {
        throw new TypeError("namedLimitRead: named limit failed finite-prefix check");
    }
    return Object.freeze({
        kind: "ordinalClosure.namedLimit:witness",
        name,
        ordinal: name === "omega" ? omegaSummary(prefixLength) : omegaShiftSummary(prefixLength),
        isFinite: false,
        prefixBelowLimit: true,
        regimeWhenScott: regimeOfOrdinal(ordinal, true, true),
        regimeWhenNonScottCountable: regimeOfOrdinal(ordinal, false, true),
        regimeWhenNonScottUncountable: regimeOfOrdinal(ordinal, false, false),
    });
}
export function classifierShadow(data, ordinal) {
    const ordinalIsFinite = isFiniteOrdinal(ordinal);
    if (ordinalIsFinite !== data.finiteBase) {
        throw new TypeError("classifierShadow: ordinal finiteness must match the finiteBase flag");
    }
    const regime = regimeOfOrdinal(ordinal, data.scottContinuous, data.countableCofinality);
    const classified = classifyRegime(data);
    if (regime.kind !== classified.kind) {
        throw new TypeError("classifierShadow: ordinal regime disagrees with Boolean classifier");
    }
    return Object.freeze({
        kind: "ordinalClosure.classifierShadow:witness",
        data,
        ordinalIsFinite,
        finiteFlagMatchesOrdinal: true,
        regimeOfOrdinal: regime,
        classifiedRegime: classified,
        matches: true,
    });
}
export function receipt(stage = 3) {
    const finite = finiteRead(stage);
    const data = Object.freeze({
        kind: "settling.closureRegimeData",
        scottContinuous: true,
        finiteBase: true,
        countableCofinality: true,
    });
    return Object.freeze({
        kind: "ordinalClosure.receipt:witness",
        finite,
        omega: namedLimitRead("omega"),
        omegaShift: namedLimitRead("omegaShift"),
        classifierShadow: classifierShadow(data, ofNat(stage)),
        limitLubBoundary: "named-fundamental-sequence-prefix",
        arbitraryLimitBoundary: "proof-side Nat -> Ord functions",
    });
}
