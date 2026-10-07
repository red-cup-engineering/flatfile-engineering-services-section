/**
 * analysis/alexandrov-husainov - finite executable shadow of
 * RelMath.Cohomology.AlexandrovHusainov.
 *
 * Lean proves Alexandrov opens as up-sets, arbitrary intersection/union of
 * opens, specialization-order recovery, continuous iff monotone, and Čech-side
 * acyclicity while leaving Husainov's derived-functor comparison open. This
 * module exposes the finite poset/up-set carrier and the computable comparison
 * boundary.
 */
const uniqueSorted = (values) => {
    const out = [];
    for (const value of values) {
        if (value.length === 0)
            throw new TypeError("alexandrovHusainov: point names must be nonempty");
        if (!out.includes(value))
            out.push(value);
    }
    return Object.freeze(out.sort((left, right) => left.localeCompare(right)));
};
const pairKey = (left, right) => JSON.stringify([left, right]);
export function finitePoset(pointsInput, leqInput) {
    const points = uniqueSorted(pointsInput);
    const pairs = new Set();
    for (const point of points)
        pairs.add(pairKey(point, point));
    for (const [left, right] of leqInput) {
        if (!points.includes(left) || !points.includes(right)) {
            throw new TypeError(`finitePoset: relation ${left} <= ${right} mentions an unknown point`);
        }
        pairs.add(pairKey(left, right));
    }
    const leqPairs = [...pairs].map((keyValue) => JSON.parse(keyValue));
    const leq = (left, right) => pairs.has(pairKey(left, right));
    const reflexive = points.every((point) => leq(point, point));
    const transitive = points.every((a) => points.every((b) => points.every((c) => !leq(a, b) || !leq(b, c) || leq(a, c))));
    const antisymmetric = points.every((a) => points.every((b) => !leq(a, b) || !leq(b, a) || a === b));
    if (!reflexive || !transitive || !antisymmetric) {
        throw new TypeError("finitePoset: relation must be a finite partial order");
    }
    return Object.freeze({
        kind: "alexandrovHusainov.poset",
        points,
        leq: Object.freeze(leqPairs.sort(([aLeft, aRight], [bLeft, bRight]) => aLeft.localeCompare(bLeft) || aRight.localeCompare(bRight)).map((pair) => Object.freeze(pair))),
    });
}
export const defaultPoset = finitePoset(["seed", "branch-a", "branch-b", "top"], [
    ["seed", "branch-a"],
    ["seed", "branch-b"],
    ["branch-a", "top"],
    ["branch-b", "top"],
    ["seed", "top"],
]);
const leq = (poset, left, right) => poset.leq.some(([a, b]) => a === left && b === right);
export function openSet(points) {
    return Object.freeze({
        kind: "alexandrovHusainov.openSet",
        points: uniqueSorted(points),
    });
}
const subset = (left, right) => left.points.every((point) => right.points.includes(point));
const sameOpen = (left, right) => subset(left, right) && subset(right, left);
export function isUpSet(poset, open) {
    return open.points.every((x) => poset.points.includes(x)
        && poset.points.every((y) => !leq(poset, x, y) || open.points.includes(y)));
}
export function principalUpSet(poset, point) {
    if (!poset.points.includes(point))
        throw new TypeError(`principalUpSet: unknown point ${point}`);
    return openSet(poset.points.filter((candidate) => leq(poset, point, candidate)));
}
export const intersection = (family, universe) => openSet(universe.filter((point) => family.every((member) => member.points.includes(point))));
export const union = (family) => openSet(family.flatMap((member) => member.points));
const allSubsets = (points) => {
    const count = 2 ** points.length;
    if (count > 4096)
        throw new TypeError("allSubsets: poset too large for exhaustive finite Alexandrov receipt");
    return Object.freeze(Array.from({ length: count }, (_, mask) => openSet(points.filter((_, index) => (mask & (1 << index)) !== 0))));
};
export const allOpenSets = (poset) => Object.freeze(allSubsets(poset.points).filter((candidate) => isUpSet(poset, candidate)));
export function specializes(poset, x, y) {
    const opens = allOpenSets(poset);
    return opens.every((open) => !open.points.includes(x) || open.points.includes(y));
}
export function monotoneMap(source, target, mapInput) {
    for (const point of source.points) {
        const image = mapInput[point];
        if (!Object.hasOwn(mapInput, point) || image === undefined || !target.points.includes(image)) {
            throw new TypeError(`monotoneMap: ${point} maps outside the target`);
        }
    }
    const monotone = source.points.every((x) => source.points.every((y) => !leq(source, x, y) || leq(target, mapInput[x] ?? "", mapInput[y] ?? "")));
    if (!monotone)
        throw new TypeError("monotoneMap: map is not monotone");
    return Object.freeze({
        kind: "alexandrovHusainov.monotoneMap",
        source: source.points,
        target: target.points,
        map: Object.freeze({ ...mapInput }),
    });
}
const preimage = (source, map, targetOpen) => openSet(source.points.filter((point) => targetOpen.points.includes(map.map[point] ?? "")));
const allFiniteMaps = (source, target) => {
    let maps = Object.freeze([Object.freeze({})]);
    for (const point of source.points) {
        maps = Object.freeze(maps.flatMap((existing) => target.points.map((image) => Object.freeze({ ...existing, [point]: image }))));
    }
    return maps;
};
const isMonotoneRaw = (source, target, map) => source.points.every((x) => source.points.every((y) => !leq(source, x, y) || leq(target, map[x] ?? "", map[y] ?? "")));
const isContinuousRaw = (source, target, map) => {
    const carrier = Object.freeze({
        kind: "alexandrovHusainov.monotoneMap",
        source: source.points,
        target: target.points,
        map: Object.freeze({ ...map }),
    });
    return allOpenSets(target).every((open) => isUpSet(source, preimage(source, carrier, open)));
};
export function topologyReceipt(poset = defaultPoset) {
    const opens = allOpenSets(poset);
    const openFamilies = allSubsets(opens.map((_, index) => String(index))).map((indexSet) => indexSet.points.map((index) => opens[Number(index)]).filter(Boolean));
    const emptyOpen = opens.some((open) => open.points.length === 0);
    const universeOpen = opens.some((open) => sameOpen(open, openSet(poset.points)));
    const binaryIntersectionOpen = opens.every((left) => opens.every((right) => isUpSet(poset, intersection([left, right], poset.points))));
    const binaryUnionOpen = opens.every((left) => opens.every((right) => isUpSet(poset, union([left, right]))));
    const arbitraryFiniteIntersectionOpen = openFamilies.every((family) => isUpSet(poset, intersection(family, poset.points)));
    const arbitraryFiniteUnionOpen = openFamilies.every((family) => isUpSet(poset, union(family)));
    const principalUpSetsOpen = poset.points.every((point) => isUpSet(poset, principalUpSet(poset, point)));
    const specializationRecoversOrder = poset.points.every((x) => poset.points.every((y) => specializes(poset, x, y) === leq(poset, x, y)));
    if (!emptyOpen || !universeOpen || !binaryIntersectionOpen || !binaryUnionOpen
        || !arbitraryFiniteIntersectionOpen || !arbitraryFiniteUnionOpen
        || !principalUpSetsOpen || !specializationRecoversOrder) {
        throw new TypeError("topologyReceipt: finite Alexandrov topology laws failed");
    }
    return Object.freeze({
        kind: "alexandrovHusainov.topology:witness",
        poset,
        opens,
        emptyOpen: true,
        universeOpen: true,
        binaryIntersectionOpen: true,
        binaryUnionOpen: true,
        arbitraryFiniteIntersectionOpen: true,
        arbitraryFiniteUnionOpen: true,
        principalUpSetsOpen: true,
        specializationRecoversOrder: true,
    });
}
export function continuousMonotoneReceipt(source = defaultPoset, target = defaultPoset, mapInput = Object.freeze({
    seed: "seed",
    "branch-a": "top",
    "branch-b": "top",
    top: "top",
})) {
    const map = monotoneMap(source, target, mapInput);
    const targetOpens = allOpenSets(target);
    const preimagesOfOpensAreOpen = targetOpens.every((open) => isUpSet(source, preimage(source, map, open)));
    const continuousIffMonotoneOnFiniteMaps = allFiniteMaps(source, target).every((candidate) => isContinuousRaw(source, target, candidate) === isMonotoneRaw(source, target, candidate));
    if (!preimagesOfOpensAreOpen || !continuousIffMonotoneOnFiniteMaps) {
        throw new TypeError("continuousMonotoneReceipt: continuous/monotone laws failed");
    }
    return Object.freeze({
        kind: "alexandrovHusainov.continuousMonotone:witness",
        source,
        target,
        map,
        monotone: true,
        preimagesOfOpensAreOpen: true,
        continuousIffMonotoneOnFiniteMaps: true,
    });
}
export function husainovBoundaryReceipt() {
    return Object.freeze({
        kind: "alexandrovHusainov.husainovBoundary:documented",
        cechH1VanishesOnBoundedSites: true,
        cechAboveOneTrivial: true,
        derivedFunctorComparisonImplemented: false,
        obstruction: Object.freeze([
            "The finite runtime receipt carries the Cech-side bounded-site acyclicity already available from settling cohomology.",
            "The Husainov comparison to derived-functor sheaf cohomology requires injective or flasque resolutions and is not modeled by definitionally equating RGamma with Cech cohomology.",
            "Dedekind-MacNeille cut acyclicity can be computed for finite posets in a future kernel, but the derived-functor comparison remains proof/topology work.",
        ]),
    });
}
export function receipt() {
    return Object.freeze({
        kind: "alexandrovHusainov.receipt:witness",
        topology: topologyReceipt(),
        continuousMonotone: continuousMonotoneReceipt(),
        husainov: husainovBoundaryReceipt(),
        openFrontier: Object.freeze([
            "The runtime Alexandrov topology is finite and exhaustively enumerates up-sets; Lean states arbitrary Prop-valued intersections over any index type.",
            "Continuous iff monotone is checked over all finite maps between the sample posets, not as a generic theorem over arbitrary carriers.",
            "Husainov's Cech-vs-derived comparison remains proof/topology work until the runtime has resolution and derived-functor carriers.",
        ]),
    });
}
