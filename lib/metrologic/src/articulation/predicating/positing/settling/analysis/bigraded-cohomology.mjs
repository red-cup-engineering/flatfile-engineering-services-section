/**
 * analysis/bigraded-cohomology - finite executable shadow of
 * RelMath.Positing.BigradedCohomology.
 *
 * Lean states the aperiodic-regime trichotomy and the internal Z/2 gauge over a
 * finite cell list and valuation. This runtime surface takes the finite list of
 * FOUR reading names that results from such a valuation and returns the
 * truth/inconsistency content, regime, and gauge facts as a carrier receipt.
 */
import { combine, cochain, dK, dT, dTop, defaultCochain, defaultValuation, projT, projTop, vanishesOff, } from "./settling-associated-sheaf.mjs";
import { readingAs, negateReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_BOTTOM, TRUTH_TOP } from "../../../../../reading-points.mjs";
const freezeReadingNames = (readings) => Object.freeze([...readings]);
export const normalizeReadingNames = (readings) => freezeReadingNames(readings.map(asReadingValueName));
export const isTruthFiring = (reading) => reading === TRUTH_TOP;
export const isFalseFiring = (reading) => reading === TRUTH_BOTTOM;
export const isInconsistency = (reading) => reading === KNOWLEDGE_TOP;
export const truthContent = (readings) => readings.some(isTruthFiring);
export const falseContent = (readings) => readings.some(isFalseFiring);
export const inconsistencyContent = (readings) => readings.some(isInconsistency);
export function regimeOf(truth, inconsistency) {
    if (truth && inconsistency)
        return "mixed";
    if (truth)
        return "consistent";
    if (inconsistency)
        return "paraconsistent";
    return "trivial";
}
export const negateNames = (readings) => freezeReadingNames(readings.map((name) => negateReading(name)));
const paraconsistentOnly = (readings) => readings.every((name) => name === KNOWLEDGE_BOTTOM || name === KNOWLEDGE_TOP);
/** Finite bigraded-cohomology and gauge receipt over a list of FOUR reading names. */
export function receipt(readingsInput) {
    const readings = normalizeReadingNames(readingsInput);
    const negated = negateNames(readings);
    const truth = truthContent(readings);
    const falsity = falseContent(readings);
    const inconsistency = inconsistencyContent(readings);
    const negatedTruth = truthContent(negated);
    const negatedInconsistency = inconsistencyContent(negated);
    const paraconsistentGaugeStable = paraconsistentOnly(readings)
        ? negated.every((name, index) => name === readings[index])
        : false;
    const classicalGaugeMoved = readings.some((name, index) => isTruthFiring(name) && negated[index] !== name);
    if (negatedInconsistency !== inconsistency) {
        throw new Error("bigradedCohomology: negation failed to preserve inconsistency content");
    }
    if (negatedTruth !== falsity) {
        throw new Error("bigradedCohomology: negation failed to flip truth content to false content");
    }
    return Object.freeze({
        kind: "bigradedCohomology.receipt:witness",
        readings,
        negated,
        truthContent: truth,
        falseContent: falsity,
        inconsistencyContent: inconsistency,
        regime: regimeOf(truth, inconsistency),
        nontrivialTrichotomy: true,
        truthInconsistencyDisjoint: true,
        gaugeFixesInconsistency: true,
        gaugeFlipsTruthToFalse: true,
        paraconsistentGaugeStable,
        classicalGaugeMoved,
    });
}
const coefficientAt = (value, cell) => value.coefficients.find((entry) => entry.cell === cell)?.coefficient ?? 0;
const sameCochain = (cells, left, right) => cells.every((cell) => coefficientAt(left, cell) === coefficientAt(right, cell));
const canonicalCells = (valuation) => Object.freeze(valuation.map((entry) => entry.cell));
const sampleKnowledgeSections = (valuation) => {
    const knowledgeCells = dK(valuation).cells;
    const values = [-1, 0, 1];
    let samples = Object.freeze([cochain([])]);
    for (const cell of knowledgeCells) {
        samples = Object.freeze(samples.flatMap((existing) => values.map((coefficient) => cochain([...existing.coefficients, { cell, coefficient }]))));
    }
    return samples;
};
/**
 * Finite degree-0 carrier for `RelMath.Cohomology.BigradedTruthKnowledgeLES`.
 *
 * Knowledge-supported sections split into truth-supported and top-supported
 * sections, and those two parts merge back uniquely over the sampled finite
 * cochain carrier. The full long exact sequence is recorded only at the
 * degenerate degree-0/H1-vanishing boundary.
 */
export function truthKnowledgeSectionDecompositionReceipt(valuationInput = defaultValuation, knowledgeSectionInput = defaultCochain) {
    const valuation = Object.freeze([...valuationInput]);
    const cells = canonicalCells(valuation);
    const knowledgeMask = dK(valuation);
    const truthMask = dT(valuation);
    const topMask = dTop(valuation);
    const knowledgeSection = knowledgeSectionInput;
    const truthSection = projT(valuation, knowledgeSection);
    const topSection = projTop(valuation, knowledgeSection);
    const merged = combine(truthSection, topSection);
    const samples = sampleKnowledgeSections(valuation);
    const knowledgeSupported = vanishesOff(knowledgeMask, knowledgeSection, cells);
    const truthSupported = vanishesOff(truthMask, truthSection, cells);
    const topSupported = vanishesOff(topMask, topSection, cells);
    const mergeSplitIdentity = sameCochain(cells, merged, knowledgeSection);
    const splitMergeIdentityOnSamples = samples.every((sample) => {
        const truthPart = projT(valuation, sample);
        const topPart = projTop(valuation, sample);
        const recombined = combine(truthPart, topPart);
        return sameCochain(cells, recombined, sample)
            && sameCochain(cells, projT(valuation, recombined), truthPart)
            && sameCochain(cells, projTop(valuation, recombined), topPart);
    });
    if (!knowledgeSupported || !truthSupported || !topSupported || !mergeSplitIdentity || !splitMergeIdentityOnSamples) {
        throw new TypeError("truthKnowledgeSectionDecompositionReceipt: finite truth/knowledge direct-sum laws failed");
    }
    return Object.freeze({
        kind: "bigradedCohomology.truthKnowledgeSectionDecomposition:witness",
        valuation,
        knowledgeSection,
        truthSection,
        topSection,
        merged,
        knowledgeSupported: true,
        truthSupported: true,
        topSupported: true,
        mergeSplitIdentity: true,
        splitMergeIdentityOnSamples: true,
        h1Vanishes: true,
        hnAboveOneZero: true,
        degenerateLes: true,
        sampleSize: samples.length,
        frontier: "full graded LES over arbitrary cochain complexes remains proof-side",
    });
}
export const workedMixedReadings = Object.freeze([
    TRUTH_TOP,
    KNOWLEDGE_TOP,
    KNOWLEDGE_BOTTOM,
]);
export const workedParaconsistentReadings = Object.freeze([
    KNOWLEDGE_TOP,
    KNOWLEDGE_BOTTOM,
]);
export function localMldClassificationReceipt() {
    const gaugeOrbits = Object.freeze([
        Object.freeze([KNOWLEDGE_BOTTOM]),
        Object.freeze([TRUTH_TOP, TRUTH_BOTTOM]),
        Object.freeze([KNOWLEDGE_TOP]),
    ]);
    return Object.freeze({
        kind: "bigradedCohomology.localMldClassification.receipt:witness",
        sourceModule: "RelMath.Positing.LocalMldClassification",
        theorems: Object.freeze([
            "negate_involutive",
            "gaugeEquiv_refl",
            "gaugeEquiv_symm",
            "gaugeEquiv_trans",
            "local_mld_classification",
            "bilattice_base_mld",
        ]),
        gaugeOrbits,
        localClInvFibers: gaugeOrbits,
        converseIncluded: true,
    });
}
