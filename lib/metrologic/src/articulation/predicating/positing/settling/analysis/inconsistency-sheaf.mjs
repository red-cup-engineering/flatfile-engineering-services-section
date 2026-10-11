/**
 * analysis/inconsistency-sheaf - finite executable shadow of
 * RelMath.Cohomology.InconsistencySheaf.
 *
 * Lean defines the inconsistency sheaf as the dTop-supported cokernel of the
 * settling-associated sheaf inclusion. This module reuses the existing
 * settling-associated masks, projections, and short exact sequence receipt.
 */
import { aperiodicClosureRegime, finiteClosureRegime, scottClosureRegime, transfiniteClosureRegime, } from "../closure.mjs";
import { cohomologyVanishesInRegime } from "../value-category.mjs";
import { readingCell, cochain, dTop, defaultCochain, defaultValuation, pi, shortExactSequenceReceipt, vanishesOff, } from "./settling-associated-sheaf.mjs";
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_BOTTOM, TRUTH_TOP } from "../../../../../reading-points.mjs";
const coefficientAt = (value, cell) => value.coefficients.find((entry) => entry.cell === cell)?.coefficient ?? 0;
const allCells = (valuation) => Object.freeze(valuation.map((entry) => entry.cell));
const zeroOnCells = (value, cells) => cells.every((cell) => coefficientAt(value, cell) === 0);
export const h0Top = (valuation) => dTop(valuation).cells.length;
export const hasInconsistencyContent = (valuation) => h0Top(valuation) > 0;
export const restrictTop = (valuation, value) => pi(valuation, value);
export function inconsistencyCohomologyReceipt(valuationInput = defaultValuation) {
    const valuation = Object.freeze([...valuationInput]);
    const cells = allCells(valuation);
    const count = h0Top(valuation);
    const h0CountsInconsistency = count === valuation.filter((entry) => entry.reading === KNOWLEDGE_TOP).length;
    const h1VanishesInStrict = cohomologyVanishesInRegime(finiteClosureRegime);
    const h1VanishesInScott = cohomologyVanishesInRegime(scottClosureRegime);
    const h1VanishesInTransfinite = cohomologyVanishesInRegime(transfiniteClosureRegime);
    const h1VanishesInAperiodic = cohomologyVanishesInRegime(aperiodicClosureRegime);
    if (!h0CountsInconsistency || !h1VanishesInStrict || !h1VanishesInScott || h1VanishesInTransfinite || h1VanishesInAperiodic) {
        throw new TypeError("inconsistencyCohomologyReceipt: inconsistency count/regime gate laws failed");
    }
    return Object.freeze({
        kind: "inconsistencySheaf.cohomology:witness",
        valuation,
        cells,
        h0Top: count,
        hasInconsistencyContent: count > 0,
        h0CountsInconsistency: true,
        h1VanishesInStrict: true,
        h1VanishesInScott: true,
        h1VanishesInTransfinite: false,
        h1VanishesInAperiodic: false,
    });
}
export function consistentZeroReceipt(valuationInput = Object.freeze([
    readingCell("truth-cell", TRUTH_TOP),
    readingCell("false-cell", TRUTH_BOTTOM),
    readingCell("empty-cell", KNOWLEDGE_BOTTOM),
]), value = cochain([
    { cell: "truth-cell", coefficient: 3 },
    { cell: "false-cell", coefficient: 5 },
    { cell: "empty-cell", coefficient: 0 },
])) {
    const valuation = Object.freeze([...valuationInput]);
    const cells = allCells(valuation);
    const topMask = dTop(valuation);
    const topSection = restrictTop(valuation, value);
    const noTopCells = topMask.cells.length === 0;
    const topSectionZero = zeroOnCells(topSection, cells);
    if (!noTopCells || !topSectionZero) {
        throw new TypeError("consistentZeroReceipt: consistent valuation did not kill the dTop section");
    }
    return Object.freeze({
        kind: "inconsistencySheaf.consistentZero:witness",
        valuation,
        cochain: value,
        topSection,
        noTopCells: true,
        topSectionZero: true,
    });
}
export function receipt(valuationInput = defaultValuation, value = defaultCochain) {
    const valuation = Object.freeze([...valuationInput]);
    const cells = allCells(valuation);
    const topMask = dTop(valuation);
    const topSection = restrictTop(valuation, value);
    const cokernel = shortExactSequenceReceipt(valuation, value);
    const restrictTopEqualsPi = zeroOnCells(cochain(topSection.coefficients.map((entry) => ({
        cell: entry.cell,
        coefficient: entry.coefficient - coefficientAt(pi(valuation, value), entry.cell),
    }))), cells);
    const supportedOnTop = vanishesOff(topMask, topSection, cells);
    if (!restrictTopEqualsPi || !supportedOnTop || !cokernel.piSurjectiveOnTopPart || !cokernel.kernelPiIffVanishesOnTopOnSample) {
        throw new TypeError("inconsistencySheaf.receipt: dTop cokernel laws failed");
    }
    return Object.freeze({
        kind: "inconsistencySheaf.receipt:witness",
        valuation,
        cochain: value,
        topMask,
        topSection,
        cokernel,
        cohomology: inconsistencyCohomologyReceipt(valuation),
        consistentZero: consistentZeroReceipt(),
        restrictTopEqualsPi: true,
        cokernelOfIota: true,
        directSumSplitInherited: true,
        frontier: "arbitrary Cech H1 proof objects remain Lean-side; Node reports the finite dTop cokernel and regime gate",
    });
}
