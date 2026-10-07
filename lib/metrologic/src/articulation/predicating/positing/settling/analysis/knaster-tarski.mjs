/**
 * analysis/knaster-tarski - finite executable shadow of
 * RelMath.Order.KnasterTarskiStandalone.
 *
 * Lean proves the abstract complete-lattice theorem. This module carries the
 * finite table version: a finite complete lattice relation plus a monotone
 * endomap table yields least/greatest fixed-point receipts.
 */
import { assertIndex, completeLattice, monotoneMap, } from "./order-infra.mjs";
const leAt = (system, left, right) => {
    assertIndex("knasterTarski left", left, system.labels.length);
    assertIndex("knasterTarski right", right, system.labels.length);
    return system.le[left]?.[right] === true;
};
const requireEndomap = (map, size) => {
    if (map.length !== size)
        throw new RangeError("finiteMonotoneEndomap: map length must match carrier size");
    map.forEach((target, index) => assertIndex(`finiteMonotoneEndomap[${index}]`, target, size));
};
export function finiteMonotoneEndomap(order, map) {
    requireEndomap(map, order.labels.length);
    return Object.freeze({
        kind: "knasterTarski.finiteMonotoneEndomap",
        order,
        map: Object.freeze([...map]),
    });
}
const carrierIndices = (size) => Object.freeze(Array.from({ length: size }, (_, index) => index));
const isUpperBound = (system, subset, candidate) => subset.every((member) => leAt(system, member, candidate));
const isLowerBound = (system, subset, candidate) => subset.every((member) => leAt(system, candidate, member));
const leastElements = (system, candidates) => Object.freeze(candidates.filter((candidate) => candidates.every((other) => leAt(system, candidate, other))));
const greatestElements = (system, candidates) => Object.freeze(candidates.filter((candidate) => candidates.every((other) => leAt(system, other, candidate))));
const lub = (system, subset) => {
    const carrier = carrierIndices(system.labels.length);
    return leastElements(system, carrier.filter((candidate) => isUpperBound(system, subset, candidate)));
};
const glb = (system, subset) => {
    const carrier = carrierIndices(system.labels.length);
    return greatestElements(system, carrier.filter((candidate) => isLowerBound(system, subset, candidate)));
};
/** Finite Knaster-Tarski receipt: monotone endomap on a finite complete lattice. */
export function fixedPoints(endomap) {
    const { order, map } = endomap;
    const complete = completeLattice(order);
    if (complete.kind !== "orderInfra.completeLattice:witness") {
        return Object.freeze({
            kind: "knasterTarski.fixedPoints-obstruction",
            reason: "completeLattice",
            completeLattice: complete,
        });
    }
    const monotone = monotoneMap(order, order, map);
    if (monotone.kind !== "orderInfra.monotoneMap:witness") {
        return Object.freeze({
            kind: "knasterTarski.fixedPoints-obstruction",
            reason: "monotone",
            monotone,
        });
    }
    const carrier = carrierIndices(order.labels.length);
    const prefixPoints = carrier.filter((point) => leAt(order, map[point], point));
    const postfixPoints = carrier.filter((point) => leAt(order, point, map[point]));
    const fixedPointSet = carrier.filter((point) => map[point] === point);
    const lfpCandidates = glb(order, prefixPoints);
    const gfpCandidates = lub(order, postfixPoints);
    if (lfpCandidates.length !== 1) {
        return Object.freeze({
            kind: "knasterTarski.fixedPoints-obstruction",
            reason: "lfp-infimum",
            candidates: lfpCandidates,
            candidateLabels: Object.freeze(lfpCandidates.map((index) => order.labels[index])),
        });
    }
    if (gfpCandidates.length !== 1) {
        return Object.freeze({
            kind: "knasterTarski.fixedPoints-obstruction",
            reason: "gfp-supremum",
            candidates: gfpCandidates,
            candidateLabels: Object.freeze(gfpCandidates.map((index) => order.labels[index])),
        });
    }
    const lfp = lfpCandidates[0];
    const gfp = gfpCandidates[0];
    if (map[lfp] !== lfp) {
        return Object.freeze({ kind: "knasterTarski.fixedPoints-obstruction", reason: "lfp-fixed", point: lfp, pointLabel: order.labels[lfp] });
    }
    if (map[gfp] !== gfp) {
        return Object.freeze({ kind: "knasterTarski.fixedPoints-obstruction", reason: "gfp-fixed", point: gfp, pointLabel: order.labels[gfp] });
    }
    const leastFailure = fixedPointSet.find((point) => !leAt(order, lfp, point));
    if (leastFailure !== undefined) {
        return Object.freeze({ kind: "knasterTarski.fixedPoints-obstruction", reason: "lfp-least", point: leastFailure, pointLabel: order.labels[leastFailure] });
    }
    const greatestFailure = fixedPointSet.find((point) => !leAt(order, point, gfp));
    if (greatestFailure !== undefined) {
        return Object.freeze({ kind: "knasterTarski.fixedPoints-obstruction", reason: "gfp-greatest", point: greatestFailure, pointLabel: order.labels[greatestFailure] });
    }
    if (!leAt(order, lfp, gfp)) {
        return Object.freeze({ kind: "knasterTarski.fixedPoints-obstruction", reason: "bracket", point: lfp, pointLabel: order.labels[lfp] });
    }
    return Object.freeze({
        kind: "knasterTarski.fixedPoints:witness",
        carrier: order.labels,
        map: Object.freeze([...map]),
        prefixPoints: Object.freeze(prefixPoints),
        postfixPoints: Object.freeze(postfixPoints),
        fixedPoints: Object.freeze(fixedPointSet),
        lfp,
        lfpLabel: order.labels[lfp],
        gfp,
        gfpLabel: order.labels[gfp],
        lfpFixed: true,
        gfpFixed: true,
        lfpLeast: true,
        gfpGreatest: true,
        lfpLeGfp: true,
    });
}
