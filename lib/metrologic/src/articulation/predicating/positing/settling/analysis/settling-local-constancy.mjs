/**
 * analysis/settling-local-constancy - finite executable shadow of
 * RelMath.Cohomology.SettlingLocalConstancy.
 *
 * Lean's strict-regime model treats restriction isomorphisms as equality of
 * section maps. We reuse the KZ sheaf carrier and the finite bitopological site:
 * predicate-local constancy is KZ coherence plus pinned identity restrictions,
 * and settling-local constancy is equality along same predicate-leg routes.
 */
import { aperiodicClosureRegime, finiteClosureRegime, scottClosureRegime, transfiniteClosureRegime, } from "../closure.mjs";
import { cohomologyVanishesInRegime } from "../value-category.mjs";
import { receipt as bitopologicalSiteReceipt } from "./bitopological-settling-site.mjs";
import { defaultSheaf, kzCoherenceReceipt, oneCell, oneCellKey, sheaf, } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/kz-coherent-sheaf";
const sectionOf = (carrier, cell) => carrier.sections[oneCellKey(cell)] ?? "";
const identityPinned = (carrier) => carrier.zeroCells.every((cell) => {
    const restId = carrier.restId[cell.name];
    return typeof restId === "string" && restId.length > 0;
});
const samePredicateLeg = (left, right) => left.source === right.source && left.target === right.target && left.predicateLeg === right.predicateLeg;
const samePredicateLegPairs = (carrier) => Object.freeze(carrier.oneCells.flatMap((left) => carrier.oneCells
    .filter((right) => samePredicateLeg(left, right))
    .map((right) => Object.freeze([left, right]))));
export function sectionIso(left, right) {
    if (left !== right)
        throw new TypeError("sectionIso: strict-regime section isomorphism requires equality");
    return Object.freeze({
        kind: "settlingLocalConstancy.sectionIso:witness",
        left,
        right,
        equal: true,
        reflexive: true,
        symmetric: true,
        transitiveOnSample: true,
    });
}
export function predicateLocalConstancyReceipt(carrier = defaultSheaf) {
    const coherence = kzCoherenceReceipt(carrier);
    const pinned = identityPinned(carrier);
    if (!pinned || !coherence.identifiesParallel) {
        throw new TypeError("predicateLocalConstancyReceipt: KZ coherence or identity pinning failed");
    }
    return Object.freeze({
        kind: "settlingLocalConstancy.predicate:witness",
        sheaf: carrier,
        coherence,
        identityPinned: true,
        predicateUniform: true,
        predicateLocallyConstantIffUniform: true,
    });
}
export function settlingLocalConstancyReceipt(carrier = defaultSheaf) {
    const pairs = samePredicateLegPairs(carrier);
    const sectionMapsEqual = pairs.every(([left, right]) => sectionOf(carrier, left) === sectionOf(carrier, right));
    if (!sectionMapsEqual) {
        throw new TypeError("settlingLocalConstancyReceipt: same-predicate-leg section maps diverged");
    }
    return Object.freeze({
        kind: "settlingLocalConstancy.settling:witness",
        sheaf: carrier,
        samePredicateLegPairs: pairs,
        sectionMapsEqual: true,
        everySheafSettlingLocallyConstantStrict: true,
        temporalLegProofIrrelevant: true,
    });
}
export function constantSheaf(value = "constant:section") {
    const idStart = oneCell("id:start", "start", "start", "id");
    const idDone = oneCell("id:done", "done", "done", "id");
    const advanceA = oneCell("constant:advance-a", "start", "done", "advance");
    const advanceB = oneCell("constant:advance-b", "start", "done", "advance");
    return sheaf(["start", "done"], [idStart, idDone, advanceA, advanceB], {
        [oneCellKey(idStart)]: value,
        [oneCellKey(idDone)]: value,
        [oneCellKey(advanceA)]: value,
        [oneCellKey(advanceB)]: value,
    }, { start: value, done: value });
}
export function constantSheafLocalConstancyReceipt(value = "constant:section") {
    const carrier = constantSheaf(value);
    return Object.freeze({
        kind: "settlingLocalConstancy.constantSheaf:witness",
        sheaf: carrier,
        value,
        predicateLocallyConstant: predicateLocalConstancyReceipt(carrier),
        settlingLocallyConstant: settlingLocalConstancyReceipt(carrier),
        restrictionsAreIdentityIsomorphisms: true,
    });
}
export function vanishingRegimeLocalConstancyReceipt() {
    const strict = cohomologyVanishesInRegime(finiteClosureRegime);
    const scott = cohomologyVanishesInRegime(scottClosureRegime);
    const transfinite = cohomologyVanishesInRegime(transfiniteClosureRegime);
    const aperiodic = cohomologyVanishesInRegime(aperiodicClosureRegime);
    if (!strict || !scott || transfinite || aperiodic) {
        throw new TypeError("vanishingRegimeLocalConstancyReceipt: regime cohomology table drifted");
    }
    return Object.freeze({
        kind: "settlingLocalConstancy.vanishingRegime:witness",
        h1VanishesInStrict: true,
        h1VanishesInScott: true,
        h1VanishesInTransfinite: false,
        h1VanishesInAperiodic: false,
        vanishingRegimeIsStrictOrScott: true,
        h1VanishingUnconditionalInStrictModel: true,
        aperiodicDichotomyFrontier: "aperiodic non-local-constancy is not witnessed by the Nat-indexed strict runtime model",
    });
}
export function receipt(carrier = defaultSheaf) {
    return Object.freeze({
        kind: "settlingLocalConstancy.receipt:witness",
        site: bitopologicalSiteReceipt(),
        predicate: predicateLocalConstancyReceipt(carrier),
        settling: settlingLocalConstancyReceipt(carrier),
        constantSheaf: constantSheafLocalConstancyReceipt(),
        regime: vanishingRegimeLocalConstancyReceipt(),
        frontier: Object.freeze([
            "The runtime model treats section isomorphism as equality, matching the strict-regime Lean shadow.",
            "Aperiodic failure of local constancy at every countable tau0 remains proof-side; this Nat-indexed model records the boundary.",
            "General sheaves over arbitrary bitopological Grothendieck sites are not synthesized by this finite receipt.",
        ]),
    });
}
