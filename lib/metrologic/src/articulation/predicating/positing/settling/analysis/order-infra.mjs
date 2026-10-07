/**
 * analysis/order-infra - finite executable shadows of RelMath.Order.OrderInfra.
 *
 * Lean gives the abstract order hierarchy: preorder, partial order, monotone
 * maps, algebraic lattices, bounded/distributive lattices, and complete
 * lattices by arbitrary suprema. This module keeps the Node claim finite:
 * explicit carrier/relation/table data are checked and returned as receipts.
 */
export const assertIndex = (name, value, length) => {
    if (!Number.isSafeInteger(value) || value < 0 || value >= length) {
        throw new RangeError(`${name}: expected an index into the carrier`);
    }
};
const requireNonemptyLabels = (name, labels) => {
    if (labels.length === 0)
        throw new RangeError(`${name}: carrier must be nonempty`);
};
const freezeRelation = (le) => Object.freeze(le.map((row) => Object.freeze([...row])));
const freezeTable = (table) => Object.freeze(table.map((row) => Object.freeze([...row])));
const requireSquareRelation = (le, size) => {
    if (le.length !== size)
        throw new RangeError("orderInfra: relation row count must match carrier size");
    le.forEach((row) => {
        if (row.length !== size)
            throw new RangeError("orderInfra: relation must be square");
    });
};
export const requireBinaryTable = (name, table, size, rowCountMessage = "table row count must match carrier size") => {
    if (table.length !== size)
        throw new RangeError(`${name}: ${rowCountMessage}`);
    table.forEach((row, left) => {
        if (row.length !== size)
            throw new RangeError(`${name}: table must be square`);
        row.forEach((target, right) => assertIndex(`${name}[${left}][${right}]`, target, size));
    });
};
export function finitePreorderSystem(labels, le) {
    requireNonemptyLabels("finitePreorderSystem", labels);
    requireSquareRelation(le, labels.length);
    return Object.freeze({
        kind: "orderInfra.finitePreorderSystem",
        labels: Object.freeze([...labels]),
        le: freezeRelation(le),
    });
}
const leAt = (system, left, right) => {
    assertIndex("orderInfra left", left, system.labels.length);
    assertIndex("orderInfra right", right, system.labels.length);
    return system.le[left]?.[right] === true;
};
/** Finite receipt for `Preorder`: reflexivity and transitivity. */
export function preorder(system) {
    for (let point = 0; point < system.labels.length; point += 1) {
        if (!leAt(system, point, point)) {
            return Object.freeze({
                kind: "orderInfra.preorder-obstruction",
                reason: "reflexivity",
                point,
                pointLabel: system.labels[point],
            });
        }
    }
    for (let left = 0; left < system.labels.length; left += 1) {
        for (let middle = 0; middle < system.labels.length; middle += 1) {
            for (let right = 0; right < system.labels.length; right += 1) {
                if (leAt(system, left, middle) && leAt(system, middle, right) && !leAt(system, left, right)) {
                    return Object.freeze({
                        kind: "orderInfra.preorder-obstruction",
                        reason: "transitivity",
                        chain: Object.freeze([left, middle, right]),
                        chainLabels: Object.freeze([
                            system.labels[left],
                            system.labels[middle],
                            system.labels[right],
                        ]),
                    });
                }
            }
        }
    }
    return Object.freeze({
        kind: "orderInfra.preorder:witness",
        carrier: system.labels,
        reflexive: true,
        transitive: true,
    });
}
/** Finite receipt for `PartialOrder`: preorder plus antisymmetry. */
export function partialOrder(system) {
    const preorderJudgment = preorder(system);
    if (preorderJudgment.kind !== "orderInfra.preorder:witness") {
        return Object.freeze({
            kind: "orderInfra.partialOrder-obstruction",
            reason: "preorder",
            preorder: preorderJudgment,
        });
    }
    for (let left = 0; left < system.labels.length; left += 1) {
        for (let right = 0; right < system.labels.length; right += 1) {
            if (left !== right && leAt(system, left, right) && leAt(system, right, left)) {
                return Object.freeze({
                    kind: "orderInfra.partialOrder-obstruction",
                    reason: "antisymmetry",
                    pair: Object.freeze([left, right]),
                    labels: Object.freeze([system.labels[left], system.labels[right]]),
                });
            }
        }
    }
    return Object.freeze({
        kind: "orderInfra.partialOrder:witness",
        carrier: system.labels,
        preorder: preorderJudgment,
        antisymmetric: true,
    });
}
/** Finite receipt for monotonicity between finite preorders. */
export function monotoneMap(domain, codomain, map) {
    if (map.length !== domain.labels.length)
        throw new RangeError("monotoneMap: map length must match domain carrier size");
    map.forEach((target, index) => assertIndex(`monotoneMap[${index}]`, target, codomain.labels.length));
    const domainPreorder = preorder(domain);
    if (domainPreorder.kind !== "orderInfra.preorder:witness") {
        return Object.freeze({
            kind: "orderInfra.monotoneMap-obstruction",
            reason: "domain-preorder",
            domainPreorder,
        });
    }
    const codomainPreorder = preorder(codomain);
    if (codomainPreorder.kind !== "orderInfra.preorder:witness") {
        return Object.freeze({
            kind: "orderInfra.monotoneMap-obstruction",
            reason: "codomain-preorder",
            codomainPreorder,
        });
    }
    for (let left = 0; left < domain.labels.length; left += 1) {
        for (let right = 0; right < domain.labels.length; right += 1) {
            const imageLeft = map[left];
            const imageRight = map[right];
            if (leAt(domain, left, right) && !leAt(codomain, imageLeft, imageRight)) {
                return Object.freeze({
                    kind: "orderInfra.monotoneMap-obstruction",
                    reason: "monotonicity",
                    pair: Object.freeze([left, right]),
                    imagePair: Object.freeze([imageLeft, imageRight]),
                    labels: Object.freeze([domain.labels[left], domain.labels[right]]),
                    imageLabels: Object.freeze([codomain.labels[imageLeft], codomain.labels[imageRight]]),
                });
            }
        }
    }
    return Object.freeze({
        kind: "orderInfra.monotoneMap:witness",
        domain: domain.labels,
        codomain: codomain.labels,
        map: Object.freeze([...map]),
        monotone: true,
    });
}
export function finiteLatticeSystem(labels, meet, join) {
    requireNonemptyLabels("finiteLatticeSystem", labels);
    requireBinaryTable("finiteLatticeSystem meet", meet, labels.length);
    requireBinaryTable("finiteLatticeSystem join", join, labels.length);
    return Object.freeze({
        kind: "orderInfra.finiteLatticeSystem",
        labels: Object.freeze([...labels]),
        meet: freezeTable(meet),
        join: freezeTable(join),
    });
}
const meetAt = (system, left, right) => system.meet[left]?.[right];
const joinAt = (system, left, right) => system.join[left]?.[right];
export function latticeOrder(system) {
    return finitePreorderSystem(system.labels, system.labels.map((_, left) => system.labels.map((__, right) => meetAt(system, left, right) === left)));
}
const latticeObstruction = (law, system, indices, left, right) => {
    const base = {
        kind: "orderInfra.lattice-obstruction",
        law,
        indices: Object.freeze([...indices]),
        labels: Object.freeze(indices.map((index) => system.labels[index])),
    };
    if (left === undefined && right === undefined)
        return Object.freeze(base);
    if (right === undefined)
        return Object.freeze({ ...base, left });
    if (left === undefined)
        return Object.freeze({ ...base, right });
    return Object.freeze({ ...base, left, right });
};
/** Finite receipt for the algebraic lattice laws plus derived glb/lub order laws. */
export function lattice(system) {
    const size = system.labels.length;
    for (let a = 0; a < size; a += 1) {
        if (meetAt(system, a, a) !== a)
            return latticeObstruction("meet.idem", system, [a], meetAt(system, a, a), a);
        if (joinAt(system, a, a) !== a)
            return latticeObstruction("join.idem", system, [a], joinAt(system, a, a), a);
        for (let b = 0; b < size; b += 1) {
            if (meetAt(system, a, b) !== meetAt(system, b, a))
                return latticeObstruction("meet.comm", system, [a, b], meetAt(system, a, b), meetAt(system, b, a));
            if (joinAt(system, a, b) !== joinAt(system, b, a))
                return latticeObstruction("join.comm", system, [a, b], joinAt(system, a, b), joinAt(system, b, a));
            if (meetAt(system, a, joinAt(system, a, b)) !== a)
                return latticeObstruction("absorb.meetJoin", system, [a, b], meetAt(system, a, joinAt(system, a, b)), a);
            if (joinAt(system, a, meetAt(system, a, b)) !== a)
                return latticeObstruction("absorb.joinMeet", system, [a, b], joinAt(system, a, meetAt(system, a, b)), a);
            for (let c = 0; c < size; c += 1) {
                if (meetAt(system, meetAt(system, a, b), c) !== meetAt(system, a, meetAt(system, b, c))) {
                    return latticeObstruction("meet.assoc", system, [a, b, c], meetAt(system, meetAt(system, a, b), c), meetAt(system, a, meetAt(system, b, c)));
                }
                if (joinAt(system, joinAt(system, a, b), c) !== joinAt(system, a, joinAt(system, b, c))) {
                    return latticeObstruction("join.assoc", system, [a, b, c], joinAt(system, joinAt(system, a, b), c), joinAt(system, a, joinAt(system, b, c)));
                }
            }
        }
    }
    const order = latticeOrder(system);
    const partial = partialOrder(order);
    if (partial.kind !== "orderInfra.partialOrder:witness") {
        return Object.freeze({
            kind: "orderInfra.lattice-obstruction",
            law: "partialOrder",
            partialOrder: partial,
        });
    }
    for (let a = 0; a < size; a += 1) {
        for (let b = 0; b < size; b += 1) {
            const meet = meetAt(system, a, b);
            const join = joinAt(system, a, b);
            if (!leAt(order, meet, a) || !leAt(order, meet, b))
                return latticeObstruction("meet.glb", system, [a, b], meet, -1);
            if (!leAt(order, a, join) || !leAt(order, b, join))
                return latticeObstruction("join.lub", system, [a, b], join, -1);
            if ((meetAt(system, a, b) === a) !== (joinAt(system, a, b) === b)) {
                return latticeObstruction("order.agreement", system, [a, b], meetAt(system, a, b), joinAt(system, a, b));
            }
            for (let c = 0; c < size; c += 1) {
                if (leAt(order, c, a) && leAt(order, c, b) && !leAt(order, c, meet))
                    return latticeObstruction("meet.glb", system, [a, b, c], c, meet);
                if (leAt(order, a, c) && leAt(order, b, c) && !leAt(order, join, c))
                    return latticeObstruction("join.lub", system, [a, b, c], join, c);
            }
        }
    }
    return Object.freeze({
        kind: "orderInfra.lattice:witness",
        carrier: system.labels,
        order,
        partialOrder: partial,
        laws: true,
        meetGlb: true,
        joinLub: true,
        meetJoinOrderAgree: true,
    });
}
/** Finite receipt for `BoundedLattice`: top/bot identities and derived bounds. */
export function boundedLattice(system, top, bot) {
    assertIndex("boundedLattice top", top, system.labels.length);
    assertIndex("boundedLattice bot", bot, system.labels.length);
    const latticeJudgment = lattice(system);
    if (latticeJudgment.kind !== "orderInfra.lattice:witness") {
        return Object.freeze({
            kind: "orderInfra.boundedLattice-obstruction",
            reason: "lattice",
            lattice: latticeJudgment,
        });
    }
    for (let point = 0; point < system.labels.length; point += 1) {
        if (meetAt(system, point, top) !== point) {
            return Object.freeze({ kind: "orderInfra.boundedLattice-obstruction", reason: "meetTop", point, pointLabel: system.labels[point] });
        }
        if (joinAt(system, point, bot) !== point) {
            return Object.freeze({ kind: "orderInfra.boundedLattice-obstruction", reason: "joinBot", point, pointLabel: system.labels[point] });
        }
        if (!leAt(latticeJudgment.order, point, top)) {
            return Object.freeze({ kind: "orderInfra.boundedLattice-obstruction", reason: "leTop", point, pointLabel: system.labels[point] });
        }
        if (!leAt(latticeJudgment.order, bot, point)) {
            return Object.freeze({ kind: "orderInfra.boundedLattice-obstruction", reason: "botLe", point, pointLabel: system.labels[point] });
        }
    }
    return Object.freeze({
        kind: "orderInfra.boundedLattice:witness",
        carrier: system.labels,
        top,
        topLabel: system.labels[top],
        bot,
        botLabel: system.labels[bot],
        lattice: latticeJudgment,
        leTop: true,
        botLe: true,
    });
}
/** Finite receipt for `meet a (join b c) = join (meet a b) (meet a c)`. */
export function distributiveLattice(system) {
    const latticeJudgment = lattice(system);
    if (latticeJudgment.kind !== "orderInfra.lattice:witness") {
        return Object.freeze({
            kind: "orderInfra.distributiveLattice-obstruction",
            reason: "lattice",
            lattice: latticeJudgment,
        });
    }
    for (let a = 0; a < system.labels.length; a += 1) {
        for (let b = 0; b < system.labels.length; b += 1) {
            for (let c = 0; c < system.labels.length; c += 1) {
                const left = meetAt(system, a, joinAt(system, b, c));
                const right = joinAt(system, meetAt(system, a, b), meetAt(system, a, c));
                if (left !== right) {
                    return Object.freeze({
                        kind: "orderInfra.distributiveLattice-obstruction",
                        reason: "distributivity",
                        indices: Object.freeze([a, b, c]),
                        labels: Object.freeze([system.labels[a], system.labels[b], system.labels[c]]),
                        left,
                        right,
                    });
                }
            }
        }
    }
    return Object.freeze({
        kind: "orderInfra.distributiveLattice:witness",
        carrier: system.labels,
        lattice: latticeJudgment,
        meetJoinDistributes: true,
    });
}
const subsetMembers = (size, mask) => Object.freeze(Array.from({ length: size }, (_, index) => index).filter((index) => (mask & (1 << index)) !== 0));
const isUpperBound = (system, subset, candidate) => subset.every((member) => leAt(system, member, candidate));
const isLowerBound = (system, subset, candidate) => subset.every((member) => leAt(system, candidate, member));
const leastElements = (system, candidates) => Object.freeze(candidates.filter((candidate) => candidates.every((other) => leAt(system, candidate, other))));
const greatestElements = (system, candidates) => Object.freeze(candidates.filter((candidate) => candidates.every((other) => leAt(system, other, candidate))));
/** Finite complete-lattice check: every finite subset has a unique lub and glb. */
export function completeLattice(system, maxSize = 20) {
    if (system.labels.length > maxSize) {
        return Object.freeze({
            kind: "orderInfra.completeLattice-obstruction",
            reason: "size",
            maxSize,
        });
    }
    const partial = partialOrder(system);
    if (partial.kind !== "orderInfra.partialOrder:witness") {
        return Object.freeze({
            kind: "orderInfra.completeLattice-obstruction",
            reason: "partialOrder",
            partialOrder: partial,
        });
    }
    const carrier = Array.from({ length: system.labels.length }, (_, index) => index);
    const subsetCount = 2 ** system.labels.length;
    let top = -1;
    let bot = -1;
    for (let mask = 0; mask < subsetCount; mask += 1) {
        const subset = subsetMembers(system.labels.length, mask);
        const upperBounds = carrier.filter((candidate) => isUpperBound(system, subset, candidate));
        const lubs = leastElements(system, upperBounds);
        if (lubs.length !== 1) {
            return Object.freeze({
                kind: "orderInfra.completeLattice-obstruction",
                reason: "supremum",
                subset,
                subsetLabels: Object.freeze(subset.map((index) => system.labels[index])),
                candidates: lubs,
                candidateLabels: Object.freeze(lubs.map((index) => system.labels[index])),
            });
        }
        const lowerBounds = carrier.filter((candidate) => isLowerBound(system, subset, candidate));
        const glbs = greatestElements(system, lowerBounds);
        if (glbs.length !== 1) {
            return Object.freeze({
                kind: "orderInfra.completeLattice-obstruction",
                reason: "infimum",
                subset,
                subsetLabels: Object.freeze(subset.map((index) => system.labels[index])),
                candidates: glbs,
                candidateLabels: Object.freeze(glbs.map((index) => system.labels[index])),
            });
        }
        if (subset.length === 0) {
            bot = lubs[0];
            top = glbs[0];
        }
    }
    return Object.freeze({
        kind: "orderInfra.completeLattice:witness",
        carrier: system.labels,
        subsetsChecked: subsetCount,
        top,
        topLabel: system.labels[top],
        bot,
        botLabel: system.labels[bot],
        partialOrder: partial,
    });
}
export const booleanLatticeSystem = finiteLatticeSystem(["false", "true"], [
    [0, 0],
    [0, 1],
], [
    [0, 1],
    [1, 1],
]);
export const booleanOrderSystem = latticeOrder(booleanLatticeSystem);
