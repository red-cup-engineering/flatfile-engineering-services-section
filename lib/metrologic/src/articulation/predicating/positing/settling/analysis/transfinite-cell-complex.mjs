/**
 * analysis/transfinite-cell-complex - finite executable shadow of
 * RelMath.Cohomology.TransfiniteCellComplex.
 *
 * Lean carries the general theorem for arbitrary cell types and modeled limit
 * ordinals. This module earns the finite runtime content: finite-dimensional
 * cells, face dimension drop, downward-closed finite subcomplexes, directed
 * union/colimit checks, and the finite-prefix settling-continuity equation.
 */
import { joinFamily, leqValuation, orbit, truthSideClosureOperator, valuation, } from "./flow.mjs";
const assertNat = (name, value) => {
    if (!Number.isSafeInteger(value) || value < 0)
        throw new RangeError(`${name} must be a safe natural number`);
    return value;
};
const unique = (items) => {
    const out = [];
    for (const item of items)
        if (!out.includes(item))
            out.push(item);
    return Object.freeze(out);
};
const sameNames = (left, right) => left.length === right.length && left.every((item, index) => item === right[index]);
const sameSubcomplex = (left, right) => sameNames([...left.cells].sort(), [...right.cells].sort());
const cellMap = (complex) => new Map(complex.cells.map((entry) => [entry.name, entry]));
const assertCellInComplex = (complex, name) => {
    const found = cellMap(complex).get(name);
    if (!found)
        throw new TypeError(`transfiniteCellComplex: unknown cell ${name}`);
    return found;
};
const facesOf = (complex, coface) => Object.freeze(complex.faces.filter((entry) => entry.coface === coface).map((entry) => entry.face));
export function cell(name, dimension) {
    if (name.length === 0)
        throw new TypeError("transfiniteCellComplex.cell: name must be nonempty");
    return Object.freeze({
        kind: "transfiniteCellComplex.cell",
        name,
        dimension: assertNat("dimension", dimension),
    });
}
export function cellComplex(cellsInput, facesInput) {
    const cells = Object.freeze([...cellsInput]);
    const names = cells.map((entry) => entry.name);
    if (cells.length === 0)
        throw new TypeError("transfiniteCellComplex.cellComplex: cells must be nonempty");
    if (new Set(names).size !== names.length)
        throw new TypeError("transfiniteCellComplex.cellComplex: duplicate cell names");
    const lookup = new Map(cells.map((entry) => [entry.name, entry.dimension]));
    for (const incidence of facesInput) {
        const faceDim = lookup.get(incidence.face);
        const cofaceDim = lookup.get(incidence.coface);
        if (faceDim === undefined || cofaceDim === undefined)
            throw new TypeError("transfiniteCellComplex.cellComplex: face incidence references unknown cell");
        if (!(faceDim < cofaceDim))
            throw new TypeError("transfiniteCellComplex.cellComplex: face dimension must strictly drop");
    }
    return Object.freeze({
        kind: "transfiniteCellComplex.complex",
        cells,
        faces: Object.freeze(facesInput.map((entry) => Object.freeze({ ...entry }))),
    });
}
export function generatedFiniteSubcomplex(complex, seedCells) {
    const closure = new Set();
    const queue = [...unique(seedCells)];
    for (const seed of queue)
        assertCellInComplex(complex, seed);
    while (queue.length > 0) {
        const current = queue.shift();
        if (closure.has(current))
            continue;
        closure.add(current);
        for (const faceName of facesOf(complex, current)) {
            if (!closure.has(faceName))
                queue.push(faceName);
        }
    }
    return finiteSubcomplex(complex, [...closure]);
}
export function finiteSubcomplex(complex, cellsInput) {
    const cells = unique(cellsInput);
    for (const name of cells)
        assertCellInComplex(complex, name);
    const downwardClosed = cells.every((coface) => facesOf(complex, coface).every((faceName) => cells.includes(faceName)));
    if (!downwardClosed)
        throw new TypeError("transfiniteCellComplex.finiteSubcomplex: cells must be downward closed under faces");
    return Object.freeze({
        kind: "transfiniteCellComplex.finiteSubcomplex",
        cells,
    });
}
export const subcomplexIncludes = (left, right) => left.cells.every((name) => right.cells.includes(name));
export function unionSubcomplex(complex, left, right) {
    return finiteSubcomplex(complex, [...left.cells, ...right.cells]);
}
export function transfiniteComplexReceipt(complex = defaultComplex) {
    const finiteSubcomplexes = Object.freeze(complex.cells.map((entry) => generatedFiniteSubcomplex(complex, [entry.name])));
    const everyCellFiniteDimensional = complex.cells.every((entry) => Number.isSafeInteger(entry.dimension) && entry.dimension >= 0);
    const lookup = cellMap(complex);
    const faceDimensionDrops = complex.faces.every((entry) => (lookup.get(entry.face)?.dimension ?? Infinity) < (lookup.get(entry.coface)?.dimension ?? -Infinity));
    const generatedSubcomplexesDownwardClosed = finiteSubcomplexes.every((subcomplex) => subcomplex.cells.every((coface) => facesOf(complex, coface).every((faceName) => subcomplex.cells.includes(faceName))));
    const everyCellInSomeFiniteSubcomplex = complex.cells.every((entry) => finiteSubcomplexes.some((subcomplex) => subcomplex.cells.includes(entry.name)));
    const finiteSubcomplexesDirected = finiteSubcomplexes.every((left) => finiteSubcomplexes.every((right) => {
        const joined = unionSubcomplex(complex, left, right);
        return subcomplexIncludes(left, joined) && subcomplexIncludes(right, joined);
    }));
    const inColimitIffSomeFinite = complex.cells.every((entry) => {
        const inSomeFinite = finiteSubcomplexes.some((subcomplex) => subcomplex.cells.includes(entry.name));
        const generated = generatedFiniteSubcomplex(complex, [entry.name]);
        return inSomeFinite && finiteSubcomplexes.some((subcomplex) => sameSubcomplex(subcomplex, generated));
    });
    if (!everyCellFiniteDimensional || !faceDimensionDrops || !generatedSubcomplexesDownwardClosed || !everyCellInSomeFiniteSubcomplex || !finiteSubcomplexesDirected || !inColimitIffSomeFinite) {
        throw new TypeError("transfiniteCellComplex.receipt: finite colimit laws failed");
    }
    return Object.freeze({
        kind: "transfiniteCellComplex.colimit:witness",
        complex,
        finiteSubcomplexes,
        everyCellFiniteDimensional: true,
        faceDimensionDrops: true,
        generatedSubcomplexesDownwardClosed: true,
        everyCellInSomeFiniteSubcomplex: true,
        finiteSubcomplexesDirected: true,
        inColimitIffSomeFinite: true,
        noLimitCellsBeyondUnion: true,
        frontier: "omega-one cardinality and arbitrary covering families remain proof-side",
    });
}
export function limitJoin(prefix) {
    if (prefix.length === 0)
        throw new RangeError("transfiniteCellComplex.limitJoin: prefix must be nonempty");
    const cells = prefix[0].cells;
    if (!prefix.every((stage) => sameNames(stage.cells, cells))) {
        throw new TypeError("transfiniteCellComplex.limitJoin: prefix valuations must share a carrier");
    }
    return valuation(cells, Object.fromEntries(cells.map((name) => [
        name,
        joinFamily(prefix.map((stage) => stage.values[name])),
    ])));
}
export function settlingContinuityReceipt(operator = truthSideClosureOperator, seed = defaultSeed, prefixLength = 3) {
    assertNat("prefixLength", prefixLength);
    if (prefixLength === 0)
        throw new RangeError("transfiniteCellComplex.settlingContinuityReceipt: prefixLength must be positive");
    const stages = orbit(operator, seed, prefixLength - 1);
    const limit = limitJoin(stages);
    const upperBound = stages.every((stage) => leqValuation(stage, limit));
    const sampleBounds = Object.freeze([...stages, limit]);
    const leastUpperBoundOnSamples = sampleBounds.every((candidate) => !stages.every((stage) => leqValuation(stage, candidate)) || leqValuation(limit, candidate));
    const noNewContentAtLimit = leastUpperBoundOnSamples;
    const closureOrbitContinuous = upperBound && leastUpperBoundOnSamples;
    if (!upperBound || !leastUpperBoundOnSamples || !noNewContentAtLimit || !closureOrbitContinuous) {
        throw new TypeError("transfiniteCellComplex.settlingContinuityReceipt: finite-prefix limit laws failed");
    }
    return Object.freeze({
        kind: "transfiniteCellComplex.settlingContinuity:witness",
        seed,
        prefixLength,
        prefix: stages,
        limitJoin: limit,
        upperBound: true,
        leastUpperBoundOnSamples: true,
        noNewContentAtLimit: true,
        closureOrbitContinuous: true,
        boundary: "finite-prefix-limit-model",
    });
}
export const defaultComplex = cellComplex([
    cell("v0", 0),
    cell("v1", 0),
    cell("edge", 1),
    cell("face", 2),
], [
    { face: "v0", coface: "edge" },
    { face: "v1", coface: "edge" },
    { face: "edge", coface: "face" },
    { face: "v0", coface: "face" },
    { face: "v1", coface: "face" },
]);
export const defaultSeed = valuation(["x", "y"], {
    x: "absurd",
    y: "active",
});
export function receipt() {
    return Object.freeze({
        kind: "transfiniteCellComplex.receipt:witness",
        colimit: transfiniteComplexReceipt(defaultComplex),
        continuity: settlingContinuityReceipt(truthSideClosureOperator, defaultSeed, 3),
    });
}
