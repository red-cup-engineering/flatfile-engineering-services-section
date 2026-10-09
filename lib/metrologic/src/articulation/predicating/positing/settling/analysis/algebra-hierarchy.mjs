/**
 * analysis/algebra-hierarchy - finite executable shadow of
 * RelMath.Order.AlgebraHierarchy.
 *
 * Lean packages the algebra tower as structures and exhibits concrete shadows:
 * Boolean field F2, Klein-four group K4, and commutative monoids obtained from
 * lattice meet/join and residuated fusion. This module checks those finite
 * tables as carrier-shaped receipts.
 */
import { assertIndex, booleanLatticeSystem, requireBinaryTable, } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/order-infra";
import { twoBooleanResiduatedLattice, } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/residuated-lattice";
import { readingFamilies, samePoint, gauge, gaugeElementNames } from "@red-cup-engineering/computer-data-engineering-services-section/four";
const freezeTable = (table) => Object.freeze(table.map((row) => Object.freeze([...row])));
export function finiteBinaryAlgebra(labels, op) {
    if (labels.length === 0)
        throw new RangeError("finiteBinaryAlgebra: carrier must be nonempty");
    requireBinaryTable("finiteBinaryAlgebra op", op, labels.length, "row count must match carrier size");
    return Object.freeze({
        kind: "algebraHierarchy.finiteBinaryAlgebra",
        labels: Object.freeze([...labels]),
        op: freezeTable(op),
    });
}
const opAt = (algebra, left, right) => algebra.op[left]?.[right];
const obstruction = (law, labels, indices, left, right) => Object.freeze({
    kind: "algebraHierarchy.obstruction",
    law,
    indices: Object.freeze([...indices]),
    labels: Object.freeze(indices.map((index) => labels[index])),
    left,
    right,
});
export function commutativeMonoid(algebra, one) {
    assertIndex("commutativeMonoid one", one, algebra.labels.length);
    const size = algebra.labels.length;
    for (let a = 0; a < size; a += 1) {
        if (opAt(algebra, one, a) !== a)
            return obstruction("leftIdentity", algebra.labels, [one, a], opAt(algebra, one, a), a);
        if (opAt(algebra, a, one) !== a)
            return obstruction("rightIdentity", algebra.labels, [a, one], opAt(algebra, a, one), a);
        for (let b = 0; b < size; b += 1) {
            if (opAt(algebra, a, b) !== opAt(algebra, b, a))
                return obstruction("comm", algebra.labels, [a, b], opAt(algebra, a, b), opAt(algebra, b, a));
            for (let c = 0; c < size; c += 1) {
                if (opAt(algebra, opAt(algebra, a, b), c) !== opAt(algebra, a, opAt(algebra, b, c))) {
                    return obstruction("assoc", algebra.labels, [a, b, c], opAt(algebra, opAt(algebra, a, b), c), opAt(algebra, a, opAt(algebra, b, c)));
                }
            }
        }
    }
    for (let candidate = 0; candidate < size; candidate += 1) {
        const twoSided = Array.from({ length: size }, (_, point) => opAt(algebra, candidate, point) === point && opAt(algebra, point, candidate) === point).every(Boolean);
        if (twoSided && candidate !== one)
            return obstruction("identityUnique", algebra.labels, [candidate, one], candidate, one);
    }
    return Object.freeze({
        kind: "algebraHierarchy.commutativeMonoid:witness",
        carrier: algebra.labels,
        one,
        oneLabel: algebra.labels[one],
        associative: true,
        leftIdentity: true,
        rightIdentity: true,
        commutative: true,
        identityUnique: true,
    });
}
export function abelianGroup(algebra, one, inverses) {
    if (inverses.length !== algebra.labels.length)
        throw new RangeError("abelianGroup: inverse table length must match carrier size");
    inverses.forEach((inverse, index) => assertIndex(`abelianGroup inverses[${index}]`, inverse, algebra.labels.length));
    const monoid = commutativeMonoid(algebra, one);
    if (monoid.kind !== "algebraHierarchy.commutativeMonoid:witness")
        return monoid;
    const size = algebra.labels.length;
    for (let a = 0; a < size; a += 1) {
        const inv = inverses[a];
        if (opAt(algebra, inv, a) !== one)
            return obstruction("leftInverse", algebra.labels, [inv, a, one], opAt(algebra, inv, a), one);
        if (opAt(algebra, a, inv) !== one)
            return obstruction("rightInverse", algebra.labels, [a, inv, one], opAt(algebra, a, inv), one);
        for (let b = 0; b < size; b += 1) {
            for (let c = 0; c < size; c += 1) {
                if (opAt(algebra, a, b) === opAt(algebra, a, c) && b !== c) {
                    return obstruction("leftCancel", algebra.labels, [a, b, c], b, c);
                }
            }
        }
    }
    return Object.freeze({
        ...monoid,
        kind: "algebraHierarchy.abelianGroup:witness",
        inverses: Object.freeze([...inverses]),
        leftInverse: true,
        rightInverse: true,
        leftCancel: true,
    });
}
export function finiteFieldSystem(labels, add, mul, zero, one, neg, inv) {
    if (labels.length === 0)
        throw new RangeError("finiteFieldSystem: carrier must be nonempty");
    requireBinaryTable("finiteFieldSystem add", add, labels.length);
    requireBinaryTable("finiteFieldSystem mul", mul, labels.length);
    assertIndex("finiteFieldSystem zero", zero, labels.length);
    assertIndex("finiteFieldSystem one", one, labels.length);
    if (neg.length !== labels.length || inv.length !== labels.length)
        throw new RangeError("finiteFieldSystem: neg/inv length must match carrier size");
    neg.forEach((target, index) => assertIndex(`finiteFieldSystem neg[${index}]`, target, labels.length));
    inv.forEach((target, index) => assertIndex(`finiteFieldSystem inv[${index}]`, target, labels.length));
    return Object.freeze({
        kind: "algebraHierarchy.finiteFieldSystem",
        labels: Object.freeze([...labels]),
        add: freezeTable(add),
        mul: freezeTable(mul),
        zero,
        one,
        neg: Object.freeze([...neg]),
        inv: Object.freeze([...inv]),
    });
}
const addAt = (field, left, right) => field.add[left]?.[right];
const mulAt = (field, left, right) => field.mul[left]?.[right];
export function field(fieldSystem) {
    const size = fieldSystem.labels.length;
    if (fieldSystem.zero === fieldSystem.one)
        return obstruction("zeroNeOne", fieldSystem.labels, [fieldSystem.zero, fieldSystem.one], fieldSystem.zero, fieldSystem.one);
    for (let a = 0; a < size; a += 1) {
        if (addAt(fieldSystem, a, fieldSystem.zero) !== a)
            return obstruction("addZero", fieldSystem.labels, [a, fieldSystem.zero], addAt(fieldSystem, a, fieldSystem.zero), a);
        if (addAt(fieldSystem, fieldSystem.zero, a) !== a)
            return obstruction("zeroAdd", fieldSystem.labels, [fieldSystem.zero, a], addAt(fieldSystem, fieldSystem.zero, a), a);
        if (mulAt(fieldSystem, fieldSystem.one, a) !== a)
            return obstruction("oneMul", fieldSystem.labels, [fieldSystem.one, a], mulAt(fieldSystem, fieldSystem.one, a), a);
        if (mulAt(fieldSystem, a, fieldSystem.one) !== a)
            return obstruction("mulOne", fieldSystem.labels, [a, fieldSystem.one], mulAt(fieldSystem, a, fieldSystem.one), a);
        if (mulAt(fieldSystem, fieldSystem.zero, a) !== fieldSystem.zero)
            return obstruction("zeroMul", fieldSystem.labels, [fieldSystem.zero, a], mulAt(fieldSystem, fieldSystem.zero, a), fieldSystem.zero);
        if (mulAt(fieldSystem, a, fieldSystem.zero) !== fieldSystem.zero)
            return obstruction("mulZero", fieldSystem.labels, [a, fieldSystem.zero], mulAt(fieldSystem, a, fieldSystem.zero), fieldSystem.zero);
        if (addAt(fieldSystem, fieldSystem.neg[a], a) !== fieldSystem.zero)
            return obstruction("addLeftNeg", fieldSystem.labels, [fieldSystem.neg[a], a], addAt(fieldSystem, fieldSystem.neg[a], a), fieldSystem.zero);
        if (a !== fieldSystem.zero && mulAt(fieldSystem, a, fieldSystem.inv[a]) !== fieldSystem.one)
            return obstruction("mulInvCancel", fieldSystem.labels, [a, fieldSystem.inv[a]], mulAt(fieldSystem, a, fieldSystem.inv[a]), fieldSystem.one);
        for (let b = 0; b < size; b += 1) {
            if (addAt(fieldSystem, a, b) !== addAt(fieldSystem, b, a))
                return obstruction("addComm", fieldSystem.labels, [a, b], addAt(fieldSystem, a, b), addAt(fieldSystem, b, a));
            if (mulAt(fieldSystem, a, b) !== mulAt(fieldSystem, b, a))
                return obstruction("mulComm", fieldSystem.labels, [a, b], mulAt(fieldSystem, a, b), mulAt(fieldSystem, b, a));
            for (let c = 0; c < size; c += 1) {
                if (addAt(fieldSystem, addAt(fieldSystem, a, b), c) !== addAt(fieldSystem, a, addAt(fieldSystem, b, c)))
                    return obstruction("addAssoc", fieldSystem.labels, [a, b, c]);
                if (mulAt(fieldSystem, mulAt(fieldSystem, a, b), c) !== mulAt(fieldSystem, a, mulAt(fieldSystem, b, c)))
                    return obstruction("mulAssoc", fieldSystem.labels, [a, b, c]);
                if (mulAt(fieldSystem, a, addAt(fieldSystem, b, c)) !== addAt(fieldSystem, mulAt(fieldSystem, a, b), mulAt(fieldSystem, a, c)))
                    return obstruction("leftDistrib", fieldSystem.labels, [a, b, c]);
                if (mulAt(fieldSystem, addAt(fieldSystem, a, b), c) !== addAt(fieldSystem, mulAt(fieldSystem, a, c), mulAt(fieldSystem, b, c)))
                    return obstruction("rightDistrib", fieldSystem.labels, [a, b, c]);
            }
        }
    }
    if (fieldSystem.inv[fieldSystem.zero] !== fieldSystem.zero)
        return obstruction("invZero", fieldSystem.labels, [fieldSystem.zero], fieldSystem.inv[fieldSystem.zero], fieldSystem.zero);
    return Object.freeze({
        kind: "algebraHierarchy.field:witness",
        carrier: fieldSystem.labels,
        zero: fieldSystem.zero,
        zeroLabel: fieldSystem.labels[fieldSystem.zero],
        one: fieldSystem.one,
        oneLabel: fieldSystem.labels[fieldSystem.one],
        additiveGroup: true,
        multiplicativeMonoid: true,
        distributive: true,
        zeroAnnihilates: true,
        additiveInverses: true,
        multiplicativeCommutative: true,
        multiplicativeInverses: true,
        invZero: true,
        zeroNeOne: true,
        zeroUnique: true,
    });
}
const composeGauge = (left, right) => {
    const images = readingFamilies.knowledge.map((name) => gauge(left, gauge(right, name)));
    const found = gaugeElementNames.find((candidate) => readingFamilies.knowledge.every((name, index) => samePoint(gauge(candidate, name), images[index])));
    if (found === undefined)
        throw new TypeError("composeGauge: K4 composition left the gauge set");
    return found;
};
const indexByLabel = (labels, label) => {
    const index = labels.indexOf(label);
    if (index < 0)
        throw new RangeError(`missing label: ${label}`);
    return index;
};
export const boolFieldSystem = finiteFieldSystem(["false", "true"], [
    [0, 1],
    [1, 0],
], [
    [0, 0],
    [0, 1],
], 0, 1, [0, 1], [0, 1]);
export const kleinFourAlgebra = finiteBinaryAlgebra(gaugeElementNames, gaugeElementNames.map((left) => gaugeElementNames.map((right) => indexByLabel(gaugeElementNames, composeGauge(left, right)))));
export const booleanMeetMonoidAlgebra = finiteBinaryAlgebra(booleanLatticeSystem.labels, booleanLatticeSystem.meet);
export const booleanJoinMonoidAlgebra = finiteBinaryAlgebra(booleanLatticeSystem.labels, booleanLatticeSystem.join);
export const booleanFuseMonoidAlgebra = finiteBinaryAlgebra(twoBooleanResiduatedLattice.lattice.labels, twoBooleanResiduatedLattice.fuse);
/** Concrete finite receipt for the Lean AlgebraHierarchy worked examples. */
export function algebraHierarchy() {
    const bool = field(boolFieldSystem);
    if (bool.kind !== "algebraHierarchy.field:witness")
        return bool;
    const k4 = abelianGroup(kleinFourAlgebra, indexByLabel(kleinFourAlgebra.labels, "id"), [0, 1, 2, 3]);
    if (k4.kind !== "algebraHierarchy.abelianGroup:witness")
        return k4;
    const meet = commutativeMonoid(booleanMeetMonoidAlgebra, 1);
    if (meet.kind !== "algebraHierarchy.commutativeMonoid:witness")
        return meet;
    const join = commutativeMonoid(booleanJoinMonoidAlgebra, 0);
    if (join.kind !== "algebraHierarchy.commutativeMonoid:witness")
        return join;
    const fuse = commutativeMonoid(booleanFuseMonoidAlgebra, 1);
    if (fuse.kind !== "algebraHierarchy.commutativeMonoid:witness")
        return fuse;
    return Object.freeze({
        kind: "algebraHierarchy.receipt:witness",
        boolField: bool,
        kleinFourGroup: k4,
        meetMonoid: meet,
        joinMonoid: join,
        fuseMonoid: fuse,
        orderToAlgebraCollapse: true,
    });
}
