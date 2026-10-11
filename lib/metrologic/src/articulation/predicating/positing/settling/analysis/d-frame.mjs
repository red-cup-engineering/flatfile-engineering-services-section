import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
/**
 * analysis/d-frame - articulating's own semiotic-charge binding of the
 * canonical, algebra-generic finite executable shadow of
 * Obsmetrologia.DFrame.dframe_valued_sheaf.
 *
 * Canonicalized 2026-09-11 to
 * `@lenticule-science/sheaf-mathematics-services-section/topology/d-frame`
 * alongside `./twist-product.mts` (same founding note). The powerset/frame
 * machinery needs no reading vocabulary; only `dK`/`dF`/`settledMask`/
 * `valuedSheafReceipt` take articulating's own semiotic reading names
 * (absurd/potential/active/stable) as a bound parameter.
 */
import { readingCell, } from "./settling-associated-sheaf.mjs";
import { subset as subsetGeneric, includes, le, sameSubset, meet, join, finiteSup, disjoint, covers, allSubsets, powersetFrameReceipt, canonicalDFrameReceipt, dK as dKGeneric, dF as dFGeneric, settledMask as settledMaskGeneric, restrictSub, valuedSheafReceipt as valuedSheafReceiptGeneric, } from "@red-cup-engineering/metrologic/sheaf/topology/d-frame";
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_BOTTOM, TRUTH_TOP } from "../../../../../reading-points.mjs";
export { subsetGeneric as subset, includes, le, sameSubset, meet, join, finiteSup, disjoint, covers, allSubsets, powersetFrameReceipt, canonicalDFrameReceipt, restrictSub, };
const SEMIOTIC_NAMES = Object.freeze({ bottom: readingOfSides("knowledge", false, false), positiveOnly: readingOfSides("knowledge", true, false), negativeOnly: readingOfSides("knowledge", false, true), top: readingOfSides("knowledge", true, true) });
export const dK = (valuation) => dKGeneric(SEMIOTIC_NAMES, valuation);
export const dF = (valuation) => dFGeneric(SEMIOTIC_NAMES, valuation);
export const settledMask = (valuation, clopen) => settledMaskGeneric(SEMIOTIC_NAMES, valuation, clopen);
export const defaultValuation = Object.freeze([
    readingCell("truth-cell", TRUTH_TOP),
    readingCell("both-cell", KNOWLEDGE_TOP),
    readingCell("false-cell", TRUTH_BOTTOM),
    readingCell("empty-cell", KNOWLEDGE_BOTTOM),
]);
export function valuedSheafReceipt(valuationInput = defaultValuation, clopenInput = subsetGeneric(defaultValuation.map((entry) => entry.cell))) {
    return valuedSheafReceiptGeneric(SEMIOTIC_NAMES, valuationInput, clopenInput);
}
export function receipt() {
    return Object.freeze({
        kind: "dFrame.receipt:witness",
        powerset: powersetFrameReceipt(),
        canonical: canonicalDFrameReceipt(),
        valuedSheaf: valuedSheafReceipt(),
        openFrontier: Object.freeze([
            "The runtime receipt checks finite powerset-frame laws; arbitrary Prop-valued frames and infinitary suprema remain Lean-side.",
            "The d-frame-valued sheaf is modeled over finite valued cells and masks, not arbitrary bitopological sites or all clopen covers.",
            "General d-frame morphism categories and non-finite frame-valued sheaf cohomology remain proof/kernel obligations.",
        ]),
    });
}
