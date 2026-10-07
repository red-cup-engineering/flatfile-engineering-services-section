/**
 * analysis/lax-slack - finite executable shadow of RelMath.Closure.LaxSlackDiagnosis.
 *
 * Lean isolates the order-theoretic reason a KZ/lax-idempotent closure collapses
 * to strict idempotence: antisymmetry. This module models that as finite relation
 * and endomap tables, plus a concrete FOUR/knowledge-order no-slack receipt.
 */
import { assertIndex } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/order-infra";
import { readingFamilies, samePoint, knowledgeJoinReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
const requireSquareRelation = (le, size) => {
    if (le.length !== size)
        throw new RangeError("laxSlack: relation row count must match carrier size");
    for (const row of le) {
        if (row.length !== size)
            throw new RangeError("laxSlack: relation must be square");
    }
};
const requireEndomap = (op, size) => {
    if (op.length !== size)
        throw new RangeError("laxSlack: endomap length must match carrier size");
    op.forEach((target, index) => assertIndex(`laxSlack op[${index}]`, target, size));
};
const freezeTable = (le) => Object.freeze(le.map((row) => Object.freeze([...row])));
export function finiteLaxSystem(labels, le, op) {
    if (labels.length === 0)
        throw new RangeError("finiteLaxSystem: carrier must be nonempty");
    requireSquareRelation(le, labels.length);
    requireEndomap(op, labels.length);
    return Object.freeze({
        kind: "laxSlack.finiteSystem",
        labels: Object.freeze([...labels]),
        le: freezeTable(le),
        op: Object.freeze([...op]),
    });
}
const leAt = (system, left, right) => {
    assertIndex("laxSlack left", left, system.labels.length);
    assertIndex("laxSlack right", right, system.labels.length);
    return system.le[left]?.[right] === true;
};
const opAt = (system, point) => {
    assertIndex("laxSlack point", point, system.labels.length);
    return system.op[point];
};
export function antisymmetry(system) {
    for (let left = 0; left < system.labels.length; left += 1) {
        for (let right = 0; right < system.labels.length; right += 1) {
            if (left !== right && leAt(system, left, right) && leAt(system, right, left)) {
                return Object.freeze({
                    kind: "laxSlack.antisymmetry-obstruction",
                    pair: Object.freeze([left, right]),
                    labels: Object.freeze([system.labels[left], system.labels[right]]),
                });
            }
        }
    }
    return Object.freeze({ kind: "laxSlack.antisymmetry:witness", carrier: system.labels });
}
/** Finite carrier for `kz_strict_of_antisymm`: KZ + inflation + antisymmetry force strictness. */
export function kzStrictCollapse(system, point) {
    assertIndex("kzStrictCollapse point", point, system.labels.length);
    const first = opAt(system, point);
    const second = opAt(system, first);
    const inflationAtFirst = leAt(system, first, second);
    const kz = leAt(system, second, first);
    const antisymmetryJudgment = antisymmetry(system);
    const strict = second === first;
    const base = {
        point,
        label: system.labels[point],
        first,
        second,
        firstLabel: system.labels[first],
        secondLabel: system.labels[second],
        inflationAtFirst,
        kz,
        strict,
    };
    if (inflationAtFirst && kz && antisymmetryJudgment.kind === "laxSlack.antisymmetry:witness" && strict) {
        return Object.freeze({ kind: "laxSlack.kzStrictCollapse:witness", ...base, inflationAtFirst: true, kz: true, antisymmetric: true, strict: true });
    }
    return Object.freeze({
        kind: "laxSlack.kzStrictCollapse-obstruction",
        reason: !inflationAtFirst ? "inflation"
            : !kz ? "kz"
                : antisymmetryJudgment.kind !== "laxSlack.antisymmetry:witness" ? "antisymmetry"
                    : "strict",
        ...base,
        antisymmetry: antisymmetryJudgment,
    });
}
/** Finite carrier for `lax_slack_witnesses_antisymmetry_failure`. */
export function laxSlackAntisymmetryFailure(system, point) {
    assertIndex("laxSlackAntisymmetryFailure point", point, system.labels.length);
    const first = opAt(system, point);
    const second = opAt(system, first);
    const kz = leAt(system, second, first);
    const inflationAtFirst = leAt(system, first, second);
    const strict = second === first;
    const base = {
        point,
        label: system.labels[point],
        first,
        second,
        firstLabel: system.labels[first],
        secondLabel: system.labels[second],
        kz,
        inflationAtFirst,
        strict,
    };
    if (kz && inflationAtFirst && !strict) {
        return Object.freeze({
            kind: "laxSlack.antisymmetryFailure:witness",
            ...base,
            kz: true,
            inflationAtFirst: true,
            strict: false,
            antisymmetryFailurePair: Object.freeze([second, first]),
        });
    }
    return Object.freeze({
        kind: "laxSlack.antisymmetryFailure-obstruction",
        reason: !kz ? "kz" : !inflationAtFirst ? "inflation" : "strict",
        ...base,
    });
}
export const twoPointChainSystem = finiteLaxSystem(["bottom", "top"], [
    [true, true],
    [false, true],
], [1, 1]);
export const nonThinLaxSystem = finiteLaxSystem(["x", "y"], [
    [true, true],
    [true, true],
], [1, 0]);
/** Concrete FOUR/knowledge-order receipt: reading join closures have no genuine lax slack. */
export function readingNoLaxSlack(target) {
    const targetValue = target;
    const checked = readingFamilies.knowledge.map((seed) => {
        const first = knowledgeJoinReading(targetValue, seed);
        const second = knowledgeJoinReading(targetValue, first);
        const kz = samePoint(knowledgeJoinReading(second, first), first);
        const strict = samePoint(second, first);
        return Object.freeze({
            seed,
            first,
            second,
            kz,
            strict,
            laxSlack: false,
        });
    });
    return Object.freeze({
        kind: "laxSlack.readingNoLaxSlack:witness",
        target,
        checked: Object.freeze(checked),
        noLaxSlack: true,
    });
}
/** Finite receipt for RelMath.Value.PreValueCategory. */
export function preValueCategoryReceipt() {
    const laxSlack = laxSlackAntisymmetryFailure(nonThinLaxSystem, 0);
    const nonThin = antisymmetry(nonThinLaxSystem);
    const thinCollapse = kzStrictCollapse(twoPointChainSystem, 0);
    if (laxSlack.kind !== "laxSlack.antisymmetryFailure:witness"
        || nonThin.kind !== "laxSlack.antisymmetry-obstruction"
        || thinCollapse.kind !== "laxSlack.kzStrictCollapse:witness") {
        throw new TypeError("preValueCategoryReceipt: finite pre-value/lax-closure laws failed");
    }
    return Object.freeze({
        kind: "preValueCategory.laxClosure:witness",
        nonThinCarrier: nonThinLaxSystem,
        slackAt: 0,
        laxSlackWitness: laxSlack,
        antisymmetryObstruction: nonThin,
        thinCollapse,
        kzInequality: true,
        mutuallyBelowDistinct: true,
        genuineLaxConeNeedsNonThinCarrier: true,
        antisymmetricCarrierCollapsesToIdempotence: true,
    });
}
