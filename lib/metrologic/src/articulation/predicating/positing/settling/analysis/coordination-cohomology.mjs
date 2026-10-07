/**
 * analysis/coordination-cohomology - finite executable shadow of
 * RelMath.Cohomology.CoordinationCohomology.
 *
 * Lean models a federated cover nerve by Euler counts: entities |V|, cells |E|,
 * and components |C|. H0 is |C| and H1 is |E| - |V| + |C| under the carried
 * union-find invariant |V| <= |E| + |C|. This module makes that finite
 * coordination-cost receipt executable.
 */
import { detailedBalanceImpliesStationary, poissonKernel, poissonPi, ratStochSemiring, } from "../stochastic.mjs";
const assertNat = (name, value) => {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new TypeError(`${name} must be a safe natural number`);
    }
    return value;
};
/** Whether Euler counts (entities |V|, cells |E|, components |C|) can be a cover nerve: C ≤ V,
 *  C > 0 when V > 0, and the union–find invariant V ≤ E + C. A nerve, or an obstruction with its reason. */
export function coverNerveJudgment(entitiesInput, cellsInput, componentsInput) {
    const entities = assertNat("entities", entitiesInput), cells = assertNat("cells", cellsInput), components = assertNat("components", componentsInput);
    const obstruction = (reason) => Object.freeze({ kind: "coordinationCohomology.coverNerve-obstruction", entities, cells, components, reason });
    if (entities > 0 && components === 0)
        return obstruction("empty-component-with-entities");
    if (components > entities)
        return obstruction("components-exceed-entities");
    if (entities > cells + components)
        return obstruction("union-find-invariant-fails");
    return Object.freeze({ kind: "coordinationCohomology.coverNerve", entities, cells, components, componentsLeEntities: true, entitiesLeCellsAddComponents: true });
}
/** The cover nerve of Euler counts; throws on an obstruction. */
export function coverNerve(entities, cells, components) {
    const judgment = coverNerveJudgment(entities, cells, components);
    if (judgment.kind !== "coordinationCohomology.coverNerve")
        throw new TypeError(`coverNerve: ${judgment.reason}`);
    return judgment;
}
/** H⁰ of a nerve: its components. */
export const h0Rank = (nerve) => nerve.components;
/** H¹ of a nerve: E + C − V, the cycles no spanning forest covers. */
export const h1Rank = (nerve) => nerve.cells + nerve.components - nerve.entities;
/** Whether a nerve needs no coordination: H¹ vanishes. */
export const coordinationFree = (nerve) => h1Rank(nerve) === 0;
/** Whether a nerve is a forest: V = E + C. */
export const forestEquality = (nerve) => nerve.entities === nerve.cells + nerve.components;
export const landauerBits = (nerve) => h1Rank(nerve);
export const landauerZeroIffReversible = (nerve) => (landauerBits(nerve) === 0) === forestEquality(nerve);
export const landauerEqualsCoordinationCost = (nerve) => landauerBits(nerve) === nerve.cells - (nerve.entities - nerve.components);
export function coordinationCostReceipt(nerve) {
    const h1 = h1Rank(nerve);
    const spanningForestEdges = nerve.entities - nerve.components;
    const coordinationCost = nerve.cells - spanningForestEdges;
    const h1VanishesIffForest = (h1 === 0) === forestEquality(nerve);
    const h1RankIsCoordinationCost = h1 === coordinationCost;
    if (!h1VanishesIffForest || !h1RankIsCoordinationCost) {
        throw new TypeError("coordinationCostReceipt: cover-nerve Euler laws failed");
    }
    return Object.freeze({
        kind: "coordinationCohomology.cost:witness",
        nerve,
        h0Rank: h0Rank(nerve),
        h1Rank: h1,
        spanningForestEdges,
        coordinationCost,
        coordinationFree: h1 === 0,
        forestEquality: forestEquality(nerve),
        h1VanishesIffForest: true,
        h1RankIsCoordinationCost: true,
    });
}
export function laplacianDualReceipt(nerve) {
    const incidenceRank = nerve.entities - nerve.components;
    const h0KernelRank = nerve.entities - incidenceRank;
    const h1CokernelRank = nerve.cells - incidenceRank;
    const h0EqualsKernel = h0Rank(nerve) === h0KernelRank;
    const h1EqualsCokernel = h1Rank(nerve) === h1CokernelRank;
    if (!h0EqualsKernel || !h1EqualsCokernel) {
        throw new TypeError("laplacianDualReceipt: kernel/cokernel rank identities failed");
    }
    return Object.freeze({
        kind: "coordinationCohomology.laplacianDual:witness",
        nerve,
        incidenceRank,
        h0KernelRank,
        h1CokernelRank,
        h0EqualsKernel: true,
        h1EqualsCokernel: true,
    });
}
export function treeCoordinationReceipt(verticesInput) {
    const vertices = assertNat("vertices", verticesInput);
    if (vertices === 0)
        throw new TypeError("treeCoordinationReceipt: a finite tree has at least one vertex");
    const edges = vertices - 1;
    const nerve = coverNerve(vertices, edges, 1);
    const h1 = h1Rank(nerve);
    if (h1 !== 0)
        throw new TypeError("treeCoordinationReceipt: tree H1 rank did not vanish");
    return Object.freeze({
        kind: "coordinationCohomology.tree:witness",
        vertices,
        edges,
        nerve,
        edgeCountIdentity: true,
        h1Rank: 0,
        coordinationFree: true,
    });
}
export function landauerEntropyReceipt(nerve = coverNerve(3, 3, 1)) {
    const bits = landauerBits(nerve);
    const coordinationCost = nerve.cells - (nerve.entities - nerve.components);
    const zeroIffReversible = landauerZeroIffReversible(nerve);
    const equalsCoordinationCost = landauerEqualsCoordinationCost(nerve);
    const stochasticFace = detailedBalanceImpliesStationary(poissonKernel, ratStochSemiring, poissonPi);
    const reversibleIsLandauerFree = stochasticFace.detailedBalance && stochasticFace.rowsSumToOne && stochasticFace.stationary;
    if (!zeroIffReversible || !equalsCoordinationCost || !reversibleIsLandauerFree) {
        throw new TypeError("landauerEntropyReceipt: Landauer/cohomology reversibility laws failed");
    }
    return Object.freeze({
        kind: "coordinationCohomology.landauerEntropy:witness",
        nerve,
        bits,
        coordinationCost,
        reversible: forestEquality(nerve),
        landauerFree: bits === 0,
        zeroIffReversible: true,
        equalsCoordinationCost: true,
        stochasticFace,
        reversibleIsLandauerFree: true,
        bitScale: "one-bit-per-first-cohomology-class",
        physicalScaleBoundary: "exact bit count only; kT-ln2 thermodynamic scaling remains an interpretation boundary",
    });
}
export function receipt() {
    const cycle = coverNerve(3, 3, 1);
    const forest = coverNerve(4, 2, 2);
    return Object.freeze({
        kind: "coordinationCohomology.receipt:witness",
        cycle: coordinationCostReceipt(cycle),
        forest: coordinationCostReceipt(forest),
        tree: treeCoordinationReceipt(5),
        laplacian: laplacianDualReceipt(cycle),
        landauer: landauerEntropyReceipt(cycle),
        openFrontier: Object.freeze([
            "General component counting from arbitrary graph reachability is still proof/kernel work; this carrier requires the union-find invariant.",
            "A nonzero H1 rank is a coordination-cost count, not a runtime proof that a concrete monotone global section is obstructed without a total order.",
            "Cech gluing existence is reused from finite settling cohomology; arbitrary cover sheaf proof objects remain Lean-side.",
            "Landauer entropy is reported as exact H1 bit count; physical kT ln2 scaling and entropy-production units remain outside this Node carrier.",
        ]),
    });
}
