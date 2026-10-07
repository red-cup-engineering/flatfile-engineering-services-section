/**
 * analysis/lambek-calculus - finite Lambek algebra law receipts.
 *
 * Executable shadow of RelMath.Order.LambekCalculus. A finite Lambek algebra is
 * represented by a lattice table, a possibly noncommutative product table, and
 * left/right residual tables satisfying the two bi-residuation adjunctions.
 */
import { assertIndex, lattice, requireBinaryTable, } from "./order-infra.mjs";
const freezeTable = (table) => Object.freeze(table.map((row) => Object.freeze([...row])));
export function finiteLambekAlgebraSystem(latticeSystem, unit, dot, lres, rres) {
    assertIndex("finiteLambekAlgebraSystem unit", unit, latticeSystem.labels.length);
    requireBinaryTable("finiteLambekAlgebraSystem dot", dot, latticeSystem.labels.length);
    requireBinaryTable("finiteLambekAlgebraSystem lres", lres, latticeSystem.labels.length);
    requireBinaryTable("finiteLambekAlgebraSystem rres", rres, latticeSystem.labels.length);
    return Object.freeze({
        kind: "lambek.finiteAlgebraSystem",
        lattice: latticeSystem,
        unit,
        dot: freezeTable(dot),
        lres: freezeTable(lres),
        rres: freezeTable(rres),
    });
}
const meetAt = (system, left, right) => system.lattice.meet[left]?.[right];
const leAt = (system, left, right) => meetAt(system, left, right) === left;
const dotAt = (system, left, right) => system.dot[left]?.[right];
const lresAt = (system, left, right) => system.lres[left]?.[right];
const rresAt = (system, numerator, denominator) => system.rres[numerator]?.[denominator];
const obstruction = (reason, system, indices, left, right) => Object.freeze({
    kind: "lambek.laws-obstruction",
    reason,
    indices: Object.freeze([...indices]),
    labels: Object.freeze(indices.map((index) => system.lattice.labels[index])),
    left,
    right,
});
const isCommutative = (system) => system.lattice.labels.every((_, a) => system.lattice.labels.every((__, b) => dotAt(system, a, b) === dotAt(system, b, a)));
/** Finite Lambek algebra law receipt, including derived laws and commutative collapse. */
export function laws(system) {
    const latticeJudgment = lattice(system.lattice);
    if (latticeJudgment.kind !== "orderInfra.lattice:witness") {
        return Object.freeze({
            kind: "lambek.laws-obstruction",
            reason: "lattice",
            lattice: latticeJudgment,
        });
    }
    const size = system.lattice.labels.length;
    for (let a = 0; a < size; a += 1) {
        if (dotAt(system, system.unit, a) !== a)
            return obstruction("dot.unit.left", system, [system.unit, a], dotAt(system, system.unit, a), a);
        if (dotAt(system, a, system.unit) !== a)
            return obstruction("dot.unit.right", system, [a, system.unit], dotAt(system, a, system.unit), a);
        for (let b = 0; b < size; b += 1) {
            for (let c = 0; c < size; c += 1) {
                if (dotAt(system, dotAt(system, a, b), c) !== dotAt(system, a, dotAt(system, b, c))) {
                    return obstruction("dot.assoc", system, [a, b, c], dotAt(system, dotAt(system, a, b), c), dotAt(system, a, dotAt(system, b, c)));
                }
                const dotLe = leAt(system, dotAt(system, a, b), c);
                const leftResLe = leAt(system, b, lresAt(system, a, c));
                if (dotLe !== leftResLe)
                    return obstruction("leftBiResiduation", system, [a, b, c], dotLe, leftResLe);
                const rightResLe = leAt(system, a, rresAt(system, c, b));
                if (dotLe !== rightResLe)
                    return obstruction("rightBiResiduation", system, [a, b, c], dotLe, rightResLe);
                if (leAt(system, a, b) && !leAt(system, dotAt(system, a, c), dotAt(system, b, c))) {
                    return obstruction("fusion.mono.left", system, [a, b, c], dotAt(system, a, c), dotAt(system, b, c));
                }
                if (leAt(system, a, b) && !leAt(system, dotAt(system, c, a), dotAt(system, c, b))) {
                    return obstruction("fusion.mono.right", system, [c, a, b], dotAt(system, c, a), dotAt(system, c, b));
                }
                if (leAt(system, b, c) && !leAt(system, lresAt(system, a, b), lresAt(system, a, c))) {
                    return obstruction("lres.mono.right", system, [a, b, c], lresAt(system, a, b), lresAt(system, a, c));
                }
                if (leAt(system, a, b) && !leAt(system, lresAt(system, b, c), lresAt(system, a, c))) {
                    return obstruction("lres.antitone.left", system, [a, b, c], lresAt(system, b, c), lresAt(system, a, c));
                }
                if (leAt(system, a, b) && !leAt(system, rresAt(system, a, c), rresAt(system, b, c))) {
                    return obstruction("rres.mono.left", system, [a, b, c], rresAt(system, a, c), rresAt(system, b, c));
                }
                if (leAt(system, b, c) && !leAt(system, rresAt(system, a, c), rresAt(system, a, b))) {
                    return obstruction("rres.antitone.right", system, [a, b, c], rresAt(system, a, c), rresAt(system, a, b));
                }
            }
            if (!leAt(system, dotAt(system, a, lresAt(system, a, b)), b)) {
                return obstruction("modusPonens.left", system, [a, b], dotAt(system, a, lresAt(system, a, b)), b);
            }
            if (!leAt(system, dotAt(system, rresAt(system, a, b), b), a)) {
                return obstruction("modusPonens.right", system, [a, b], dotAt(system, rresAt(system, a, b), b), a);
            }
        }
        if (lresAt(system, system.unit, a) !== a)
            return obstruction("lres.unit", system, [system.unit, a], lresAt(system, system.unit, a), a);
        if (rresAt(system, a, system.unit) !== a)
            return obstruction("rres.unit", system, [a, system.unit], rresAt(system, a, system.unit), a);
    }
    const commutative = isCommutative(system);
    let residualsCoincideWhenCommutative = false;
    let singleImplicationWhenCommutative = false;
    if (commutative) {
        residualsCoincideWhenCommutative = system.lattice.labels.every((_, a) => system.lattice.labels.every((__, c) => lresAt(system, a, c) === rresAt(system, c, a)));
        if (!residualsCoincideWhenCommutative)
            return obstruction("commutativeCollapse.residuals", system, []);
        singleImplicationWhenCommutative = system.lattice.labels.every((_, a) => system.lattice.labels.every((__, b) => system.lattice.labels.every((___, c) => leAt(system, dotAt(system, a, b), c) === leAt(system, b, lresAt(system, a, c)))));
        if (!singleImplicationWhenCommutative)
            return obstruction("commutativeCollapse.singleImplication", system, []);
    }
    return Object.freeze({
        kind: "lambek.laws:witness",
        carrier: system.lattice.labels,
        unit: system.unit,
        unitLabel: system.lattice.labels[system.unit],
        lattice: true,
        monoid: true,
        leftBiResiduation: true,
        rightBiResiduation: true,
        modusPonensLeft: true,
        modusPonensRight: true,
        fusionMonotoneLeft: true,
        fusionMonotoneRight: true,
        residualMonotone: true,
        residualAntitone: true,
        unitResiduals: true,
        commutative,
        residualsCoincideWhenCommutative,
        singleImplicationWhenCommutative,
    });
}
export const trivialLambekAlgebra = finiteLambekAlgebraSystem({
    kind: "orderInfra.finiteLatticeSystem",
    labels: Object.freeze(["unit"]),
    meet: Object.freeze([Object.freeze([0])]),
    join: Object.freeze([Object.freeze([0])]),
}, 0, [[0]], [[0]], [[0]]);
export const booleanCommutativeLambekAlgebra = finiteLambekAlgebraSystem({
    kind: "orderInfra.finiteLatticeSystem",
    labels: Object.freeze(["false", "true"]),
    meet: Object.freeze([
        Object.freeze([0, 0]),
        Object.freeze([0, 1]),
    ]),
    join: Object.freeze([
        Object.freeze([0, 1]),
        Object.freeze([1, 1]),
    ]),
}, 1, [
    [0, 0],
    [0, 1],
], [
    [1, 1],
    [0, 1],
], [
    [1, 0],
    [1, 1],
]);
