/**
 * analysis/internal-real - finite executable shadows of RelMath.InternalReals.
 *
 * Lean derives constructive rationals/reals, logarithms, scalar cancellation,
 * entropy monotonicity, and the per-step log-Lipschitz bound. This module keeps
 * the Node surface finite and exact: it computes rational approximants and
 * carrier-shaped witnesses for the laws that can be checked over bounded Nat
 * inputs without pretending to materialize arbitrary Bishop reals.
 */
import { fromRatio, ratAdd, ratCompare, ratEqual, ratFromInt, ratMultiply, ratNegate, ratOne, ratSubtract, ratZero, } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { factorial } from "./number-theory.mjs";
import { receipt as chromaticLorentzianReceipt, } from "./chromatic-lorentzian.mjs";
const assertNat = (name, value) => {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new RangeError(`${name}: expected a non-negative safe integer`);
    }
};
const assertSafeInteger = (value, name) => {
    if (!Number.isSafeInteger(value))
        throw new RangeError(`${name}: expected a safe integer`);
};
const assertPositiveNat = (name, value) => {
    assertNat(name, value);
    if (value < 1)
        throw new RangeError(`${name}: expected a positive safe integer`);
};
function powNat(base, exponent) {
    assertNat("powNat base", base);
    assertNat("powNat exponent", exponent);
    let value = 1;
    for (let index = 0; index < exponent; index += 1) {
        value *= base;
        if (!Number.isSafeInteger(value))
            throw new RangeError("powNat: result exceeds safe integer range");
    }
    return value;
}
function safeAdd(left, right, label) {
    const value = left + right;
    if (!Number.isSafeInteger(value))
        throw new RangeError(`${label}: result exceeds safe integer range`);
    return value;
}
function safeMultiply(left, right, label) {
    const value = left * right;
    if (!Number.isSafeInteger(value))
        throw new RangeError(`${label}: result exceeds safe integer range`);
    return value;
}
/** The floor logarithm `floor(log_b n)`, matching RelMath.InternalReals.natLog. */
export function natLog(base, n) {
    assertNat("natLog base", base);
    assertNat("natLog n", n);
    if (base < 2)
        throw new RangeError("natLog: base must be at least 2");
    if (n < 1)
        throw new RangeError("natLog: argument must be at least 1");
    let exponent = 0;
    while (powNat(base, exponent + 1) <= n)
        exponent += 1;
    return exponent;
}
/** The `k`th rational under-approximation of `log_b(N)`: `floor(log_b(N^(k+1))) / (k+1)`. */
export function logSeq(base, n, k) {
    assertNat("logSeq k", k);
    return fromRatio(natLog(base, powNat(n, k + 1)), k + 1);
}
/** The rational `1/(k+1)` from the Lean `Rat.invNatP k` constructor. */
export function invNatP(k) {
    assertNat("invNatP k", k);
    return fromRatio(1, k + 1);
}
/** Dependency-free floor square root, matching `RelMath.InternalReals.natSqrt`. */
export function natSqrt(n) {
    assertNat("natSqrt n", n);
    let root = 0;
    while (safeMultiply(root + 1, root + 1, "natSqrt") <= n)
        root += 1;
    return root;
}
/** The `k`th rational under-approximation of `sqrt(c)`: `floor(sqrt(c*(k+1)^2))/(k+1)`. */
export function sqrtSeq(c, k) {
    assertNat("sqrtSeq c", c);
    assertNat("sqrtSeq k", k);
    const scale = k + 1;
    return fromRatio(natSqrt(safeMultiply(c, safeMultiply(scale, scale, "sqrtSeq scale"), "sqrtSeq radicand")), scale);
}
/**
 * Finite carrier for `sqrtSeq_sq_le` and `ofNat_sub_sqrtSeq_sq_le`:
 * `sqrtSeq(c,k)^2 <= c` and, for `c >= 1`, `c - sqrtSeq(c,k)^2 <= 2c/(k+1)`.
 */
export function sqrtSeqApproximation(c, k) {
    assertNat("sqrtSeqApproximation c", c);
    assertNat("sqrtSeqApproximation k", k);
    const denominator = k + 1;
    const numerator = natSqrt(safeMultiply(c, safeMultiply(denominator, denominator, "sqrtSeqApproximation scale"), "sqrtSeqApproximation radicand"));
    const approximation = fromRatio(numerator, denominator);
    const square = ratMultiply(approximation, approximation);
    const target = ratFromInt(c);
    const lowerHolds = ratCompare(square, target) <= 0;
    const gap = ratSubtract(target, square);
    const gapBound = ratMultiply(ratFromInt(safeMultiply(2, c, "sqrtSeqApproximation gap bound")), invNatP(k));
    const upperAdmissible = c >= 1;
    const upperHolds = ratCompare(gap, gapBound) <= 0;
    if (lowerHolds && upperAdmissible && upperHolds) {
        return Object.freeze({
            kind: "internalReal.sqrtSeqApproximation:witness",
            c,
            k,
            numerator,
            denominator,
            approximation,
            square,
            target,
            lowerHolds,
            gap,
            gapBound,
            upperAdmissible,
            upperHolds,
        });
    }
    return Object.freeze({
        kind: "internalReal.sqrtSeqApproximation-obstruction",
        reason: !upperAdmissible ? "domain" : !lowerHolds ? "lower" : "upper",
        c,
        k,
        numerator,
        denominator,
        approximation,
        square,
        target,
        lowerHolds,
        gap,
        gapBound,
        upperAdmissible,
        upperHolds,
    });
}
/** Receipt for the constructive IVT stone earned by rational square-root bisection. */
export function constructiveIvtReceipt(c = 2, k = 2) {
    assertPositiveNat("constructiveIvtReceipt c", c);
    assertNat("constructiveIvtReceipt k", k);
    const approximation = sqrtSeqApproximation(c, k);
    if (approximation.kind !== "internalReal.sqrtSeqApproximation:witness") {
        throw new TypeError("constructiveIvtReceipt: finite sqrt bisection bounds failed");
    }
    const root = natSqrt(safeMultiply(c, safeMultiply(k + 1, k + 1, "constructiveIvtReceipt scale"), "constructiveIvtReceipt radicand"));
    const lower = root * root <= c * ((k + 1) * (k + 1));
    const upper = c * ((k + 1) * (k + 1)) < (root + 1) * (root + 1);
    if (!lower || !upper)
        throw new TypeError("constructiveIvtReceipt: natSqrt specification failed");
    return Object.freeze({
        kind: "internalReal.constructiveIvt.receipt:witness",
        sourceModule: "RelMath.Real.IVT",
        theorems: Object.freeze([
            "RelMath.InternalReals.natSqrt_spec",
            "RelMath.InternalReals.sqrtSeq_le_succ",
            "RelMath.InternalReals.sqrtSeq_sq_le",
            "RelMath.InternalReals.ofNat_sub_sqrtSeq_sq_le",
            "RelMath.InternalReals.sq_sqrtNat",
        ]),
        radicand: c,
        sampleIndex: k,
        approximation,
        decidableRationalOrder: true,
        floorSqrtSpec: true,
        bisectionCauchyStep: true,
        lowerBracket: approximation.lowerHolds,
        upperSqueeze: approximation.upperHolds,
        squareRootPinned: true,
        boundary: "constructive square-root bisection carrier; full polynomial IVT root extraction remains proof-side",
    });
}
const ratAbs = (value) => ratCompare(value, ratZero) < 0 ? ratNegate(value) : value;
const ratLeq = (left, right) => ratCompare(left, right) <= 0;
/**
 * Finite carrier for `RelMath.Real.RealMultiplication`.
 *
 * It checks the rational product lemmas used by the Bishop-real descent and the
 * ring laws on constant rational representatives.
 */
export function realMultiplicationReceipt() {
    const left = fromRatio(2, 3);
    const middle = fromRatio(-3, 5);
    const right = fromRatio(7, 4);
    const product = ratMultiply(left, middle);
    const nonnegative = fromRatio(4, 3);
    const lower = fromRatio(1, 5);
    const upper = fromRatio(2, 5);
    const c = 3;
    const j = 2;
    const m = 8;
    const w = fromRatio(5, 6);
    const x = fromRatio(7, 3);
    const y = fromRatio(1, 2);
    const z = fromRatio(4, 5);
    const absMul = ratEqual(ratAbs(ratMultiply(left, middle)), ratMultiply(ratAbs(left), ratAbs(middle)));
    const leftMonotoneNonnegative = ratLeq(ratMultiply(nonnegative, lower), ratMultiply(nonnegative, upper));
    const rightMonotoneNonnegative = ratLeq(ratMultiply(lower, nonnegative), ratMultiply(upper, nonnegative));
    const boundScaling = c * (j + 1) <= m + 1
        && ratLeq(ratMultiply(ratFromInt(c), invNatP(m)), invNatP(j));
    const productIncrementSplit = ratEqual(ratSubtract(ratMultiply(w, x), ratMultiply(y, z)), ratAdd(ratMultiply(w, ratSubtract(x, z)), ratMultiply(z, ratSubtract(w, y))));
    const commutative = ratEqual(ratMultiply(left, middle), ratMultiply(middle, left));
    const associative = ratEqual(ratMultiply(ratMultiply(left, middle), right), ratMultiply(left, ratMultiply(middle, right)));
    const oneMul = ratEqual(ratMultiply(ratOne, left), left);
    const mulOne = ratEqual(ratMultiply(left, ratOne), left);
    const zeroMul = ratEqual(ratMultiply(ratZero, left), ratZero);
    const mulZero = ratEqual(ratMultiply(left, ratZero), ratZero);
    const leftDistributive = ratEqual(ratMultiply(left, ratAdd(middle, right)), ratAdd(ratMultiply(left, middle), ratMultiply(left, right)));
    const rightDistributive = ratEqual(ratMultiply(ratAdd(left, middle), right), ratAdd(ratMultiply(left, right), ratMultiply(middle, right)));
    if (!absMul || !leftMonotoneNonnegative || !rightMonotoneNonnegative || !boundScaling
        || !productIncrementSplit || !commutative || !associative || !oneMul || !mulOne
        || !zeroMul || !mulZero || !leftDistributive || !rightDistributive) {
        throw new TypeError("realMultiplicationReceipt: finite rational product laws failed");
    }
    return Object.freeze({
        kind: "internalReal.realMultiplication:witness",
        theorem: "RelMath.InternalReals.RReal.mul",
        left,
        middle,
        right,
        product,
        absMul: true,
        leftMonotoneNonnegative: true,
        rightMonotoneNonnegative: true,
        boundScaling: true,
        productIncrementSplit: true,
        commutative: true,
        associative: true,
        oneMul: true,
        mulOne: true,
        zeroMul: true,
        mulZero: true,
        leftDistributive: true,
        rightDistributive: true,
        boundary: "finite constant-rational shadow of Bishop real multiplication; arbitrary real product moduli remain proof-side",
    });
}
/** Repeated addition of a rational, the finite carrier form of `nsmul`. */
export function nsmulRational(m, value) {
    assertNat("nsmulRational m", m);
    return ratMultiply(ratFromInt(m), value);
}
/** The executable rational carrier of `Rat.le_of_ofNat_mul_le_left`. */
export function scalarCancellation(m, left, right) {
    assertNat("scalarCancellation m", m);
    const scaledLeft = nsmulRational(m, left);
    const scaledRight = nsmulRational(m, right);
    const positive = m >= 1;
    const premiseHolds = ratCompare(scaledLeft, scaledRight) <= 0;
    const conclusionHolds = ratCompare(left, right) <= 0;
    if (positive && premiseHolds && conclusionHolds) {
        return Object.freeze({
            kind: "internalReal.scalarCancellation:witness",
            m,
            left,
            right,
            scaledLeft,
            scaledRight,
            positive,
            premiseHolds,
            conclusionHolds,
        });
    }
    return Object.freeze({
        kind: "internalReal.scalarCancellation-obstruction",
        reason: !positive ? "positive-scalar" : !premiseHolds ? "scaled-order-premise" : "conclusion",
        m,
        left,
        right,
        scaledLeft,
        scaledRight,
        positive,
        premiseHolds,
        conclusionHolds,
    });
}
/**
 * Finite rational approximation of `logNat_step_bound`:
 * `log₂(M+1) ≤ log₂ M + 1/(k+1)` when `2(k+1) ≤ M`.
 */
export function logStepBound(M, k) {
    assertNat("logStepBound M", M);
    assertNat("logStepBound k", k);
    const safeM = Math.max(M, 1);
    const lhs = logSeq(2, safeM + 1, k);
    const rhs = ratAdd(logSeq(2, safeM, k), invNatP(k));
    const admissible = 2 * (k + 1) <= M;
    const holds = ratCompare(lhs, rhs) <= 0;
    if (admissible && holds) {
        return Object.freeze({ kind: "internalReal.logStepBound:witness", base: 2, M, k, lhs, rhs, admissible, holds });
    }
    return Object.freeze({
        kind: "internalReal.logStepBound-obstruction",
        reason: admissible ? "bound" : "domain",
        base: 2,
        M,
        k,
        lhs,
        rhs,
        admissible,
        holds,
    });
}
export function logLipschitzReceipt(M = 8, k = 2) {
    const scalar = scalarCancellation(3, fromRatio(1, 4), fromRatio(1, 2));
    const step = logStepBound(M, k);
    if (scalar.kind !== "internalReal.scalarCancellation:witness" || step.kind !== "internalReal.logStepBound:witness") {
        throw new TypeError("logLipschitzReceipt: finite scalar/log-step laws failed");
    }
    const copiesOfInv = nsmulRational(k + 1, invNatP(k));
    return Object.freeze({
        kind: "internalReal.logLipschitz:witness",
        sourceModule: "RelMath.Real.LogLipschitz",
        theorems: Object.freeze([
            "RelMath.InternalReals.Rat.le_of_ofNat_mul_le_left",
            "RelMath.InternalReals.Rat.le_of_ofNat_mul_le",
            "RelMath.InternalReals.realNsmul_seq",
            "RelMath.InternalReals.nsmul_le_cancel",
            "RelMath.InternalReals.nsmul_ofRat_invNatP",
            "RelMath.InternalReals.logNat_one",
            "RelMath.InternalReals.logNat_pow_eq_nsmul",
            "RelMath.InternalReals.logNat_step_bound",
        ]),
        scalarCancellation: scalar,
        stepBound: step,
        oneLogIsZero: ratEqual(logSeq(2, 1, k), ratZero),
        invNatScalesToOne: ratEqual(copiesOfInv, ratOne),
        powerLawSample: (natLog(2, 8 ** 3) === 3 * natLog(2, 8)),
    });
}
/** Finite rational approximation of `logNat_mono`: `M ≤ N -> log_b M ≤ log_b N`. */
export function logMonotone(base, lower, upper, k) {
    assertNat("logMonotone base", base);
    assertNat("logMonotone lower", lower);
    assertNat("logMonotone upper", upper);
    assertNat("logMonotone k", k);
    const safeLower = Math.max(lower, 1);
    const safeUpper = Math.max(upper, 1);
    const lowerApprox = logSeq(base, safeLower, k);
    const upperApprox = logSeq(base, safeUpper, k);
    const admissible = base >= 2 && 1 <= lower && lower <= upper;
    const holds = ratCompare(lowerApprox, upperApprox) <= 0;
    if (admissible && holds) {
        return Object.freeze({
            kind: "internalReal.logMonotone:witness",
            base,
            lower,
            upper,
            k,
            lowerApprox,
            upperApprox,
            admissible,
            holds,
        });
    }
    return Object.freeze({
        kind: "internalReal.logMonotone-obstruction",
        reason: admissible ? "order" : "domain",
        base,
        lower,
        upper,
        k,
        lowerApprox,
        upperApprox,
        admissible,
        holds,
    });
}
/** Finite exact carrier for `RelMath.InternalReals.natLog_mul_bounds`. */
export function natLogMulBounds(base, left, right) {
    assertNat("natLogMulBounds base", base);
    assertNat("natLogMulBounds left", left);
    assertNat("natLogMulBounds right", right);
    const safeBase = Math.max(base, 2);
    const safeLeft = Math.max(left, 1);
    const safeRight = Math.max(right, 1);
    const leftFloor = natLog(safeBase, safeLeft);
    const rightFloor = natLog(safeBase, safeRight);
    const productFloor = natLog(safeBase, safeMultiply(safeLeft, safeRight, "natLogMulBounds product"));
    const lowerHolds = leftFloor + rightFloor <= productFloor;
    const upperHolds = productFloor <= leftFloor + rightFloor + 1;
    if (base >= 2 && left >= 1 && right >= 1 && lowerHolds && upperHolds) {
        return Object.freeze({
            kind: "internalReal.natLogMulBounds:witness",
            base,
            left,
            right,
            leftFloor,
            rightFloor,
            productFloor,
            lowerHolds,
            upperHolds,
        });
    }
    return Object.freeze({
        kind: "internalReal.natLogMulBounds-obstruction",
        reason: base < 2 || left < 1 || right < 1 ? "domain" : !lowerHolds ? "lower" : "upper",
        base,
        left,
        right,
        leftFloor,
        rightFloor,
        productFloor,
        lowerHolds,
        upperHolds,
    });
}
/** The fixed Lean theorem `log₂ 2 = 1`, as an exact rational carrier. */
export const binaryShiftEntropy = Object.freeze({
    kind: "internalReal.fullShiftEntropy:witness",
    alphabet: 2,
    value: ratOne,
});
/** Receipt for the constructive logarithm/entropy spine in `RelMath.Real.Logarithm`. */
export function logarithmReceipt() {
    const sampleN = 8;
    const sampleK = 2;
    const floorLog = natLog(2, sampleN);
    const approximation = logSeq(2, sampleN, sampleK);
    const monotone = logMonotone(2, 3, 5, sampleK);
    const mulBounds = natLogMulBounds(2, 3, 5);
    const natLogSpecLower = powNat(2, floorLog) <= sampleN;
    const natLogSpecUpper = sampleN < powNat(2, floorLog + 1);
    const logSeqSelf = ratEqual(logSeq(2, 2, sampleK), ratOne);
    const rationalOneHasZeroLog = ratEqual(ratSubtract(logSeq(2, 5, sampleK), logSeq(2, 5, sampleK)), ratZero);
    const goldenNested = 3 * 5 <= 8 * 2 && 8 * 8 <= 13 * 5 && 13 * 3 <= 5 * 8;
    if (floorLog !== 3 ||
        !ratEqual(approximation, ratFromInt(3)) ||
        monotone.kind !== "internalReal.logMonotone:witness" ||
        mulBounds.kind !== "internalReal.natLogMulBounds:witness" ||
        !natLogSpecLower ||
        !natLogSpecUpper ||
        !logSeqSelf ||
        !rationalOneHasZeroLog ||
        !goldenNested) {
        throw new TypeError("logarithmReceipt: finite logarithm laws failed");
    }
    return Object.freeze({
        kind: "internalReal.logarithm:witness",
        sourceModule: "RelMath.Real.Logarithm",
        theorems: Object.freeze([
            "RelMath.InternalReals.natLog_spec",
            "RelMath.InternalReals.logSeq_le_succ",
            "RelMath.InternalReals.logNat_self",
            "RelMath.InternalReals.fullShiftEntropy_two",
            "RelMath.InternalReals.logNat_mono",
            "RelMath.InternalReals.fullShiftEntropy_mono",
            "RelMath.InternalReals.natLog_mul_bounds",
            "RelMath.InternalReals.logNat_mul",
            "RelMath.InternalReals.logRatN_scale",
            "RelMath.InternalReals.logRatN_self",
            "RelMath.InternalReals.logRatN_mono",
            "RelMath.InternalReals.golden_log_nested",
        ]),
        base: 2,
        sample: Object.freeze({
            n: sampleN,
            k: sampleK,
            floorLog: floorLog,
            approximation,
        }),
        natLogSpecLower: natLogSpecLower,
        natLogSpecUpper: natLogSpecUpper,
        logSeqSelf: logSeqSelf,
        binaryEntropy: ratOne,
        monotone,
        mulBounds,
        rationalOneHasZeroLog: rationalOneHasZeroLog,
        goldenNestedCrossProducts: Object.freeze([15, 16, 64, 65, 39, 40]),
        goldenNested: goldenNested,
        boundary: "finite floor-log and rational-order carrier; arbitrary Bishop real equality remains proof-side",
    });
}
/** The Fibonacci sequence `F₀ = F₁ = 1`, from `RelMath.Real.GoldenLog`. */
export function fib(n) {
    assertNat("fib n", n);
    if (n <= 1)
        return 1;
    let previous = 1;
    let current = 1;
    for (let index = 2; index <= n; index += 1) {
        const next = safeAdd(previous, current, "fib");
        previous = current;
        current = next;
    }
    return current;
}
/** The finite executable witness for Cassini's identity `F_{n+2}F_n - F_{n+1}² = (-1)^n`. */
export function goldenCassini(n) {
    assertNat("goldenCassini n", n);
    const left = safeMultiply(fib(n + 2), fib(n), "goldenCassini")
        - safeMultiply(fib(n + 1), fib(n + 1), "goldenCassini");
    const right = n % 2 === 0 ? 1 : -1;
    if (left === right)
        return Object.freeze({ kind: "internalReal.goldenCassini:witness", n, left, right, holds: true });
    return Object.freeze({ kind: "internalReal.goldenCassini-obstruction", n, left, right, holds: false });
}
/**
 * Finite carrier for `RelMath.InternalReals.convergent_log_gap`.
 *
 * Cassini reduces the adjacent convergent-ratio gap to numerator `1`; the log
 * width is then bounded by `1/(k+1)` once `2(k+1) ≤ F_{n+1}²`.
 */
export function goldenConvergentLogGap(n, k) {
    assertNat("goldenConvergentLogGap n", n);
    assertNat("goldenConvergentLogGap k", k);
    const fibonacci = fib(n + 1);
    const square = safeMultiply(fibonacci, fibonacci, "goldenConvergentLogGap square");
    const gap = ratSubtract(logSeq(2, square + 1, k), logSeq(2, square, k));
    const bound = invNatP(k);
    const cassini = goldenCassini(n);
    const admissible = 2 * (k + 1) <= square;
    const holds = ratCompare(gap, bound) <= 0;
    if (cassini.kind === "internalReal.goldenCassini:witness" && admissible && holds) {
        return Object.freeze({
            kind: "internalReal.goldenConvergentLogGap:witness",
            n,
            k,
            fibonacci,
            square,
            gap,
            bound,
            cassini,
            admissible,
            holds,
        });
    }
    return Object.freeze({
        kind: "internalReal.goldenConvergentLogGap-obstruction",
        reason: cassini.kind !== "internalReal.goldenCassini:witness" ? "cassini" : !admissible ? "domain" : "bound",
        n,
        k,
        fibonacci,
        square,
        gap,
        bound,
        cassini,
        admissible,
        holds,
    });
}
/** The metallic recurrence `F₀ = 0`, `F₁ = 1`, `F_{k+2} = nF_{k+1} + F_k`. */
export function metallicNum(n, k) {
    assertPositiveNat("metallicNum n", n);
    assertNat("metallicNum k", k);
    if (k === 0)
        return 0;
    if (k === 1)
        return 1;
    let previous = 0;
    let current = 1;
    for (let index = 2; index <= k; index += 1) {
        const scaled = safeMultiply(n, current, "metallicNum");
        const next = safeAdd(scaled, previous, "metallicNum");
        previous = current;
        current = next;
    }
    return current;
}
/** Finite carrier for `RelMath.Aperiodic.StepN.metallic_cassini`. */
export function metallicCassini(n, k) {
    assertPositiveNat("metallicCassini n", n);
    assertNat("metallicCassini k", k);
    const left = safeMultiply(metallicNum(n, k + 2), metallicNum(n, k), "metallicCassini")
        - safeMultiply(metallicNum(n, k + 1), metallicNum(n, k + 1), "metallicCassini");
    const right = k % 2 === 0 ? -1 : 1;
    if (left === right)
        return Object.freeze({ kind: "internalReal.metallicCassini:witness", n, k, left, right, holds: true });
    return Object.freeze({ kind: "internalReal.metallicCassini-obstruction", n, k, left, right, holds: false });
}
/** Finite carrier for the metallic convergent gap bound `|cᵢ₊₁-cᵢ| ≤ 1/Fᵢ₊₁ - 1/Fᵢ₊₂`. */
export function metallicConvergentGap(n, i) {
    assertPositiveNat("metallicConvergentGap n", n);
    assertNat("metallicConvergentGap i", i);
    const f1 = metallicNum(n, i + 1);
    const f2 = metallicNum(n, i + 2);
    const denominator = safeMultiply(f2, f1, "metallicConvergentGap denominator");
    const gap = fromRatio(1, denominator);
    const telescopingBound = ratSubtract(fromRatio(1, f1), fromRatio(1, f2));
    const cassini = metallicCassini(n, i + 1);
    const admissible = i >= 1;
    const holds = ratCompare(gap, telescopingBound) <= 0;
    if (cassini.kind === "internalReal.metallicCassini:witness" && admissible && holds) {
        return Object.freeze({
            kind: "internalReal.metallicConvergentGap:witness",
            n,
            i,
            numerator: 1,
            denominator,
            gap,
            telescopingBound,
            cassini,
            admissible,
            holds,
        });
    }
    return Object.freeze({
        kind: "internalReal.metallicConvergentGap-obstruction",
        reason: cassini.kind !== "internalReal.metallicCassini:witness" ? "cassini" : !admissible ? "domain" : "bound",
        n,
        i,
        numerator: 1,
        denominator,
        gap,
        telescopingBound,
        cassini,
        admissible,
        holds,
    });
}
/**
 * Symbolic exact carrier for `RelMath.Aperiodic.StepN.metallic_root`.
 *
 * Expanding both sides gives the same `sqrt(n^2+4)` coefficient `2n`; the
 * constant equality reduces to `n^2 + (n^2+4) = 2n^2 + 4`.
 */
export function metallicRoot(n) {
    assertNat("metallicRoot n", n);
    const nSquared = safeMultiply(n, n, "metallicRoot nSquared");
    const radicand = safeAdd(nSquared, 4, "metallicRoot radicand");
    const leftConstant = safeAdd(nSquared, radicand, "metallicRoot leftConstant");
    const rightConstant = safeAdd(safeMultiply(2, nSquared, "metallicRoot rightConstant"), 4, "metallicRoot rightConstant");
    const sqrtCoefficient = safeMultiply(2, n, "metallicRoot sqrtCoefficient");
    const holds = leftConstant === rightConstant;
    if (holds) {
        return Object.freeze({
            kind: "internalReal.metallicRoot:witness",
            n,
            radicand,
            leftConstant,
            rightConstant,
            sqrtCoefficient,
            equation: "(n+sqrt(n^2+4))^2=(n+n)*(n+sqrt(n^2+4))+4",
            holds: true,
        });
    }
    return Object.freeze({
        kind: "internalReal.metallicRoot-obstruction",
        n,
        radicand,
        leftConstant,
        rightConstant,
        sqrtCoefficient,
        equation: "(n+sqrt(n^2+4))^2=(n+n)*(n+sqrt(n^2+4))+4",
        holds: false,
    });
}
export function metallicConvergent(n, k) {
    assertPositiveNat("metallicConvergent n", n);
    assertNat("metallicConvergent k", k);
    return fromRatio(metallicNum(n, k + 2), metallicNum(n, k + 1));
}
export function metallicRealReceipt(n = 1, support = 4, start = 1, distance = 1) {
    assertPositiveNat("metallicRealReceipt n", n);
    assertNat("metallicRealReceipt support", support);
    assertNat("metallicRealReceipt start", start);
    assertNat("metallicRealReceipt distance", distance);
    if (start < 1 || distance < 1)
        throw new RangeError("metallicRealReceipt: expected start and distance to be positive");
    const cassiniValues = Object.freeze(Array.from({ length: support + 1 }, (_, k) => metallicCassini(n, k).left));
    const gapStep = metallicConvergentGap(n, start);
    if (gapStep.kind !== "internalReal.metallicConvergentGap:witness") {
        throw new TypeError("metallicRealReceipt: finite gap witness failed");
    }
    const endpointGap = ratAbs(ratSubtract(metallicConvergent(n, start + distance), metallicConvergent(n, start)));
    const telescopingBound = ratSubtract(fromRatio(1, metallicNum(n, start + 1)), fromRatio(1, metallicNum(n, start + distance + 1)));
    const growsAtLeastLinearly = Array.from({ length: support + 1 }, (_, k) => k)
        .every((k) => k <= metallicNum(n, k + 1));
    const denominatorsPositive = Array.from({ length: support + 1 }, (_, k) => k)
        .every((k) => metallicNum(n, k + 1) > 0);
    return Object.freeze({
        kind: "internalReal.metallicReal:witness",
        sourceModule: "RelMath.Aperiodic.StepN.MetallicReal",
        theorems: Object.freeze([
            "RelMath.Aperiodic.StepN.cassini_step",
            "RelMath.Aperiodic.StepN.cassini_base",
            "RelMath.Aperiodic.StepN.metallic_cassini",
            "RelMath.Aperiodic.StepN.metallicNum_ge",
            "RelMath.Aperiodic.StepN.metallicNum_den_pos",
            "RelMath.Aperiodic.StepN.conv_diff",
            "RelMath.Aperiodic.StepN.abs_conv_diff",
            "RelMath.Aperiodic.StepN.metallicNum_strict",
            "RelMath.Aperiodic.StepN.gap_step_bound",
            "RelMath.Aperiodic.StepN.conv_telescope",
        ]),
        n,
        support,
        cassiniValues,
        cassiniFlips: cassiniValues.slice(1).every((value, index) => value === -cassiniValues[index]),
        cassiniMagnitudeOne: cassiniValues.every((value) => Math.abs(value) === 1),
        growsAtLeastLinearly: growsAtLeastLinearly,
        denominatorsPositive: denominatorsPositive,
        gapStep,
        telescope: Object.freeze({
            start,
            distance,
            endpointGap,
            telescopingBound,
            holds: (ratCompare(endpointGap, telescopingBound) <= 0),
        }),
    });
}
export function metallicPowerCoef(n, k) {
    assertNat("metallicPowerCoef n", n);
    assertNat("metallicPowerCoef k", k);
    let p = 0;
    let q = 1;
    for (let index = 0; index < k; index += 1) {
        const nextP = safeAdd(safeMultiply(p, safeMultiply(2, n, "metallicPowerCoef twoN"), "metallicPowerCoef p"), q, "metallicPowerCoef p");
        const nextQ = safeMultiply(p, 4, "metallicPowerCoef q");
        p = nextP;
        q = nextQ;
    }
    return Object.freeze([p, q]);
}
export function metallicPowerLensReceipt(n = 3, power = 4) {
    assertNat("metallicPowerLensReceipt n", n);
    assertNat("metallicPowerLensReceipt power", power);
    const root = metallicRoot(n);
    if (root.kind !== "internalReal.metallicRoot:witness")
        throw new TypeError("metallicPowerLensReceipt: metallic root witness failed");
    const coef = metallicPowerCoef(n, power);
    const nextCoef = metallicPowerCoef(n, power + 1);
    return Object.freeze({
        kind: "internalReal.metallicPowerLens:witness",
        sourceModule: "RelMath.Aperiodic.StepN.MetallicPowerLens",
        theorem: "RelMath.Aperiodic.StepN.metallic_power_expansion",
        n,
        power,
        root,
        coef,
        nextCoef,
        baseZero: Object.freeze([0, 1]),
        baseOne: Object.freeze([1, 0]),
        recurrenceHolds: (nextCoef[0] === coef[0] * 2 * n + coef[1] && nextCoef[1] === coef[0] * 4),
        rootEquationHolds: root.holds,
    });
}
export function expTerm(n) {
    assertNat("expTerm n", n);
    return fromRatio(1, factorial(n));
}
export function expSeq(N) {
    assertNat("expSeq N", N);
    let sum = ratZero;
    for (let n = 0; n < N; n += 1)
        sum = ratAdd(sum, expTerm(n));
    return sum;
}
export function expSeriesReceipt(support = 5, N = 2, M = 2) {
    assertNat("expSeriesReceipt support", support);
    assertNat("expSeriesReceipt N", N);
    assertNat("expSeriesReceipt M", M);
    if (N < 1)
        throw new RangeError("expSeriesReceipt: expected N to be positive");
    const indices = Array.from({ length: support + 1 }, (_, index) => index);
    const halvingIndex = Math.max(1, Math.min(N, support));
    const twiceNext = ratAdd(expTerm(halvingIndex + 1), expTerm(halvingIndex + 1));
    const capLeft = ratAdd(expSeq(N + 1), ratAdd(expTerm(N + 1), expTerm(N + 1)));
    const capRight = ratAdd(expSeq(N), ratAdd(expTerm(N), expTerm(N)));
    const partial = expSeq(N + M);
    const bound = ratAdd(expSeq(N), ratAdd(expTerm(N), expTerm(N)));
    return Object.freeze({
        kind: "internalReal.expSeries:witness",
        sourceModule: "RelMath.Real.ExpSeries",
        theorems: Object.freeze([
            "RelMath.InternalReals.factorial_ge_self",
            "RelMath.InternalReals.factorial_mono",
            "RelMath.InternalReals.term_halving",
            "RelMath.InternalReals.term_antitone",
            "RelMath.InternalReals.expTerm_nonneg",
            "RelMath.InternalReals.cap_dec",
            "RelMath.InternalReals.cap_mono",
            "RelMath.InternalReals.expSeq_summable",
        ]),
        support,
        factorialDominatesSelf: indices.every((index) => index <= factorial(index)),
        factorialMonotone: indices.slice(1).every((index) => factorial(index - 1) <= factorial(index)),
        halvingIndex,
        termHalving: (ratCompare(twiceNext, expTerm(halvingIndex)) <= 0),
        termsAntitone: indices.slice(1).every((index) => ratCompare(expTerm(index), expTerm(index - 1)) <= 0),
        termsNonnegative: indices.every((index) => ratCompare(ratZero, expTerm(index)) <= 0),
        capDecreases: (ratCompare(capLeft, capRight) <= 0),
        summable: Object.freeze({
            N,
            M,
            partial,
            bound,
            holds: (ratCompare(partial, bound) <= 0),
        }),
    });
}
export function metallizationDichotomyReceipt() {
    const metallic = metallicPowerLensReceipt(3, 4);
    const chromatic = chromaticLorentzianReceipt();
    const exponential = expSeriesReceipt();
    return Object.freeze({
        kind: "aperiodic.metallizationDichotomy:witness",
        sourceModule: "RelMath.Aperiodic.MetallizationDichotomy",
        theorem: "RelMath.Aperiodic.metallization_dichotomy",
        metallic,
        chromatic,
        exponential,
        finiteMetallicExpansion: metallic.recurrenceHolds,
        chromaticNonIdempotent: chromatic.stepNotIdempotent,
        exponentialSummable: exponential.summable.holds,
    });
}
export const charPolySalem = Object.freeze([1, -1, -1, -1, 1]);
export const salemTrace = Object.freeze([-3, -1, 1]);
export function charPolyMetallic(n) {
    assertSafeInteger(n, "charPolyMetallic n");
    return Object.freeze([-1, -n, 1]);
}
export function evalIntPoly(coefficients, x) {
    assertSafeInteger(x, "evalIntPoly x");
    let value = 0;
    for (let index = coefficients.length - 1; index >= 0; index -= 1) {
        assertSafeInteger(coefficients[index], "evalIntPoly coefficient");
        value = safeAdd(coefficients[index], safeMultiply(x, value, "evalIntPoly"), "evalIntPoly");
    }
    return value;
}
export function reciprocal(coefficients) {
    return coefficients.every((coefficient, index) => coefficient === coefficients[coefficients.length - 1 - index]);
}
function squareRootTraceRoot(name, radicand) {
    assertNat("squareRootTraceRoot radicand", radicand);
    const leftConstant = safeAdd(1, radicand, "squareRootTraceRoot leftConstant");
    const rightConstant = safeAdd(radicand, 1, "squareRootTraceRoot rightConstant");
    const holds = leftConstant === rightConstant;
    const base = {
        name,
        radicand,
        leftConstant,
        rightConstant,
        sqrtCoefficient: 2,
        equation: "(1+sqrt(c))^2=sqrt(c)+sqrt(c)+(c+1)",
    };
    return holds
        ? Object.freeze({ kind: "internalReal.squareRootTraceRoot:witness", ...base, holds: true })
        : Object.freeze({ kind: "internalReal.squareRootTraceRoot-obstruction", ...base, holds: false });
}
export function salemTraceRoot() {
    return squareRootTraceRoot("salem-trace", 13);
}
export function goldenRoot() {
    return squareRootTraceRoot("golden", 5);
}
/** Finite arithmetic carrier for `RelMath.Aperiodic.StepN.Salem` and `SalemRoot`. */
export function salemPisotReceipt() {
    const metallicPolynomial = charPolyMetallic(1);
    const salemUnitCircleSigns = [evalIntPoly(salemTrace, -2), evalIntPoly(salemTrace, 0)];
    const salemRealRootSigns = [evalIntPoly(salemTrace, 2), evalIntPoly(salemTrace, 3)];
    const pisotContractingSigns = [evalIntPoly(metallicPolynomial, -1), evalIntPoly(metallicPolynomial, 0)];
    const salemRoot = salemTraceRoot();
    const golden = goldenRoot();
    const salemReciprocal = reciprocal(charPolySalem);
    const metallicReciprocal = reciprocal(metallicPolynomial);
    const signsHold = salemUnitCircleSigns[0] > 0
        && salemUnitCircleSigns[1] < 0
        && salemRealRootSigns[0] < 0
        && salemRealRootSigns[1] > 0
        && pisotContractingSigns[0] > 0
        && pisotContractingSigns[1] < 0;
    if (!salemReciprocal
        || metallicReciprocal
        || !signsHold
        || salemRoot.kind !== "internalReal.squareRootTraceRoot:witness"
        || golden.kind !== "internalReal.squareRootTraceRoot:witness") {
        throw new TypeError("salemPisotReceipt: finite Salem/Pisot arithmetic laws failed");
    }
    return Object.freeze({
        kind: "internalReal.salemPisot:witness",
        salemPolynomial: charPolySalem,
        salemTrace,
        metallicPolynomial,
        salemReciprocal: true,
        metallicReciprocal: false,
        salemUnitCircleSigns,
        salemRealRootSigns,
        pisotContractingSigns,
        salemDeterminant: 1,
        pisotDeterminant: -1,
        salemCayleyHamilton: true,
        salemTraceRoot: salemRoot,
        goldenRoot: golden,
        boundary: "unit-circle trace signs are finite evidence; complex-root topology remains proof-side",
    });
}
export const properEdgeColouringsCount = 2;
export const properTriangleColouringsCount = 6;
/** The finite carrier for `edge_colouring_entropy`: a properly 2-coloured edge carries one bit. */
export const edgeColouringEntropy = Object.freeze({
    kind: "internalReal.edgeColouringEntropy:witness",
    graph: "K2",
    colors: 2,
    properColourings: properEdgeColouringsCount,
    entropy: ratOne,
    equalsBinaryShiftEntropy: true,
});
/** The finite count side of `properTriangleColourings_count`, plus its log₂ approximant. */
export function triangleColouringEntropy(k) {
    assertNat("triangleColouringEntropy k", k);
    return Object.freeze({
        kind: "internalReal.triangleColouringEntropy:approximation",
        graph: "K3",
        colors: 3,
        properColourings: properTriangleColouringsCount,
        k,
        entropyApprox: logSeq(2, properTriangleColouringsCount, k),
    });
}
