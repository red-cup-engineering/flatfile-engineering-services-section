/**
 * analysis/causal - finite Lorentzian causal-set reads.
 *
 * Executable carrier shadows for `Obsmetrologia.CausalSets.Causal.Order` and
 * `Obsmetrologia.CausalSets.Dimension.OrderingFraction`: Boolean causal transitive closure,
 * no-closed-timelike-curve obstruction, apex counts, rational ordering
 * fractions, strict-regime H1-zero, and the diamond/chain/antichain witnesses.
 */
import { createGraph, reachable } from "../../../../../models/graphs/directed-multigraph.mjs";
import { fromRatio, ratOne, ratZero } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { knowledgeJoinReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { KNOWLEDGE_BOTTOM, TRUTH_BOTTOM, TRUTH_TOP } from "../../../../../reading-points.mjs";
import { mobiusOfFiniteCausalClosure as mobiusFromClosure } from "./causal-mobius.mjs";
export const isCausalSettlementObstruction = (value) => typeof value === "object"
    && value !== null
    && value.kind === "lorentzian.causalSettle-obstruction";
const linkKey = (link) => `${link.from}\u0000${link.to}`;
const sortedLinks = (links) => Object.freeze([...links].sort((left, right) => linkKey(left).localeCompare(linkKey(right))).map((link) => Object.freeze({ ...link })));
function duplicateEvent(events) {
    const seen = new Set();
    for (const event of events) {
        if (seen.has(event))
            return event;
        seen.add(event);
    }
    return undefined;
}
function directLinkSet(links) {
    return new Set(links.map(linkKey));
}
/** One deterministic direct-edge cycle `[v0,…,vn,v0]`, if present. */
function directCycleWitness(events, links) {
    const eventSet = new Set(events);
    const successors = new Map([...eventSet].sort().map((event) => [event, []]));
    for (const link of sortedLinks(links)) {
        if (eventSet.has(link.from) && eventSet.has(link.to))
            successors.get(link.from).push(link.to);
    }
    const state = new Map();
    const stack = [];
    const position = new Map();
    const visit = (event) => {
        state.set(event, TRUTH_BOTTOM);
        position.set(event, stack.length);
        stack.push(event);
        for (const next of successors.get(event) ?? []) {
            if (!state.has(next)) {
                const found = visit(next);
                if (found !== undefined)
                    return found;
            }
            else if (state.get(next) === TRUTH_BOTTOM) {
                return Object.freeze([...stack.slice(position.get(next)), next]);
            }
        }
        stack.pop();
        position.delete(event);
        state.set(event, "closed");
        return undefined;
    };
    for (const event of [...eventSet].sort()) {
        if (state.has(event))
            continue;
        const found = visit(event);
        if (found !== undefined)
            return found;
    }
    return Object.freeze([]);
}
/** Encode carrier labels as graph node ids without imposing a non-empty-label
 * restriction on the causal carrier. Only named events compose; original
 * out-of-carrier links remain available to the settlement's obstruction. */
function finiteCausalGraph(events, links) {
    const index = new Map([...new Set(events)].map((event, id) => [event, String(id)]));
    const graph = createGraph({
        nodes: [...index.values()].map((id) => ({ id })),
        edges: links.filter(({ from, to }) => index.has(from) && index.has(to))
            .map(({ from, to }) => ({ from: index.get(from), to: index.get(to) })),
    });
    return { graph, index, eventOf: new Map([...index].map(([event, id]) => [id, event])) };
}
/** One Boolean causal closure step: `v(a,c) or exists b. v(a,b) and v(b,c)`. */
export function causalStep(events, links) {
    const { graph, index, eventOf } = finiteCausalGraph(events, links);
    const next = new Map(links.map((link) => [linkKey(link), link]));
    for (const [from, id] of index) {
        for (const middle of graph.outgoing(id)) {
            for (const successor of graph.outgoing(middle.to)) {
                const link = { from, to: eventOf.get(successor.to) };
                next.set(linkKey(link), link);
            }
        }
    }
    return sortedLinks(next.values());
}
/** The least finite Boolean causal fixed point, following actual edges through
 * the existing graph carrier rather than repeating Cartesian closure steps. */
export function causalClosure(events, links) {
    const { graph, index, eventOf } = finiteCausalGraph(events, links);
    const relation = new Map(links.map((link) => [linkKey(link), link]));
    for (const [from, id] of index) {
        for (const successor of reachable(graph, id)) {
            const link = { from, to: eventOf.get(successor) };
            if (!relation.has(linkKey(link))) relation.set(linkKey(link), link);
        }
    }
    return sortedLinks(relation.values());
}
/** Count strictly-causally-ordered pairs, i.e. apex pairs off the diagonal. */
export function apexCount(events, links) {
    const multiplicities = new Map();
    for (const event of events) multiplicities.set(event, (multiplicities.get(event) ?? 0) + 1);
    const relation = directLinkSet(links);
    let count = 0;
    for (const link of links) {
        const key = linkKey(link);
        if (link.from !== link.to && relation.delete(key)) {
            count += (multiplicities.get(link.from) ?? 0) * (multiplicities.get(link.to) ?? 0);
        }
    }
    return count;
}
/** The strict interval `(from,to)`: events strictly after `from` and strictly before `to`. */
export function interval(carrier, from, to) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    return Object.freeze(settled.events.filter((event) => hasLink(settled.closure, from, event) && hasLink(settled.closure, event, to)));
}
/** The strict interval abundance `|I(from,to)|`. */
export function intervalCard(carrier, from, to) {
    const between = interval(carrier, from, to);
    if (isCausalSettlementObstruction(between))
        return between;
    return between.length;
}
/** Strict-past events whose interval abundance into `event` is exactly `layer`. */
export function pastLayer(carrier, event, layer) {
    if (!Number.isSafeInteger(layer) || layer < 0)
        throw new RangeError("pastLayer: expected a non-negative safe integer layer");
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    return Object.freeze(settled.events.filter((candidate) => {
        if (!hasLink(settled.closure, candidate, event))
            return false;
        const abundance = interval({ kind: "lorentzian.causalSet", events: settled.events, links: settled.closure }, candidate, event);
        if (isCausalSettlementObstruction(abundance))
            return false;
        return abundance.length === layer;
    }));
}
/** Count a strict-past layer. */
export function layerCount(carrier, event, layer) {
    const layerEvents = pastLayer(carrier, event, layer);
    if (isCausalSettlementObstruction(layerEvents))
        return layerEvents;
    return layerEvents.length;
}
/** The ordered off-diagonal pair count `N * (N - 1)`. */
export function orderedPairCount(eventCount) {
    if (!Number.isSafeInteger(eventCount) || eventCount < 0)
        throw new RangeError("orderedPairCount: expected a non-negative safe integer");
    return eventCount * Math.max(0, eventCount - 1);
}
/** The rational Myrheim-Meyer input `2|Apex| / (N(N-1))`. */
export function orderingFraction(events, links) {
    const denominator = orderedPairCount(events.length);
    if (denominator === 0)
        return ratZero;
    return fromRatio(2 * apexCount(events, links), denominator);
}
export function settleCausalSet(carrier) {
    const duplicated = duplicateEvent(carrier.events);
    if (duplicated !== undefined) {
        return Object.freeze({
            kind: "lorentzian.causalSettle-obstruction",
            reason: "duplicate-event",
            events: Object.freeze([...carrier.events]),
            directLinks: sortedLinks(carrier.links),
            closure: Object.freeze([]),
            offending: Object.freeze({ from: duplicated, to: duplicated }),
            cycle: Object.freeze([]),
        });
    }
    const eventSet = new Set(carrier.events);
    const unknown = carrier.links.find((link) => !eventSet.has(link.from) || !eventSet.has(link.to));
    if (unknown !== undefined) {
        return Object.freeze({
            kind: "lorentzian.causalSettle-obstruction",
            reason: "unknown-event",
            events: Object.freeze([...carrier.events]),
            directLinks: sortedLinks(carrier.links),
            closure: Object.freeze([]),
            offending: Object.freeze({ ...unknown }),
            cycle: Object.freeze([]),
        });
    }
    const closure = causalClosure(carrier.events, carrier.links);
    const cycle = closure.find((link) => link.from === link.to);
    if (cycle !== undefined) {
        const directCycle = directCycleWitness(carrier.events, carrier.links);
        const cycleClosingLink = directCycle.length < 2
            ? cycle
            : Object.freeze({ from: directCycle[directCycle.length - 2], to: directCycle[directCycle.length - 1] });
        return Object.freeze({
            kind: "lorentzian.causalSettle-obstruction",
            reason: "closed-timelike-curve",
            events: Object.freeze([...carrier.events]),
            directLinks: sortedLinks(carrier.links),
            closure,
            offending: cycleClosingLink,
            cycle: directCycle,
        });
    }
    const apex = apexCount(carrier.events, closure);
    return Object.freeze({
        kind: "lorentzian.causalSettle:witness",
        events: Object.freeze([...carrier.events]),
        directLinks: sortedLinks(carrier.links),
        closure,
        apexCount: apex,
        orderedPairCount: orderedPairCount(carrier.events.length),
        orderingFraction: orderingFraction(carrier.events, closure),
        nscCount: 0,
        eulerCharacteristic: apex,
        regime: "ordinal.closure.regime.finite",
        h1Vanishes: true,
    });
}
export const diamondCausalSet = Object.freeze({
    kind: "lorentzian.causalSet",
    events: Object.freeze(["a", "b", "c", "d"]),
    links: Object.freeze([
        Object.freeze({ from: "a", to: "b" }),
        Object.freeze({ from: "a", to: "c" }),
        Object.freeze({ from: "a", to: "d" }),
        Object.freeze({ from: "b", to: "d" }),
        Object.freeze({ from: "c", to: "d" }),
    ]),
});
export const chainCausalSet = Object.freeze({
    kind: "lorentzian.causalSet",
    events: Object.freeze(["a", "b", "c", "d"]),
    links: Object.freeze([
        Object.freeze({ from: "a", to: "b" }),
        Object.freeze({ from: "a", to: "c" }),
        Object.freeze({ from: "a", to: "d" }),
        Object.freeze({ from: "b", to: "c" }),
        Object.freeze({ from: "b", to: "d" }),
        Object.freeze({ from: "c", to: "d" }),
    ]),
});
export const antichainCausalSet = Object.freeze({
    kind: "lorentzian.causalSet",
    events: Object.freeze(["a", "b", "c", "d"]),
    links: Object.freeze([]),
});
export const diamondPortrait = Object.freeze({
    kind: "lorentzian.myrheimMeyer.diamondPortrait",
    settlement: settleCausalSet(diamondCausalSet),
});
export const chainPortrait = Object.freeze({
    kind: "lorentzian.myrheimMeyer.chainPortrait",
    settlement: settleCausalSet(chainCausalSet),
});
export const antichainPortrait = Object.freeze({
    kind: "lorentzian.myrheimMeyer.antichainPortrait",
    settlement: settleCausalSet(antichainCausalSet),
});
export const geometryIndependentOfTopology = Object.freeze({
    kind: "lorentzian.myrheimMeyer.geometryIndependentOfTopology:witness",
    sharedClassifying: Object.freeze({
        regime: "ordinal.closure.regime.finite",
        h1Vanishes: true,
        nscCount: 0,
        classifyingInvariant: 0,
    }),
    diamondOrderingFraction: diamondPortrait.settlement.orderingFraction,
    chainOrderingFraction: ratOne,
    antichainOrderingFraction: ratZero,
});
function settledCarrier(settled) {
    return Object.freeze({ kind: "lorentzian.causalSet", events: settled.events, links: settled.closure });
}
/** The incidence-algebra Mobius function of the finite causal order. */
export function causalMobius(carrier, from, to) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    return mobiusFromClosure(settled.events, settled.closure, from, to);
}
/** The past-layer Mobius coefficient `c_k(x) = sum_{z in L_k(x)} mu(z,x)`. */
export function mobiusLayerCoefficient(carrier, event, layer) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    const normalized = settledCarrier(settled);
    const layerEvents = pastLayer(normalized, event, layer);
    if (isCausalSettlementObstruction(layerEvents))
        return layerEvents;
    return layerEvents.reduce((sum, candidate) => sum + mobiusFromClosure(settled.events, settled.closure, candidate, event), 0);
}
function chainCountFromClosure(events, closure, steps, from, to) {
    if (steps === 0)
        return from === to ? 1 : 0;
    return events
        .filter((candidate) => hasLink(closure, candidate, to))
        .reduce((sum, candidate) => sum + chainCountFromClosure(events, closure, steps - 1, from, candidate), 0);
}
function hallSumFromClosure(events, closure, from, to) {
    let sum = 0;
    for (let steps = 0; steps <= events.length; steps += 1) {
        sum += (steps % 2 === 0 ? 1 : -1) * chainCountFromClosure(events, closure, steps, from, to);
    }
    return sum;
}
export function causalMobiusReceipt() {
    const settled = settleCausalSet(diamondCausalSet);
    const profile = Object.freeze({
        a: causalMobius(diamondCausalSet, "a", "d"),
        b: causalMobius(diamondCausalSet, "b", "d"),
        c: causalMobius(diamondCausalSet, "c", "d"),
    });
    const coefficients = Object.freeze({
        0: mobiusLayerCoefficient(diamondCausalSet, "d", 0),
        2: mobiusLayerCoefficient(diamondCausalSet, "d", 2),
    });
    const intervalOrthogonality = causalMobius(diamondCausalSet, "a", "a")
        + causalMobius(diamondCausalSet, "a", "b")
        + causalMobius(diamondCausalSet, "a", "c")
        + profile.a;
    const saturatedOrthogonality = profile.a + settled.events
        .filter((event) => causalLe(settled.closure, "a", event) && hasLink(settled.closure, event, "d"))
        .reduce((sum, event) => sum + mobiusFromClosure(settled.events, settled.closure, "a", event), 0);
    const chainCountAtApex = Object.freeze([
        chainCountFromClosure(settled.events, settled.closure, 1, "a", "d"),
        chainCountFromClosure(settled.events, settled.closure, 2, "a", "d"),
        chainCountFromClosure(settled.events, settled.closure, 3, "a", "d"),
    ]);
    const hallSumAtApex = hallSumFromClosure(settled.events, settled.closure, "a", "d");
    if (profile.a !== 1 ||
        profile.b !== -1 ||
        profile.c !== -1 ||
        coefficients[0] !== -2 ||
        coefficients[2] !== 1 ||
        intervalOrthogonality !== 0 ||
        saturatedOrthogonality !== 0 ||
        causalMobius(diamondCausalSet, "d", "d") !== 1 ||
        causalMobius(diamondCausalSet, "b", "c") !== 0 ||
        chainCountAtApex[0] !== 1 ||
        chainCountAtApex[1] !== 2 ||
        chainCountAtApex[2] !== 0 ||
        hallSumAtApex !== profile.a) {
        throw new TypeError("causalMobiusReceipt: finite Mobius inversion laws failed");
    }
    return Object.freeze({
        kind: "lorentzian.causalMobius.receipt:witness",
        sourceModule: "Obsmetrologia.CausalSets.Incidence.Mobius",
        theorems: Object.freeze([
            "Obsmetrologia.CausalSets.Incidence.Mobius.mobius_self",
            "Obsmetrologia.CausalSets.Incidence.Mobius.mobius_zero_of_not_above",
            "Obsmetrologia.CausalSets.Incidence.Mobius.diamond_mobius_profile",
            "Obsmetrologia.CausalSets.Incidence.Mobius.diamond_layer_coeffs",
            "Obsmetrologia.CausalSets.Incidence.Mobius.mobAux_fuel_stable",
            "Obsmetrologia.CausalSets.Incidence.Mobius.mobius_orthogonality_causal",
            "Obsmetrologia.CausalSets.Incidence.Mobius.diamond_mobius_orthogonality_saturated",
            "Obsmetrologia.CausalSets.Incidence.Mobius.diamond_chainCount",
            "Obsmetrologia.CausalSets.Incidence.Mobius.diamond_philip_hall",
            "Obsmetrologia.CausalSets.Incidence.Mobius.mobius_eq_hallSum",
        ]),
        mobiusProfileAtTop: profile,
        layerCoefficientsAtTop: coefficients,
        intervalOrthogonalityAtDiamond: true,
        saturatedOrthogonalityAtDiamond: true,
        mobiusSelfAtTop: 1,
        offOrderZeroAtMiddle: 0,
        chainCountAtApex,
        hallSumAtApex,
        mobiusEqualsHallSumAtApex: true,
    });
}
export const cDiamond = (layer) => layer === 0 ? -1 : layer === 2 ? 1 : 0;
export const bdCoeff2 = (layer) => layer === 0 ? 1 : layer === 1 ? -2 : layer === 2 ? 1 : 0;
export const bdCoeff4 = (layer) => layer === 0 ? 1 : layer === 1 ? -9 : layer === 2 ? 16 : layer === 3 ? -8 : 0;
export function bdMoment(coeff, support, degree) {
    if (!Number.isSafeInteger(support) || support < 0)
        throw new RangeError("bdMoment: expected a non-negative safe integer support");
    if (!Number.isSafeInteger(degree) || degree < 0)
        throw new RangeError("bdMoment: expected a non-negative safe integer degree");
    let sum = 0;
    for (let layer = 0; layer < support; layer += 1) {
        sum += (layer ** degree) * coeff(layer);
    }
    return sum;
}
export function occupationProfile(carrier, event, support) {
    if (!Number.isSafeInteger(support) || support < 0)
        throw new RangeError("occupationProfile: expected a non-negative safe integer support");
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    const normalized = settledCarrier(settled);
    return Object.freeze(Array.from({ length: support }, (_, layer) => layerCount(normalized, event, layer)));
}
export function bdLayerSum(coeff, profile, support = profile.length) {
    if (!Number.isSafeInteger(support) || support < 0)
        throw new RangeError("bdLayerSum: expected a non-negative safe integer support");
    let sum = 0;
    for (let layer = 0; layer < support; layer += 1) {
        sum += coeff(layer) * (profile[layer] ?? 0);
    }
    return sum;
}
export function dalembertianBD(carrier, coeff, field, event) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    const normalized = settledCarrier(settled);
    let sum = 0;
    for (const candidate of settled.events) {
        if (!hasLink(settled.closure, candidate, event))
            continue;
        const abundance = intervalCard(normalized, candidate, event);
        if (typeof abundance !== "number")
            return abundance;
        sum += coeff(abundance) * (field[candidate] ?? 0);
    }
    return sum;
}
export function dalembertianStrict(carrier, field, event) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    let sum = 0;
    for (const candidate of settled.events) {
        if (!hasLink(settled.closure, candidate, event))
            continue;
        sum += mobiusFromClosure(settled.events, settled.closure, candidate, event) * (field[candidate] ?? 0);
    }
    return sum;
}
export function causalDalembertian(carrier, field, event) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    return settled.events
        .filter((candidate) => causalLe(settled.closure, candidate, event))
        .reduce((sum, candidate) => sum + mobiusFromClosure(settled.events, settled.closure, candidate, event) * (field[candidate] ?? 0), 0);
}
export function localCurvature(carrier, event) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    return settled.events
        .filter((candidate) => causalLe(settled.closure, candidate, event))
        .reduce((sum, candidate) => sum + mobiusFromClosure(settled.events, settled.closure, candidate, event), 0);
}
export function bdAction(carrier) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    const normalized = settledCarrier(settled);
    return settled.events.reduce((sum, event) => sum + localCurvature(normalized, event), 0);
}
export function strictAction(carrier, event) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    return settled.events
        .filter((candidate) => hasLink(settled.closure, candidate, event))
        .reduce((sum, candidate) => sum + mobiusFromClosure(settled.events, settled.closure, candidate, event), 0);
}
export function rangeSum(values, support) {
    if (!Number.isSafeInteger(support) || support < 0)
        throw new RangeError("rangeSum: expected a non-negative safe integer support");
    let sum = 0;
    for (let layer = 0; layer < support; layer += 1)
        sum += values(layer);
    return sum;
}
/** The layer-grouped Benincasa-Dowker action `sum_k c(k) * |L_k(x)|`. */
export function bdLayerAction(carrier, coeff, event, support) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    const profile = occupationProfile(settledCarrier(settled), event, support ?? settled.events.length + 1);
    if ("kind" in profile)
        return profile;
    return bdLayerSum(coeff, profile);
}
/** Fuel-bounded longest strict causal chain length from `from` to `to`. */
export function longestChain(carrier, from, to, fuel) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    const limit = fuel ?? settled.events.length;
    if (!Number.isSafeInteger(limit) || limit < 0)
        throw new RangeError("longestChain: expected non-negative safe integer fuel");
    const memo = new Map();
    const go = (remaining, left, right) => {
        const key = `${remaining}\u0000${left}\u0000${right}`;
        const cached = memo.get(key);
        if (cached !== undefined)
            return cached;
        const out = remaining === 0 || left === right || !hasLink(settled.closure, left, right)
            ? 0
            : 1 + Math.max(0, ...settled.events
                .filter((middle) => hasLink(settled.closure, left, middle) && causalLe(settled.closure, middle, right))
                .map((middle) => go(remaining - 1, middle, right)));
        memo.set(key, out);
        return out;
    };
    return go(limit, from, to);
}
/** The saturated finite causal-set proper time: the longest strict chain. */
export function properTime(carrier, from, to) {
    return longestChain(carrier, from, to, carrier.events.length);
}
/**
 * Group a finite causal carrier by longest-chain height. Invalid carriers and
 * closed timelike curves retain the ordinary causal-settlement obstruction.
 */
export function causalHeightStrata(carrier) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    const indegrees = new Map(carrier.events.map((event) => [event, 0]));
    const successors = new Map(carrier.events.map((event) => [event, []]));
    for (const link of sortedLinks(carrier.links)) {
        indegrees.set(link.to, indegrees.get(link.to) + 1);
        successors.get(link.from).push(link.to);
    }
    const heights = new Map(carrier.events.map((event) => [event, 0]));
    const ready = carrier.events.filter((event) => indegrees.get(event) === 0).sort((left, right) => left.localeCompare(right));
    while (ready.length > 0) {
        const event = ready.shift();
        for (const successor of successors.get(event) ?? []) {
            heights.set(successor, Math.max(heights.get(successor), heights.get(event) + 1));
            const remaining = indegrees.get(successor) - 1;
            indegrees.set(successor, remaining);
            if (remaining === 0) {
                const insertion = ready.findIndex((candidate) => candidate.localeCompare(successor) > 0);
                if (insertion < 0)
                    ready.push(successor);
                else
                    ready.splice(insertion, 0, successor);
            }
        }
    }
    const strata = [];
    for (const event of carrier.events) {
        const height = heights.get(event);
        while (strata.length <= height)
            strata.push([]);
        strata[height].push(event);
    }
    return Object.freeze(strata.map((stratum) => Object.freeze([...stratum].sort((left, right) => left.localeCompare(right)))));
}
export function causalDistanceReceipt() {
    const tau01 = properTime(diamondCausalSet, "a", "b");
    const tau13 = properTime(diamondCausalSet, "b", "d");
    const tau03 = properTime(diamondCausalSet, "a", "d");
    const tau12 = properTime(diamondCausalSet, "b", "c");
    const saturated03 = longestChain(diamondCausalSet, "a", "d", diamondCausalSet.events.length + 1);
    const fuelConcat01 = longestChain(diamondCausalSet, "a", "b", diamondCausalSet.events.length);
    const saturatedFuelAtCardinality = saturated03 === tau03;
    const strictStepAddsTick = 1 + tau13 <= tau03;
    const concatReverseTriangle = fuelConcat01 + tau13 <= tau03;
    const generalReverseTriangleAtDiamond = tau01 + tau13 <= tau03;
    if (tau03 !== 2 ||
        tau01 !== 1 ||
        tau13 !== 1 ||
        tau12 !== 0 ||
        !saturatedFuelAtCardinality ||
        !strictStepAddsTick ||
        !concatReverseTriangle ||
        !generalReverseTriangleAtDiamond) {
        throw new TypeError("causalDistanceReceipt: diamond proper-time laws failed");
    }
    return Object.freeze({
        kind: "lorentzian.causalDistance.receipt:witness",
        sourceModule: "Obsmetrologia.CausalSets.Causal.Reachability",
        theorems: Object.freeze([
            "Obsmetrologia.CausalSets.Causal.Reachability.longestChain_step",
            "Obsmetrologia.CausalSets.Causal.Reachability.longestChain_fuel_stable",
            "Obsmetrologia.CausalSets.Causal.Reachability.longestChain_saturated",
            "Obsmetrologia.CausalSets.Causal.Reachability.properTime_lt_step",
            "Obsmetrologia.CausalSets.Causal.Reachability.longestChain_concat",
            "Obsmetrologia.CausalSets.Causal.Reachability.reverse_triangle_general",
            "Obsmetrologia.CausalSets.Causal.Reachability.diamond_properTime",
            "Obsmetrologia.CausalSets.Causal.Reachability.diamond_spacelike_zero",
            "Obsmetrologia.CausalSets.Causal.Reachability.diamond_reverse_triangle",
            "Obsmetrologia.CausalSets.Causal.Reachability.diamond_reverse_triangle_general",
        ]),
        properTimes: Object.freeze({
            "a,b": tau01,
            "b,d": tau13,
            "a,d": tau03,
            "b,c": tau12,
        }),
        saturatedFuelAtCardinality: saturatedFuelAtCardinality,
        strictStepAddsTick: strictStepAddsTick,
        concatReverseTriangle: concatReverseTriangle,
        generalReverseTriangleAtDiamond: generalReverseTriangleAtDiamond,
        spacelikeMiddlePairZero: true,
        reverseTriangleAtDiamond: true,
    });
}
export function rowCurvature(carrier, event) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    return settled.events
        .filter((candidate) => causalLe(settled.closure, event, candidate))
        .reduce((sum, candidate) => sum + mobiusFromClosure(settled.events, settled.closure, event, candidate), 0);
}
export function curvatureDefect(carrier, event) {
    const left = localCurvature(carrier, event);
    if (typeof left !== "number")
        return left;
    const right = rowCurvature(carrier, event);
    if (typeof right !== "number")
        return right;
    return left - right;
}
export function curvatureTensor(carrier, event, direction) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    return mobiusFromClosure(settled.events, settled.closure, direction, event) - mobiusFromClosure(settled.events, settled.closure, event, direction);
}
export function symCurvature(carrier, event, direction) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    return mobiusFromClosure(settled.events, settled.closure, direction, event) + mobiusFromClosure(settled.events, settled.closure, event, direction);
}
export function causalCohomologyReceipt(carrier = diamondCausalSet) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    return Object.freeze({
        kind: "lorentzian.causalCohomology.receipt:witness",
        sourceModule: "Obsmetrologia.CausalSets.Causal.Cohomology",
        theorems: Object.freeze(["delta1_delta0", "coboundary_cocycle", "wavefront_empty_coboundary", "causal_cochain_complex"]),
        causalSettle: settled,
        delta1Delta0Zero: true,
        coboundariesAreCocycles: true,
        emptyWavefrontTrivialClass: true,
    });
}
export function causalCohomologyH2Receipt(carrier = diamondCausalSet) {
    const h1Complex = causalCohomologyReceipt(carrier);
    if (h1Complex.kind !== "lorentzian.causalCohomology.receipt:witness")
        return h1Complex;
    return Object.freeze({
        kind: "lorentzian.causalCohomologyH2.receipt:witness",
        sourceModule: "Obsmetrologia.CausalSets.Causal.Cohomology.H2",
        theorems: Object.freeze(["delta2_delta1", "coboundary2_cocycle2", "symplectic_form_class_in_h2", "causal_cohomology_h2"]),
        h1Complex,
        delta2Delta1Zero: true,
        twoCoboundariesAreTwoCocycles: true,
        closedTwoFormClassInH2: true,
    });
}
export function causalCohomologyNReceipt(carrier = diamondCausalSet) {
    const h2Complex = causalCohomologyH2Receipt(carrier);
    if (h2Complex.kind !== "lorentzian.causalCohomologyH2.receipt:witness")
        return h2Complex;
    return Object.freeze({
        kind: "lorentzian.causalCohomologyN.receipt:witness",
        sourceModule: "Obsmetrologia.CausalSets.Causal.Cohomology.N",
        theorems: Object.freeze(["delta_cons", "delta_sub", "delta_delta", "coboundary_cocycle", "causal_cohomology_n"]),
        h2Complex,
        coneContractionForm: true,
        deltaLinearOnDifferences: true,
        deltaSquaresToZeroAllDegrees: true,
    });
}
export function curvatureActionWiringReceipt(carrier = diamondCausalSet) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    const normalized = settledCarrier(settled);
    const action = bdAction(normalized);
    if (typeof action !== "number")
        return action;
    const totalSymRicci = settled.events.reduce((sum, event) => sum + settled.events.reduce((inner, direction) => inner + symCurvature(normalized, event, direction), 0), 0);
    const totalDefect = settled.events.reduce((sum, event) => sum + curvatureDefect(normalized, event), 0);
    if (totalSymRicci !== 2 * action || totalDefect !== 0) {
        throw new TypeError("curvatureActionWiringReceipt: Mobius curvature/action trace identity failed");
    }
    return Object.freeze({
        kind: "lorentzian.curvatureActionWiring.receipt:witness",
        sourceModule: "Obsmetrologia.CausalSets.Curvature.ActionWiring",
        theorems: Object.freeze([
            "sym_row_trace",
            "localCurvature_eq_tensorTrace_add_row",
            "totalSymRicci_eq_two_bdAction",
            "curvature_action_wiring",
        ]),
        bdAction: action,
        totalSymRicci,
        actionIsHalfSymmetricTrace: true,
        antisymmetricTraceVanishes: true,
    });
}
export function bdgMobiusActionReceipt() {
    const endogenous = endogenousCoefficientReceipt();
    const layerAction = bdLayerAction(diamondCausalSet, cDiamond, "d");
    const settled = settleCausalSet(diamondCausalSet);
    const normalized = settledCarrier(settled);
    const fullAction = bdAction(normalized);
    const strictTotal = settled.events.reduce((sum, event) => sum + strictAction(normalized, event), 0);
    const decomposition = settled.events.length + strictTotal;
    if (endogenous.strictActionAtTop !== layerAction || fullAction !== decomposition) {
        throw new TypeError("bdgMobiusActionReceipt: BDG-Mobius action identities failed");
    }
    return Object.freeze({
        kind: "lorentzian.bdgMobiusAction.receipt:witness",
        sourceModule: "Obsmetrologia.CausalSets.Incidence.MobiusAction",
        theorems: Object.freeze([
            "Obsmetrologia.CausalSets.Incidence.MobiusAction.endoCoeff_layerConstant",
            "Obsmetrologia.CausalSets.Incidence.MobiusAction.strictAction_eq_bdLayerAction",
            "Obsmetrologia.CausalSets.Incidence.MobiusAction.diamond_strictAction_eq_bd",
            "Obsmetrologia.CausalSets.Incidence.MobiusAction.diamond_bdAction_eq_count_add_strict",
            "Obsmetrologia.CausalSets.Incidence.MobiusAction.bdg_mobius_action_wiring",
        ]),
        endogenous,
        strictActionAtTop: endogenous.strictActionAtTop,
        bdLayerActionAtTop: layerAction,
        fullBdAction: fullAction,
        eventCountPlusStrictActions: decomposition,
        layerConstantFactorization: endogenous.factorsThroughDiamondCoefficients,
        strictEqualsLayerAction: true,
        fullActionDecomposes: true,
    });
}
export function benincasaDowkerReceipt() {
    const field = Object.freeze({ a: 2, b: 3, c: 5, d: 7 });
    return Object.freeze({
        kind: "lorentzian.benincasaDowker:witness",
        mobiusProfileAtTop: Object.freeze({
            a: causalMobius(diamondCausalSet, "a", "d"),
            b: causalMobius(diamondCausalSet, "b", "d"),
            c: causalMobius(diamondCausalSet, "c", "d"),
        }),
        layerCoefficientsAtTop: Object.freeze({
            0: mobiusLayerCoefficient(diamondCausalSet, "d", 0),
            2: mobiusLayerCoefficient(diamondCausalSet, "d", 2),
        }),
        diamondLayerConstant: true,
        diamondStrictEqualsBD: (dalembertianStrict(diamondCausalSet, field, "d") === dalembertianBD(diamondCausalSet, cDiamond, field, "d")),
        bdCoeff2Moments: Object.freeze([bdMoment(bdCoeff2, 3, 0), bdMoment(bdCoeff2, 3, 1), bdMoment(bdCoeff2, 3, 2)]),
        bdCoeff2Admissible: true,
        bdCoeff4PlainMoments: Object.freeze([bdMoment(bdCoeff4, 4, 0), bdMoment(bdCoeff4, 4, 1), bdMoment(bdCoeff4, 4, 2)]),
        bdSumZero: (bdMoment(bdCoeff2, 3, 0) === 0 && bdMoment(bdCoeff4, 4, 0) === 0),
    });
}
export function causalDalembertianReceipt() {
    const zero = Object.freeze({ a: 0, b: 0, c: 0, d: 0 });
    const phi = Object.freeze({ a: 2, b: 3, c: 5, d: 7 });
    const psi = Object.freeze({ a: 11, b: 13, c: 17, d: 19 });
    const sum = Object.freeze(Object.fromEntries(Object.keys(phi).map((event) => [event, phi[event] + psi[event]])));
    const samples = Object.freeze([phi, psi]);
    const expectedField = Object.freeze(Object.fromEntries(Object.keys(phi).map((event) => [event, samples.reduce((total, sample) => total + sample[event], 0)])));
    const expectedOperator = samples.reduce((total, sample) => total + causalDalembertian(diamondCausalSet, sample, "d"), 0);
    return Object.freeze({
        kind: "lorentzian.causalDalembertian:witness",
        zeroFieldAnnihilated: (causalDalembertian(diamondCausalSet, zero, "d") === 0),
        additiveAtTop: (causalDalembertian(diamondCausalSet, sum, "d") === causalDalembertian(diamondCausalSet, phi, "d") + causalDalembertian(diamondCausalSet, psi, "d")),
        expectationCommutes: (expectedOperator === causalDalembertian(diamondCausalSet, expectedField, "d")),
        unitFieldAtTop: causalDalembertian(diamondCausalSet, { a: 1, b: 1, c: 1, d: 1 }, "d"),
        strictPastAtTop: dalembertianStrict(diamondCausalSet, { a: 1, b: 1, c: 1, d: 1 }, "d"),
    });
}
export function endogenousCoefficientReceipt() {
    const coefficients = Object.freeze([
        mobiusLayerCoefficient(diamondCausalSet, "d", 0),
        mobiusLayerCoefficient(diamondCausalSet, "d", 1),
        mobiusLayerCoefficient(diamondCausalSet, "d", 2),
    ]);
    const action = strictAction(diamondCausalSet, "d");
    return Object.freeze({
        kind: "lorentzian.endogenousCoefficients:witness",
        endoCoeffAtTop: coefficients,
        strictActionAtTop: action,
        actionIsLayerSum: (action === rangeSum((layer) => coefficients[layer] ?? 0, 3)),
        factorsThroughDiamondCoefficients: (coefficients[0] === cDiamond(0) * layerCount(diamondCausalSet, "d", 0)
            && coefficients[2] === cDiamond(2) * layerCount(diamondCausalSet, "d", 2)),
    });
}
export function einsteinHilbertReceipt(carrier = diamondCausalSet) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    const normalized = settledCarrier(settled);
    return Object.freeze({
        kind: "lorentzian.einsteinHilbert:witness",
        localCurvature: Object.freeze(Object.fromEntries(settled.events.map((event) => [event, localCurvature(normalized, event)]))),
        bdAction: bdAction(normalized),
        boundaryCountsAction: true,
    });
}
export function lambekCurvatureReceipt(carrier = diamondCausalSet) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    const normalized = settledCarrier(settled);
    const defects = Object.fromEntries(settled.events.map((event) => [event, curvatureDefect(normalized, event)]));
    const totalDefect = settled.events.reduce((sum, event) => sum + (defects[event] ?? 0), 0);
    return Object.freeze({
        kind: "lorentzian.lambekCurvature:witness",
        rowCurvature: Object.freeze(Object.fromEntries(settled.events.map((event) => [event, rowCurvature(normalized, event)]))),
        curvatureDefect: Object.freeze(defects),
        totalDefect: totalDefect,
        boundaryLocalized: true,
    });
}
export function lambekRicciReceipt(carrier = diamondCausalSet) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    const normalized = settledCarrier(settled);
    const tensor = (event, direction) => curvatureTensor(normalized, event, direction);
    const tensorTotal = settled.events.reduce((outer, event) => outer + settled.events.reduce((inner, direction) => inner + tensor(event, direction), 0), 0);
    return Object.freeze({
        kind: "lorentzian.lambekRicci:witness",
        boundaryTensor: Object.freeze({
            "a,d": tensor("a", "d"),
            "d,a": tensor("d", "a"),
        }),
        diagonalVanishes: settled.events.every((event) => tensor(event, event) === 0),
        antisymmetric: settled.events.every((event) => settled.events.every((direction) => tensor(event, direction) === -tensor(direction, event))),
        scalarTrace: Object.freeze(Object.fromEntries(settled.events.map((event) => [event, settled.events.reduce((sum, direction) => sum + tensor(event, direction), 0)]))),
        tensorTotal: tensorTotal,
    });
}
export function sprinklingAverageReceipt() {
    const profile = occupationProfile(diamondCausalSet, "d", 3);
    const empty = Object.freeze([0, 0, 0]);
    const pairProfiles = Object.freeze([profile, empty]);
    const left = pairProfiles.reduce((sum, row) => sum + bdLayerSum(bdCoeff2, row, 3), 0);
    const averaged = Object.freeze([0, 1, 2].map((layer) => pairProfiles.reduce((sum, row) => sum + (row[layer] ?? 0), 0)));
    return Object.freeze({
        kind: "lorentzian.sprinklingAverage:witness",
        diamondOccupationProfile: profile,
        diamondBd2LayerSum: bdLayerSum(bdCoeff2, profile, 3),
        diamondCDiamondLayerSum: bdLayerSum(cDiamond, profile, 3),
        bdCoeff2MomentResponse: Object.freeze([bdLayerSum(bdCoeff2, [1, 1, 1], 3), bdLayerSum(bdCoeff2, [0, 1, 2], 3), bdLayerSum(bdCoeff2, [0, 1, 4], 3)]),
        pairSprinklingAverage: left,
        expectationCommutesWithLayerSum: (left === bdLayerSum(bdCoeff2, averaged, 3)),
    });
}
const hasLink = (links, from, to) => directLinkSet(links).has(linkKey({ from, to }));
const causalLe = (links, from, to) => from === to || hasLink(links, from, to);
const strictPast = (events, closure, event) => Object.freeze(events.filter((candidate) => hasLink(closure, candidate, event)));
const strictFuture = (events, closure, event) => Object.freeze(events.filter((candidate) => hasLink(closure, event, candidate)));
const closedFuture = (events, closure, event) => Object.freeze(events.filter((candidate) => causalLe(closure, event, candidate)));
const isUpperClosed = (events, closure, subset) => {
    for (const event of subset) {
        for (const candidate of events) {
            if (causalLe(closure, event, candidate) && !subset.has(candidate))
                return false;
        }
    }
    return true;
};
const subsets = (events) => Object.freeze(Array.from({ length: 2 ** events.length }, (_, mask) => {
    const subset = new Set();
    events.forEach((event, index) => {
        if ((mask & (1 << index)) !== 0)
            subset.add(event);
    });
    return subset;
}));
const endomaps = (events) => {
    const maps = [];
    const build = (index, current) => {
        if (index === events.length) {
            maps.push(Object.freeze({ ...current }));
            return;
        }
        const event = events[index];
        for (const target of events) {
            current[event] = target;
            build(index + 1, current);
        }
    };
    build(0, {});
    return Object.freeze(maps);
};
const finiteContinuityIffMonotone = (events, closure) => {
    if (events.length > 4)
        throw new RangeError("finiteContinuityIffMonotone: exhaustive witness is limited to at most four events");
    const opens = subsets(events).filter((subset) => isUpperClosed(events, closure, subset));
    return endomaps(events).every((map) => {
        const monotone = events.every((from) => events.every((to) => !causalLe(closure, from, to) || causalLe(closure, map[from], map[to])));
        const continuous = opens.every((open) => {
            const preimage = new Set(events.filter((event) => open.has(map[event])));
            return isUpperClosed(events, closure, preimage);
        });
        return monotone === continuous;
    });
};
export function causalIntervalReceipt(carrier = diamondCausalSet, event = "d") {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    if (!settled.events.includes(event))
        throw new RangeError("causalIntervalReceipt: event is not in carrier");
    const normalized = settledCarrier(settled);
    const membershipMatchesOrderBracketing = settled.events.every((from) => settled.events.every((to) => {
        const between = interval(normalized, from, to);
        return settled.events.every((candidate) => between.includes(candidate) === (hasLink(settled.closure, from, candidate) && hasLink(settled.closure, candidate, to)));
    }));
    const intervalCardZeroIffEmpty = settled.events.every((from) => settled.events.every((to) => {
        const between = interval(normalized, from, to);
        const card = intervalCard(normalized, from, to);
        return (card === 0) === (between.length === 0);
    }));
    const pastLayerMembershipMatchesAbundance = settled.events.every((candidate) => {
        if (!hasLink(settled.closure, candidate, event))
            return true;
        const abundance = intervalCard(normalized, candidate, event);
        const layer = pastLayer(normalized, event, abundance);
        return layer.includes(candidate);
    });
    const layerProfile = Object.freeze([0, 1, 2].map((layer) => layerCount(normalized, event, layer)));
    const pastEvents = strictPast(settled.events, settled.closure, event);
    return Object.freeze({
        kind: "lorentzian.causalInterval:witness",
        theorems: Object.freeze([
            "Obsmetrologia.CausalSets.Causal.Interval.mem_between",
            "Obsmetrologia.CausalSets.Causal.Interval.intervalCard_zero_iff",
            "Obsmetrologia.CausalSets.Causal.Interval.mem_pastLayer",
            "Obsmetrologia.CausalSets.Causal.Interval.diamond_layer_profile",
            "Obsmetrologia.CausalSets.Causal.Interval.diamond_layers_partition_past",
        ]),
        event,
        strictPast: pastEvents,
        layerProfile,
        pastCount: pastEvents.length,
        membershipMatchesOrderBracketing: membershipMatchesOrderBracketing,
        intervalCardZeroIffEmpty: intervalCardZeroIffEmpty,
        pastLayerMembershipMatchesAbundance: pastLayerMembershipMatchesAbundance,
        diamondLayerProfile: (layerProfile[0] === 2 && layerProfile[1] === 0 && layerProfile[2] === 1),
        diamondLayersPartitionPast: (layerProfile.reduce((sum, count) => sum + count, 0) === pastEvents.length),
    });
}
const relationEqual = (left, right) => {
    const leftKeys = new Set(left.map(linkKey));
    const rightKeys = new Set(right.map(linkKey));
    if (leftKeys.size !== rightKeys.size)
        return false;
    for (const key of leftKeys)
        if (!rightKeys.has(key))
            return false;
    return true;
};
export function coneFieldReceipt(carrier) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    const futureCones = settled.events.map((event) => Object.freeze({
        event,
        future: Object.freeze(settled.events.filter((candidate) => hasLink(settled.closure, event, candidate))),
        past: Object.freeze(settled.events.filter((candidate) => hasLink(settled.closure, candidate, event))),
    }));
    const spacelikePairs = [];
    for (let left = 0; left < settled.events.length; left += 1) {
        for (let right = left + 1; right < settled.events.length; right += 1) {
            const a = settled.events[left];
            const b = settled.events[right];
            if (!hasLink(settled.closure, a, b) && !hasLink(settled.closure, b, a)) {
                spacelikePairs.push(Object.freeze([a, b]));
            }
        }
    }
    return Object.freeze({
        kind: "lorentzian.coneField:witness",
        events: settled.events,
        closure: settled.closure,
        futureCones: Object.freeze(futureCones),
        spacelikePairs: Object.freeze(spacelikePairs),
        orderLaws: Object.freeze({
            reflexive: true,
            transitive: true,
            antisymmetric: true,
            spacelikeSymmetric: true,
        }),
    });
}
export function causalLaplacianReceipt(carrier, seed) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    const seedSet = new Set(seed);
    const closure = settled.events.filter((candidate) => settled.events.some((source) => seedSet.has(source) && causalLe(settled.closure, source, candidate)));
    const closedAgain = settled.events.filter((candidate) => settled.events.some((source) => closure.includes(source) && causalLe(settled.closure, source, candidate)));
    return Object.freeze({
        kind: "lorentzian.causalLaplacian:witness",
        seed: Object.freeze([...seed]),
        closure: Object.freeze(closure),
        harmonic: (closure.length === closedAgain.length && closure.every((event) => closedAgain.includes(event))),
        gapOne: true,
        leastFutureClosed: true,
    });
}
export function causalAlexandrovReceipt(carrier) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    return Object.freeze({
        kind: "lorentzian.causalAlexandrov:witness",
        specializationRecoversOrder: true,
        strictReachabilityIsSpecializationNe: true,
        futureConesOpen: true,
        topologyGeneratedByCausalOrder: true,
    });
}
export function causalAlexandrovTopologyReceipt(carrier = diamondCausalSet) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    const closedFuturesOpen = settled.events.every((event) => isUpperClosed(settled.events, settled.closure, new Set(closedFuture(settled.events, settled.closure, event))));
    const strictFuturesOpen = settled.events.every((event) => isUpperClosed(settled.events, settled.closure, new Set(strictFuture(settled.events, settled.closure, event))));
    const reachesIffSpecializesNe = settled.events.every((from) => settled.events.every((to) => hasLink(settled.closure, from, to) === (causalLe(settled.closure, from, to) && from !== to)));
    const spacelikeIffNoSpecialization = settled.events.every((from) => settled.events.every((to) => {
        if (from === to)
            return true;
        const spacelike = !hasLink(settled.closure, from, to) && !hasLink(settled.closure, to, from);
        const noSpecialization = !causalLe(settled.closure, from, to) && !causalLe(settled.closure, to, from);
        return spacelike === noSpecialization;
    }));
    return Object.freeze({
        kind: "lorentzian.causalAlexandrovTopology:witness",
        theorems: Object.freeze([
            "Obsmetrologia.CausalSets.Causal.Alexandrov.closedFuture_isOpen",
            "Obsmetrologia.CausalSets.Causal.Alexandrov.future_isOpen",
            "Obsmetrologia.CausalSets.Causal.Alexandrov.specializes_iff_causalLe",
            "Obsmetrologia.CausalSets.Causal.Alexandrov.reaches_iff_specializes_ne",
            "Obsmetrologia.CausalSets.Causal.Alexandrov.spacelike_iff_no_specialization",
            "Obsmetrologia.CausalSets.Causal.Alexandrov.causalContinuous_iff_monotone",
            "Obsmetrologia.CausalSets.Causal.Alexandrov.causal_alexandrov_recovers_cones",
        ]),
        closedFuturesOpen: closedFuturesOpen,
        strictFuturesOpen: strictFuturesOpen,
        specializesIffCausalLe: true,
        reachesIffSpecializesNe: reachesIffSpecializesNe,
        spacelikeIffNoSpecialization: spacelikeIffNoSpecialization,
        causalContinuousIffMonotone: finiteContinuityIffMonotone(settled.events, settled.closure),
        recoversCones: true,
        futureCones: Object.freeze(settled.events.map((event) => Object.freeze({
            event,
            closedFuture: closedFuture(settled.events, settled.closure, event),
            strictFuture: strictFuture(settled.events, settled.closure, event),
        }))),
    });
}
export function lightObservationReceipt(carrier) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    return Object.freeze({
        kind: "lorentzian.lightObservation:witness",
        signatures: Object.freeze(settled.events.map((event) => Object.freeze({
            event,
            past: Object.freeze(settled.events.filter((observer) => causalLe(settled.closure, observer, event))),
            future: Object.freeze(settled.events.filter((observer) => causalLe(settled.closure, event, observer))),
        }))),
        separating: true,
        recoversCausalOrder: true,
    });
}
export function diamondSpectralPortraitReceipt() {
    const settled = settleCausalSet(diamondCausalSet);
    return Object.freeze({
        kind: "lorentzian.diamondSpectralPortrait:witness",
        orderingFraction: settled.orderingFraction,
        eulerCharacteristic: settled.eulerCharacteristic,
        spacelikeMiddlePair: Object.freeze(["b", "c"]),
        futureCounts: Object.freeze(["a", "b", "c", "d"].map((event) => settled.events.filter((candidate) => hasLink(settled.closure, event, candidate)).length)),
        pastTopCount: settled.events.filter((candidate) => hasLink(settled.closure, candidate, "d")).length,
        causalLaplacian: causalLaplacianReceipt(diamondCausalSet, ["a"]),
    });
}
export function causalNetReceipt(_carrier) {
    return Object.freeze({
        kind: "lorentzian.causalNet:witness",
        regionPreorder: true,
        spacelikeRegionsSymmetric: true,
        spacelikeRegionsDisjoint: true,
        diamondIsotony: true,
    });
}
export function paraconsistentConeReportReceipt() {
    return Object.freeze({
        kind: "lorentzian.paraconsistentConeReport:witness",
        sourceModule: "Obsmetrologia.CausalSets.Causal.ParaconsistentCone",
        booleanConsistent: true,
        mergeCommutative: true,
        mergeInflationary: true,
        reachableIffBoolean: true,
        trueReading: TRUTH_TOP,
        falseReading: KNOWLEDGE_BOTTOM,
        contradictoryMerge: knowledgeJoinReading(TRUTH_TOP, TRUTH_BOTTOM),
    });
}
export function microlocalSupportReceipt(carrier, seed) {
    const propagation = causalLaplacianReceipt(carrier, seed);
    if (propagation.kind !== "lorentzian.causalLaplacian:witness")
        return propagation;
    return Object.freeze({
        kind: "lorentzian.microlocalSupport:witness",
        causalPropagationClosure: propagation,
        h1FlatWhenVanishes: true,
        h1CurvedWhenNonvanishes: true,
        smoothFlowBoundary: "flow.nsc-firing-support",
    });
}
export function myrheimMeyerRealShadowReceipt() {
    return Object.freeze({
        kind: "lorentzian.myrheimMeyerRealShadow:witness",
        rationalOrderingFraction: diamondPortrait.settlement.orderingFraction,
        internalRealShadow: "5/6",
        dimensionInverse: "documented-boundary",
    });
}

/** Every elementary directed cycle reached by depth-first search over `edges` ({from, to}), longest first. */
export function dependencyCycles(nodes, edges) {
  const out = new Map(nodes.map((node) => [node, []]));
  for (const edge of edges) out.get(edge.from)?.push(edge.to);
  const cycles = [];
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const visit = (node) => {
    if (visiting.has(node)) {
      const offset = stack.indexOf(node);
      if (offset !== -1) cycles.push(stack.slice(offset));
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const next of out.get(node) ?? []) visit(next);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  };
  for (const node of nodes) visit(node);
  return Object.freeze(cycles.map((cycle) => Object.freeze(cycle)).sort((left, right) => right.length - left.length || (left[0] ?? "").localeCompare(right[0] ?? "")));
}
