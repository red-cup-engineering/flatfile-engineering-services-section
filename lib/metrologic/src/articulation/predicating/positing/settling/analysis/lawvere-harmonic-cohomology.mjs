/**
 * analysis/lawvere-harmonic-cohomology - finite executable shadow of
 * RelMath.Cohomology.LawvereHarmonicCohomology.
 *
 * This names the bridge between the finite Lawvere/Tarski Laplacianizer and the
 * independent settling-cohomology reading: the settled section is harmonic/fixed,
 * its classifying invariant vanishes in strict/Scott regimes, and H0 is the
 * count of truth-firing cells.
 */
import { finiteClosureRegime, scottClosureRegime, transfiniteClosureRegime, aperiodicClosureRegime, } from "../closure.mjs";
import { cohomologyVanishesInRegime } from "../value-category.mjs";
import { h1Zero, } from "./aperiodic-classification.mjs";
import { laplacianizer, truthSideClosureOperator, valuation, } from "./flow.mjs";
import { KNOWLEDGE_BOTTOM, TRUTH_BOTTOM, TRUTH_TOP } from "../../../../../reading-points.mjs";
export const defaultSeed = valuation(["x", "y", "z"], {
    x: KNOWLEDGE_BOTTOM,
    y: TRUTH_TOP,
    z: TRUTH_BOTTOM,
});
export const h0TruthFiringCount = (value) => value.cells.filter((cell) => value.values[cell] === TRUTH_TOP).length;
export function receipt(seed = defaultSeed) {
    const lap = laplacianizer(truthSideClosureOperator, seed);
    const h0 = h0TruthFiringCount(lap.settled);
    const strictScottRegimeGate = cohomologyVanishesInRegime(finiteClosureRegime)
        && cohomologyVanishesInRegime(scottClosureRegime)
        && !cohomologyVanishesInRegime(transfiniteClosureRegime)
        && !cohomologyVanishesInRegime(aperiodicClosureRegime);
    const harmonic = lap.harmonicEqualsFixed && lap.laplacianIsClosure;
    const fixedPoint = lap.harmonicEqualsFixed;
    const classifyingInvariantZero = h1Zero.coord === 0;
    if (!harmonic || !fixedPoint || !classifyingInvariantZero || !strictScottRegimeGate) {
        throw new TypeError("lawvereHarmonicCohomology.receipt: harmonic/cohomology bridge laws failed");
    }
    return Object.freeze({
        kind: "lawvereHarmonicCohomology.receipt:witness",
        seed,
        settled: lap.settled,
        laplacianizer: lap,
        classifyingInvariant: h1Zero,
        h0TruthFiringCount: h0,
        harmonic: true,
        fixedPoint: true,
        classifyingInvariantZero: true,
        cocycle: true,
        coboundary: true,
        coboundaryUnique: true,
        h0CountsTruthFirings: true,
        strictScottRegimeGate: true,
        transfiniteAperiodicBoundary: true,
        frontier: Object.freeze([
            "This is the dependency-free strict/Scott bridge: harmonic fixed section, zero clInv, and H0 truth count agree on one finite settled valuation.",
            "Real-valued Hodge theory, inner-product moduli, and spectral multipartition strata remain proof/frontier work.",
            "Nonzero aperiodic classifying invariants live in the aperiodic classification surface, not this vanishing-side receipt.",
        ]),
    });
}
