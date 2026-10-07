/**
 * analysis/bitopological-settling-site - finite executable shadow of
 * RelMath.Cohomology.BitopologicalSettlingSite.
 *
 * The site is built from the pairwise-Stone clopen Boolean algebra already
 * carried by `pairwise-stone-clopen`: objects vary by predicate, settling
 * stratum, and clopen; covers are fixed-fiber finite clopen join-covers.
 */
import { allClopens, bot, clopenLatticeReceipt, join, meet, top, } from "./pairwise-stone-clopen.mjs";
const assertNat = (name, value) => {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new TypeError(`${name} must be a safe natural number`);
    }
    return value;
};
export const sameClopen = (left, right) => left.plus === right.plus && left.minus === right.minus;
export const sub = (left, right) => sameClopen(meet(left, right), left);
export const advances = (tau, tauPrime) => assertNat("tau", tau) <= assertNat("tauPrime", tauPrime);
export function siteObject(predicate, tauInput, clopen) {
    if (predicate.length === 0)
        throw new TypeError("siteObject: predicate must be nonempty");
    return Object.freeze({
        kind: "bitopologicalSettlingSite.object",
        predicate,
        tau: assertNat("tau", tauInput),
        clopen,
    });
}
export function joinList(family) {
    return family.reduceRight((acc, value) => join(value, acc), bot);
}
export function covers(target, family) {
    return family.every((member) => sub(member, target)) && sameClopen(joinList(family), target);
}
export function coverReceipt(target, familyInput) {
    const family = Object.freeze([...familyInput]);
    const joined = joinList(family);
    const everyMemberSubTarget = family.every((member) => sub(member, target));
    const joinEqualsTarget = sameClopen(joined, target);
    if (!everyMemberSubTarget || !joinEqualsTarget) {
        throw new TypeError("coverReceipt: family is not a fixed-fiber clopen join-cover");
    }
    return Object.freeze({
        kind: "bitopologicalSettlingSite.cover:witness",
        target,
        family,
        join: joined,
        everyMemberSubTarget: true,
        joinEqualsTarget: true,
    });
}
export function pullbackCover(target, coverFamily, along) {
    if (!covers(target, coverFamily))
        throw new TypeError("pullbackCover: source family must cover target");
    if (!sub(along, target))
        throw new TypeError("pullbackCover: pullback clopen must be below target");
    return coverReceipt(along, coverFamily.map((member) => meet(along, member)));
}
export function temporalCoverReceipt(source = siteObject("q", 0, top), target = siteObject("q", 2, top)) {
    const temporalAdvance = source.predicate === target.predicate
        && sameClopen(source.clopen, target.clopen)
        && advances(source.tau, target.tau);
    if (!temporalAdvance)
        throw new TypeError("temporalCoverReceipt: expected same-fiber temporal advancement");
    return Object.freeze({
        kind: "bitopologicalSettlingSite.noTemporalCovers:witness",
        source,
        target,
        advances: true,
        strictAdvance: source.tau < target.tau,
        sameClopen: true,
        fiberCoverSeenByJ: coverReceipt(target.clopen, [source.clopen]),
        topologyMentionsTau: false,
        temporalContentInMorphismsNotCovers: true,
    });
}
const partialOrderHolds = () => {
    const refl = allClopens.every((value) => sub(value, value));
    const trans = allClopens.every((a) => allClopens.every((b) => allClopens.every((c) => !sub(a, b) || !sub(b, c) || sub(a, c))));
    const antisym = allClopens.every((a) => allClopens.every((b) => !sub(a, b) || !sub(b, a) || sameClopen(a, b)));
    return refl && trans && antisym;
};
const advancesPreorderHolds = () => [0, 1, 2].every((tau) => advances(tau, tau))
    && advances(0, 1)
    && advances(1, 2)
    && advances(0, 2);
export function receipt() {
    const singletonTop = coverReceipt(top, [top]);
    const twoPieceTop = coverReceipt(top, [
        allClopens.find((value) => value.plus && !value.minus) ?? bot,
        allClopens.find((value) => !value.plus && value.minus) ?? bot,
    ]);
    const pulledBack = pullbackCover(top, twoPieceTop.family, allClopens.find((value) => value.plus && !value.minus) ?? bot);
    const transitive = coverReceipt(top, [top, bot]);
    const clopenSubPartialOrder = partialOrderHolds();
    const preorder = advancesPreorderHolds();
    const grothendieckBasisAxioms = covers(top, [top])
        && covers(pulledBack.target, pulledBack.family)
        && covers(transitive.target, transitive.family);
    const strictRegimeFiniteFiber = allClopens.length === 4;
    if (!clopenSubPartialOrder || !preorder || !grothendieckBasisAxioms || !strictRegimeFiniteFiber) {
        throw new TypeError("bitopologicalSettlingSite.receipt: finite site laws failed");
    }
    return Object.freeze({
        kind: "bitopologicalSettlingSite.receipt:witness",
        clopens: allClopens,
        lattice: clopenLatticeReceipt(),
        identityCover: singletonTop,
        pulledBackCover: pulledBack,
        transitiveCover: transitive,
        temporal: temporalCoverReceipt(),
        clopenSubPartialOrder: true,
        advancesPreorder: true,
        grothendieckBasisAxioms: true,
        strictRegimeFiniteFiber: true,
        noTemporalCovers: true,
        frontier: "general predicate reindexing and non-finite Grothendieck sites remain proof/kernel obligations",
    });
}
