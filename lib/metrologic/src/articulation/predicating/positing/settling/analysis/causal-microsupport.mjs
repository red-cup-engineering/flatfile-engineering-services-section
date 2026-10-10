/**
 * analysis/causal-microsupport - finite cone-confined microsupport reads.
 *
 * Executable shadow for `RelMath.Lorentzian.CausalMicrosupport`,
 * `ChargedMicrosupport`, and `CotangentMicrosupport`: support propagates by
 * causal future closure, cone emissions carry FOUR readings, and edge cochains
 * expose a finite cotangent wavefront projection.
 */
import { diamondCausalSet, isCausalSettlementObstruction as isObstruction, settleCausalSet, } from "./causal.mjs";
import { knowledgeJoinReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_BOTTOM, TRUTH_TOP } from "../../../../../reading-points.mjs";
const edgeKey = (edge) => `${edge.from}->${edge.to}`;
function settledCarrier(carrier) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    return Object.freeze({ kind: "lorentzian.causalSet", events: settled.events, links: settled.closure });
}
function hasLink(links, from, to) {
    return links.some((link) => link.from === from && link.to === to);
}
function causalLe(carrier, from, to) {
    return from === to || hasLink(carrier.links, from, to);
}
function knowledgeJoinName(left, right) {
    return knowledgeJoinReading(left, right);
}
function knowledgeLeq(left, right) {
    return knowledgeJoinName(left, right) === right;
}
/** The closed future cone `J+(source)`. */
export function closedFuture(carrier, source) {
    const settled = settledCarrier(carrier);
    if (isObstruction(settled))
        return settled;
    return Object.freeze(settled.events.filter((event) => causalLe(settled, source, event)));
}
/** The causal microsupport of a finite event section. */
export function microsupport(carrier, support) {
    const settled = settledCarrier(carrier);
    if (isObstruction(settled))
        return settled;
    const seed = new Set(support);
    return Object.freeze(settled.events.filter((event) => settled.events.some((source) => seed.has(source) && causalLe(settled, source, event))));
}
/** Microsupport is an up-set of the causal order. */
export function microsupportUpwardClosed(carrier, support) {
    const settled = settledCarrier(carrier);
    if (isObstruction(settled))
        return settled;
    const supported = new Set(microsupport(settled, support));
    return [...supported].every((event) => settled.events.every((future) => !causalLe(settled, event, future) || supported.has(future)));
}
/** Propagating a microsupport again adds no events. */
export function microsupportIdempotent(carrier, support) {
    const once = microsupport(carrier, support);
    if (isObstruction(once))
        return once;
    const twice = microsupport(carrier, once);
    if (isObstruction(twice))
        return twice;
    return JSON.stringify(once) === JSON.stringify(twice);
}
/** Two events are spacelike when neither lies in the other's causal future. */
export function spacelike(carrier, left, right) {
    const settled = settledCarrier(carrier);
    if (isObstruction(settled))
        return settled;
    return left !== right && !causalLe(settled, left, right) && !causalLe(settled, right, left);
}
/** A point source does not propagate to a spacelike-separated event. */
export function microsupportExcludesSpacelike(carrier, source, target) {
    const separated = spacelike(carrier, source, target);
    if (isObstruction(separated))
        return separated;
    if (!separated)
        return false;
    const support = microsupport(carrier, [source]);
    if (isObstruction(support))
        return support;
    return !support.includes(target);
}
/** A valued source emits its reading inside the cone and `absurd` outside it. */
export function emit(carrier, source, reading, target) {
    const settled = settledCarrier(carrier);
    if (isObstruction(settled))
        return settled;
    return causalLe(settled, source, target) ? reading : KNOWLEDGE_BOTTOM;
}
/** Merge two valued cone emissions pointwise by knowledge join. */
export function emit2(carrier, leftSource, leftReading, rightSource, rightReading, target) {
    const left = emit(carrier, leftSource, leftReading, target);
    if (isObstruction(left))
        return left;
    const right = emit(carrier, rightSource, rightReading, target);
    if (isObstruction(right))
        return right;
    return knowledgeJoinName(left, right);
}
/** Merging valued influences climbs the knowledge order. */
export function emit2Inflationary(carrier, source, reading, otherSource, otherReading, target) {
    const left = emit(carrier, source, reading, target);
    if (isObstruction(left))
        return left;
    const merged = emit2(carrier, source, reading, otherSource, otherReading, target);
    if (isObstruction(merged))
        return merged;
    return knowledgeLeq(left, merged);
}
/** Direct causal edges as the finite cotangent/codirection carrier. */
export function codirections(carrier) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    return Object.freeze(settled.directLinks.map((link) => Object.freeze({ from: link.from, to: link.to })));
}
/** The wavefront set: codirections where the edge cochain is nonzero. */
export function wavefront(carrier, cochain) {
    const edges = codirections(carrier);
    if (isObstruction(edges))
        return edges;
    return Object.freeze(edges.filter((edge) => (cochain[edgeKey(edge)] ?? 0) !== 0));
}
/** The base singular support: projection of wavefront codirections to source events. */
export function singularSupport(carrier, cochain) {
    const wf = wavefront(carrier, cochain);
    if (isObstruction(wf))
        return wf;
    return Object.freeze([...new Set(wf.map((edge) => edge.from))]);
}
export function emptyWavefrontCoboundary(carrier, cochain) {
    const wf = wavefront(carrier, cochain);
    if (isObstruction(wf))
        return wf;
    return wf.length === 0;
}
export function clinvNonzeroSingular(carrier, cochain, edge) {
    const support = singularSupport(carrier, cochain);
    if (isObstruction(support))
        return support;
    return (cochain[edgeKey(edge)] ?? 0) !== 0 && support.includes(edge.from);
}
/** Bundle the finite causal/valued/cotangent microsupport laws. */
export function causalMicrosupportReceipt(carrier = diamondCausalSet) {
    const pointSupport = microsupport(carrier, ["a"]);
    if (isObstruction(pointSupport))
        return pointSupport;
    const upward = microsupportUpwardClosed(carrier, ["a"]);
    if (isObstruction(upward))
        return upward;
    const idem = microsupportIdempotent(carrier, ["a"]);
    if (isObstruction(idem))
        return idem;
    const spacelikeExcluded = microsupportExcludesSpacelike(carrier, "b", "c");
    if (isObstruction(spacelikeExcluded))
        return spacelikeExcluded;
    const outside = emit(carrier, "b", TRUTH_TOP, "c");
    if (isObstruction(outside))
        return outside;
    const collision = emit2(carrier, "b", TRUTH_TOP, "c", TRUTH_BOTTOM, "d");
    if (isObstruction(collision))
        return collision;
    const agreement = emit2(carrier, "b", TRUTH_TOP, "c", TRUTH_TOP, "d");
    if (isObstruction(agreement))
        return agreement;
    const inflationary = emit2Inflationary(carrier, "b", TRUTH_TOP, "c", TRUTH_BOTTOM, "d");
    if (isObstruction(inflationary))
        return inflationary;
    const cochain = Object.freeze({ "a->b": 1, "a->c": 0, "a->d": 0, "b->d": 2, "c->d": 0 });
    const wf = wavefront(carrier, cochain);
    if (isObstruction(wf))
        return wf;
    const singular = singularSupport(carrier, cochain);
    if (isObstruction(singular))
        return singular;
    const nonzero = clinvNonzeroSingular(carrier, cochain, Object.freeze({ from: "a", to: "b" }));
    if (isObstruction(nonzero))
        return nonzero;
    if (!upward || !idem || !spacelikeExcluded || outside !== KNOWLEDGE_BOTTOM || collision !== KNOWLEDGE_TOP || agreement !== TRUTH_TOP || !inflationary || !nonzero) {
        throw new TypeError("causalMicrosupport.receipt: finite microsupport laws failed");
    }
    return Object.freeze({
        kind: "lorentzian.causalMicrosupport:witness",
        pointSupport,
        upwardClosed: true,
        idempotent: true,
        spacelikeExcluded: true,
        chargedOutsideCone: KNOWLEDGE_BOTTOM,
        chargedCollision: KNOWLEDGE_TOP,
        chargedAgreement: TRUTH_TOP,
        mergeKnowledgeInflationary: true,
        wavefront: wf,
        singularSupport: singular,
        nonzeroClinvSingular: true,
        bridgeBoundary: "smooth cotangent symplectic flow remains frontier",
    });
}
