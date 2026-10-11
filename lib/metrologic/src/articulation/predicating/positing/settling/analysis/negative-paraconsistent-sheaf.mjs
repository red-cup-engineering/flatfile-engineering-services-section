/**
 * analysis/negative-paraconsistent-sheaf - finite executable shadow of
 * RelMath.Cohomology.NegativeParaconsistentSheaf.
 *
 * Lean proves that the negative paraconsistent sheaf is the bilattice-negation
 * mirror of the positive settling-associated sheaf. This module exposes the
 * finite mask/cochain content: dNeg = dF, dFonly, negation mirror laws, the
 * shared top seam, and the negative split into f-only plus top parts.
 */
import { readingCell, cochain, combine, dK, dT, dTop, defaultCochain, defaultValuation, mask, restrict, vanishesOff, } from "./settling-associated-sheaf.mjs";
import { dF as dFrameFalseMask } from "./d-frame.mjs";
import { readingAs, negateReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_BOTTOM, TRUTH_TOP } from "../../../../../reading-points.mjs";
const sorted = (cells) => Object.freeze([...new Set(cells)].sort((left, right) => left.localeCompare(right)));
const asCustomMask = (cells) => mask("custom", sorted(cells));
const subset = (left, right) => left.cells.every((cell) => right.cells.includes(cell));
const sameMask = (left, right) => subset(left, right) && subset(right, left);
const meetMask = (left, right) => asCustomMask(left.cells.filter((cell) => right.cells.includes(cell)));
const unionMask = (left, right) => asCustomMask([...left.cells, ...right.cells]);
const coefficientAt = (value, cell) => value.coefficients.find((entry) => entry.cell === cell)?.coefficient ?? 0;
const sameCochain = (cells, left, right) => cells.every((cell) => coefficientAt(left, cell) === coefficientAt(right, cell));
const zeroCochain = cochain([]);
const cellsOf = (valuation) => Object.freeze(valuation.map((entry) => entry.cell));
const normalizeValueName = (reading) => readingAs("knowledge", reading);
export function negateValuation(valuation) {
    return Object.freeze(valuation.map((entry) => readingCell(entry.cell, negateReading(normalizeValueName(entry.reading)))));
}
/** Negative-designated mask: dNeg = DFrame.dF = {f, top}. */
export function dNeg(valuation) {
    return asCustomMask(dFrameFalseMask(valuation).elements);
}
/** F-only mask: cells whose settled reading is f. */
export function dFonly(valuation) {
    return asCustomMask(valuation
        .filter((entry) => entry.reading === TRUTH_BOTTOM)
        .map((entry) => entry.cell));
}
export const restrictNeg = (valuation, value) => restrict(dNeg(valuation), value);
export const projF = (valuation, value) => restrict(dFonly(valuation), value);
export const projTopNeg = (valuation, value) => restrict(dTop(valuation), value);
export const isSection = (valuation, value) => vanishesOff(dNeg(valuation), value, cellsOf(valuation));
const sampleCochains = (cells) => {
    const values = [-1, 0, 1];
    let samples = Object.freeze([cochain([])]);
    for (const cell of cells) {
        samples = Object.freeze(samples.flatMap((existing) => values.map((coefficient) => cochain([...existing.coefficients, { cell, coefficient }]))));
    }
    return samples;
};
export function negationMirrorReceipt(valuationInput = defaultValuation) {
    const valuation = Object.freeze([...valuationInput]);
    const negatedValuation = negateValuation(valuation);
    const negativeMask = dNeg(valuation);
    const positiveMaskOfNegated = dK(negatedValuation);
    const falseOnly = dFonly(valuation);
    const truthOnlyOfNegated = dT(negatedValuation);
    const top = dTop(valuation);
    const topOfNegated = dTop(negatedValuation);
    const roundTrip = negateValuation(negatedValuation);
    const dNegEqualsDkOfNegation = sameMask(negativeMask, positiveMaskOfNegated);
    const dFonlyEqualsDtOfNegation = sameMask(falseOnly, truthOnlyOfNegated);
    const topSeamFixed = sameMask(top, topOfNegated);
    const negationInvolutive = valuation.every((entry) => roundTrip.some((candidate) => candidate.cell === entry.cell && candidate.reading === entry.reading));
    if (!dNegEqualsDkOfNegation || !dFonlyEqualsDtOfNegation || !topSeamFixed || !negationInvolutive) {
        throw new TypeError("negationMirrorReceipt: negative sheaf mirror laws failed");
    }
    return Object.freeze({
        kind: "negativeParaconsistentSheaf.negationMirror:witness",
        valuation,
        negatedValuation,
        dNeg: negativeMask,
        dKOfNegated: positiveMaskOfNegated,
        dFonly: falseOnly,
        dTOfNegated: truthOnlyOfNegated,
        dTop: top,
        dTopOfNegated: topOfNegated,
        dNegEqualsDkOfNegation: true,
        dFonlyEqualsDtOfNegation: true,
        topSeamFixed: true,
        negationInvolutive: true,
        readingMirrorTable: Object.freeze({
            [KNOWLEDGE_BOTTOM]: negateReading(KNOWLEDGE_BOTTOM),
            [TRUTH_TOP]: negateReading(TRUTH_TOP),
            [TRUTH_BOTTOM]: negateReading(TRUTH_BOTTOM),
            [KNOWLEDGE_TOP]: negateReading(KNOWLEDGE_TOP),
        }),
    });
}
export function negativeSplitReceipt(valuationInput = defaultValuation, value = cochain([
    { cell: "truth-cell", coefficient: 0 },
    { cell: "both-cell", coefficient: 5 },
    { cell: "false-cell", coefficient: -2 },
    { cell: "empty-cell", coefficient: 0 },
])) {
    const valuation = Object.freeze([...valuationInput]);
    const cells = cellsOf(valuation);
    const negativeMask = dNeg(valuation);
    const falseOnly = dFonly(valuation);
    const top = dTop(valuation);
    const positiveMask = dK(valuation);
    const fPart = projF(valuation, value);
    const topPart = projTopNeg(valuation, value);
    const reconstructed = combine(fPart, topPart);
    const samples = sampleCochains(cells);
    const supportedSamples = samples.filter((sample) => vanishesOff(negativeMask, sample, cells));
    const dFonlyDisjointDTop = falseOnly.cells.every((cell) => !top.cells.includes(cell));
    const dNegEqualsUnion = sameMask(negativeMask, unionMask(falseOnly, top));
    const dFonlyIncludedInDNeg = subset(falseOnly, negativeMask);
    const dTopIncludedInDNeg = subset(top, negativeMask);
    const dTopIncludedInDK = subset(top, positiveMask);
    const splitReconstructs = supportedSamples.every((sample) => sameCochain(cells, combine(projF(valuation, sample), projTopNeg(valuation, sample)), sample));
    const splitUniqueOnSample = supportedSamples.every((left) => supportedSamples.every((right) => {
        const sameParts = sameCochain(cells, projF(valuation, left), projF(valuation, right))
            && sameCochain(cells, projTopNeg(valuation, left), projTopNeg(valuation, right));
        return !sameParts || sameCochain(cells, left, right);
    }));
    if (!dFonlyDisjointDTop || !dNegEqualsUnion || !dFonlyIncludedInDNeg || !dTopIncludedInDNeg
        || !dTopIncludedInDK || !splitReconstructs || !splitUniqueOnSample) {
        throw new TypeError("negativeSplitReceipt: negative split laws failed");
    }
    return Object.freeze({
        kind: "negativeParaconsistentSheaf.split:witness",
        valuation,
        dNeg: negativeMask,
        dFonly: falseOnly,
        dTop: top,
        cochain: value,
        fPart,
        topPart,
        reconstructed,
        dFonlyDisjointDTop: true,
        dNegEqualsUnion: true,
        dFonlyIncludedInDNeg: true,
        dTopIncludedInDNeg: true,
        dTopIncludedInDK: true,
        splitReconstructs: true,
        splitUniqueOnSample: true,
        sampleSize: supportedSamples.length,
    });
}
export function negativeRestrictionReceipt(valuationInput = defaultValuation, value = defaultCochain) {
    const valuation = Object.freeze([...valuationInput]);
    const cells = cellsOf(valuation);
    const negativeMask = dNeg(valuation);
    const restricted = restrictNeg(valuation, value);
    const fullMask = asCustomMask(cells);
    const fullRestrictionIdentity = sameCochain(cells, restrict(fullMask, value), value);
    const restrictedVanishesOffDNeg = vanishesOff(negativeMask, restricted, cells);
    const restrictionComposesByMeet = sameCochain(cells, restrict(dTop(valuation), restrict(negativeMask, value)), restrict(meetMask(dTop(valuation), negativeMask), value));
    if (!restrictedVanishesOffDNeg || !fullRestrictionIdentity || !restrictionComposesByMeet) {
        throw new TypeError("negativeRestrictionReceipt: negative restriction laws failed");
    }
    return Object.freeze({
        kind: "negativeParaconsistentSheaf.restriction:witness",
        valuation,
        cochain: value,
        dNeg: negativeMask,
        restricted,
        restrictedVanishesOffDNeg: true,
        fullRestrictionIdentity: true,
        restrictionComposesByMeet: true,
    });
}
export function receipt() {
    const valuation = defaultValuation;
    return Object.freeze({
        kind: "negativeParaconsistentSheaf.receipt:witness",
        mirror: negationMirrorReceipt(valuation),
        split: negativeSplitReceipt(valuation),
        restriction: negativeRestrictionReceipt(valuation),
        supportReading: Object.freeze({
            [KNOWLEDGE_BOTTOM]: Object.freeze({ dNeg: false, dFonly: false, dTop: false }),
            [TRUTH_TOP]: Object.freeze({ dNeg: false, dFonly: false, dTop: false }),
            [TRUTH_BOTTOM]: Object.freeze({ dNeg: true, dFonly: true, dTop: false }),
            [KNOWLEDGE_TOP]: Object.freeze({ dNeg: true, dFonly: false, dTop: true }),
        }),
        openFrontier: Object.freeze([
            "The runtime receipt models finite negative masks and bounded cochain sample laws; Lean proves the mask equalities and split generally.",
            "Negation mirror parity is charge-name and finite-cell parity, not arbitrary sheaf equivalence over every cover.",
            "General Cech gluing, CALM equivalence, and non-finite paraconsistent sheaf cohomology remain proof/kernel obligations.",
        ]),
    });
}
export { zeroCochain };
