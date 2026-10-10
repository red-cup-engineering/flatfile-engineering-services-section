import { readingAs } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_BOTTOM, TRUTH_TOP } from "../../../../../reading-points.mjs";
/**
 * analysis/settling-associated-sheaf - finite executable shadow of
 * RelMath.Cohomology.SettlingAssociatedSheaf.
 *
 * Lean proves the settling-associated sheaf masks, restriction laws, and the
 * designated short exact sequence. This module exposes the finite mask/cochain
 * operations over charge-valued cells, plus bounded sample receipts for the
 * all-integer proof obligations.
 */
const canonicalCells = (valuation) => Object.freeze(valuation.map((entry) => entry.cell));
const unique = (cells) => {
    const out = [];
    for (const cell of cells)
        if (!out.includes(cell))
            out.push(cell);
    return Object.freeze(out);
};
const assertSafeInteger = (value) => {
    if (!Number.isSafeInteger(value)) {
        throw new TypeError(`cochain coefficient must be a safe integer: ${value}`);
    }
    return value;
};
export function readingCell(cell, reading) {
    if (cell.length === 0)
        throw new TypeError("readingCell: cell id must be nonempty");
    return Object.freeze({
        kind: "settlingAssociatedSheaf.readingCell",
        cell,
        reading: readingAs("knowledge", reading),
    });
}
export function mask(name, cells) {
    return Object.freeze({
        kind: "settlingAssociatedSheaf.mask",
        name,
        cells: unique(cells),
    });
}
export function cochain(coefficients) {
    const merged = new Map();
    for (const entry of coefficients) {
        if (entry.cell.length === 0)
            throw new TypeError("cochain: cell id must be nonempty");
        merged.set(entry.cell, (merged.get(entry.cell) ?? 0) + assertSafeInteger(entry.coefficient));
    }
    return Object.freeze({
        kind: "settlingAssociatedSheaf.cochain",
        coefficients: Object.freeze([...merged.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([cell, coefficient]) => Object.freeze({ cell, coefficient: assertSafeInteger(coefficient) }))),
    });
}
const coefficientAt = (value, cell) => value.coefficients.find((entry) => entry.cell === cell)?.coefficient ?? 0;
const sameCochain = (cells, left, right) => cells.every((cell) => coefficientAt(left, cell) === coefficientAt(right, cell));
const subset = (left, right) => left.cells.every((cell) => right.cells.includes(cell));
const sameMask = (left, right) => subset(left, right) && subset(right, left);
const meetMask = (left, right) => mask("custom", left.cells.filter((cell) => right.cells.includes(cell)));
export function dT(valuation) {
    return mask("dT", valuation.filter((entry) => entry.reading === TRUTH_TOP).map((entry) => entry.cell));
}
export function dTop(valuation) {
    return mask("dTop", valuation.filter((entry) => entry.reading === KNOWLEDGE_TOP).map((entry) => entry.cell));
}
export function dK(valuation) {
    return mask("dK", valuation
        .filter((entry) => entry.reading === TRUTH_TOP || entry.reading === KNOWLEDGE_TOP)
        .map((entry) => entry.cell));
}
export function restrict(support, value) {
    return cochain(value.coefficients.map((entry) => Object.freeze({
        cell: entry.cell,
        coefficient: support.cells.includes(entry.cell) ? entry.coefficient : 0,
    })));
}
export const iota = (valuation, value) => restrict(dT(valuation), value);
export const pi = (valuation, value) => restrict(dTop(valuation), value);
export const projT = iota;
export const projTop = pi;
export function combine(left, right) {
    return cochain([
        ...left.coefficients,
        ...right.coefficients,
    ]);
}
export function vanishesOff(support, value, cells) {
    return cells.every((cell) => support.cells.includes(cell) || coefficientAt(value, cell) === 0);
}
export function vanishesOnTop(valuation, value) {
    const top = dTop(valuation);
    return top.cells.every((cell) => coefficientAt(value, cell) === 0);
}
export function maskSplitReceipt(valuationInput = defaultValuation) {
    const valuation = Object.freeze([...valuationInput]);
    const truth = dT(valuation);
    const topOnly = dTop(valuation);
    const belnap = dK(valuation);
    const dTDisjointDTop = truth.cells.every((cell) => !topOnly.cells.includes(cell));
    const union = mask("custom", [...truth.cells, ...topOnly.cells]);
    const dKEqualsUnion = sameMask(belnap, union);
    const dTIncludedInDK = subset(truth, belnap);
    const dTopIncludedInDK = subset(topOnly, belnap);
    if (!dTDisjointDTop || !dKEqualsUnion || !dTIncludedInDK || !dTopIncludedInDK) {
        throw new TypeError("maskSplitReceipt: dT/dK/dTop split laws failed");
    }
    return Object.freeze({
        kind: "settlingAssociatedSheaf.maskSplit:witness",
        valuation,
        dT: truth,
        dTop: topOnly,
        dK: belnap,
        dTDisjointDTop: true,
        dKEqualsUnion: true,
        dTIncludedInDK: true,
        dTopIncludedInDK: true,
    });
}
export function restrictionReceipt(valuationInput = defaultValuation, value = defaultCochain) {
    const cells = canonicalCells(valuationInput);
    const fullMask = mask("custom", cells);
    const subMask = dT(valuationInput);
    const restricted = restrict(subMask, value);
    const fullRestrictionIdentity = sameCochain(cells, restrict(fullMask, value), value);
    const restrictedVanishesOffMask = vanishesOff(subMask, restricted, cells);
    const m1 = dK(valuationInput);
    const m2 = dTop(valuationInput);
    const restrictionComposesByMeet = sameCochain(cells, restrict(m2, restrict(m1, value)), restrict(meetMask(m2, m1), value));
    if (!fullRestrictionIdentity || !restrictedVanishesOffMask || !restrictionComposesByMeet) {
        throw new TypeError("restrictionReceipt: masked cochain restriction laws failed");
    }
    return Object.freeze({
        kind: "settlingAssociatedSheaf.restriction:witness",
        cochain: value,
        fullMask,
        subMask,
        restricted,
        fullRestrictionIdentity: true,
        restrictedVanishesOffMask: true,
        restrictionComposesByMeet: true,
    });
}
const sampleCochains = (cells) => {
    const values = [-1, 0, 1];
    let samples = Object.freeze([cochain([])]);
    for (const cell of cells) {
        samples = Object.freeze(samples.flatMap((existing) => values.map((coefficient) => cochain([...existing.coefficients, { cell, coefficient }]))));
    }
    return samples;
};
export function shortExactSequenceReceipt(valuationInput = defaultValuation, value = defaultCochain) {
    const cells = canonicalCells(valuationInput);
    const belnap = dK(valuationInput);
    const topOnly = dTop(valuationInput);
    const truthPart = projT(valuationInput, value);
    const topPart = projTop(valuationInput, value);
    const reconstructed = combine(truthPart, topPart);
    const included = iota(valuationInput, value);
    const projected = pi(valuationInput, value);
    const samples = sampleCochains(cells);
    const supportedSamples = samples.filter((sample) => vanishesOff(belnap, sample, cells));
    const iotaImageVanishesOnTop = supportedSamples.every((sample) => vanishesOnTop(valuationInput, iota(valuationInput, sample)));
    const piSurjectiveOnTopPart = samples
        .filter((sample) => vanishesOff(topOnly, sample, cells))
        .every((sample) => sameCochain(cells, pi(valuationInput, sample), sample));
    const kernelPiIffVanishesOnTopOnSample = supportedSamples.every((sample) => sameCochain(cells, pi(valuationInput, sample), cochain([])) === vanishesOnTop(valuationInput, sample));
    const splitReconstructs = supportedSamples.every((sample) => sameCochain(cells, combine(projT(valuationInput, sample), projTop(valuationInput, sample)), sample));
    const splitUniqueOnSample = supportedSamples.every((left) => supportedSamples.every((right) => {
        const sameParts = sameCochain(cells, projT(valuationInput, left), projT(valuationInput, right))
            && sameCochain(cells, projTop(valuationInput, left), projTop(valuationInput, right));
        return !sameParts || sameCochain(cells, left, right);
    }));
    if (!iotaImageVanishesOnTop || !piSurjectiveOnTopPart || !kernelPiIffVanishesOnTopOnSample || !splitReconstructs || !splitUniqueOnSample) {
        throw new TypeError("shortExactSequenceReceipt: designated SES sample laws failed");
    }
    return Object.freeze({
        kind: "settlingAssociatedSheaf.shortExactSequence:witness",
        cochain: value,
        iota: included,
        pi: projected,
        truthPart,
        topPart,
        reconstructed,
        iotaImageVanishesOnTop: true,
        piSurjectiveOnTopPart: true,
        kernelPiIffVanishesOnTopOnSample: true,
        splitReconstructs: true,
        splitUniqueOnSample: true,
        sampleSize: supportedSamples.length,
    });
}
export const defaultValuation = Object.freeze([
    readingCell("truth-cell", TRUTH_TOP),
    readingCell("both-cell", KNOWLEDGE_TOP),
    readingCell("false-cell", TRUTH_BOTTOM),
    readingCell("empty-cell", KNOWLEDGE_BOTTOM),
]);
export const defaultCochain = cochain([
    { cell: "truth-cell", coefficient: 2 },
    { cell: "both-cell", coefficient: 5 },
    { cell: "false-cell", coefficient: 0 },
    { cell: "empty-cell", coefficient: 0 },
]);
export function receipt() {
    return Object.freeze({
        kind: "settlingAssociatedSheaf.receipt:witness",
        masks: maskSplitReceipt(defaultValuation),
        restriction: restrictionReceipt(defaultValuation, defaultCochain),
        ses: shortExactSequenceReceipt(defaultValuation, defaultCochain),
        supportReading: Object.freeze({
            [KNOWLEDGE_BOTTOM]: Object.freeze({ dT: false, dK: false, dTop: false }),
            [TRUTH_TOP]: Object.freeze({ dT: true, dK: true, dTop: false }),
            [TRUTH_BOTTOM]: Object.freeze({ dT: false, dK: false, dTop: false }),
            [KNOWLEDGE_TOP]: Object.freeze({ dT: false, dK: true, dTop: true }),
        }),
        openFrontier: Object.freeze([
            "Lean proves the restriction and SES laws for arbitrary integer cochains; SEN carries finite executable samples and operations.",
            "Sheaf gluing and H1=0 are reused from existing finite cohomology/sheaf surfaces, not reconstructed as arbitrary cover proof objects.",
            "General bitopological site semantics and non-finite clopen covers remain proof/kernel obligations.",
        ]),
    });
}
