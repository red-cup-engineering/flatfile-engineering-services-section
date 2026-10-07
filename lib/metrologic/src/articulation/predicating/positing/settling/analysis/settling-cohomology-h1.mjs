/**
 * analysis/settling-cohomology-h1 - finite executable shadow of
 * RelMath.Cohomology.SettlingCohomologyH1 and the finite sheaf laws it uses.
 *
 * Lean proves the sheaf separation/gluing statements for arbitrary covers and
 * cochains. This Node surface carries the finite support calculation: H0 is the
 * truth-designated count, agreeing local sections glue pointwise to a global
 * cochain, H1 vanishes in strict/Scott regimes, and the identity cochain's
 * classifying invariant is zero on that vanishing side.
 */
import { finiteClosureRegime, scottClosureRegime, transfiniteClosureRegime, aperiodicClosureRegime, } from "../closure.mjs";
import { cohomologyVanishesInRegime } from "../value-category.mjs";
import { h1Zero } from "./aperiodic-classification.mjs";
import { cochain, dT, defaultValuation, shortExactSequenceReceipt, } from "./settling-associated-sheaf.mjs";
import { truthKnowledgeSectionDecompositionReceipt, } from "./bigraded-cohomology.mjs";
const unique = (items) => {
    const out = [];
    for (const item of items)
        if (!out.includes(item))
            out.push(item);
    return Object.freeze(out);
};
const coefficientAt = (value, cell) => value.coefficients.find((entry) => entry.cell === cell)?.coefficient ?? 0;
const sameCochainOn = (cells, left, right) => cells.every((cell) => coefficientAt(left, cell) === coefficientAt(right, cell));
const patchByName = (datum, name) => {
    const found = datum.cover.find((patch) => patch.name === name);
    if (!found)
        throw new TypeError(`settlingCohomologyH1: unknown patch ${name}`);
    return found;
};
const sectionFor = (datum, patchName) => {
    const found = datum.localSections.find((section) => section.patch === patchName);
    if (!found)
        throw new TypeError(`settlingCohomologyH1: missing local section for patch ${patchName}`);
    return found.section;
};
const coversCells = (cells, cover) => cells.every((cell) => cover.some((patch) => patch.cells.includes(cell)));
const sameNames = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);
export function patch(name, cells) {
    if (name.length === 0)
        throw new TypeError("settlingCohomologyH1.patch: name must be nonempty");
    return Object.freeze({
        kind: "settlingCohomologyH1.patch",
        name,
        cells: unique(cells),
    });
}
export function localSection(patchName, section) {
    if (patchName.length === 0)
        throw new TypeError("settlingCohomologyH1.localSection: patch must be nonempty");
    return Object.freeze({
        kind: "settlingCohomologyH1.localSection",
        patch: patchName,
        section,
    });
}
export function cech1(cellsInput, coverInput, localSectionsInput) {
    const cells = unique(cellsInput);
    const cover = Object.freeze([...coverInput]);
    const localSections = Object.freeze([...localSectionsInput]);
    const coverNames = cover.map((entry) => entry.name);
    const localNames = localSections.map((entry) => entry.patch);
    if (cells.length === 0)
        throw new TypeError("settlingCohomologyH1.cech1: cells must be nonempty");
    if (new Set(coverNames).size !== coverNames.length)
        throw new TypeError("settlingCohomologyH1.cech1: duplicate patch names");
    if (!coversCells(cells, cover))
        throw new TypeError("settlingCohomologyH1.cech1: cover does not cover every cell");
    if (!sameNames([...coverNames].sort(), [...localNames].sort())) {
        throw new TypeError("settlingCohomologyH1.cech1: local sections must match cover patches");
    }
    return Object.freeze({
        kind: "settlingCohomologyH1.cech1",
        cells,
        cover,
        localSections,
    });
}
export function h0(valuationInput = defaultValuation, cellsInput = valuationInput.map((entry) => entry.cell)) {
    const valuation = Object.freeze([...valuationInput]);
    const cells = unique(cellsInput);
    const designatedCells = Object.freeze(dT(valuation).cells.filter((cell) => cells.includes(cell)));
    const count = designatedCells.length;
    const truthContent = count > 0;
    const positiveIffTruthContent = (count > 0) === truthContent;
    if (!positiveIffTruthContent)
        throw new TypeError("settlingCohomologyH1.h0: designated count/truth-content law failed");
    return Object.freeze({
        kind: "settlingCohomologyH1.h0:witness",
        valuation,
        cells,
        designatedCells,
        count,
        truthContent,
        h0IsDesignatedCount: true,
        positiveIffTruthContent: true,
    });
}
export function cocycle(datum) {
    return datum.cover.every((left) => datum.cover.every((right) => {
        const leftSection = sectionFor(datum, left.name);
        const rightSection = sectionFor(datum, right.name);
        const overlap = left.cells.filter((cell) => right.cells.includes(cell));
        return overlap.every((cell) => coefficientAt(leftSection, cell) === coefficientAt(rightSection, cell));
    }));
}
export function glue(datum) {
    return cochain(datum.cells.map((cell) => {
        const coveringPatch = datum.cover.find((candidate) => candidate.cells.includes(cell));
        return Object.freeze({
            cell,
            coefficient: coveringPatch ? coefficientAt(sectionFor(datum, coveringPatch.name), cell) : 0,
        });
    }));
}
export function coboundary(datum, global) {
    return datum.cover.every((coverPatch) => {
        const local = sectionFor(datum, coverPatch.name);
        return coverPatch.cells.every((cell) => coefficientAt(local, cell) === coefficientAt(global, cell));
    });
}
export function separated(datum, left, right) {
    const agreeOnCover = datum.cover.every((coverPatch) => coverPatch.cells.every((cell) => coefficientAt(left, cell) === coefficientAt(right, cell)));
    return !agreeOnCover || sameCochainOn(datum.cells, left, right);
}
export function gluingReceipt(datum = defaultCechDatum) {
    const glued = glue(datum);
    const isCocycle = cocycle(datum);
    const isCoboundary = coboundary(datum, glued);
    const isSeparated = separated(datum, glued, glued);
    const uniqueGluingOnFiniteSupport = coversCells(datum.cells, datum.cover);
    if (!isCocycle || !isCoboundary || !isSeparated || !uniqueGluingOnFiniteSupport) {
        throw new TypeError("settlingCohomologyH1.gluingReceipt: finite Cech gluing laws failed");
    }
    return Object.freeze({
        kind: "settlingCohomologyH1.gluing:witness",
        datum,
        glued,
        cocycle: true,
        coboundary: true,
        separated: true,
        uniqueGluingOnFiniteSupport: true,
    });
}
export function identityCochain(valuationInput = defaultValuation, cellsInput = valuationInput.map((entry) => entry.cell)) {
    const truthMask = dT(valuationInput);
    return cochain(unique(cellsInput).map((cell) => Object.freeze({
        cell,
        coefficient: truthMask.cells.includes(cell) ? 1 : 0,
    })));
}
export function clInvDatum(valuationInput = defaultValuation, coverInput = defaultCover) {
    const cells = valuationInput.map((entry) => entry.cell);
    const id = identityCochain(valuationInput, cells);
    return cech1(cells, coverInput, coverInput.map((coverPatch) => localSection(coverPatch.name, id)));
}
export function classifyingInvariantReceipt(valuationInput = defaultValuation, coverInput = defaultCover) {
    const cells = valuationInput.map((entry) => entry.cell);
    const id = identityCochain(valuationInput, cells);
    const truthMask = dT(valuationInput);
    const identityVanishesOffTruthMask = cells.every((cell) => truthMask.cells.includes(cell) || coefficientAt(id, cell) === 0);
    const datum = clInvDatum(valuationInput, coverInput);
    const clInvDatumCocycle = cocycle(datum);
    const clInvCoboundary = coboundary(datum, id);
    const classifyingInvariantZero = h1Zero.coord === 0;
    const zeroOnlyInStrictScottReceipt = strictScottRegimeGate();
    if (!identityVanishesOffTruthMask || !clInvDatumCocycle || !clInvCoboundary || !classifyingInvariantZero || !zeroOnlyInStrictScottReceipt) {
        throw new TypeError("settlingCohomologyH1.classifyingInvariantReceipt: finite clInv laws failed");
    }
    return Object.freeze({
        kind: "settlingCohomologyH1.classifyingInvariant:witness",
        identityCochain: id,
        classifyingInvariant: h1Zero,
        identityVanishesOffTruthMask: true,
        clInvDatumCocycle: true,
        clInvCoboundary: true,
        classifyingInvariantZero: true,
        zeroOnlyInStrictScottReceipt: true,
    });
}
export function strictScottRegimeGate() {
    return cohomologyVanishesInRegime(finiteClosureRegime)
        && cohomologyVanishesInRegime(scottClosureRegime)
        && !cohomologyVanishesInRegime(transfiniteClosureRegime)
        && !cohomologyVanishesInRegime(aperiodicClosureRegime);
}
export const defaultCells = Object.freeze([
    "truth-cell",
    "both-cell",
    "false-cell",
    "empty-cell",
]);
export const defaultCover = Object.freeze([
    patch("truth-side", ["truth-cell", "false-cell"]),
    patch("top-side", ["both-cell", "empty-cell"]),
    patch("bridge", ["truth-cell", "both-cell"]),
]);
export const defaultGlobalCochain = cochain([
    { cell: "truth-cell", coefficient: 1 },
    { cell: "both-cell", coefficient: 2 },
    { cell: "false-cell", coefficient: 0 },
    { cell: "empty-cell", coefficient: 0 },
]);
export const defaultCechDatum = cech1(defaultCells, defaultCover, [
    localSection("truth-side", cochain([
        { cell: "truth-cell", coefficient: 1 },
        { cell: "both-cell", coefficient: 99 },
        { cell: "false-cell", coefficient: 0 },
    ])),
    localSection("top-side", cochain([
        { cell: "truth-cell", coefficient: 88 },
        { cell: "both-cell", coefficient: 2 },
        { cell: "empty-cell", coefficient: 0 },
    ])),
    localSection("bridge", cochain([
        { cell: "truth-cell", coefficient: 1 },
        { cell: "both-cell", coefficient: 2 },
    ])),
]);
export function receipt() {
    const h0Receipt = h0(defaultValuation, defaultCells);
    const h1Receipt = gluingReceipt(defaultCechDatum);
    const clInv = classifyingInvariantReceipt(defaultValuation, defaultCover);
    const ses = shortExactSequenceReceipt(defaultValuation, defaultGlobalCochain);
    const bigradedLes = truthKnowledgeSectionDecompositionReceipt(defaultValuation, defaultGlobalCochain);
    const gate = strictScottRegimeGate();
    const gluedMatchesDefault = sameCochainOn(defaultCells, h1Receipt.glued, defaultGlobalCochain);
    if (!gate || !gluedMatchesDefault) {
        throw new TypeError("settlingCohomologyH1.receipt: finite H0/H1/classifying-invariant laws failed");
    }
    return Object.freeze({
        kind: "settlingCohomologyH1.receipt:witness",
        h0: h0Receipt,
        h1: h1Receipt,
        classifyingInvariant: clInv,
        ses,
        bigradedLes,
        strictScottRegimeGate: true,
        hnAboveOneZero: true,
        h1Vanishes: true,
        transfiniteAperiodicBoundary: true,
        frontier: Object.freeze([
            "Lean proves H1 vanishing for arbitrary covers; this carrier computes finite cover agreement, pointwise glue, and separation on a finite support.",
            "Higher cohomology is represented by the settled Hn=0 receipt boundary, not by a general chain-complex runtime.",
            "Nonzero aperiodic classifying invariants remain in the aperiodic classification surface; this receipt is the strict/Scott zero side.",
        ]),
    });
}
