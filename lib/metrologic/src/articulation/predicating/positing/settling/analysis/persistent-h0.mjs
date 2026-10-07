/**
 * analysis/persistent-h0 - finite H0 persistence over graph filtrations.
 *
 * Executable shadow of RelMath.Topology.PersistentH0. Lean proves that
 * undirected path connectivity is transitive, monotone under edge growth, and
 * therefore components only merge along a graph filtration. This finite carrier
 * computes the component partitions and records the derived component-count
 * monotonicity that Lean deliberately leaves to finite quotient infrastructure.
 */
const unique = (items) => new Set(items).size === items.length;
function requireVertex(vertices, vertex, caller) {
    if (!vertices.includes(vertex))
        throw new TypeError(`${caller}: ${vertex} is not in the finite vertex carrier`);
}
function edgeKey([source, target]) {
    return `${source}\u0000${target}`;
}
function normalizeEdges(vertices, edges, caller) {
    const seen = new Set();
    const out = [];
    for (const [source, target] of edges) {
        requireVertex(vertices, source, caller);
        requireVertex(vertices, target, caller);
        const key = edgeKey([source, target]);
        if (!seen.has(key)) {
            seen.add(key);
            out.push(Object.freeze([source, target]));
        }
    }
    return Object.freeze(out);
}
function edgeSubset(left, right) {
    const rightKeys = new Set(right.map(edgeKey));
    return left.every((edge) => rightKeys.has(edgeKey(edge)));
}
export function graphFiltration(vertices, stages) {
    if (!unique(vertices))
        throw new TypeError("graphFiltration: duplicate vertices are not a finite carrier");
    const normalizedVertices = Object.freeze([...vertices]);
    const normalizedStages = stages.map((edges, stage) => Object.freeze({
        stage,
        edges: normalizeEdges(normalizedVertices, edges, "graphFiltration"),
    }));
    const monotone = normalizedStages.slice(0, -1).every((stage, index) => edgeSubset(stage.edges, normalizedStages[index + 1]?.edges ?? []));
    if (!monotone)
        throw new TypeError("graphFiltration: edge stages must be monotone non-decreasing");
    return Object.freeze({
        kind: "topology.persistentH0.filtration.carrier",
        vertices: normalizedVertices,
        stages: Object.freeze(normalizedStages),
    });
}
function componentPartition(vertices, edges) {
    const parent = vertices.map((_, index) => index);
    const find = (index) => {
        let root = index;
        while (parent[root] !== root)
            root = parent[root];
        while (parent[index] !== index) {
            const next = parent[index];
            parent[index] = root;
            index = next;
        }
        return root;
    };
    const union = (left, right) => {
        const leftRoot = find(left);
        const rightRoot = find(right);
        if (leftRoot !== rightRoot)
            parent[rightRoot] = leftRoot;
    };
    for (const [source, target] of edges) {
        union(vertices.indexOf(source), vertices.indexOf(target));
    }
    const classes = new Map();
    for (const [index, vertex] of vertices.entries()) {
        const root = find(index);
        const cls = classes.get(root) ?? [];
        cls.push(vertex);
        classes.set(root, cls);
    }
    return Object.freeze([...classes.values()].map((cls) => Object.freeze(cls)));
}
export function pathConnected(filtration, stage, left, right) {
    requireVertex(filtration.vertices, left, "pathConnected");
    requireVertex(filtration.vertices, right, "pathConnected");
    const graph = filtration.stages[stage];
    if (graph === undefined)
        throw new RangeError("pathConnected: stage is outside the filtration");
    return componentPartition(filtration.vertices, graph.edges).some((component) => component.includes(left) && component.includes(right));
}
function componentContains(component, member) {
    return component.includes(member);
}
function componentsCoarsen(earlier, later) {
    return earlier.every((component) => later.some((candidate) => component.every((member) => componentContains(candidate, member))));
}
export function componentPartitions(filtration) {
    return Object.freeze(filtration.stages.map((stage) => {
        const components = componentPartition(filtration.vertices, stage.edges);
        return Object.freeze({
            stage: stage.stage,
            components,
            componentCount: components.length,
        });
    }));
}
export function persistentH0Receipt(filtration) {
    const partitions = componentPartitions(filtration);
    const componentsOnlyMerge = partitions.every((earlier, leftIndex) => partitions.slice(leftIndex).every((later) => componentsCoarsen(earlier.components, later.components)));
    const finiteComponentCountsNonIncreasing = partitions.slice(0, -1).every((stage, index) => stage.componentCount >= (partitions[index + 1]?.componentCount ?? 0));
    if (!componentsOnlyMerge || !finiteComponentCountsNonIncreasing) {
        throw new TypeError("persistentH0Receipt: finite H0 persistence laws failed");
    }
    return Object.freeze({
        kind: "topology.persistentH0.receipt:witness",
        sourceModule: "RelMath.Topology.PersistentH0",
        theorems: Object.freeze([
            "RelMath.Topology.PathConn.trans",
            "RelMath.Topology.PathConn.mono",
            "RelMath.Topology.components_only_merge",
        ]),
        filtration,
        partitions,
        pathConnTransitive: true,
        pathConnMonotone: true,
        componentsOnlyMerge: true,
        finiteComponentCountsNonIncreasing: true,
        boundary: "Finite graph-filtration H0 shadow: components are computed by union-find; higher homology and metric alpha complexes are outside this carrier.",
    });
}
