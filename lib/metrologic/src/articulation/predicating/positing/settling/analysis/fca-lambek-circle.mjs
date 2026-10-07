/**
 * analysis/fca-lambek-circle - finite receipts for RelMath.Order.FCALambekCircle.
 *
 * This surface closes the executable part of the FCA -> Lambek ->
 * residuated-lattice -> settling-closure circle over finite carriers. The Wurm /
 * Pentus model-theoretic completeness edge remains a documented boundary.
 */
import { finiteLambekAlgebraSystem, laws as lambekLaws, } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/lambek-calculus";
import { laws as residuatedLatticeLaws, } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/residuated-lattice";
import { makeContext, intent as kernelIntent, extent as kernelExtent } from "@red-cup-engineering/metrologic/closure/formal-context";
const MAX_CONTEXT_SIZE = 16;
const uniq = (values) => Object.freeze([...new Set(values)]);
const sameSet = (left, right) => {
    if (left.length !== right.length)
        return false;
    const rightSet = new Set(right);
    return left.every((value) => rightSet.has(value));
};
const subsetOf = (left, right) => {
    const rightSet = new Set(right);
    return left.every((value) => rightSet.has(value));
};
const intersection = (left, right) => {
    const rightSet = new Set(right);
    return Object.freeze(left.filter((value) => rightSet.has(value)));
};
const union = (left, right) => uniq([...left, ...right]);
const subsets = (carrier) => {
    if (carrier.length > MAX_CONTEXT_SIZE) {
        throw new RangeError(`fcaLambek: finite context carrier exceeds max size ${MAX_CONTEXT_SIZE}`);
    }
    const count = 2 ** carrier.length;
    return Object.freeze(Array.from({ length: count }, (_, mask) => Object.freeze(carrier.filter((_, index) => (mask & (1 << index)) !== 0))));
};
export function finiteFcaContext(cells) {
    if (cells.length === 0)
        throw new RangeError("finiteFcaContext: context must have at least one incidence cell");
    cells.forEach((cell, index) => {
        if (cell.subject.length === 0)
            throw new RangeError(`finiteFcaContext.cells[${index}].subject must be nonempty`);
        if (cell.predicate.length === 0)
            throw new RangeError(`finiteFcaContext.cells[${index}].predicate must be nonempty`);
    });
    const frozenCells = Object.freeze(cells.map((cell) => Object.freeze({
        subject: cell.subject,
        predicate: cell.predicate,
    })));
    return Object.freeze({
        kind: "fcaLambek.finiteContext",
        cells: frozenCells,
        subjects: uniq(frozenCells.map((cell) => cell.subject)),
        predicates: uniq(frozenCells.map((cell) => cell.predicate)),
    });
}
// The Galois double-prime primitives (intentOfExtent/extentOfIntent) are the
// SAME operators predicated-inference-kernel/context defines as intent/extent
// over its own {G,M,A,I} formal-context shape -- this module used to
// hand-roll them again here. Delegated 2026-09-11: build the kernel's
// context once from this module's own FiniteFcaContext (same subjects,
// predicates, incidence cells, just a different carrier) and call through.
// Order is preserved: both sides iterate context.predicates/context.subjects
// in their original (first-seen) order, so this is behavior-identical, not
// merely law-identical.
const kernelContextOf = (context) => makeContext(context.subjects, context.predicates, context.cells.map((cell) => [cell.subject, cell.predicate]));
export const intentOfExtent = (context, extent) => Object.freeze([...kernelIntent(kernelContextOf(context), extent)]);
export const extentOfIntent = (context, intent) => Object.freeze([...kernelExtent(kernelContextOf(context), intent)]);
export const closeExtent = (context, extent) => extentOfIntent(context, intentOfExtent(context, extent));
export const closeIntent = (context, intent) => intentOfExtent(context, extentOfIntent(context, intent));
/** Finite receipt for the Boolean derivation/Galois core of `RelMath.FCA`. */
export function formalConceptAnalysisReceipt(context = workedContext, sampleExtent = ["a", "b"]) {
    const allExtents = subsets(context.subjects);
    const allIntents = subsets(context.predicates);
    const normalizedSample = intersection(context.subjects, sampleExtent);
    const sampleIntent = intentOfExtent(context, normalizedSample);
    const sampleClosedExtent = closeExtent(context, normalizedSample);
    const primeAdjunction = allExtents.every((extent) => allIntents.every((intent) => subsetOf(extent, extentOfIntent(context, intent)) === subsetOf(intent, intentOfExtent(context, extent))));
    const primeAAntitone = allExtents.every((left) => allExtents.every((right) => !subsetOf(left, right) || subsetOf(intentOfExtent(context, right), intentOfExtent(context, left))));
    const primeBAntitone = allIntents.every((left) => allIntents.every((right) => !subsetOf(left, right) || subsetOf(extentOfIntent(context, right), extentOfIntent(context, left))));
    const closeAExtensive = allExtents.every((extent) => subsetOf(extent, closeExtent(context, extent)));
    const primeACancelsClosure = allExtents.every((extent) => sameSet(intentOfExtent(context, closeExtent(context, extent)), intentOfExtent(context, extent)));
    const closeAMonotone = allExtents.every((left) => allExtents.every((right) => !subsetOf(left, right) || subsetOf(closeExtent(context, left), closeExtent(context, right))));
    const closeAIdempotent = allExtents.every((extent) => sameSet(closeExtent(context, closeExtent(context, extent)), closeExtent(context, extent)));
    const closedExtents = Object.freeze(allExtents
        .map((extent) => closeExtent(context, extent))
        .filter((extent, index, array) => array.findIndex((other) => sameSet(other, extent)) === index));
    const conceptExtentsClosed = closedExtents.every((extent) => sameSet(closeExtent(context, extent), extent));
    const conceptMeetClosed = closedExtents.every((left) => closedExtents.every((right) => closedExtents.some((extent) => sameSet(extent, intersection(left, right)))));
    const conceptJoinClosed = closedExtents.every((left) => closedExtents.every((right) => closedExtents.some((extent) => sameSet(extent, closeExtent(context, union(left, right))))));
    const implicationCharacterization = allIntents.every((left) => allIntents.every((right) => {
        const implies = subsetOf(extentOfIntent(context, left), extentOfIntent(context, right));
        return implies === subsetOf(right, closeIntent(context, left));
    }));
    if (!primeAdjunction ||
        !primeAAntitone ||
        !primeBAntitone ||
        !closeAExtensive ||
        !primeACancelsClosure ||
        !closeAMonotone ||
        !closeAIdempotent ||
        !conceptExtentsClosed ||
        !conceptMeetClosed ||
        !conceptJoinClosed ||
        !implicationCharacterization) {
        throw new TypeError("formalConceptAnalysisReceipt: finite FCA derivation laws failed");
    }
    return Object.freeze({
        kind: "fca.formalConceptAnalysis.receipt:witness",
        sourceModule: "RelMath.Order.FormalConceptAnalysis",
        theorems: Object.freeze([
            "RelMath.FCA.prime_adjunction",
            "RelMath.FCA.primeA_antitone",
            "RelMath.FCA.primeB_antitone",
            "RelMath.FCA.subA_closeA",
            "RelMath.FCA.primeA_closeA",
            "RelMath.FCA.closeA_mono",
            "RelMath.FCA.closeA_idem",
            "RelMath.FCA.derivation_galois_connection",
            "RelMath.FCA.Concept.extent_closed",
            "RelMath.FCA.familyMeet_le",
            "RelMath.FCA.familyJoin_ge",
            "RelMath.FCA.implies_iff_closeM",
            "RelMath.FCA.conceptLatticeData",
        ]),
        contextSubjects: context.subjects,
        contextPredicates: context.predicates,
        sampleExtent: Object.freeze([...normalizedSample]),
        sampleIntent,
        sampleClosedExtent,
        closedExtents,
        primeAdjunction: true,
        primeAAntitone: true,
        primeBAntitone: true,
        closeAExtensive: true,
        primeACancelsClosure: true,
        closeAMonotone: true,
        closeAIdempotent: true,
        conceptExtentsClosed: true,
        conceptMeetClosed: true,
        conceptJoinClosed: true,
        implicationCharacterization: true,
    });
}
const obstruction = (reason, detail = {}) => Object.freeze({
    kind: "fcaLambek.circle-obstruction",
    reason,
    ...detail,
});
const lambekFromResiduated = (system) => finiteLambekAlgebraSystem(system.lattice, system.one, system.fuse, system.imp, system.lattice.labels.map((_, numerator) => system.lattice.labels.map((__, denominator) => system.imp[denominator]?.[numerator])));
/** Finite receipt for the proved algebraic edges of `RelMath.Order.FCALambekCircle`. */
export function circle(context, residuated) {
    const allExtents = subsets(context.subjects);
    for (const extent of allExtents) {
        const closed = closeExtent(context, extent);
        if (!subsetOf(extent, closed))
            return obstruction("fca.extensive", { extent, closed });
        const twice = closeExtent(context, closed);
        if (!sameSet(twice, closed))
            return obstruction("fca.idempotent", { extent, closed: twice });
        for (const extent2 of allExtents) {
            if (subsetOf(extent, extent2)) {
                const closed2 = closeExtent(context, extent2);
                if (!subsetOf(closed, closed2))
                    return obstruction("fca.monotone", { extent, extent2, closed });
            }
        }
    }
    const closedExtents = Object.freeze(allExtents
        .map((extent) => closeExtent(context, extent))
        .filter((extent, index, array) => array.findIndex((other) => sameSet(other, extent)) === index));
    for (const left of closedExtents) {
        for (const right of closedExtents) {
            const meet = intersection(left, right);
            if (!closedExtents.some((extent) => sameSet(extent, meet))) {
                return obstruction("concept.meet", { extent: left, extent2: right, closed: meet });
            }
            const join = closeExtent(context, union(left, right));
            if (!closedExtents.some((extent) => sameSet(extent, join))) {
                return obstruction("concept.join", { extent: left, extent2: right, closed: join });
            }
        }
    }
    const residuatedReceipt = residuatedLatticeLaws(residuated);
    if (residuatedReceipt.kind !== "residuatedLattice.laws:witness") {
        return obstruction("residuated", { residuated: residuatedReceipt });
    }
    const lambekReceipt = lambekLaws(lambekFromResiduated(residuated));
    if (lambekReceipt.kind !== "lambek.laws:witness") {
        return obstruction("lambek", { lambek: lambekReceipt });
    }
    if (!lambekReceipt.commutative || !lambekReceipt.singleImplicationWhenCommutative) {
        return obstruction("commutativeCollapse");
    }
    return Object.freeze({
        kind: "fcaLambek.circle:witness",
        contextSubjects: context.subjects,
        contextPredicates: context.predicates,
        extentsChecked: allExtents.length,
        closedExtentCount: closedExtents.length,
        fcaClosureIsSettlingClosure: true,
        conceptLatticeFiniteComplete: true,
        residuatedAsCommutativeLambek: true,
        lambek: lambekReceipt,
        commutativeCollapse: true,
        modelTheoreticClosingEdge: "documented-boundary",
    });
}
export const workedContext = finiteFcaContext([
    { subject: "a", predicate: "p" },
    { subject: "a", predicate: "q" },
    { subject: "b", predicate: "p" },
    { subject: "b", predicate: "r" },
    { subject: "c", predicate: "p" },
]);
