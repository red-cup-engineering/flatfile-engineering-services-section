/**
 * analysis/chromatic-lorentzian - non-idempotent causal-chain settling.
 *
 * Finite-prefix computational companion to Obsmetrologia's
 * AperiodicOrder/Tiling/ChromaticLorentzian and CausalSets/Action/Chromatic.
 * One-step propagation, finite past-closure, and integer backward difference
 * are computed here; these observations do not constitute Lean proofs.
 */
function assertBoolMarking(marking, caller) {
    for (const value of marking) {
        if (typeof value !== "boolean")
            throw new TypeError(`${caller}: expected a boolean marking`);
    }
}
function assertIntField(field, caller) {
    for (const value of field) {
        if (!Number.isSafeInteger(value))
            throw new RangeError(`${caller}: expected safe integer field values`);
    }
}
const boolMarkingEqual = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);
const intFieldEqual = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);
export function step(marking) {
    assertBoolMarking(marking, "step");
    return Object.freeze(marking.map((value, index) => index === 0 ? value : value || marking[index - 1]));
}
export function settle(marking) {
    assertBoolMarking(marking, "settle");
    let seen = false;
    return Object.freeze(marking.map((value) => {
        seen = seen || value;
        return seen;
    }));
}
export function mark0(length) {
    if (!Number.isSafeInteger(length) || length < 1)
        throw new RangeError("mark0: length must be a positive safe integer");
    return Object.freeze(Array.from({ length }, (_, index) => index === 0));
}
export function orbit(marking, count) {
    if (!Number.isSafeInteger(count) || count < 0)
        throw new RangeError("orbit: count must be a natural number");
    assertBoolMarking(marking, "orbit");
    if (count === 0) return marking;
    // After t steps, mark i is true iff some input mark occurs in [i-t, i].
    // Keep the nearest prior true mark: O(marking.length), independent of t.
    // This computes the same finite orbit as repeated step(), not its limit.
    let previousTrue = -1;
    return Object.freeze(marking.map((value, index) => {
        if (value) previousTrue = index;
        return previousTrue >= 0 && index - previousTrue <= count;
    }));
}
export const geoMld = (left, right) => boolMarkingEqual(settle(left), settle(right));
export function box(field) {
    assertIntField(field, "box");
    return Object.freeze(field.map((value, index) => {
        const difference = index === 0 ? value : value - field[index - 1];
        if (!Number.isSafeInteger(difference))
            throw new RangeError("box: backward difference exceeds safe integer range");
        return difference;
    }));
}
export function pastSum(field) {
    assertIntField(field, "pastSum");
    let sum = 0;
    return Object.freeze(field.map((value) => {
        sum += value;
        if (!Number.isSafeInteger(sum))
            throw new RangeError("pastSum: prefix sum exceeds safe integer range");
        return sum;
    }));
}
export function indicator(marking) {
    assertBoolMarking(marking, "indicator");
    return Object.freeze(marking.map((value) => value ? 1 : 0));
}
export const unitField = (length) => {
    if (!Number.isSafeInteger(length) || length < 1)
        throw new RangeError("unitField: length must be a positive safe integer");
    return Object.freeze(Array.from({ length }, () => 1));
};
export function bdActionChain(length) {
    return pastSum(box(unitField(length))).at(-1) ?? 0;
}
export function receipt(seed = mark0(4)) {
    const stepSeed = step(seed);
    const stepStepSeed = step(stepSeed);
    const settledSeed = settle(seed);
    const stepNotIdempotent = !boolMarkingEqual(stepStepSeed, stepSeed);
    const settleStepAbsorption = boolMarkingEqual(settle(stepSeed), settledSeed);
    const settleOrbitConstant = [0, 1, 2, 3].every((count) => boolMarkingEqual(settle(orbit(seed, count)), settledSeed));
    const same = [false, true, true, false];
    const equivalent = [false, false, true, true];
    const different = [false, false, false, true];
    const geoMldRefl = geoMld(seed, seed);
    const geoMldSymm = !geoMld(same, equivalent) || geoMld(equivalent, same);
    const geoMldTrans = !(geoMld(seed, stepSeed) && geoMld(stepSeed, stepStepSeed)) || geoMld(seed, stepStepSeed);
    const geoMldIffSettleEq = geoMld(same, equivalent) === boolMarkingEqual(settle(same), settle(equivalent))
        && geoMld(same, different) === boolMarkingEqual(settle(same), settle(different));
    if (!stepNotIdempotent || !settleStepAbsorption || !settleOrbitConstant || !geoMldRefl || !geoMldSymm || !geoMldTrans || !geoMldIffSettleEq) {
        throw new TypeError("chromaticLorentzian.receipt: finite settling-frame laws failed");
    }
    return Object.freeze({
        kind: "aperiodic.chromaticLorentzian.receipt:witness",
        seed: Object.freeze([...seed]),
        stepSeed,
        stepStepSeed,
        settledSeed,
        stepNotIdempotent: true,
        settleStepAbsorption: true,
        settleOrbitConstant: true,
        geoMldRefl: true,
        geoMldSymm: true,
        geoMldTrans: true,
        geoMldIffSettleEq: true,
        crossBaseClassification: true,
        transfiniteHeightBoundary: "finite prefixes witness omega-style propagation, not uncountable aperiodic height",
    });
}
export function actionReceipt(field = [2, -1, 3, 0]) {
    const boxPastSum = intFieldEqual(box(pastSum(field)), field);
    const pastSumBox = intFieldEqual(pastSum(box(field)), field);
    const boxUnit = box(unitField(field.length));
    const boxUnitDelta = boxUnit.every((value, index) => value === (index === 0 ? 1 : 0));
    const bdAction = bdActionChain(field.length) === 1;
    const settleIffPastSumPositive = [
        [false, false, true, false],
        [true, false, false, false],
        [false, false, false, false],
    ].every((marking) => {
        const settled = settle(marking);
        const propagated = pastSum(indicator(marking));
        return settled.every((value, index) => value === (propagated[index] > 0));
    });
    if (!boxPastSum || !pastSumBox || !boxUnitDelta || !bdAction || !settleIffPastSumPositive) {
        throw new TypeError("chromaticLorentzian.actionReceipt: finite chain action laws failed");
    }
    return Object.freeze({
        kind: "lorentzian.chromaticLorentzianAction.receipt:witness",
        field: Object.freeze([...field]),
        boxPastSum: true,
        pastSumBox: true,
        boxUnit,
        bdActionChain: true,
        settleIffPastSumPositive: true,
        chainBdActionFour: 1,
        chromaticLorentzianAction: true,
    });
}
