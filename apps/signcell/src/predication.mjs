/**
 * Predication over utterance carriers. A predication cell is a SignCell cell (`cell.mjs`) whose
 * subject and object are Tokens and whose predicate is a Predicate: one cell, one coincidence
 * (content identity of the triple), one set of moves. This module adds only what predication
 * names over those cells: entity and predicate sets, sites and the base category.
 */
import { canonicalCarrier } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { readingSchema } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { MarkSchema, TokenSchema, ClaimSchema, coincides } from "./utterance.mjs";
import { cell as signCell, cellSet as signCellSet, converse, hasEvidence, objectProjection, sameCell, specialize, subjectProjection } from "./cell.mjs";
export const PredicateSchema = {
    type: "object",
    required: ["kind", "claim", "mark"],
    properties: { kind: { const: "predication.predicate" }, claim: ClaimSchema, mark: MarkSchema },
    additionalProperties: false,
};
export const CellSchema = {
    type: "object",
    required: ["subject", "predicate", "object", "for", "against"],
    properties: {
        subject: TokenSchema, predicate: PredicateSchema, object: TokenSchema,
        for: { type: "array", uniqueItems: true }, against: { type: "array", uniqueItems: true },
        value: readingSchema("knowledge"),
    },
    additionalProperties: false,
};
/** A predicate: an object of the predicate category, a frozen carrier of a Claim and its mark.
 *  Callable with or without `new`. */
export function Predicate(claimCarrier) {
    return canonicalCarrier({ kind: "predication.predicate", claim: claimCarrier, mark: claimCarrier.mark });
}
// — coincidence: content identity, read through the carried marks —
/** Whether two terms coincide (by their token's mark value). */
export const termCoincides = (left, right) => coincides(left.mark.value, right.mark.value);
/** Whether two predicates coincide (by their claim's mark value). */
export const predicateCoincides = (left, right) => coincides(left.claim.mark.value, right.claim.mark.value);
/** Whether two cells coincide: SignCell's sameness, the content identity of their triples. */
export const cellCoincides = (left, right) => sameCell(left, right);
/** Whether two nodes coincide positionally. */
export const nodeCoincides = (left, right) => termCoincides(left[0], right[0]) && predicateCoincides(left[1], right[1]) && termCoincides(left[2], right[2]);
const isNode = (value) => Array.isArray(value);
const isPredicateObject = (value) => !Array.isArray(value) && "kind" in value && value.kind === "predication.predicate";
/** Whether two base objects coincide; cross-shape comparisons never coincide. */
export function baseObjectCoincides(left, right) {
    if (isNode(left) || isNode(right))
        return isNode(left) && isNode(right) && nodeCoincides(left, right);
    if (isPredicateObject(left) || isPredicateObject(right)) {
        return isPredicateObject(left) && isPredicateObject(right) && predicateCoincides(left, right);
    }
    return termCoincides(left, right);
}
function judge(holds, left, right) {
    return holds
        ? Object.freeze({ kind: "predication.identity:witness", left, right })
        : Object.freeze({ kind: "predication.identity-obstruction", left, right });
}
export const predicationTermIdentity = (l, r) => judge(termCoincides(l, r), l, r);
export const predicationPredicateIdentity = (l, r) => judge(predicateCoincides(l, r), l, r);
export const cellIdentity = (l, r) => judge(cellCoincides(l, r), l, r);
export const predicationNodeIdentity = (l, r) => judge(nodeCoincides(l, r), l, r);
// — constructors and builders —
function uniqueBy(values, same) {
    const out = [];
    for (const value of values)
        if (!out.some((item) => same(item, value)))
            out.push(value);
    return Object.freeze(out);
}
/** Promote a Claim into a predicate object (preserving the mark, not identity). */
export function predicateOfClaim(claimCarrier) {
    return Predicate(claimCarrier);
}
/** Build an entity set, deduplicating by the given sameness. */
export function entitySet(entities, same) {
    return canonicalCarrier({ kind: "predication.entitySet", entities: uniqueBy([...entities], same) });
}
/** Build a predicate set, deduplicating by the given sameness. */
export function predicateSet(predicates, same) {
    return canonicalCarrier({ kind: "predication.predicateSet", predicates: uniqueBy([...predicates], same) });
}
/** Build a cell set: SignCell's cell set (one cell per triple, tellings merged), with its entity and
 *  predicate sets derived. */
export function cellSet(cells) {
    const witnessed = signCellSet(cells);
    return Object.freeze({
        kind: "predication.cellSet",
        cells: Object.freeze(witnessed),
        entities: entitySet(witnessed.flatMap((c) => [c.subject, c.object]), termCoincides),
        predicates: predicateSet(witnessed.map((c) => c.predicate), predicateCoincides),
    });
}
/** Present Φ = E × Π × E by its generators. */
export function generatedPredicationCellSet(entities, predicates) {
    return canonicalCarrier({ kind: "predication.generatedCellSet", entities, predicates });
}
/** A predication cell: the SignCell cell over (subject, predicate, object), with its evidence (none
 *  by default). The object is a token, so it is never null. */
export function cell(subject, predicate, object, evidence = {}) {
    if (subject === undefined || predicate === undefined || object === undefined || object === null) {
        throw new TypeError("cell: subject, predicate, and non-null object must be present");
    }
    return signCell(subject, predicate, object, evidence);
}
/** `RelMath.PredicationCell.seed`: `(token, claim) -> (token, claim, token)`. */
export function predicationSeed(carrier) {
    return cell(carrier.token, predicateOfClaim(carrier.claim), carrier.token);
}
/** Predicating proper out of the potential articulation cell. */
export function predicatingCell(articulation) {
    const [carrier] = articulation.potentialAperiodicArticulationCell;
    return predicationSeed(carrier);
}
/** `RelMath.PredicationCell.converse`: swap subject and object. */
export const converseCell = converse;
/** `RelMath.PredicationCell.subjProj`: collapse object onto subject. */
export const subjectProjectionCell = subjectProjection;
/** `RelMath.PredicationCell.objProj`: collapse subject onto object. */
export const objectProjectionCell = objectProjection;
/** `RelMath.PredicationCell.specialize`: refine only the predicate coordinate. */
export const specializePredicateCell = specialize;
/** Converse is an involution. */
export const converseCellInvolution = (carrier) => cellCoincides(converseCell(converseCell(carrier)), carrier);
/** The seed is reflexive, so converse fixes it. */
export const converseSeed = (carrier) => cellCoincides(converseCell(predicationSeed(carrier)), predicationSeed(carrier));
/** Orientation is real when subject and object are distinct. */
export const converseCellDistinctWhenOriented = (carrier) => termCoincides(carrier.subject, carrier.object) || !cellCoincides(converseCell(carrier), carrier);
/** Subject projection is idempotent. */
export const subjectProjectionCellIdempotent = (carrier) => cellCoincides(subjectProjectionCell(subjectProjectionCell(carrier)), subjectProjectionCell(carrier));
/** Object projection is idempotent. */
export const objectProjectionCellIdempotent = (carrier) => cellCoincides(objectProjectionCell(objectProjectionCell(carrier)), objectProjectionCell(carrier));
/** Identity predicate specialization is the identity morphism. */
export const specializePredicateCellIdentity = (carrier) => cellCoincides(specializePredicateCell((predicate) => predicate, carrier), carrier);
const isRecord = (value) => typeof value === "object" && value !== null;
/** Admission-compatible Mark shape; decoded JSON need not be a Mark instance. */
const isMarkCarrier = (value) => isRecord(value)
    && value.kind === "utterance.mark"
    && "value" in value;
/** Admission-compatible token shape; decoded JSON need not be a Token instance. */
const isPredicationTerm = (value) => isRecord(value)
    && value.kind === "utterance.token"
    && value.hand === "left"
    && isMarkCarrier(value.mark);
/** Admission-compatible predicate shape; decoded JSON need not be a Predicate instance. */
const isPredicationPredicate = (value) => isRecord(value)
    && value.kind === "predication.predicate"
    && isRecord(value.claim)
    && value.claim.kind === "utterance.claim"
    && value.claim.hand === "right"
    && isMarkCarrier(value.claim.mark)
    && isMarkCarrier(value.mark);
/** Type guard for a cell. */
export const isCell = (value) => isRecord(value)
    && isPredicationTerm(value.subject)
    && isPredicationPredicate(value.predicate)
    && isPredicationTerm(value.object);
/** Construct a frozen specialization morphism (domain general, codomain specialized). */
export function specializationMorphism(specialized, general) {
    return Object.freeze({ kind: "predication.specialization", domain: general, codomain: specialized });
}
/** Type guard for a specialization morphism. */
export function isSpecializationMorphism(value) {
    return "kind" in value && value.kind === "predication.specialization";
}
function baseCategory(cellCarrier, specializations = []) {
    const materialized = "cells" in cellCarrier ? cellCarrier.cells : [];
    const nodeOf = (c) => Object.freeze([c.subject, c.predicate, c.object]);
    return Object.freeze({
        kind: "predication.base",
        objects: uniqueBy([...cellCarrier.entities.entities, ...cellCarrier.predicates.predicates], baseObjectCoincides),
        specialization: Object.freeze(specializations),
        converse: Object.freeze(materialized.map((c) => Object.freeze({ domain: nodeOf(c), codomain: Object.freeze([c.object, c.predicate, c.subject]) }))),
        subjectProjection: Object.freeze(materialized.map((c) => Object.freeze({ domain: nodeOf(c), codomain: c.subject }))),
        objectProjection: Object.freeze(materialized.map((c) => Object.freeze({ domain: nodeOf(c), codomain: c.object }))),
    });
}
/** Build a predication site from cells and specialization morphisms. */
export function predicationSite(witnesses) {
    // A generator stored before cells carried evidence is that triple with no telling.
    const cells = witnesses.filter(isCell).map((at) => hasEvidence(at) ? at : cell(at.subject, at.predicate, at.object));
    const specializations = witnesses.filter(isSpecializationMorphism);
    const cellCarrier = cellSet(cells);
    return Object.freeze({
        kind: "predication.site",
        cells: cellCarrier,
        specializations: Object.freeze(specializations),
        base: baseCategory(cellCarrier, specializations),
    });
}
/** Build the transfinite predication category from generators. */
export function transfinitePredicationCategory(predicationCellSet) {
    const base = baseCategory(predicationCellSet);
    return Object.freeze({
        kind: "predication.transfiniteCategory",
        predicationCellSet,
        predicationFiberFunctor: Object.freeze({
            kind: "predication.fiberFunctor",
            cellSet: predicationCellSet,
            base,
            entities: predicationCellSet.entities,
        }),
    });
}
/** Open the generated transfinite predication category around an articulation carrier. */
export function generatePredicationCategory(articulation) {
    const [carrier, [articulatedTokens]] = articulation.potentialAperiodicArticulationCell;
    const articulatedToken = articulatedTokens[0];
    return transfinitePredicationCategory(generatedPredicationCellSet(entitySet([articulatedToken], termCoincides), predicateSet([predicateOfClaim(carrier.claim)], predicateCoincides)));
}
/** Materialize a generated category as the finite predication site positing consumes. */
export function materializePredicationCategory(category) {
    const cells = category.predicationCellSet.entities.entities.flatMap((subject) => category.predicationCellSet.predicates.predicates.flatMap((predicate) => category.predicationCellSet.entities.entities.map((object) => cell(subject, predicate, object))));
    return predicationSite(cells);
}
/** The predication morphism: articulated givens → the relational cells. */
export function predicate(articulation) {
    return materializePredicationCategory(generatePredicationCategory(articulation));
}
/** Project a materialized site to its generators (the stored/wire presentation). */
export function presentPredicationSite(site) {
    return Object.freeze({
        kind: "predication.site",
        cells: site.cells.cells,
        specializations: site.specializations,
    });
}
/** Re-derive the full materialized site from its generators (the read projection). */
export function freePredicationSite(generators) {
    return predicationSite([...generators.cells, ...generators.specializations]);
}
/** The base category with its specialization relation transitively closed. */
export function closeSpecialization(base) {
    const edges = base.specialization.map((edge) => [edge.domain, edge.codomain]);
    const has = (domain, codomain) => edges.some(([d, c]) => termCoincides(d, domain) && termCoincides(c, codomain));
    let changed = true;
    while (changed) {
        changed = false;
        for (const [leftDomain, leftCodomain] of [...edges]) {
            for (const [rightDomain, rightCodomain] of [...edges]) {
                if (termCoincides(leftCodomain, rightDomain) && !has(leftDomain, rightCodomain)) {
                    edges.push([leftDomain, rightCodomain]);
                    changed = true;
                }
            }
        }
    }
    return Object.freeze({
        ...base,
        specialization: Object.freeze(edges.map(([domain, codomain]) => Object.freeze({ domain, codomain }))),
    });
}
/** Cohere a site: saturated cells + residue with closed specialization. */
export function cohere(predication) {
    return Object.freeze({
        kind: "predication.coherence",
        saturated: predication.cells,
        residue: Object.freeze({
            kind: "predication.site",
            cells: predication.cells,
            specializations: predication.specializations,
            base: closeSpecialization(predication.base),
        }),
    });
}
/** Compute the unrelated ordered entity pairs of a site. */
export function unrelatedPairs(predication) {
    const closed = closeSpecialization(predication.base);
    const related = (domain, codomain) => closed.specialization.some((edge) => termCoincides(edge.domain, domain) && termCoincides(edge.codomain, codomain));
    const edges = [];
    for (const domain of predication.cells.entities.entities) {
        for (const codomain of predication.cells.entities.entities) {
            if (!related(domain, codomain))
                edges.push(Object.freeze({ domain, codomain }));
        }
    }
    return Object.freeze({ kind: "predication.unrelatedPairs", edges: Object.freeze(edges) });
}

export const specializationSchema = {
    type: "object",
    required: ["kind", "domain", "codomain"],
    properties: { kind: { const: "predication.specialization" }, domain: TokenSchema, codomain: TokenSchema },
    additionalProperties: false,
};
export const predicationGeneratorsShape = {
    cells: { type: "array", items: CellSchema },
    specializations: { type: "array", items: specializationSchema },
};
export const predicationSiteGeneratorsSchema = {
    $id: "metroplat/calculus/predicating/predication-site-generators",
    type: "object",
    required: ["kind", "cells", "specializations"],
    properties: { kind: { const: "predication.site" }, ...predicationGeneratorsShape },
    additionalProperties: false,
    title: "PredicationSiteGenerators",
    description: "The witnessed cells and specializations a predication site is freely constructed from.",
};
