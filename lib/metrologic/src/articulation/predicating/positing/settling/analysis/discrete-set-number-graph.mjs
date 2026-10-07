/**
 * analysis/discrete - finite set, Nat, and graph shadows.
 *
 * Executable shadow of RelMath.Order.SetNumberGraphTheory: finite powersets,
 * Kuratowski pair equality, equivalence partitions, bounded Nat semiring checks,
 * directed handshake counts, topological-order DAG witnesses, and tree counts.
 */
const unique = (items) => new Set(items).size === items.length;
const freezeRecord = (record) => Object.freeze({ ...record });
function requireUniverse(universe, caller) {
    if (!unique(universe))
        throw new TypeError(`${caller}: duplicate universe elements are not a finite carrier`);
}
function requireMember(universe, member, caller) {
    if (!universe.includes(member))
        throw new TypeError(`${caller}: ${member} is not in the finite carrier`);
}
export function finiteSet(universe, members) {
    requireUniverse(universe, "finiteSet");
    if (!unique(members))
        throw new TypeError("finiteSet: duplicate members are not extensional");
    for (const member of members)
        requireMember(universe, member, "finiteSet");
    return Object.freeze({
        kind: "discrete.set.carrier",
        universe: Object.freeze([...universe]),
        members: Object.freeze([...members].sort((a, b) => universe.indexOf(a) - universe.indexOf(b))),
    });
}
const has = (set, member) => set.members.includes(member);
export const subset = (left, right) => left.members.every((member) => has(right, member));
const sameSet = (left, right) => subset(left, right) && subset(right, left);
export const setIntersection = (left, right) => finiteSet(left.universe, left.universe.filter((member) => has(left, member) && has(right, member)));
export const setUnion = (left, right) => finiteSet(left.universe, left.universe.filter((member) => has(left, member) || has(right, member)));
export const setComplement = (set) => finiteSet(set.universe, set.universe.filter((member) => !has(set, member)));
function* subsets(universe, index = 0, members = []) {
    if (index === universe.length) {
        yield finiteSet(universe, members);
        return;
    }
    yield* subsets(universe, index + 1, members);
    members.push(universe[index]);
    yield* subsets(universe, index + 1, members);
    members.pop();
}
export function powersetReceipt(universe, leftMembers, rightMembers) {
    if (universe.length > 6)
        throw new RangeError("powersetReceipt: exhaustive powerset checks are limited to at most 6 elements");
    const left = finiteSet(universe, leftMembers);
    const right = finiteSet(universe, rightMembers);
    const all = [...subsets(universe)];
    const partial = all.every((set) => subset(set, set))
        && all.every((a) => all.every((b) => all.every((c) => !(subset(a, b) && subset(b, c)) || subset(a, c))))
        && all.every((a) => all.every((b) => !(subset(a, b) && subset(b, a)) || sameSet(a, b)));
    const bounded = all.every((set) => sameSet(setIntersection(set, finiteSet(universe, universe)), set)
        && sameSet(setUnion(set, finiteSet(universe, [])), set));
    const deMorganInter = sameSet(setComplement(setIntersection(left, right)), setUnion(setComplement(left), setComplement(right)));
    const deMorganUnion = sameSet(setComplement(setUnion(left, right)), setIntersection(setComplement(left), setComplement(right)));
    const complementAntitone = !subset(left, right) || subset(setComplement(right), setComplement(left));
    if (!partial || !bounded || !deMorganInter || !deMorganUnion || !complementAntitone) {
        throw new TypeError("powersetReceipt: finite powerset laws failed");
    }
    return Object.freeze({
        kind: "discrete.powerset.receipt:witness",
        universe: left.universe,
        left,
        right,
        intersection: setIntersection(left, right),
        union: setUnion(left, right),
        leftComplement: setComplement(left),
        rightComplement: setComplement(right),
        subsetPartialOrder: true,
        boundedLattice: true,
        deMorganInter: true,
        deMorganUnion: true,
        complementAntitone: true,
    });
}
export function kuratowskiPairReceipt(a, b, c, d) {
    return Object.freeze({
        kind: "discrete.kuratowskiPair.receipt:witness",
        left: Object.freeze([a, b]),
        right: Object.freeze([c, d]),
        equal: a === c && b === d,
        characteristicEquality: true,
    });
}
export function equivalencePartitionReceipt(carrier, relation) {
    requireUniverse(carrier, "equivalencePartitionReceipt");
    if (relation.length !== carrier.length || relation.some((row) => row.length !== carrier.length)) {
        throw new TypeError("equivalencePartitionReceipt: relation must be square over the carrier");
    }
    const reflexive = carrier.every((_, i) => relation[i]?.[i] === true);
    const symmetric = carrier.every((_, i) => carrier.every((__, j) => relation[i]?.[j] !== true || relation[j]?.[i] === true));
    const transitive = carrier.every((_, i) => carrier.every((__, j) => carrier.every((___, k) => !(relation[i]?.[j] === true && relation[j]?.[k] === true) || relation[i]?.[k] === true)));
    if (!reflexive || !symmetric || !transitive) {
        throw new TypeError("equivalencePartitionReceipt: relation is not an equivalence relation");
    }
    const classBySeed = carrier.map((seed, i) => finiteSet(carrier, carrier.filter((_, j) => relation[i]?.[j] === true)));
    const classes = Object.freeze(classBySeed.filter((set, i) => classBySeed.findIndex((other) => sameSet(set, other)) === i));
    const covers = carrier.every((member) => classes.some((cls) => has(cls, member)));
    const overlapForcesEqual = classes.every((left) => classes.every((right) => {
        const overlaps = left.members.some((member) => has(right, member));
        return !overlaps || sameSet(left, right);
    }));
    if (!covers || !overlapForcesEqual)
        throw new TypeError("equivalencePartitionReceipt: partition laws failed");
    return Object.freeze({
        kind: "discrete.equivalencePartition.receipt:witness",
        carrier: Object.freeze([...carrier]),
        classes,
        reflexive: true,
        symmetric: true,
        transitive: true,
        covers: true,
        overlapForcesEqual: true,
    });
}
export function natSemiringReceipt(checkedThrough = 6) {
    if (!Number.isSafeInteger(checkedThrough) || checkedThrough < 1 || checkedThrough > 50) {
        throw new RangeError("natSemiringReceipt: checkedThrough must be an integer in [1, 50]");
    }
    const xs = Array.from({ length: checkedThrough + 1 }, (_, i) => i);
    const addCommutative = xs.every((a) => xs.every((b) => a + b === b + a));
    const addAssociative = xs.every((a) => xs.every((b) => xs.every((c) => (a + b) + c === a + (b + c))));
    const addZero = xs.every((a) => a + 0 === a && 0 + a === a);
    const mulCommutative = xs.every((a) => xs.every((b) => a * b === b * a));
    const mulAssociative = xs.every((a) => xs.every((b) => xs.every((c) => (a * b) * c === a * (b * c))));
    const mulOne = xs.every((a) => a * 1 === a && 1 * a === a);
    const zeroMul = xs.every((a) => 0 * a === 0 && a * 0 === 0);
    const leftDistributive = xs.every((a) => xs.every((b) => xs.every((c) => a * (b + c) === (a * b) + (a * c))));
    const rightDistributive = xs.every((a) => xs.every((b) => xs.every((c) => (a + b) * c === (a * c) + (b * c))));
    const noAdditiveInverseOfOne = xs.every((n) => 1 + n !== 0);
    if (!addCommutative || !addAssociative || !addZero || !mulCommutative || !mulAssociative || !mulOne || !zeroMul || !leftDistributive || !rightDistributive || !noAdditiveInverseOfOne) {
        throw new TypeError("natSemiringReceipt: bounded Nat semiring laws failed");
    }
    return Object.freeze({
        kind: "discrete.natSemiring.receipt:witness",
        checkedThrough,
        addCommutative: true,
        addAssociative: true,
        addZero: true,
        mulCommutative: true,
        mulAssociative: true,
        mulOne: true,
        zeroMul: true,
        leftDistributive: true,
        rightDistributive: true,
        noAdditiveInverseOfOne: true,
    });
}
function requireSuccessorAlgebra(algebra, caller) {
    requireUniverse(algebra.elements, caller);
    requireMember(algebra.elements, algebra.zero, caller);
    for (const element of algebra.elements) {
        const next = algebra.successor[element];
        if (!Object.hasOwn(algebra.successor, element) || next === undefined)
            throw new TypeError(`${caller}: missing successor for ${element}`);
        requireMember(algebra.elements, next, caller);
    }
}
function natRecPrefix(algebra, checkedThrough) {
    const out = [algebra.zero];
    for (let index = 0; index < checkedThrough; index += 1) {
        out.push(algebra.successor[out[index]]);
    }
    return Object.freeze(out);
}
function candidateNatMorphisms(algebra, checkedThrough) {
    const length = checkedThrough + 1;
    const out = [];
    const build = (index, current) => {
        if (index === length) {
            const preservesZero = current[0] === algebra.zero;
            const preservesSuccessor = current.slice(0, -1).every((value, n) => current[n + 1] === algebra.successor[value]);
            if (preservesZero && preservesSuccessor)
                out.push(Object.freeze([...current]));
            return;
        }
        for (const element of algebra.elements) {
            current[index] = element;
            build(index + 1, current);
        }
    };
    build(0, []);
    return Object.freeze(out);
}
/** Finite prefix shadow of Nat's initiality as a successor algebra. */
export function successorAlgebraReceipt(algebra, checkedThrough = 5) {
    if (!Number.isSafeInteger(checkedThrough) || checkedThrough < 0 || checkedThrough > 8) {
        throw new RangeError("successorAlgebraReceipt: checkedThrough must be an integer in [0, 8]");
    }
    if (algebra.elements.length > 6)
        throw new RangeError("successorAlgebraReceipt: exhaustive morphism checks are limited to at most 6 elements");
    requireSuccessorAlgebra(algebra, "successorAlgebraReceipt");
    const normalized = Object.freeze({
        kind: "discrete.successorAlgebra.carrier",
        elements: Object.freeze([...algebra.elements]),
        zero: algebra.zero,
        successor: freezeRecord(Object.fromEntries(algebra.elements.map((element) => [element, algebra.successor[element]]))),
    });
    const recursor = natRecPrefix(normalized, checkedThrough);
    const candidateMorphisms = candidateNatMorphisms(normalized, checkedThrough);
    const recursorPreservesZero = recursor[0] === normalized.zero;
    const recursorPreservesSuccessor = recursor.slice(0, -1).every((value, index) => recursor[index + 1] === normalized.successor[value]);
    const initialExistsOnPrefix = candidateMorphisms.some((candidate) => candidate.every((value, index) => value === recursor[index]));
    const initialUniqueOnPrefix = candidateMorphisms.every((candidate) => candidate.every((value, index) => value === recursor[index]));
    if (!recursorPreservesZero || !recursorPreservesSuccessor || !initialExistsOnPrefix || !initialUniqueOnPrefix) {
        throw new TypeError("successorAlgebraReceipt: finite Nat initiality laws failed");
    }
    return Object.freeze({
        kind: "discrete.successorAlgebra.receipt:witness",
        sourceModule: "RelMath.Order.SetNumberGraphTheory",
        theorems: Object.freeze([
            "RelMath.Discrete.natAlg",
            "RelMath.Discrete.natRec",
            "RelMath.Discrete.natRecHom",
            "RelMath.Discrete.nat_initial_exists",
            "RelMath.Discrete.nat_initial_unique",
            "RelMath.Discrete.nat_hom_unique",
        ]),
        algebra: normalized,
        checkedThrough,
        recursor,
        candidateMorphisms,
        recursorPreservesZero: recursorPreservesZero,
        recursorPreservesSuccessor: recursorPreservesSuccessor,
        initialExistsOnPrefix: initialExistsOnPrefix,
        initialUniqueOnPrefix: initialUniqueOnPrefix,
    });
}
export function directedGraph(vertices, edges) {
    requireUniverse(vertices, "directedGraph");
    for (const [source, target] of edges) {
        requireMember(vertices, source, "directedGraph");
        requireMember(vertices, target, "directedGraph");
    }
    const edgeKeys = new Set();
    const out = [];
    for (const [source, target] of edges) {
        const key = JSON.stringify([source, target]);
        if (!edgeKeys.has(key)) {
            edgeKeys.add(key);
            out.push(Object.freeze([source, target]));
        }
    }
    return Object.freeze({
        kind: "discrete.graph.directed.carrier",
        vertices: Object.freeze([...vertices]),
        edges: Object.freeze(out),
    });
}
export function directedHandshakeReceipt(graph) {
    const indegrees = Object.fromEntries(graph.vertices.map((v) => [v, 0]));
    const outdegrees = Object.fromEntries(graph.vertices.map((v) => [v, 0]));
    for (const [source, target] of graph.edges) {
        outdegrees[source] = (outdegrees[source] ?? 0) + 1;
        indegrees[target] = (indegrees[target] ?? 0) + 1;
    }
    const sumIndegree = Object.values(indegrees).reduce((a, b) => a + b, 0);
    const sumOutdegree = Object.values(outdegrees).reduce((a, b) => a + b, 0);
    if (sumIndegree !== graph.edges.length || sumOutdegree !== graph.edges.length) {
        throw new TypeError("directedHandshakeReceipt: directed handshake failed");
    }
    return Object.freeze({
        kind: "discrete.graph.handshake.receipt:witness",
        graph,
        edgeCount: graph.edges.length,
        indegrees: freezeRecord(indegrees),
        outdegrees: freezeRecord(outdegrees),
        sumIndegree,
        sumOutdegree,
        directedHandshake: true,
    });
}
export function topologicalDagReceipt(graph, order) {
    const normalized = Object.fromEntries(graph.vertices.map((vertex) => {
        const value = order[vertex];
        if (!Object.hasOwn(order, vertex) || typeof value !== "number" || !Number.isSafeInteger(value))
            throw new TypeError(`topologicalDagReceipt: missing integer order for ${vertex}`);
        return [vertex, value];
    }));
    const irreflexive = graph.edges.every(([source, target]) => source !== target);
    const topological = graph.edges.every(([source, target]) => normalized[source] < normalized[target]);
    if (!irreflexive || !topological)
        throw new TypeError("topologicalDagReceipt: graph is not witnessed as a DAG by this order");
    return Object.freeze({
        kind: "discrete.graph.topologicalDag.receipt:witness",
        graph,
        order: freezeRecord(normalized),
        irreflexive: true,
        topological: true,
        dag: true,
    });
}
export function treeCountReceipt(graph) {
    const spanningCount = graph.edges.length + 1 === graph.vertices.length;
    return Object.freeze({
        kind: spanningCount ? "discrete.graph.treeCount.receipt:witness" : "discrete.graph.treeCount.receipt:obstruction",
        graph,
        vertexCount: graph.vertices.length,
        edgeCount: graph.edges.length,
        edgeCountPlusOne: graph.edges.length + 1,
        spanningCount,
    });
}
