/**
 * settling/analysis/sofic — finite symbolic-dynamics witnesses.
 *
 * This is the executable shadow of `RelMath.Aperiodic.SoficShift`: an SFT is a
 * finite directed transition graph, an admissible word is a directed walk, and a
 * sofic word is the 1-block factor image of such a walk. The surface stays finite
 * and exact: it checks words, computes factor images, and carries the golden-mean
 * and Fibonacci/decorated sofic witnesses as serializable receipts.
 */
const requireNatIndex = (name, value) => {
    if (!Number.isSafeInteger(value) || value < 0)
        throw new RangeError(`${name}: expected a non-negative safe integer`);
};
function requireGraph(graph) {
    if (!Array.isArray(graph))
        throw new TypeError("sofic graph: expected an adjacency matrix");
    for (const row of graph) {
        if (!Array.isArray(row) || row.length !== graph.length) {
            throw new TypeError("sofic graph: expected a square boolean adjacency matrix");
        }
        for (const entry of row) {
            if (typeof entry !== "boolean")
                throw new TypeError("sofic graph: adjacency entries must be boolean");
        }
    }
}
function requireFactorMap(name, domainSize, codomainSize, factor) {
    if (factor.length !== domainSize) {
        throw new RangeError(`${name}: factor map domain does not match source graph`);
    }
    for (const [index, symbol] of factor.entries()) {
        requireNatIndex(`${name}[${index}]`, symbol);
        if (symbol >= codomainSize)
            throw new RangeError(`${name}[${index}]: symbol is outside the target graph`);
    }
}
function requireWord(graph, word) {
    for (const [index, symbol] of word.entries()) {
        requireNatIndex(`word[${index}]`, symbol);
        if (symbol >= graph.length)
            throw new RangeError(`word[${index}]: symbol is outside the graph alphabet`);
    }
}
function firstFailedTransition(graph, word) {
    for (let index = 0; index + 1 < word.length; index += 1) {
        if (graph[word[index]][word[index + 1]] !== true)
            return index;
    }
    return null;
}
/** The complete finite directed graph without loops, read as a palette shift. */
export function completePaletteGraph(vertexCount) {
    requireNatIndex("completePaletteGraph vertexCount", vertexCount);
    return Object.freeze(Array.from({ length: vertexCount }, (_, row) => Object.freeze(Array.from({ length: vertexCount }, (_, column) => row !== column))));
}
/** Check a one-block map as a finite graph hom/factor between transition graphs. */
export function graphHom(source, target, factor) {
    requireGraph(source);
    requireGraph(target);
    const frozenFactor = Object.freeze([...factor]);
    if (factor.length !== source.length) {
        return Object.freeze({
            kind: "sofic.graphHom-obstruction",
            reason: "factor-domain",
            sourceSize: source.length,
            targetSize: target.length,
            factor: frozenFactor,
        });
    }
    for (const [index, symbol] of factor.entries()) {
        if (!Number.isSafeInteger(symbol) || symbol < 0 || symbol >= target.length) {
            return Object.freeze({
                kind: "sofic.graphHom-obstruction",
                reason: "factor-codomain",
                sourceSize: source.length,
                targetSize: target.length,
                factor: frozenFactor,
                edge: Object.freeze([index, symbol]),
            });
        }
    }
    for (let left = 0; left < source.length; left += 1) {
        for (let right = 0; right < source.length; right += 1) {
            if (source[left][right] === true && target[factor[left]][factor[right]] !== true) {
                return Object.freeze({
                    kind: "sofic.graphHom-obstruction",
                    reason: "edge",
                    sourceSize: source.length,
                    targetSize: target.length,
                    factor: frozenFactor,
                    edge: Object.freeze([left, right]),
                    imageEdge: Object.freeze([factor[left], factor[right]]),
                });
            }
        }
    }
    return Object.freeze({
        kind: "sofic.graphHom:witness",
        sourceSize: source.length,
        targetSize: target.length,
        factor: frozenFactor,
        preservesEdges: true,
    });
}
export function identityGraphHom(graph) {
    requireGraph(graph);
    const identity = Object.freeze(Array.from({ length: graph.length }, (_, index) => index));
    const judgment = graphHom(graph, graph, identity);
    if (judgment.kind !== "sofic.graphHom:witness")
        throw new Error("identityGraphHom: invariant failure");
    return judgment;
}
export function composeFactorMaps(first, second) {
    for (const [index, symbol] of first.entries()) {
        requireNatIndex(`first[${index}]`, symbol);
        if (symbol >= second.length)
            throw new RangeError(`first[${index}]: symbol is outside the second factor domain`);
    }
    return Object.freeze(first.map((symbol) => second[symbol]));
}
/** Lean `GraphHom.map_path`: a graph hom carries SFT-admissible words to admissible words. */
export function mapPathByGraphHom(source, target, factor, word) {
    const hom = graphHom(source, target, factor);
    const sourcePath = path(source, word);
    const targetWord = Object.freeze(word.map((symbol) => factor[symbol]));
    if (hom.kind !== "sofic.graphHom:witness") {
        return Object.freeze({
            kind: "sofic.graphHom.mapPath-obstruction",
            reason: "hom",
            sourceWord: Object.freeze([...word]),
            targetWord,
            hom,
            sourcePath,
        });
    }
    if (sourcePath.kind !== "sofic.path:witness") {
        return Object.freeze({
            kind: "sofic.graphHom.mapPath-obstruction",
            reason: "source-path",
            sourceWord: Object.freeze([...word]),
            targetWord,
            hom,
            sourcePath,
        });
    }
    const targetPath = path(target, targetWord);
    if (targetPath.kind !== "sofic.path:witness") {
        return Object.freeze({
            kind: "sofic.graphHom.mapPath-obstruction",
            reason: "target-path",
            sourceWord: Object.freeze([...word]),
            targetWord,
            hom,
            sourcePath,
            targetPath,
        });
    }
    return Object.freeze({
        kind: "sofic.graphHom.mapPath:witness",
        sourceWord: Object.freeze([...word]),
        targetWord,
        hom,
        sourcePath,
        targetPath,
    });
}
/** Check whether a finite word is a directed walk in the transition graph. */
export function path(graph, word) {
    requireGraph(graph);
    requireWord(graph, word);
    const frozenWord = Object.freeze([...word]);
    const failedAt = firstFailedTransition(graph, word);
    if (failedAt === null) {
        return Object.freeze({
            kind: "sofic.path:witness",
            word: frozenWord,
            length: word.length,
            transitions: Math.max(0, word.length - 1),
            admissible: true,
        });
    }
    return Object.freeze({
        kind: "sofic.path-obstruction",
        word: frozenWord,
        length: word.length,
        transitions: Math.max(0, word.length - 1),
        admissible: false,
        failedAt,
        edge: Object.freeze([word[failedAt], word[failedAt + 1]]),
    });
}
/** Compute the 1-block factor image of an admissible SFT word. */
export function soficImage(graph, factor, preimage) {
    requireGraph(graph);
    requireWord(graph, preimage);
    for (const [index, symbol] of factor.entries()) {
        requireNatIndex(`factor[${index}]`, symbol);
    }
    const pathJudgment = path(graph, preimage);
    const factorDomain = preimage.every((symbol) => symbol < factor.length);
    const image = factorDomain ? Object.freeze(preimage.map((symbol) => factor[symbol])) : Object.freeze([]);
    const base = {
        preimage: Object.freeze([...preimage]),
        image,
        factor: Object.freeze([...factor]),
        path: pathJudgment,
    };
    if (pathJudgment.kind === "sofic.path:witness" && factorDomain) {
        return Object.freeze({ kind: "sofic.image:witness", ...base, path: pathJudgment });
    }
    return Object.freeze({
        kind: "sofic.image-obstruction",
        ...base,
        reason: factorDomain ? "path" : "factor-domain",
    });
}
/** Golden-mean alphabet: `0 = a`, `1 = b`; the only forbidden adjacent pair is `bb`. */
export const goldenMeanGraph = Object.freeze([
    Object.freeze([true, true]),
    Object.freeze([true, false]),
]);
/** The Fibonacci substitution `a -> ab`, `b -> a`, encoded over `0=a`, `1=b`. */
export function fibSubstitute(word) {
    for (const [index, symbol] of word.entries()) {
        if (symbol !== 0 && symbol !== 1)
            throw new RangeError(`fibSubstitute word[${index}]: expected 0 or 1`);
    }
    return Object.freeze(word.flatMap((symbol) => symbol === 0 ? [0, 1] : [0]));
}
/** The golden-mean SFT rejects every word beginning with `bb`. */
export function goldenForbidsBB(suffix = Object.freeze([])) {
    const word = Object.freeze([1, 1, ...suffix]);
    const pathJudgment = path(goldenMeanGraph, word);
    if (pathJudgment.kind !== "sofic.path-obstruction") {
        throw new Error("goldenForbidsBB: invariant failure, bb should be forbidden");
    }
    return Object.freeze({
        kind: "sofic.goldenMean.forbidsBB:witness",
        word,
        path: pathJudgment,
        forbiddenPair: Object.freeze([1, 1]),
    });
}
/** Finite carrier for Lean `fib_substitute_golden`. */
export function fibSubstituteGolden(word) {
    const substituted = fibSubstitute(word);
    const pathJudgment = path(goldenMeanGraph, substituted);
    const base = {
        source: Object.freeze([...word]),
        substituted,
        path: pathJudgment,
    };
    if (pathJudgment.kind === "sofic.path:witness") {
        return Object.freeze({ kind: "sofic.fibonacciSubstitution.golden:witness", ...base, path: pathJudgment });
    }
    return Object.freeze({ kind: "sofic.fibonacciSubstitution.golden-obstruction", ...base });
}
/** Decorated alphabet: `0=(a,0)`, `1=(b,0)`, `2=(a,1)`. */
export const decoratedGoldenGraph = Object.freeze([
    Object.freeze([false, true, false]),
    Object.freeze([true, false, true]),
    Object.freeze([true, false, false]),
]);
/** The decorated Fibonacci substitution: `a -> (a,0)(b,0)`, `b -> (a,1)`. */
export function decoratedFibSubstitute(word) {
    for (const [index, symbol] of word.entries()) {
        if (symbol !== 0 && symbol !== 1)
            throw new RangeError(`decoratedFibSubstitute word[${index}]: expected 0 or 1`);
    }
    return Object.freeze(word.flatMap((symbol) => symbol === 0 ? [0, 1] : [2]));
}
/** The forgetful decoration factor `(a,0)->a`, `(b,0)->b`, `(a,1)->a`. */
export const forgetDecoration = Object.freeze([0, 1, 0]);
/** Finite carrier for the decorated golden-case deep sofic cover. */
export function fibDeepSofic(word) {
    const sourcePath = path(goldenMeanGraph, word);
    const substituted = fibSubstitute(word);
    const decorated = decoratedFibSubstitute(word);
    const decoratedPath = path(decoratedGoldenGraph, decorated);
    const sofic = soficImage(decoratedGoldenGraph, forgetDecoration, decorated);
    const forgetsToSubstitution = sofic.kind === "sofic.image:witness"
        && sofic.image.length === substituted.length
        && sofic.image.every((symbol, index) => symbol === substituted[index]);
    const base = {
        source: Object.freeze([...word]),
        substituted,
        decorated,
        sourcePath,
        decoratedPath,
        sofic,
        forgetsToSubstitution,
    };
    if (sourcePath.kind === "sofic.path:witness"
        && decoratedPath.kind === "sofic.path:witness"
        && sofic.kind === "sofic.image:witness"
        && forgetsToSubstitution) {
        return Object.freeze({
            kind: "sofic.fibonacciSubstitution.deep:witness",
            ...base,
            sourcePath,
            decoratedPath,
            sofic,
            forgetsToSubstitution: true,
        });
    }
    return Object.freeze({
        kind: "sofic.fibonacciSubstitution.deep-obstruction",
        ...base,
        reason: sourcePath.kind !== "sofic.path:witness" ? "source"
            : decoratedPath.kind !== "sofic.path:witness" ? "decorated"
                : "factor",
    });
}
const requireGraphHomWitness = (name, judgment) => {
    if (judgment.kind !== "sofic.graphHom:witness")
        throw new TypeError(`${name}: expected a graph-hom witness`);
    return judgment;
};
const requireMapPathWitness = (name, judgment) => {
    if (judgment.kind !== "sofic.graphHom.mapPath:witness")
        throw new TypeError(`${name}: expected a map-path witness`);
    return judgment;
};
const requireSoficImageWitness = (name, judgment) => {
    if (judgment.kind !== "sofic.image:witness")
        throw new TypeError(`${name}: expected a sofic-image witness`);
    return judgment;
};
/**
 * Finite carrier for `RelMath.Aperiodic.FiniteLocalRule`: graph factors compose, preserve
 * admissible words, pull colourings back, and expose every one-block SFT factor as sofic.
 */
export function finiteLocalRuleReceipt() {
    const source = Object.freeze([
        Object.freeze([false, true, false]),
        Object.freeze([false, false, true]),
        Object.freeze([false, false, false]),
    ]);
    const target = completePaletteGraph(2);
    const palette = completePaletteGraph(4);
    const factor = Object.freeze([0, 1, 0]);
    const postFactor = Object.freeze([1, 0]);
    const composedFactor = composeFactorMaps(factor, postFactor);
    const sourceWord = Object.freeze([0, 1, 2]);
    const pulledBackColors = Object.freeze(factor.map((vertex) => vertex));
    const targetColoring = requireGraphHomWitness("finiteLocalRuleReceipt.targetColoring", graphHom(target, palette, [0, 1]));
    const pulledBackColoring = requireGraphHomWitness("finiteLocalRuleReceipt.pulledBackColoring", graphHom(source, palette, pulledBackColors));
    return Object.freeze({
        kind: "sofic.finiteLocalRule:witness",
        sourceModule: "RelMath.Aperiodic.FiniteLocalRule",
        theorems: Object.freeze([
            "RelMath.Combinatorics.GraphHom.id",
            "RelMath.Combinatorics.GraphHom.comp",
            "RelMath.Combinatorics.GraphHom.map_path",
            "RelMath.Combinatorics.Colorable.pullback",
            "RelMath.Combinatorics.fourColouring_pullback",
            "RelMath.Combinatorics.ProperColoring.map_path",
            "RelMath.Aperiodic.factor_of_sft_is_sofic",
        ]),
        source,
        target,
        palette,
        factor,
        postFactor,
        identity: identityGraphHom(source),
        factorHom: requireGraphHomWitness("finiteLocalRuleReceipt.factorHom", graphHom(source, target, factor)),
        postHom: requireGraphHomWitness("finiteLocalRuleReceipt.postHom", graphHom(target, target, postFactor)),
        composedHom: requireGraphHomWitness("finiteLocalRuleReceipt.composedHom", graphHom(source, target, composedFactor)),
        sourceWord,
        mappedPath: requireMapPathWitness("finiteLocalRuleReceipt.mappedPath", mapPathByGraphHom(source, target, factor, sourceWord)),
        colorPullback: Object.freeze({
            kind: "sofic.localRule.colorPullback:witness",
            targetColoring,
            pulledBackColoring,
            pulledBackColors,
            fourColouringPullback: true,
        }),
        properColoringPath: requireMapPathWitness("finiteLocalRuleReceipt.properColoringPath", mapPathByGraphHom(source, palette, pulledBackColors, sourceWord)),
        factorOfSftIsSofic: requireSoficImageWitness("finiteLocalRuleReceipt.factorOfSftIsSofic", soficImage(source, factor, sourceWord)),
    });
}
