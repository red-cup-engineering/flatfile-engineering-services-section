/**
 * analysis/regime-time-section - finite causal past-count time sections.
 *
 * Executable shadow for `RelMath.Lorentzian.RegimeTimeSection`: the global
 * time function `t(x) = |past(x)|`, strictly increasing along finite settled
 * causal orders, with the corpus diamond section `(0,1,1,3)`.
 */
import { diamondCausalSet, isCausalSettlementObstruction, settleCausalSet, } from "./causal.mjs";
function hasLink(carrier, from, to) {
    return carrier.links.some((link) => link.from === from && link.to === to);
}
function settledCarrier(carrier) {
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    return Object.freeze({ kind: "lorentzian.causalSet", events: settled.events, links: settled.closure });
}
/** The discrete global time function `t(x) = |past(x)|`. */
export function timeSection(carrier, event) {
    const settled = settledCarrier(carrier);
    if (isCausalSettlementObstruction(settled))
        return settled;
    return settled.events.filter((candidate) => hasLink(settled, candidate, event)).length;
}
/** The full finite time profile, event by event. */
export function timeProfile(carrier) {
    const settled = settledCarrier(carrier);
    if (isCausalSettlementObstruction(settled))
        return settled;
    return Object.freeze(Object.fromEntries(settled.events.map((event) => [event, timeSection(settled, event)])));
}
/** Check `x < y` in the causal order implies `t(x) < t(y)`. */
export function timeSectionStrictMonotone(carrier) {
    const settled = settledCarrier(carrier);
    if (isCausalSettlementObstruction(settled))
        return settled;
    const profile = timeProfile(settled);
    return settled.links.every((link) => (profile[link.from] ?? 0) < (profile[link.to] ?? 0));
}
/** Bundle the finite global time-section witness. */
export function regimeTimeSectionReceipt(carrier = diamondCausalSet) {
    const profile = timeProfile(carrier);
    if (isCausalSettlementObstruction(profile))
        return profile;
    const strict = timeSectionStrictMonotone(carrier);
    if (isCausalSettlementObstruction(strict))
        return strict;
    if (!strict)
        throw new TypeError("regimeTimeSection.receipt: expected a strictly monotone finite causal time section");
    const diamondProfile = timeProfile(diamondCausalSet);
    const diamondStrictPairs = Object.freeze(diamondCausalSet.links
        .filter((link) => diamondProfile[link.from] < diamondProfile[link.to])
        .map((link) => `${link.from}<${link.to}`));
    return Object.freeze({
        kind: "lorentzian.regimeTimeSection:witness",
        profile,
        strictMonotone: true,
        diamondTimeSection: diamondProfile,
        diamondStrictPairs,
        ordinalBound: "finite-sub-omega",
        stableCausalityBoundary: "aperiodic biconditional remains frontier",
    });
}
