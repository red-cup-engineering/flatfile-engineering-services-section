import { countProperColorings, isProperColorAssignment, properColoring, } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/coloring";
import { intIsZero, intOne, intZero } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { readingFamilies } from "@red-cup-engineering/computer-data-engineering-services-section/four";
export const tileLambdaSchema = {
    $id: "metroplat/closure/analysis/tile/tile-lambda",
    type: "object",
    required: ["kind", "mode", "order", "label"],
    properties: {
        kind: { const: "tile.lambda" },
        mode: { const: "sequential" },
        order: { type: "array", items: { type: "string" } },
        label: { const: "layout: sequential (substitution not derived)" },
    },
    additionalProperties: false,
    title: "TileLambda",
    description: "The Tile construction's layout invariant: sequential cell order.",
};
export const tileEtaSchema = {
    $id: "metroplat/closure/analysis/tile/tile-eta",
    type: "object",
    required: ["kind", "rank", "vanishing", "source"],
    properties: {
        kind: { const: "tile.eta" },
        rank: { type: "number" },
        vanishing: { type: "boolean" },
        source: { const: "reused-coordination-certificate" },
    },
    additionalProperties: false,
    title: "TileEta",
    description: "The Tile construction's cohomological invariant, reused unchanged from a cover-nerve certificate.",
};
export const tileDeltaSchema = {
    $id: "metroplat/closure/analysis/tile/tile-delta",
    type: "object",
    required: ["kind", "status", "reason"],
    properties: {
        kind: { const: "tile.delta" },
        status: { const: "omitted" },
        reason: { type: "string" },
    },
    additionalProperties: false,
    title: "TileDelta",
    description: "The Tile construction's diffraction invariant, always reported omitted (no in-package reader).",
};
const DELTA_OMITTED_REASON = "no in-package diffraction reader: core/dynamics/substitution carries no Fourier/diffraction module, "
    + "and the nearest candidate, core/closure/analysis/aperiodic-autocorrelation.mts, documents itself as "
    + "\"finite pair-correlation only; no Fourier transform or diffraction measure\"";
function neighbours(adjacency, vertex) {
    const result = [];
    for (let other = 0; other < adjacency.length; other += 1) {
        if (other !== vertex &&
            (!intIsZero(adjacency[vertex][other]) || !intIsZero(adjacency[other][vertex])))
            result.push(other);
    }
    return result;
}
/** The connected components of a cell graph, as vertex-index groups. A
 *  disjoint union's chromatic polynomial factors over exactly these groups. */
function connectedComponents(adjacency) {
    const size = adjacency.length;
    const seen = new Array(size).fill(false);
    const components = [];
    for (let start = 0; start < size; start += 1) {
        if (seen[start])
            continue;
        const stack = [start];
        seen[start] = true;
        const component = [];
        while (stack.length > 0) {
            const vertex = stack.pop();
            component.push(vertex);
            for (const neighbour of neighbours(adjacency, vertex)) {
                if (!seen[neighbour]) {
                    seen[neighbour] = true;
                    stack.push(neighbour);
                }
            }
        }
        components.push(component);
    }
    return components;
}
function submatrix(adjacency, indices) {
    return Object.freeze(indices.map((row) => Object.freeze(indices.map((col) => adjacency[row][col]))));
}
function colorIndexOf(name) {
    const index = readingFamilies.knowledge.indexOf(name);
    /* istanbul ignore next -- readingFamilies.knowledge is total over ReadingName */
    if (index < 0)
        throw new TypeError(`tile: unknown reading value ${name}`);
    return index;
}
function rawColorIndex(cells, readings) {
    return cells.map((cell) => {
        if (!Object.hasOwn(readings, cell))
            throw new TypeError(`tile: cell ${cell} has no owned reading valuation`);
        return colorIndexOf(readings[cell]);
    });
}
function buildKappa(cells, adjacency, readings) {
    const raw = rawColorIndex(cells, readings);
    const asRecord = (colors) => Object.freeze(Object.fromEntries(cells.map((cell, index) => [cell, readingFamilies.knowledge[colors[index]]])));
    if (isProperColorAssignment(adjacency, raw)) {
        return Object.freeze({
            kind: "tile.kappa",
            status: "proper",
            cells: Object.freeze([...cells]),
            readings: asRecord(raw),
            refined: false,
        });
    }
    // gamma fails properness only where an actual conflict/obstruction edge
    // exists; isolated cells can never violate it. Refine only the
    // non-trivial component(s), leaving every isolated cell's gamma untouched.
    const refined = [...raw];
    let obstructed = false;
    for (const component of connectedComponents(adjacency)) {
        if (component.length <= 1)
            continue;
        const sub = submatrix(adjacency, component);
        const subColors = component.map((vertex) => raw[vertex]);
        if (isProperColorAssignment(sub, subColors))
            continue;
        const judgment = properColoring(sub, 4);
        if (judgment.kind !== "meme-analysis.coloring.proper:witness") {
            obstructed = true;
            continue;
        }
        component.forEach((vertex, position) => { refined[vertex] = judgment.colors[position]; });
    }
    if (obstructed) {
        return Object.freeze({
            kind: "tile.kappa",
            status: "obstruction",
            cells: Object.freeze([...cells]),
            readings: asRecord(raw),
            refined: false,
        });
    }
    return Object.freeze({
        kind: "tile.kappa",
        status: "proper",
        cells: Object.freeze([...cells]),
        readings: asRecord(refined),
        refined: refined.some((value, index) => value !== raw[index]),
    });
}
function buildLambda(cells) {
    return Object.freeze({
        kind: "tile.lambda",
        mode: "sequential",
        order: Object.freeze([...cells]),
        label: "layout: sequential (substitution not derived)",
    });
}
function buildEta(coordination) {
    return Object.freeze({
        kind: "tile.eta",
        rank: coordination.rank,
        vanishing: coordination.vanishing,
        source: "reused-coordination-certificate",
    });
}
function buildDelta() {
    return Object.freeze({ kind: "tile.delta", status: "omitted", reason: DELTA_OMITTED_REASON });
}
function buildH(adjacency) {
    let isolatedCells = 0;
    let bits = 0;
    let productCount = 1;
    let anyZero = false;
    const multiplyExact = (n) => {
        if (!Number.isSafeInteger(n) || n < 0 || productCount > Number.MAX_SAFE_INTEGER / n)
            throw new RangeError("tile.h: proper-coloring count exceeds exact safe integer range");
        productCount *= n;
    };
    for (const component of connectedComponents(adjacency)) {
        if (component.length === 1) {
            isolatedCells += 1;
            bits += 2; // log2(4): one isolated cell has exactly 4 proper 4-colourings
            multiplyExact(4);
            continue;
        }
        const count = countProperColorings(submatrix(adjacency, component), 4);
        if (count === 0) {
            anyZero = true;
            continue;
        }
        bits += Math.log2(count);
        multiplyExact(count);
    }
    return Object.freeze({
        kind: "tile.h",
        bits: anyZero ? 0 : bits,
        properColoringCount: anyZero ? 0 : productCount,
        isolatedCells,
    });
}
/** Build the Tile (Def 4.2) of a witnessed structure (Construction 4.1),
 *  given an already-computed cover-nerve coordination certificate for eta. */
export function buildTile(structure, coordination) {
    if (!Array.isArray(structure?.cells) ||
        !structure.cells.every((cell) => typeof cell === "string" && cell.length > 0) ||
        new Set(structure.cells).size !== structure.cells.length)
        throw new TypeError("buildTile: cells must be distinct non-empty names");
    const { adjacency, cells } = structure;
    if (!Array.isArray(adjacency) || adjacency.length !== cells.length ||
        !adjacency.every((row) => Array.isArray(row) && row.length === cells.length))
        throw new TypeError("buildTile: adjacency must be square over the cell set");
    if (adjacency.some((row, i) => !intIsZero(row[i])))
        throw new TypeError("buildTile: self-loop cannot be properly colored");
    if (!structure.readings || typeof structure.readings !== "object")
        throw new TypeError("buildTile: an owned FOUR reading per cell is required");
    return Object.freeze({
        kind: "tile.tile",
        kappa: buildKappa(structure.cells, structure.adjacency, structure.readings),
        lambda: buildLambda(structure.cells),
        eta: buildEta(coordination),
        delta: buildDelta(),
        h: buildH(structure.adjacency),
    });
}
/** A genuine, generic cell-graph constructor: cells are pairwise adjacent
 *  exactly when they co-occur in one of the given cliques (e.g. "these cells
 *  are each a real standing conflict", "these cells are each a real
 *  coordination obstruction") — a real membership relation over the cell set,
 *  not a two-valued split of the WHOLE vertex set (most cells, belonging to
 *  no clique, stay isolated). Cliques of size <2 contribute no edges. */
export function cliqueAdjacency(cells, cliques) {
    if (!Array.isArray(cells) || !cells.every((cell) => typeof cell === "string" && cell.length > 0) ||
        new Set(cells).size !== cells.length)
        throw new TypeError("cliqueAdjacency: cells must be distinct non-empty names");
    if (!Array.isArray(cliques)) throw new TypeError("cliqueAdjacency: expected a list of cliques");
    const index = new Map(cells.map((cell, position) => [cell, position]));
    const size = cells.length;
    const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => intZero));
    for (const clique of cliques) {
        if (!Array.isArray(clique)) throw new TypeError("cliqueAdjacency: each clique must be a list");
        const positions = clique.map((cell) => {
            if (!index.has(cell)) throw new RangeError("cliqueAdjacency: unknown cell in clique");
            return index.get(cell);
        });
        for (const left of positions) {
            for (const right of positions) {
                if (left !== right)
                    matrix[left][right] = intOne;
            }
        }
    }
    return Object.freeze(matrix.map((row) => Object.freeze(row)));
}
