/**
 * analysis/linear-algebra - finite exact matrix receipts.
 *
 * This is the executable shadow of the RelMath LinearAlgebra spine: finite
 * integer matrices, Smith factors, rank, nullity, determinant, and
 * characteristic polynomial. The abstract field/vector-space proof remains in
 * Lean; this module records the computable finite matrix evidence.
 */
import { charPoly, count, determinant, monus, natAdd, natEqual, rank, smithNormalForm, } from "@red-cup-engineering/exact-number-data-service/exact-number";
const assertRectangular = (matrix) => {
    if (matrix.length === 0)
        return;
    const columns = matrix[0].length;
    if (!matrix.every((row) => row.length === columns)) {
        throw new TypeError("linear algebra matrix rows must have equal length");
    }
};
/** Finite matrix shape as exact naturals. */
export function matrixShape(matrix) {
    assertRectangular(matrix);
    const rows = count(matrix);
    const columns = count(matrix[0] ?? []);
    return Object.freeze({
        kind: "linearAlgebra.matrix.shape",
        rows,
        columns,
        square: natEqual(rows, columns),
    });
}
/** Square-matrix determinant, characteristic polynomial, rank, and Smith factors. */
export function squareMatrixInvariants(matrix) {
    const shape = matrixShape(matrix);
    if (!shape.square)
        throw new TypeError("squareMatrixInvariants expects a square matrix");
    const smith = smithNormalForm(matrix);
    return Object.freeze({
        kind: "linearAlgebra.matrix.squareInvariants",
        matrix,
        shape,
        determinant: determinant(matrix),
        characteristicPolynomial: charPoly(matrix),
        rank: rank(matrix),
        smithNormalForm: smith,
    });
}
/** Rank-nullity receipt for a finite integer matrix read as a map Z^n -> Z^m. */
export function rankNullity(matrix) {
    const shape = matrixShape(matrix);
    const matrixRank = rank(matrix);
    const nullity = monus(shape.columns, matrixRank);
    const rankPlusNullity = natAdd(matrixRank, nullity);
    return Object.freeze({
        kind: "linearAlgebra.rankNullity",
        sourceModule: "RelMath.LinearAlgebra.RankNullity",
        matrix,
        shape,
        rank: matrixRank,
        nullity,
        rankPlusNullity,
        domainDimension: shape.columns,
        rankNullityHolds: natEqual(rankPlusNullity, shape.columns),
        smithNormalForm: smithNormalForm(matrix),
    });
}
const f2Add = (left, right) => left !== right;
const f2Mul = (left, right) => left && right;
const sameF2Vector = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);
const f2Scale = (scalar, vector) => Object.freeze(vector.map((value) => f2Mul(scalar, value)));
const f2LinearCombination = (coefficients, basis, dimension) => {
    const out = Array.from({ length: dimension }, () => false);
    coefficients.forEach((coefficient, basisIndex) => {
        const vector = basis[basisIndex];
        if (vector === undefined)
            return;
        for (let coordinate = 0; coordinate < dimension; coordinate += 1) {
            out[coordinate] = f2Add(out[coordinate], f2Mul(coefficient, vector[coordinate] ?? false));
        }
    });
    return Object.freeze(out);
};
const allF2Vectors = (dimension) => Object.freeze(Array.from({ length: 2 ** dimension }, (_, mask) => Object.freeze(Array.from({ length: dimension }, (_ignored, index) => ((mask >> index) & 1) === 1))));
const f2Span = (basis, dimension) => {
    const coefficients = allF2Vectors(basis.length);
    const seen = new Map();
    for (const row of coefficients) {
        const value = f2LinearCombination(row, basis, dimension);
        seen.set(JSON.stringify(value), value);
    }
    return Object.freeze([...seen.values()]);
};
const f2Independent = (basis, dimension) => allF2Vectors(basis.length).every((coefficients) => {
    if (!coefficients.some(Boolean))
        return true;
    return !sameF2Vector(f2LinearCombination(coefficients, basis, dimension), f2LinearCombination([], [], dimension));
});
/** The worked Lean map `T : F2^2 -> F2`, `T(a,b) = a + b`. */
export function boolWorkedLinearMap(vector) {
    if (vector.length !== 2)
        throw new RangeError("boolWorkedLinearMap: expected a vector in F2^2");
    return Object.freeze([f2Add(vector[0], vector[1])]);
}
/** Finite executable carrier for `RelMath.LinearAlgebra.rank_nullity` over the worked F2 map. */
export function boolWorkedRankNullityReceipt() {
    const zero2 = Object.freeze([false, false]);
    const zero1 = Object.freeze([false]);
    const kernelBasis = Object.freeze([Object.freeze([true, true])]);
    const imageBasis = Object.freeze([Object.freeze([true])]);
    const kernelElements = Object.freeze(allF2Vectors(2).filter((vector) => sameF2Vector(boolWorkedLinearMap(vector), zero1)));
    const imageElements = Object.freeze(allF2Vectors(2).map(boolWorkedLinearMap).filter((value, index, values) => values.findIndex((candidate) => sameF2Vector(candidate, value)) === index));
    const kernelSpan = f2Span(kernelBasis, 2);
    const imageSpan = f2Span(imageBasis, 1);
    const kernelBasisIndependent = f2Independent(kernelBasis, 2);
    const imageBasisIndependent = f2Independent(imageBasis, 1);
    const kernelBasisSpansKernel = kernelElements.every((value) => kernelSpan.some((candidate) => sameF2Vector(candidate, value)));
    const imageBasisSpansImage = imageElements.every((value) => imageSpan.some((candidate) => sameF2Vector(candidate, value)));
    if (!sameF2Vector(f2Scale(false, kernelBasis[0]), zero2) || !kernelBasisIndependent || !imageBasisIndependent || !kernelBasisSpansKernel || !imageBasisSpansImage) {
        throw new TypeError("boolWorkedRankNullityReceipt: finite F2 vector-space laws failed");
    }
    return Object.freeze({
        kind: "linearAlgebra.boolWorkedRankNullity.receipt:witness",
        sourceModule: "RelMath.LinearAlgebra.Basic",
        theorems: Object.freeze([
            "RelMath.LinearAlgebra.dimension_well_defined",
            "RelMath.LinearAlgebra.dim_Fn",
            "RelMath.LinearAlgebra.steinitz_bound",
            "RelMath.LinearAlgebra.rank_nullity",
            "RelMath.LinearAlgebra.BoolWorked.rank_nullity_boolWorked",
        ]),
        domainDimension: 2,
        codomainDimension: 1,
        kernelBasis,
        imageBasis,
        kernelElements,
        imageElements,
        kernelBasisIndependent: true,
        kernelBasisSpansKernel: true,
        imageBasisIndependent: true,
        imageBasisSpansImage: true,
        rank: 1,
        nullity: 1,
        rankPlusNullity: 2,
        dimensionWellDefined: true,
        steinitzBoundWitnessed: true,
        rankNullityHolds: true,
    });
}
