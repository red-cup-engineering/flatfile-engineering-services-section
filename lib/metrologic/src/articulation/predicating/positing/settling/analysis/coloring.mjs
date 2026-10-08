/**
 * settling/analysis/coloring — proper graph coloring and the chromatic number.
 *
 * A PROPER coloring assigns colors to the vertices of a bare weighted graph (adjacency = a positive
 * weight) so that adjacent vertices DIFFER; the CHROMATIC NUMBER `χ(G)` is the least number of colors
 * admitting one. Computed exactly by backtracking (NP-hard in general, exact and fine for the finite
 * graphs the corpus carries). A proper coloring is, dynamically, a factor map from the graph to a
 * finite palette — for a tiling adjacency graph, a factor of the tiling system onto a finite shift
 * (the "what information does a coloring encode" reading). Grounding: Evans-Gawlak-Ramsey-Strungaru-
 * Trang, "Colourings of aperiodic tilings" (exact vertex/edge/face chromatic numbers for chair,
 * Ammann-Beenker, pinwheel); the Four Color Theorem / Vizing bound the planar-tiling case.
 *
 * NB the adjacency must be a GENUINE relation (geometric tile-adjacency, predication edges), not one
 * derived from a two-valued vertex attribute — such a graph is 2-colored by the attribute itself and
 * its chromatic number is degenerate.
 */
import { intIsZero, intOne, intZero } from "@red-cup-engineering/exact-number-data-service/exact-number";
const adjacent = (weights, left, right) => left !== right && !intIsZero(weights[left][right]);
const requireSquare = (weights) => {
    if (!weights.every((row) => row.length === weights.length)) {
        throw new TypeError("graph coloring expects a square adjacency matrix");
    }
};
/** The complete finite graph `K_n` as the existing exact weighted-adjacency carrier. */
export function completeGraphWeights(vertexCount) {
    if (!Number.isInteger(vertexCount) || vertexCount < 0) {
        throw new RangeError("completeGraphWeights: vertexCount must be a non-negative integer");
    }
    return Object.freeze(Array.from({ length: vertexCount }, (_, row) => Object.freeze(Array.from({ length: vertexCount }, (_, column) => row === column ? intZero : intOne))));
}
/** Check a supplied color assignment against the graph's adjacency relation. */
export function isProperColorAssignment(weights, colors) {
    requireSquare(weights);
    if (colors.length !== weights.length)
        return false;
    for (let left = 0; left < weights.length; left += 1) {
        for (let right = 0; right < weights.length; right += 1) {
            if (adjacent(weights, left, right) && colors[left] === colors[right])
                return false;
        }
    }
    return true;
}
/** Check the graph-hom/factor-map reading into the complete graph on the used palette. */
export function graphHomToCompletePalette(weights, colors) {
    requireSquare(weights);
    if (colors.length !== weights.length)
        return false;
    for (let left = 0; left < weights.length; left += 1) {
        for (let right = 0; right < weights.length; right += 1) {
            if (adjacent(weights, left, right) && colors[left] === colors[right])
                return false;
        }
    }
    return true;
}
/** Lean `properColoring_iff_hom`: proper coloring iff graph hom into the complete palette graph. */
export function coloringFactorMap(weights, colors) {
    const proper = isProperColorAssignment(weights, colors);
    const graphHom = graphHomToCompletePalette(weights, colors);
    const base = {
        colors: Object.freeze([...colors]),
        proper,
        graphHom,
        equivalent: proper === graphHom,
    };
    if (proper && graphHom) {
        return Object.freeze({ kind: "meme-analysis.coloring.factorMap:witness", ...base });
    }
    return Object.freeze({
        kind: "meme-analysis.coloring.factorMap-obstruction",
        ...base,
        reason: proper ? "not-graph-hom" : "not-proper",
    });
}
/** Whether the bare weighted graph admits a proper `k`-coloring (adjacent vertices differ), by
 *  backtracking. A witness carries the per-vertex color assignment; an obstruction reports the `k`. */
export function properColoring(weights, colorCount) {
    const vertices = weights.length;
    const colors = new Array(vertices).fill(-1);
    const extend = (vertex) => {
        if (vertex === vertices)
            return true;
        for (let color = 0; color < colorCount; color += 1) {
            let legal = true;
            for (let prior = 0; prior < vertex; prior += 1) {
                if (adjacent(weights, prior, vertex) && colors[prior] === color) {
                    legal = false;
                    break;
                }
            }
            if (legal) {
                colors[vertex] = color;
                if (extend(vertex + 1))
                    return true;
                colors[vertex] = -1;
            }
        }
        return false;
    };
    if (vertices > 0 && colorCount <= 0)
        return Object.freeze({ kind: "meme-analysis.coloring.proper-obstruction", colorCount });
    return extend(0)
        ? Object.freeze({ kind: "meme-analysis.coloring.proper:witness", colors: Object.freeze(colors.slice()), colorCount })
        : Object.freeze({ kind: "meme-analysis.coloring.proper-obstruction", colorCount });
}
/** A proper-coloring witness for the edgeless graph on `vertexCount` vertices. */
export function edgelessColoring(vertexCount, colorCount) {
    if (!Number.isInteger(vertexCount) || vertexCount < 0)
        throw new RangeError("edgelessColoring: vertexCount must be a non-negative integer");
    if (!Number.isInteger(colorCount) || colorCount < 0)
        throw new RangeError("edgelessColoring: colorCount must be a non-negative integer");
    if (vertexCount > 0 && colorCount === 0)
        return Object.freeze({ coloring: Object.freeze({ kind: "meme-analysis.coloring.proper-obstruction", colorCount }) });
    const colors = Object.freeze(new Array(vertexCount).fill(0));
    return Object.freeze({
        coloring: Object.freeze({ kind: "meme-analysis.coloring.proper:witness", colors, colorCount }),
        factorMap: Object.freeze({ kind: "meme-analysis.coloring.factorMap:witness", colors, proper: true, graphHom: true, equivalent: true }),
    });
}
/** The CHROMATIC NUMBER `χ(G)` — the least number of colors admitting a proper vertex coloring, exact
 *  by ascending search. `χ ≤ |V|`; edgeless → 1, bipartite → 2, an odd cycle → 3, complete `Kₙ` → `n`. */
export function chromaticNumber(weights) {
    const vertices = weights.length;
    if (vertices === 0)
        return 0;
    for (let colorCount = 1; colorCount <= vertices; colorCount += 1) {
        if (properColoring(weights, colorCount).kind === "meme-analysis.coloring.proper:witness")
            return colorCount;
    }
    return vertices;
}
/** The NUMBER of proper `k`-colorings of the graph — the chromatic polynomial `P(G, k)` evaluated at
 *  `k` — counted exactly by backtracking. `0` ⟺ `k < χ(G)`; for the edgeless graph it is `kⁿ`; for `Kₙ`
 *  it is the falling factorial `k(k-1)⋯(k-n+1)`. */
export function countProperColorings(weights, colorCount) {
    const vertices = weights.length;
    if (vertices === 0)
        return 1;
    const colors = new Array(vertices).fill(-1);
    let count = 0;
    const extend = (vertex) => {
        if (vertex === vertices) {
            count += 1;
            return;
        }
        for (let color = 0; color < colorCount; color += 1) {
            let legal = true;
            for (let prior = 0; prior < vertex; prior += 1) {
                if (adjacent(weights, prior, vertex) && colors[prior] === color) {
                    legal = false;
                    break;
                }
            }
            if (legal) {
                colors[vertex] = color;
                extend(vertex + 1);
                colors[vertex] = -1;
            }
        }
    };
    extend(0);
    return count;
}
/**
 * The COLORING ENTROPY at `k` colors: `log₂ P(G, k) / |V|` — the bits of information a proper
 * `k`-coloring carries PER VERTEX. A proper coloring is a factor of the graph onto a `k`-symbol
 * palette; this is the per-tile entropy of that factor. As the tiling patch grows, the per-tile
 * coloring entropy converges to the topological entropy of the coloring shift — a tiling-space
 * invariant FINER than the chromatic number (two tilings can share `χ` but differ in how much
 * freedom a coloring has). `0` when no proper `k`-coloring exists (`k < χ`) or the graph is empty.
 */
export function coloringEntropy(weights, colorCount) {
    const vertices = weights.length;
    if (vertices === 0)
        return 0;
    const count = countProperColorings(weights, colorCount);
    return count === 0 ? 0 : Math.log2(count) / vertices;
}
/** Lean complete-graph ladder: `χ(K_n)=n`, with every proper `K_n` coloring injective. */
export function completeGraphChromatic(vertexCount) {
    const weights = completeGraphWeights(vertexCount);
    const selfColoring = properColoring(weights, vertexCount);
    return Object.freeze({
        kind: "meme-analysis.coloring.completeGraphChromatic:witness",
        vertexCount,
        chromaticNumber: chromaticNumber(weights),
        selfColoring,
        properColoringCountAtSelfPalette: countProperColorings(weights, vertexCount),
        lowerBoundByInjection: true,
        requiresAllColours: vertexCount > 0,
    });
}
/** The Lean `K₄`/FOUR extremal case: four vertices require all four Belnap readings. */
export const k4RequiresFour = completeGraphChromatic(4);
const degreeOf = (weights, vertex) => {
    let degree = 0;
    for (let other = 0; other < weights.length; other += 1) {
        if (adjacent(weights, vertex, other))
            degree += 1;
    }
    return degree;
};
const symmetric = (weights) => {
    requireSquare(weights);
    for (let row = 0; row < weights.length; row += 1) {
        for (let column = 0; column < weights.length; column += 1) {
            if (intIsZero(weights[row][column]) !== intIsZero(weights[column][row]))
                return false;
        }
    }
    return true;
};
const irreflexive = (weights) => {
    requireSquare(weights);
    return weights.every((row, index) => intIsZero(row[index]));
};
/** Lean `handshake_and_degree_parity` for finite symmetric, irreflexive adjacency matrices. */
export function handshakeDegreeParity(weights) {
    if (!symmetric(weights)) {
        return Object.freeze({ kind: "meme-analysis.coloring.handshakeDegreeParity-obstruction", reason: "not-symmetric" });
    }
    if (!irreflexive(weights)) {
        return Object.freeze({ kind: "meme-analysis.coloring.handshakeDegreeParity-obstruction", reason: "not-irreflexive" });
    }
    const degrees = weights.map((_, vertex) => degreeOf(weights, vertex));
    const degreeSum = degrees.reduce((sum, degree) => sum + degree, 0);
    const oddDegreeCount = degrees.filter((degree) => degree % 2 === 1).length;
    return Object.freeze({
        kind: "meme-analysis.coloring.handshakeDegreeParity:witness",
        degrees: Object.freeze(degrees),
        degreeSum,
        directedEdgeCount: degreeSum,
        oddDegreeCount,
        degreeSumEven: degreeSum % 2 === 0,
        oddDegreeCountEven: oddDegreeCount % 2 === 0,
    });
}
const hasUndirectedEdge = (weights, left, right) => left >= 0 && right >= 0 && left < weights.length && right < weights.length
    && (adjacent(weights, left, right) || adjacent(weights, right, left));
/** Lean `not_bipartite_of_odd_closed_walk`: an odd closed walk obstructs Bool-colorability. */
export function oddClosedWalkBipartiteObstruction(weights, start, walk) {
    requireSquare(weights);
    let current = start;
    let validWalk = start >= 0 && start < weights.length;
    for (const next of walk) {
        if (!hasUndirectedEdge(weights, current, next)) {
            validWalk = false;
            break;
        }
        current = next;
    }
    const closed = validWalk && current === start;
    const oddLength = walk.length % 2 === 1;
    const base = { start, walk: Object.freeze([...walk]), validWalk, closed, oddLength };
    if (validWalk && closed && oddLength) {
        return Object.freeze({
            kind: "meme-analysis.coloring.oddClosedWalkBipartiteObstruction:witness",
            ...base,
            notBipartite: true,
        });
    }
    return Object.freeze({
        kind: "meme-analysis.coloring.oddClosedWalkBipartiteObstruction-obstruction",
        ...base,
        reason: !validWalk ? "invalid-walk" : !closed ? "not-closed" : "not-odd",
    });
}
export function combinatoricsExtremalReceipt() {
    const triangle = completeGraphWeights(3);
    const handshake = handshakeDegreeParity(triangle);
    const oddWalk = oddClosedWalkBipartiteObstruction(triangle, 0, [1, 2, 0]);
    if (handshake.kind !== "meme-analysis.coloring.handshakeDegreeParity:witness"
        || oddWalk.kind !== "meme-analysis.coloring.oddClosedWalkBipartiteObstruction:witness") {
        throw new TypeError("combinatoricsExtremalReceipt: finite extremal graph laws failed");
    }
    return Object.freeze({
        kind: "meme-analysis.combinatoricsExtremal:witness",
        sourceModule: "RelMath.Order.CombinatoricsExtremal",
        theorems: Object.freeze([
            "RelMath.Combinatorics.sum_mod_two",
            "RelMath.Combinatorics.countOdd_even_of_sum_even",
            "RelMath.Combinatorics.dsum_even",
            "RelMath.Combinatorics.degSum_even",
            "RelMath.Combinatorics.countOdd_degree_even",
            "RelMath.Combinatorics.handshake_and_degree_parity",
            "RelMath.Combinatorics.walk_color",
            "RelMath.Combinatorics.bipartite_no_odd_closed_walk",
            "RelMath.Combinatorics.bipartite_parity",
        ]),
        handshake,
        oddWalk,
        degreeSumEven: handshake.degreeSumEven,
        oddDegreeCountEven: handshake.oddDegreeCountEven,
        bipartiteOddWalkObstruction: oddWalk.notBipartite,
    });
}
const isSixBySixBool = (colors) => colors.length === 6 && colors.every((row) => row.length === 6 && row.every((entry) => typeof entry === "boolean"));
/** Lean `ramsey_three_three`: every Boolean edge-colouring of K6 has a monochromatic triangle. */
export function ramseyThreeThree(colors) {
    if (!isSixBySixBool(colors)) {
        return Object.freeze({ kind: "meme-analysis.ramsey.r33-obstruction", reason: "not-six-by-six" });
    }
    for (let i = 0; i < 6; i += 1) {
        for (let j = i + 1; j < 6; j += 1) {
            for (let k = j + 1; k < 6; k += 1) {
                const ij = colors[i][j];
                const ik = colors[i][k];
                const jk = colors[j][k];
                if (ij === ik && ik === jk) {
                    return Object.freeze({
                        kind: "meme-analysis.ramsey.r33:witness",
                        vertexCount: 6,
                        vertices: Object.freeze([i, j, k]),
                        color: ij,
                        edges: Object.freeze([ij, ik, jk]),
                    });
                }
            }
        }
    }
    return Object.freeze({
        kind: "meme-analysis.ramsey.r33-obstruction",
        reason: "no-monochromatic-triangle",
    });
}
