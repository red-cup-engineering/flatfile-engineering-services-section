/**
 * analysis/spectral — exact spectral reads of integer polynomials and matrices.
 *
 * Root location relative to the unit circle (Möbius x↦(1+x)/(1−x) then the
 * Routh–Hurwitz array over the rationals), the Pisot test (one expanding root,
 * none neutral), the resultant via the Sylvester determinant, dominant-root
 * power iteration, and the Mahler measure. Exact throughout over the integer/
 * rational carriers — a pure leaf over exact-number.
 */
import { charPoly, count, determinant, divide, fromInteger, predecessor, intAdd, intEqual, intIsZero, intMultiply, intNegate, intOne, intSubtract, intZero, natEqual, natIsZero, natOne, natZero, ratOne, ratIsZero, ratMultiply, ratSign, ratSubtract, ratZero, successor, } from "@red-cup-engineering/exact-number-data-service/exact-number";
const normalize = (poly) => {
    let high = poly.length - 1;
    while (high > 0 && intIsZero(poly[high]))
        high -= 1;
    return Object.freeze(poly.slice(0, high + 1));
};
/** Admit integer coefficients as a normalized polynomial. */
export const integerPolynomial = (coefficients) => normalize(coefficients);
const naturalFromFiniteCount = (value) => {
    if (!Number.isInteger(value) || value < 0)
        throw new RangeError("expected a non-negative finite count");
    let result = natZero;
    for (let index = 0; index < value; index += 1)
        result = successor(result);
    return result;
};
const finiteCountOfNatural = (value) => {
    let countValue = 0;
    let remaining = value;
    while (!natIsZero(remaining)) {
        countValue += 1;
        remaining = predecessor(remaining);
    }
    return countValue;
};
const degreeOf = (poly) => normalize(poly).length - 1;
const zadd = (left, right) => {
    const length = Math.max(left.length, right.length);
    return normalize(Array.from({ length }, (_, index) => intAdd(left[index] ?? intZero, right[index] ?? intZero)));
};
const zmul = (left, right) => {
    const result = Array.from({ length: left.length + right.length - 1 }, () => intZero);
    for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
        for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
            result[leftIndex + rightIndex] = intAdd(result[leftIndex + rightIndex], intMultiply(left[leftIndex], right[rightIndex]));
        }
    }
    return normalize(result);
};
const zscale = (scale, poly) => normalize(poly.map((coefficient) => intMultiply(scale, coefficient)));
const zpow = (base, exponent) => {
    let result = Object.freeze([intOne]);
    for (let index = 0; index < exponent; index += 1)
        result = zmul(result, base);
    return result;
};
function sylvester(left, right) {
    const p = normalize(left);
    const q = normalize(right);
    const n = p.length - 1;
    const m = q.length - 1;
    const pHighFirst = [...p].reverse();
    const qHighFirst = [...q].reverse();
    const size = n + m;
    const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => intZero));
    for (let row = 0; row < m; row += 1) {
        for (let column = 0; column <= n; column += 1)
            matrix[row][row + column] = pHighFirst[column];
    }
    for (let row = 0; row < n; row += 1) {
        for (let column = 0; column <= m; column += 1)
            matrix[m + row][row + column] = qHighFirst[column];
    }
    return Object.freeze(matrix.map((row) => Object.freeze(row)));
}
/** The degree of a polynomial, as a Natural. */
export const polyDegree = (poly) => predecessor(count(normalize(poly)));
function polynomialEqual(left, right) {
    const a = normalize(left);
    const b = normalize(right);
    return a.length === b.length && a.every((coefficient, index) => intEqual(coefficient, b[index]));
}
/** Compare two polynomials for equality after normalization. */
export function polynomialIdentity(left, right) {
    const normalizedLeft = normalize(left);
    const normalizedRight = normalize(right);
    return polynomialEqual(normalizedLeft, normalizedRight)
        ? Object.freeze({ kind: "spectral.polynomialIdentity:witness", left: normalizedLeft, right: normalizedRight })
        : Object.freeze({ kind: "spectral.polynomialIdentity-obstruction", left: normalizedLeft, right: normalizedRight });
}
/** The reciprocal of a polynomial (coefficients reversed). */
export const polyReciprocal = (poly) => normalize([...normalize(poly)].reverse());
/** The resultant of two polynomials (Sylvester determinant). */
export const resultant = (left, right) => determinant(sylvester(left, right));
/** Whether a polynomial equals its own reciprocal. */
export const selfReciprocity = (poly) => polynomialIdentity(poly, polyReciprocal(poly));
/** Whether two polynomials share a common root (via the resultant). */
export function rootIntersection(left, right) {
    const normalizedLeft = normalize(left);
    const normalizedRight = normalize(right);
    const value = resultant(normalizedLeft, normalizedRight);
    return intIsZero(value)
        ? Object.freeze({ kind: "spectral.polynomialRootIntersection:witness", left: normalizedLeft, right: normalizedRight, resultant: value })
        : Object.freeze({ kind: "spectral.polynomialRootIntersection-obstruction", left: normalizedLeft, right: normalizedRight, resultant: value });
}
/** A polynomial with its reciprocal and their root intersection. */
export function inversionSymmetry(poly) {
    const polynomial = normalize(poly);
    const reciprocal = polyReciprocal(polynomial);
    return Object.freeze({
        kind: "spectral.polynomialInversionSymmetry",
        polynomial,
        reciprocal,
        rootIntersection: rootIntersection(polynomial, reciprocal),
    });
}
const onePlusPolynomial = () => Object.freeze([intOne, intOne]);
const oneMinusPolynomial = () => Object.freeze([intOne, intNegate(intOne)]);
/** The Möbius transform x ↦ (1+x)/(1−x) applied to a polynomial. */
export function mobius(poly) {
    const normalized = normalize(poly);
    const n = normalized.length - 1;
    let out = Object.freeze([intZero]);
    for (let index = 0; index <= n; index += 1) {
        out = zadd(out, zscale(normalized[index], zmul(zpow(onePlusPolynomial(), index), zpow(oneMinusPolynomial(), n - index))));
    }
    return normalize(out);
}
/** Count a rational polynomial's right-half-plane roots (Routh–Hurwitz). */
export function rightHalfPlaneRoots(poly) {
    const degree = poly.length - 1;
    const highFirst = [...poly].reverse();
    const rows = [[], []];
    for (let index = 0; 2 * index <= degree; index += 1)
        rows[0].push(highFirst[2 * index]);
    for (let index = 0; 2 * index + 1 <= degree; index += 1)
        rows[1].push(highFirst[2 * index + 1]);
    for (let rowIndex = 2; rowIndex <= degree; rowIndex += 1) {
        const previous = rows[rowIndex - 1];
        const above = rows[rowIndex - 2];
        if (!previous.length || ratIsZero(previous[0])) {
            return Object.freeze({ kind: "spectral.rightHalfPlaneRoot-obstruction", reason: "routh-row-has-zero-pivot" });
        }
        const row = [];
        for (let column = 0; column + 1 < above.length; column += 1) {
            const term = ratSubtract(ratMultiply(previous[0], above[column + 1]), ratMultiply(above[0], previous[column + 1] ?? ratZero));
            row.push(divide(term, previous[0]));
        }
        rows.push(row.length ? row : [ratZero]);
    }
    const column = rows.map((row) => row[0] ?? ratZero);
    if (column.some(ratIsZero)) {
        return Object.freeze({ kind: "spectral.rightHalfPlaneRoot-obstruction", reason: "routh-first-column-has-zero-entry" });
    }
    let changes = 0;
    for (let index = 1; index < column.length; index += 1) {
        if (ratSign(column[index - 1]) !== ratSign(column[index]))
            changes += 1;
    }
    return Object.freeze({ kind: "spectral.rightHalfPlaneRoot:witness", rhp: naturalFromFiniteCount(changes) });
}
/** Locate a polynomial's roots relative to the unit circle. */
export function rootLocation(poly) {
    const normalized = normalize(poly);
    const degree = degreeOf(poly);
    const mapped = mobius(poly);
    const mappedDegree = degreeOf(mapped);
    const dropped = degree - mappedDegree;
    const result = rightHalfPlaneRoots(mapped.map(fromInteger));
    if (result.kind === "spectral.rightHalfPlaneRoot-obstruction") {
        return Object.freeze({ kind: "spectral.rootLocation-obstruction", polynomial: normalized, reason: result.reason, obstruction: result });
    }
    const expanding = result.rhp;
    return Object.freeze({
        kind: "spectral.rootLocation:witness",
        polynomial: normalized,
        expanding,
        contracting: naturalFromFiniteCount(mappedDegree - finiteCountOfNatural(expanding)),
        neutral: naturalFromFiniteCount(dropped),
    });
}
/** Whether a polynomial has Pisot-style root structure. */
export function pisotRoot(poly) {
    const polynomial = normalize(poly);
    const location = rootLocation(poly);
    if (location.kind === "spectral.rootLocation:witness" && natEqual(location.expanding, natOne) && natEqual(location.neutral, natZero)) {
        return Object.freeze({ kind: "spectral.pisotRoot:witness", polynomial, location });
    }
    return Object.freeze({ kind: "spectral.pisotRoot-obstruction", polynomial, location });
}
/** Estimate a monic polynomial's dominant root by power iteration. */
export function dominantRootConvergence(poly, iterations = naturalFromFiniteCount(12)) {
    const normalized = normalize(poly);
    const degree = degreeOf(normalized);
    if (degree < 1) {
        return Object.freeze({ kind: "spectral.dominantRootConvergence-obstruction", polynomial: normalized, iterations, reason: "non-positive-degree" });
    }
    const leading = normalized[degree];
    if (!intEqual(leading, intOne)) {
        return Object.freeze({ kind: "spectral.dominantRootConvergence-obstruction", polynomial: normalized, iterations, reason: "non-monic-polynomial" });
    }
    let state = Array.from({ length: degree }, (_, index) => index === degree - 1 ? ratOne : ratZero);
    for (let step = 0; step < finiteCountOfNatural(iterations); step += 1) {
        let next = ratZero;
        for (let index = 0; index < degree; index += 1) {
            next = ratSubtract(next, ratMultiply(fromInteger(normalized[index] ?? intZero), state[index] ?? ratZero));
        }
        state = [...state.slice(1), next];
    }
    const numerator = state[degree - 1];
    const denominator = state[degree - 2];
    if (numerator === undefined || denominator === undefined || ratIsZero(denominator)) {
        return Object.freeze({ kind: "spectral.dominantRootConvergence-obstruction", polynomial: normalized, iterations, reason: "zero-denominator" });
    }
    return Object.freeze({ kind: "spectral.dominantRootConvergence:witness", polynomial: normalized, iterations, value: divide(numerator, denominator) });
}
/** Compute a polynomial's Mahler measure. */
export function mahlerMeasure(poly, iterations = naturalFromFiniteCount(12)) {
    const normalized = normalize(poly);
    const reciprocity = selfReciprocity(normalized);
    const location = rootLocation(normalized);
    switch (reciprocity.kind) {
        case "spectral.polynomialIdentity:witness":
            switch (location.kind) {
                case "spectral.rootLocation-obstruction":
                    return Object.freeze({ kind: "spectral.mahlerMeasure.unit:witness", polynomial: normalized, selfReciprocity: reciprocity, location, value: ratOne });
            }
    }
    const pisot = pisotRoot(normalized);
    switch (pisot.kind) {
        case "spectral.pisotRoot-obstruction":
            return Object.freeze({ kind: "spectral.mahlerMeasure.pisot-obstruction", polynomial: normalized, pisot });
    }
    const convergence = dominantRootConvergence(normalized, iterations);
    switch (convergence.kind) {
        case "spectral.dominantRootConvergence-obstruction":
            return Object.freeze({ kind: "spectral.mahlerMeasure.convergence-obstruction", polynomial: normalized, pisot, convergence });
    }
    return Object.freeze({ kind: "spectral.mahlerMeasure.dominantRoot:witness", polynomial: normalized, pisot, convergence, value: convergence.value });
}
/** A matrix's characteristic polynomial with the Pisot judgment on its spectrum. */
export function matrixPisot(matrix) {
    const polynomial = charPoly(matrix);
    return Object.freeze({ kind: "spectral.matrixPisot.carrier", polynomial, roots: pisotRoot(polynomial) });
}
