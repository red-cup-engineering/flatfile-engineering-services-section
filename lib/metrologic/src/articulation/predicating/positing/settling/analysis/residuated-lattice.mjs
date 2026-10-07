/**
 * analysis/residuated-lattice - finite executable shadow of
 * RelMath.Order.ResiduatedLatticeStandalone.
 *
 * Lean proves the integral commutative residuated lattice laws abstractly over
 * a bounded lattice. This module checks the finite table version: bounded
 * lattice tables plus fusion/residual tables satisfy the commutative monoid
 * laws, residuation adjunction, integrality, and derived laws.
 */
import { assertIndex, boundedLattice, latticeOrder, requireBinaryTable, } from "./order-infra.mjs";
const freezeTable = (table) => Object.freeze(table.map((row) => Object.freeze([...row])));
const leAt = (system, left, right) => system.lattice.meet[left]?.[right] === left;
const meetAt = (system, left, right) => system.lattice.meet[left]?.[right];
const fuseAt = (system, left, right) => system.fuse[left]?.[right];
const impAt = (system, left, right) => system.imp[left]?.[right];
export function finiteResiduatedLatticeSystem(lattice, top, bot, one, fuse, imp) {
    assertIndex("finiteResiduatedLatticeSystem top", top, lattice.labels.length);
    assertIndex("finiteResiduatedLatticeSystem bot", bot, lattice.labels.length);
    assertIndex("finiteResiduatedLatticeSystem one", one, lattice.labels.length);
    requireBinaryTable("finiteResiduatedLatticeSystem fuse", fuse, lattice.labels.length);
    requireBinaryTable("finiteResiduatedLatticeSystem imp", imp, lattice.labels.length);
    return Object.freeze({
        kind: "residuatedLattice.finiteSystem",
        lattice,
        top,
        bot,
        one,
        fuse: freezeTable(fuse),
        imp: freezeTable(imp),
    });
}
const obstruction = (reason, system, indices, left, right) => Object.freeze({
    kind: "residuatedLattice.laws-obstruction",
    reason,
    indices: Object.freeze([...indices]),
    labels: Object.freeze(indices.map((index) => system.lattice.labels[index])),
    left,
    right,
});
/** Finite integral commutative residuated-lattice law receipt. */
export function laws(system) {
    const bounded = boundedLattice(system.lattice, system.top, system.bot);
    if (bounded.kind !== "orderInfra.boundedLattice:witness") {
        return Object.freeze({
            kind: "residuatedLattice.laws-obstruction",
            reason: "boundedLattice",
            boundedLattice: bounded,
        });
    }
    if (system.one !== system.top)
        return obstruction("integral", system, [system.one, system.top], system.one, system.top);
    const size = system.lattice.labels.length;
    for (let a = 0; a < size; a += 1) {
        if (fuseAt(system, a, system.one) !== a)
            return obstruction("fuse.one", system, [a, system.one], fuseAt(system, a, system.one), a);
        if (!leAt(system, a, system.one))
            return obstruction("le.one", system, [a, system.one], a, system.one);
        for (let b = 0; b < size; b += 1) {
            if (fuseAt(system, a, b) !== fuseAt(system, b, a))
                return obstruction("fuse.comm", system, [a, b], fuseAt(system, a, b), fuseAt(system, b, a));
            for (let c = 0; c < size; c += 1) {
                if (fuseAt(system, fuseAt(system, a, b), c) !== fuseAt(system, a, fuseAt(system, b, c))) {
                    return obstruction("fuse.assoc", system, [a, b, c], fuseAt(system, fuseAt(system, a, b), c), fuseAt(system, a, fuseAt(system, b, c)));
                }
                const fuseLe = leAt(system, fuseAt(system, a, b), c);
                const leImp = leAt(system, a, impAt(system, b, c));
                if (fuseLe !== leImp)
                    return obstruction("residuation", system, [a, b, c], fuseLe ? 1 : 0, leImp ? 1 : 0);
                if (leAt(system, a, b) && !leAt(system, fuseAt(system, a, c), fuseAt(system, b, c))) {
                    return obstruction("fuse.mono.left", system, [a, b, c], fuseAt(system, a, c), fuseAt(system, b, c));
                }
                if (leAt(system, a, b) && !leAt(system, fuseAt(system, c, a), fuseAt(system, c, b))) {
                    return obstruction("fuse.mono.right", system, [c, a, b], fuseAt(system, c, a), fuseAt(system, c, b));
                }
            }
        }
    }
    for (let a = 0; a < size; a += 1) {
        for (let b = 0; b < size; b += 1) {
            if (!leAt(system, fuseAt(system, impAt(system, a, b), a), b)) {
                return obstruction("modusPonens", system, [a, b], fuseAt(system, impAt(system, a, b), a), b);
            }
            if (!leAt(system, fuseAt(system, a, b), meetAt(system, a, b))) {
                return obstruction("fuse.leMeet", system, [a, b], fuseAt(system, a, b), meetAt(system, a, b));
            }
        }
    }
    return Object.freeze({
        kind: "residuatedLattice.laws:witness",
        carrier: system.lattice.labels,
        top: system.top,
        topLabel: system.lattice.labels[system.top],
        bot: system.bot,
        botLabel: system.lattice.labels[system.bot],
        one: system.one,
        oneLabel: system.lattice.labels[system.one],
        boundedLattice: true,
        commutativeMonoid: true,
        residuation: true,
        integral: true,
        fuseMonotone: true,
        leOne: true,
        modusPonens: true,
        fuseLeMeet: true,
    });
}
export const twoBooleanResiduatedLattice = finiteResiduatedLatticeSystem({
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
}, 1, 0, 1, [
    [0, 0],
    [0, 1],
], [
    [1, 1],
    [0, 1],
]);
export const twoBooleanOrder = latticeOrder(twoBooleanResiduatedLattice.lattice);
