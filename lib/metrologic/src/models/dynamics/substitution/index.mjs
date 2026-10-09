import { charPoly as matrixCharPoly, count, determinant, fromNatural, intAdd, intEqual, intIsZero, intMultiply, intOne, intZero, intSubtract, isNegative, isPositive, magnitude, matTranspose, matEqual, matmul, natAdd, natEqual, natZero, quotient, rational, rank, smithNormalForm, successor, members } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { samePoint, gauge } from "@red-cup-engineering/computer-data-engineering-services-section/four";
const fixedPointWord = () => Object.freeze({ kind: "substitution.dynamics.fixedPoint" });
const isInfinite = (word) => !Array.isArray(word);
const naturalFromInternalBound = (bound) => {
    let value = natZero;
    for (let index = 0; index < bound; index += 1)
        value = successor(value);
    return value;
};
/** Whether two substitution symbols are the same carrier (the mark is opaque). */
export function sameSubstitutionSymbol(left, right) {
    return left === right;
}
const isPrefix = (left, right) => left.every((letter, index) => sameSubstitutionSymbol(letter, right[index]));
const identityMatrix = (n) => Object.freeze(Array.from({ length: n }, (_, row) => Object.freeze(Array.from({ length: n }, (_, column) => row === column ? intOne : intZero))));
const matrixEquation = (left, right) => matEqual(left, right)
    ? Object.freeze({ kind: "substitution.dynamics.matrixEquation:witness", left, right })
    : Object.freeze({ kind: "substitution.dynamics.matrixEquation-obstruction", left, right });
const primeFactors = (value) => {
    const factors = [];
    let remaining = value;
    let prime = intAdd(intOne, intOne);
    while (!isNegative(intSubtract(remaining, intMultiply(prime, prime)))) {
        while (!intIsZero(remaining) && intIsZero(intSubtract(remaining, intMultiply(quotient(remaining, prime), prime)))) {
            if (!factors.some((item) => intEqual(item, prime)))
                factors.push(prime);
            remaining = quotient(remaining, prime);
        }
        prime = intAdd(prime, intOne);
    }
    if (!intEqual(remaining, intOne))
        factors.push(remaining);
    return Object.freeze(factors);
};
/** A substitution symbol wrapping a mark. */
export function substitutionSymbol(mark) {
    return Object.freeze({ kind: "substitution.dynamics.symbol", mark });
}
/** A rule entry pairing a symbol with its image word. */
export function substitutionRuleEntry(symbol, word) {
    return Object.freeze({ kind: "substitution.dynamics.ruleEntry", symbol, word: Object.freeze([...word]) });
}
/** A substitution rule from entries. */
export function substitutionRule(entries) {
    return Object.freeze({ kind: "substitution.dynamics.rule", entries: Object.freeze([...entries]) });
}
function ruleEntryFor(rule, symbol) {
    return rule.entries.find((entry) => sameSubstitutionSymbol(entry.symbol, symbol));
}
/** A substitution carrier from a rule and (default) alphabet. */
export function substitutionCarrier(rule, alphabet = rule.entries.map((entry) => entry.symbol)) {
    return Object.freeze({ kind: "substitution.dynamics.carrier", rule, alphabet: Object.freeze([...alphabet]) });
}
/** Apply a substitution once to a word. */
export const substitute = (rule, word) => Object.freeze(word.flatMap((letter) => ruleEntryFor(rule, letter)?.word ?? [letter]));
/** Apply a substitution n times. */
export function iterateSubstitution(rule, word, n) {
    let current = word;
    for (const _member of members(n))
        current = substitute(rule, current);
    return Object.freeze([...current]);
}
/** The orbit of a seed under a substitution. */
export function* substitutionOrbit(rule, seed) {
    let word = seed;
    for (;;) {
        yield Object.freeze([...word]);
        word = substitute(rule, word);
    }
}
/** The fixed-point closure of a substitution from a seed (prefix-ordered lattice). */
export function fixedPointClosure(rule, seed) {
    const eq = (left, right) => isInfinite(left) ? isInfinite(right) : !isInfinite(right) && left.length === right.length && isPrefix(left, right);
    const lattice = Object.freeze({
        bottom: Object.freeze([...seed]),
        eq,
        leq: (left, right) => isInfinite(right) || (!isInfinite(left) && !isInfinite(right) && left.length <= right.length && isPrefix(left, right)),
        join: (left, right) => {
            if (isInfinite(left) || isInfinite(right))
                return fixedPointWord();
            return left.length >= right.length ? left : right;
        },
        sup: (sequence) => {
            let previous = sequence(natZero);
            let stage = natZero;
            for (let index = 1; index <= 32; index += 1) {
                stage = successor(stage);
                const current = sequence(stage);
                if (eq(current, previous))
                    return current;
                if (!isInfinite(current) && !isInfinite(previous) && current.length > previous.length)
                    return fixedPointWord();
                previous = current;
            }
            return fixedPointWord();
        },
    });
    return Object.freeze({
        kind: "substitution.dynamics.closure",
        lattice,
        phi: (word) => isInfinite(word) ? fixedPointWord() : substitute(rule, word),
    });
}
/** The incidence matrix of a substitution over an alphabet. */
export function abelianize(rule, alphabet) {
    return Object.freeze(alphabet.map((targetLetter) => Object.freeze(alphabet.map((sourceLetter) => fromNatural(count((ruleEntryFor(rule, sourceLetter)?.word ?? []).filter((letter) => sameSubstitutionSymbol(letter, targetLetter))))))));
}
/** A gauge labeling from reading values. */
export function gaugeLabeling(values) {
    return Object.freeze({ kind: "substitution.dynamics.gaugeLabeling", values: Object.freeze([...values]), rank: count(values) });
}
/** Apply a gauge element to a labeling. */
export function gaugeImage(labeling, sigma) {
    return Object.freeze({
        kind: "substitution.dynamics.gaugeImage",
        labeling,
        sigma,
        values: Object.freeze(labeling.values.map((value) => gauge(sigma, value))),
        rank: labeling.rank,
    });
}
/** Whether a gauge element permutes a set of reading values. */
export function inducedPermutation(values, sigma) {
    const labeling = gaugeLabeling(values);
    const image = gaugeImage(labeling, sigma);
    const missing = Object.freeze(labeling.values
        .filter((value) => !image.values.some((candidate) => samePoint(candidate, value)))
        .map((value) => Object.freeze({ kind: "substitution.dynamics.gaugePermutationMissingValue", value, image })));
    const escaping = Object.freeze(image.values
        .filter((value) => !labeling.values.some((candidate) => samePoint(candidate, value)))
        .map((value) => Object.freeze({ kind: "substitution.dynamics.gaugePermutationEscapingValue", value, image })));
    if (missing.length > 0 || escaping.length > 0) {
        return Object.freeze({
            kind: "substitution.dynamics.gaugePermutation-obstruction",
            labeling,
            image,
            missing,
            escaping,
            rank: natAdd(count(missing), count(escaping)),
        });
    }
    const permutation = identityMatrix(labeling.values.length).map((row) => [...row]);
    for (const row of permutation)
        row.fill(intZero);
    for (let index = 0; index < labeling.values.length; index += 1) {
        const target = gauge(sigma, labeling.values[index]);
        const targetIndex = labeling.values.findIndex((value) => samePoint(value, target));
        permutation[targetIndex][index] = intOne;
    }
    const matrix = Object.freeze(permutation.map((row) => Object.freeze(row)));
    return Object.freeze({ kind: "substitution.dynamics.gaugePermutation:witness", labeling, image, matrix });
}
/** Whether a substitution incidence matrix is self-dual under a gauge. */
export function substitutionRuleSelfDual(matrix, labeling, sigma) {
    const permutation = inducedPermutation(labeling, sigma);
    if (permutation.kind === "substitution.dynamics.gaugePermutation-obstruction") {
        return Object.freeze({ kind: "substitution.dynamics.selfDuality-obstruction", permutation });
    }
    const identity = identityMatrix(permutation.matrix.length);
    return Object.freeze({
        kind: "substitution.dynamics.selfDuality:witness",
        permutation,
        commutation: matrixEquation(matmul(matrix, permutation.matrix), matmul(permutation.matrix, matrix)),
        gaugeInvolution: matrixEquation(matmul(permutation.matrix, permutation.matrix), identity),
    });
}
/** The transpose of a substitution incidence matrix. */
export function transposeSubstitutionMatrix(matrix) {
    return matTranspose(matrix);
}
/** The characteristic polynomial of a matrix. */
export function charPolyOver(matrix) {
    return matrixCharPoly(matrix);
}
/** Whether a matrix is primitive (a power is strictly positive). */
export function primitiveMatrix(matrix) {
    const n = matrix.length;
    const searchedThrough = naturalFromInternalBound((n - 1) * (n - 1) + 2);
    if (matrix.some((row) => row.some(isNegative))) {
        return Object.freeze({ kind: "substitution.dynamics.primitiveMatrix-obstruction", matrix, reason: "negative-entry", searchedThrough: natZero });
    }
    const allPositive = (candidate) => candidate.every((row) => row.every(isPositive));
    let power = matrix;
    let exponent = natZero;
    for (let index = 1; index <= (n - 1) * (n - 1) + 1; index += 1) {
        exponent = successor(exponent);
        if (allPositive(power))
            return Object.freeze({ kind: "substitution.dynamics.primitiveMatrix:witness", matrix, exponent });
        power = matmul(power, matrix);
    }
    return allPositive(power)
        ? Object.freeze({ kind: "substitution.dynamics.primitiveMatrix:witness", matrix, exponent: searchedThrough })
        : Object.freeze({ kind: "substitution.dynamics.primitiveMatrix-obstruction", matrix, reason: "positive-power-not-found", searchedThrough });
}
/** Approximate the Perron eigenvalue by power iteration from the all-ones vector. */
export function perronConvergent(matrix, iterations = 4) {
    const n = matrix.length;
    let vector = Object.freeze(Array.from({ length: n }, () => intOne));
    const total = (items) => items.reduce((sum, item) => intAdd(sum, item), intZero);
    for (let index = 0; index < iterations; index += 1) {
        const next = matrix.map((row) => row.reduce((sum, item, column) => intAdd(sum, intMultiply(item, vector[column])), intZero));
        if (index === iterations - 1)
            return rational(fromNatural(magnitude(total(next))), fromNatural(magnitude(total(vector))));
        vector = Object.freeze(next);
    }
    return rational(intOne, intOne);
}
/** The colimit structure of a matrix (Smith normal form, stable det, localized module). */
export function colimStructure(matrix) {
    const polynomial = matrixCharPoly(matrix);
    const firstNonzero = polynomial.findIndex((coefficient) => !intIsZero(coefficient));
    const firstIndex = firstNonzero < 0 ? polynomial.length - 1 : firstNonzero;
    const moduleRank = count(matrix.slice(firstIndex));
    const stableDet = fromNatural(magnitude(polynomial[firstIndex]));
    const module = localizedIntegerModule(moduleRank, stableDet);
    return Object.freeze({
        kind: "substitution.dynamics.colim",
        rank: moduleRank,
        det: determinant(matrix),
        smith: smithNormalForm(matrix),
        stableDet,
        module,
    });
}
/** The dual of a substitution matrix (sheaf of the transpose, cosheaf of the matrix). */
export function substitutionDual(matrix) {
    const sheaf = colimStructure(matTranspose(matrix));
    const cosheaf = colimStructure(matrix);
    const duality = natEqual(sheaf.rank, cosheaf.rank)
        && intEqual(sheaf.det, cosheaf.det)
        && sheaf.smith.length === cosheaf.smith.length
        && sheaf.smith.every((factor, index) => intEqual(factor, cosheaf.smith[index]))
        ? Object.freeze({ kind: "substitution.dynamics.colimDuality:witness", sheaf, cosheaf })
        : Object.freeze({ kind: "substitution.dynamics.colimDuality-obstruction", sheaf, cosheaf });
    return Object.freeze({ kind: "substitution.dynamics.dual", sheaf, cosheaf, duality });
}
/** A localized integer module: invert the distinct prime factors of the stable determinant. */
export const localizedIntegerModule = (moduleRank, stableDet) => Object.freeze({
    kind: "substitution.dynamics.localizedIntegerModule",
    rank: moduleRank,
    invertedPrimes: intEqual(stableDet, intOne) ? Object.freeze([]) : primeFactors(stableDet),
});
/** The step-N invariant of a matrix (its rank and localized module). */
export const stepNInvariant = (matrix) => {
    const colimit = colimStructure(matrix);
    return Object.freeze({ kind: "substitution.dynamics.stepNInvariant", rank: rank(matrix), module: colimit.module });
};

export function substitutionSystem(rule, alphabet = rule.entries.map((entry) => entry.symbol)) {
    return Object.freeze({ kind: "substitution.dynamics.system", rule, alphabet: Object.freeze([...alphabet]) });
}
