/**
 * @packageDocumentation
 *
 * settling/dynamics/substitution/recurrence - step-`n` hierarchy witnesses.
 *
 * This submodule reads the single natural parameter `n >= 2` that locks four
 * quantities of a canonical step-`n` rule together:
 *
 * 1. matrix dimension: the incidence matrix is `n x n`;
 * 2. recurrence depth: the rule is an `n`-term recurrence;
 * 3. alphabet size: the rule has `n` letters;
 * 4. cohomological rank: the step-`n` classifying invariant has rank `n`.
 *
 * A `+1` in the parameter is therefore visible as `+1` in all four carrier
 * fields. For Fibonacci (`n = 2`) and Padovan (`n = 3`), the module derives the
 * exact integer characteristic polynomial from the actual incidence matrix and
 * checks it against the declared polynomial. It does not compute real
 * Perron-Frobenius eigenvalues.
 *
 * Grounding: `lean/RelMath/Aperiodic/StepN/Recurrence.lean`,
 * `lean/RelMath/Aperiodic/StepN/SubstitutionMatrix.lean`, and the content node
 * `content/.../settling/content/aperiodic-settling/content/step-n-substitution-recurrence/`.
 */
import { abelianize, charPolyOver, primitiveMatrix, stepNInvariant, substitutionRule, substitutionRuleEntry, substitutionSymbol, transposeSubstitutionMatrix, } from "../index.mjs";
import { count, fromNatural, intEqual, intNegate, intOne, intZero, isNegative, isPositive, matmul, natEqual, natOne, natZero, successor, members } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { opaqueWitness as mark } from "@red-cup-engineering/metrologic/articulation/predicating/positing/opaque-coincidence";
import { readingFamilies } from "@red-cup-engineering/computer-data-engineering-services-section/four";
/** The **canonical step-`n` bundle**: every controlled quantity equals the single
 * parameter `n`. The construction witnessing the co-incrementing hierarchy — there
 * is *one* `n`, and matrix dimension, recurrence depth, alphabet size, and
 * cohomological rank are all that one `n`. */
export function mkStepN(n) {
    return Object.freeze({
        kind: "substitution.dynamics.recurrence.stepNData",
        matrixDim: n,
        recurrenceDepth: n,
        alphabetSize: n,
        cohRank: n,
    });
}
/** **The four controlled quantities of a bundle are equal.** Witnesses that matrix
 * dimension, recurrence depth, alphabet size, and cohomological rank are the single
 * parameter `n` viewed four ways — the locking that makes the hierarchy
 * co-increment. */
export function stepNDataAllEqual(data) {
    const allEqual = natEqual(data.matrixDim, data.recurrenceDepth)
        && natEqual(data.recurrenceDepth, data.alphabetSize)
        && natEqual(data.alphabetSize, data.cohRank);
    return allEqual
        ? Object.freeze({ kind: "substitution.dynamics.recurrence.allEqual:witness", data, value: data.matrixDim })
        : Object.freeze({ kind: "substitution.dynamics.recurrence.allEqual-obstruction", data });
}
/** **Degree-`n` predicate**: an `n × n` matrix's characteristic polynomial has
 * degree exactly `n`, i.e. its ascending coefficient list has length `n + 1`. */
export const degreeN = (cp, n) => natEqual(count(cp), successor(n));
/** **Monic predicate** (ascending degree): the leading (last) coefficient is `1`.
 * The characteristic polynomial of an integer matrix is always monic. */
export const monic = (cp) => {
    const leading = cp[cp.length - 1];
    return leading !== undefined && intEqual(leading, intOne);
};
/** Equality of characteristic polynomials, coefficientwise. */
export const samePolynomial = (left, right) => left.length === right.length && left.every((coefficient, index) => intEqual(coefficient, right[index]));
const negOne = intNegate(intOne);
/** Small canonical naturals (`2`, `3`, `4`) the step-`n` instances are stated over. */
const two = successor(natOne);
const three = successor(two);
const four = successor(three);
const five = successor(four);
/** **The golden ratio's minimal polynomial** `x² − x − 1`, ascending coefficients
 * `[-1, -1, 1]` — the Perron–Frobenius growth rate of the Fibonacci substitution
 * (the dominant eigenvalue of `[[1,1],[1,0]]`). Monic of degree `2`. */
export const goldenRatioMinimalPolynomial = Object.freeze([negOne, negOne, intOne]);
/** **The plastic number's minimal polynomial** `x³ − x − 1`, ascending coefficients
 * `[-1, -1, 0, 1]` — the Perron–Frobenius growth rate of the Padovan substitution
 * (the smallest Pisot number). Monic of degree `3`. */
export const plasticNumberMinimalPolynomial = Object.freeze([negOne, negOne, intZero, intOne]);
/* ──────────────────────────────────────────────────────────────────────────
 * (3) The canonical Fibonacci (n=2) and Padovan (n=3) rules, derived
 *
 * Each rule is a genuine substitution; its incidence matrix is `abelianize`d and
 * its characteristic polynomial DERIVED through `charPolyOver` (the parent module's
 * exact `charPoly`), then matched against the declared minimal polynomial.
 * ────────────────────────────────────────────────────────────────────────── */
const a = substitutionSymbol(mark("a"));
const b = substitutionSymbol(mark("b"));
const c = substitutionSymbol(mark("c"));
/** The **Fibonacci substitution** `a ↦ ab`, `b ↦ a` over the 2-letter alphabet
 * `{a, b}` — the canonical step-2 rule. */
export const fibonacciSubstitution = substitutionRule([
    substitutionRuleEntry(a, [a, b]),
    substitutionRuleEntry(b, [a]),
]);
/** The **Padovan substitution** `a ↦ b`, `b ↦ c`, `c ↦ ab` over the 3-letter
 * alphabet `{a, b, c}` — the canonical step-3 rule (recurrence `P(k) = P(k−2) +
 * P(k−3)`). */
export const padovanSubstitution = substitutionRule([
    substitutionRuleEntry(a, [b]),
    substitutionRuleEntry(b, [c]),
    substitutionRuleEntry(c, [a, b]),
]);
/** The Fibonacci incidence matrix `[[1,1],[1,0]]`, derived by abelianization. */
export const fibonacciIncidence = abelianize(fibonacciSubstitution, [a, b]);
/** The Padovan incidence matrix `[[0,0,1],[1,0,1],[0,1,0]]`, derived by abelianization. */
export const padovanIncidence = abelianize(padovanSubstitution, [a, b, c]);
/** The Lean/corpus orientation `[[0,1,0],[0,0,1],[1,1,0]]`: entry `i,j` counts `j` in `subst(i)`. */
export const padovanCorpusIncidence = transposeSubstitutionMatrix(padovanIncidence);
/* ──────────────────────────────────────────────────────────────────────────
 * (3b) The METALLIC-MEAN family `a ↦ aⁿb, b ↦ a` — the step-2 family parameterized by `n`
 *
 * For `n ≥ 1`, `a ↦ aⁿb, b ↦ a` has incidence matrix `[[n,1],[1,0]]`, characteristic polynomial
 * `x² − nx − 1`, and Perron eigenvalue the n-th METALLIC MEAN `(n + √(n²+4))/2` — a quadratic
 * irrational in `ℚ(√(n²+4))`: golden (`n=1`, = Fibonacci), silver (`n=2`, Pell, `1+√2`), bronze
 * (`n=3`). The inflation factor of Labbé's metallic-mean Wang tiles; `n=1` recovers Fibonacci.
 * ────────────────────────────────────────────────────────────────────────── */
/** The n-th **metallic-mean substitution** `a ↦ aⁿb, b ↦ a` over `{a, b}` (`n ≥ 1`). */
export function metallicMeanSubstitution(n) {
    const aCopies = members(n).map(() => a);
    return substitutionRule([
        substitutionRuleEntry(a, [...aCopies, b]),
        substitutionRuleEntry(b, [a]),
    ]);
}
/** The n-th metallic mean's minimal polynomial `x² − nx − 1`, ascending coeffs `[−1, −n, 1]`; the
 *  Perron eigenvalue `(n + √(n²+4))/2` is its larger root. */
export function metallicMeanMinimalPolynomial(n) {
    return Object.freeze([negOne, intNegate(fromNatural(n)), intOne]);
}
/** The n-th metallic mean's incidence matrix `[[n,1],[1,0]]`, derived by abelianization. */
export function metallicMeanIncidence(n) {
    return abelianize(metallicMeanSubstitution(n), [a, b]);
}
/** A witness that the n-th metallic-mean rule's growth rate is the n-th metallic mean: its derived
 *  incidence characteristic polynomial is monic of degree 2 and equals the declared `x² − nx − 1`. */
export function metallicMeanGrowthDegree(n) {
    return growthDegree(metallicMeanIncidence(n), successor(natOne), metallicMeanMinimalPolynomial(n));
}
/** The Fibonacci characteristic polynomial, derived from its incidence matrix. */
export const fibonacciCharacteristicPolynomial = charPolyOver(fibonacciIncidence);
/** The Padovan characteristic polynomial, derived from its incidence matrix. */
export const padovanCharacteristicPolynomial = charPolyOver(padovanIncidence);
const identityMatrix = (n) => Object.freeze(Array.from({ length: n }, (_, row) => Object.freeze(Array.from({ length: n }, (_, column) => row === column ? intOne : intZero))));
export function matrixPower(matrix, exponent) {
    let power = identityMatrix(matrix.length);
    for (const _member of members(exponent))
        power = matmul(power, matrix);
    return power;
}
export const nonnegativeMatrix = (matrix) => matrix.every((row) => row.every((entry) => !isNegative(entry)));
export const positiveMatrix = (matrix) => matrix.every((row) => row.every(isPositive));
const requirePrimitiveAt = (matrix, exponent) => {
    const primitive = primitiveMatrix(matrix);
    const positivePower = matrixPower(matrix, exponent);
    if (primitive.kind !== "substitution.dynamics.primitiveMatrix:witness"
        || !natEqual(primitive.exponent, exponent)
        || !nonnegativeMatrix(matrix)
        || !positiveMatrix(positivePower)) {
        throw new TypeError("requirePrimitiveAt: expected a nonnegative primitive matrix at the requested exponent");
    }
    return Object.freeze({
        kind: "substitution.dynamics.recurrence.matrixPrimitivity:witness",
        matrix,
        nonnegative: true,
        primitive,
        positiveExponent: exponent,
        positivePower,
        positiveImpliesNonnegative: nonnegativeMatrix(positivePower),
    });
};
/** Finite carrier for `RelMath.Aperiodic.SubstitutionPrimitivity`. */
export function substitutionPrimitivityReceipt() {
    return Object.freeze({
        kind: "substitution.dynamics.recurrence.substitutionPrimitivity:witness",
        sourceModule: "RelMath.Aperiodic.SubstitutionPrimitivity",
        theorems: Object.freeze([
            "RelMath.Aperiodic.StepN.NonnegativeMatrix",
            "RelMath.Aperiodic.StepN.PositiveMatrix",
            "RelMath.Aperiodic.StepN.Primitive",
            "RelMath.Aperiodic.StepN.PositiveMatrix.nonneg",
            "RelMath.Aperiodic.StepN.fibonacciMatrix_nonnegative",
            "RelMath.Aperiodic.StepN.padovanMatrix_nonnegative",
            "RelMath.Aperiodic.StepN.fibonacciMatrix_pow2_positive",
            "RelMath.Aperiodic.StepN.fibonacciMatrix_primitive",
            "RelMath.Aperiodic.StepN.padovanMatrix_pow5_positive",
            "RelMath.Aperiodic.StepN.padovanMatrix_primitive",
        ]),
        fibonacci: requirePrimitiveAt(fibonacciIncidence, two),
        padovan: requirePrimitiveAt(padovanCorpusIncidence, five),
    });
}
/** The **Fibonacci** step-2 bundle: 2-term recurrence, 2 letters, `2 × 2` matrix,
 * rank-2 cohomology — all `= 2`. */
export const fibonacciStepN = mkStepN(two);
/** The **Padovan** step-3 bundle: 3-term recurrence, 3 letters, `3 × 3` matrix,
 * rank-3 cohomology — all `= 3`. */
export const padovanStepN = mkStepN(three);
/** **The substitution growth rate has degree exactly `n`.** Derives the incidence
 * matrix's characteristic polynomial and witnesses it is monic, of degree `n`, and
 * identical to the declared minimal polynomial of the growth rate — refusing the
 * witness when any of the three fails. */
export function growthDegree(incidence, n, declared) {
    const derived = charPolyOver(incidence);
    if (!monic(derived)) {
        return Object.freeze({ kind: "substitution.dynamics.recurrence.growthDegree-obstruction", reason: "not-monic", degree: n, derived, declared });
    }
    if (!degreeN(derived, n)) {
        return Object.freeze({ kind: "substitution.dynamics.recurrence.growthDegree-obstruction", reason: "wrong-degree", degree: n, derived, declared });
    }
    if (!samePolynomial(derived, declared)) {
        return Object.freeze({ kind: "substitution.dynamics.recurrence.growthDegree-obstruction", reason: "declared-mismatch", degree: n, derived, declared });
    }
    return Object.freeze({ kind: "substitution.dynamics.recurrence.growthDegree:witness", degree: n, derived, declared });
}
/** **The step-`n` co-incrementing hierarchy.** For the canonical step-`n` rule the
 * matrix dimension, recurrence depth, alphabet size, and cohomological rank are the
 * single parameter `n` (all-equal witness), the `(n+1)`-bundle has all four equal to
 * `n + 1` (the `+1`-propagation), and the growth rate is a degree-`n` algebraic
 * number — exhibited concretely by Fibonacci (`n = 2`, golden ratio, `x² − x − 1`)
 * and Padovan (`n = 3`, plastic number, `x³ − x − 1`), each derived through the
 * parent module's `abelianize` ∘ `charPolyOver`. At `n = 2` the bilattice's
 * `4 = 2²` corners realize FOUR. */
export function stepNHierarchy(n) {
    return Object.freeze({
        kind: "substitution.dynamics.recurrence.hierarchy",
        parameter: n,
        atParameter: stepNDataAllEqual(mkStepN(n)),
        atSuccessor: stepNDataAllEqual(mkStepN(successor(n))),
        fibonacci: growthDegree(fibonacciIncidence, two, goldenRatioMinimalPolynomial),
        padovan: growthDegree(padovanIncidence, three, plasticNumberMinimalPolynomial),
        fourCornerAlignment: natEqual(count(readingFamilies.knowledge), four),
        fibonacciStepNInvariant: stepNInvariant(fibonacciIncidence),
    });
}
