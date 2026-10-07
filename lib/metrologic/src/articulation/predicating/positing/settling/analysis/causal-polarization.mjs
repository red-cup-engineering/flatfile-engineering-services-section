/**
 * analysis/causal-polarization - causal colouring polarization and Liouville receipts.
 *
 * Executable shadow of RelMath.Lorentzian.CausalPolarization and
 * RelMath.Lorentzian.CausalLiouville: a nondegenerate polarization is exactly a
 * proper colouring of direct causal edges, graph-hom/factor maps pull it back,
 * and the Liouville 1-form is the exact coboundary dc with d(dc)=0.
 */
const linkKey = (link) => `${link.from}\u0000${link.to}`;
function assertCarrier(carrier) {
    const events = new Set(carrier.events);
    if (events.size !== carrier.events.length)
        throw new TypeError("causal polarization expects unique events");
    for (const link of carrier.links) {
        if (!events.has(link.from) || !events.has(link.to))
            throw new TypeError("causal polarization link references unknown event");
    }
}
function colorOf(colors, event) {
    const value = colors[event];
    if (typeof value !== "number" || !Number.isSafeInteger(value)) {
        throw new RangeError(`missing safe integer colour for event ${event}`);
    }
    return value;
}
function directLinkSet(carrier) {
    return new Set(carrier.links.map(linkKey));
}
export function polForm(colors, from, to) {
    return colorOf(colors, to) - colorOf(colors, from);
}
export function polarizationForm(carrier, colors) {
    assertCarrier(carrier);
    return Object.freeze(carrier.links.map((link) => Object.freeze({
        from: link.from,
        to: link.to,
        value: polForm(colors, link.from, link.to),
    })));
}
export function nondegenerate(carrier, colors) {
    return polarizationForm(carrier, colors).every((entry) => entry.value !== 0);
}
export function properColoring(carrier, colors) {
    assertCarrier(carrier);
    return carrier.links.every((link) => colorOf(colors, link.from) !== colorOf(colors, link.to));
}
export function graphHom(source, target, map) {
    assertCarrier(source);
    assertCarrier(target);
    const targetEdges = directLinkSet(target);
    return source.events.every((event) => typeof map[event] === "string" && target.events.includes(map[event]))
        && source.links.every((link) => targetEdges.has(linkKey({ from: map[link.from], to: map[link.to] })));
}
export function pullbackColors(map, colors) {
    return Object.freeze(Object.fromEntries(Object.entries(map).map(([source, target]) => [source, colorOf(colors, target)])));
}
function undirectedNeighbors(carrier) {
    assertCarrier(carrier);
    const neighbors = new Map(carrier.events.map((event) => [event, new Set()]));
    for (const link of carrier.links) {
        neighbors.get(link.from).add(link.to);
        neighbors.get(link.to).add(link.from);
    }
    return neighbors;
}
export function bipartiteColoring(carrier) {
    const neighbors = undirectedNeighbors(carrier);
    const colors = new Map();
    for (const root of carrier.events) {
        if (colors.has(root))
            continue;
        colors.set(root, 0);
        const queue = [root];
        while (queue.length > 0) {
            const current = queue.shift();
            const nextColor = 1 - colors.get(current);
            for (const neighbor of neighbors.get(current) ?? []) {
                if (!colors.has(neighbor)) {
                    colors.set(neighbor, nextColor);
                    queue.push(neighbor);
                }
                else if (colors.get(neighbor) !== nextColor) {
                    return undefined;
                }
            }
        }
    }
    return Object.freeze(Object.fromEntries([...colors.entries()]));
}
export const hasBoolPolarization = (carrier) => bipartiteColoring(carrier) !== undefined;
export function liouville(carrier, colors) {
    return polarizationForm(carrier, colors);
}
export function causalTriangles(carrier) {
    assertCarrier(carrier);
    const edges = directLinkSet(carrier);
    const out = [];
    for (const a of carrier.events) {
        for (const b of carrier.events) {
            if (a === b || !edges.has(linkKey({ from: a, to: b })))
                continue;
            for (const c of carrier.events) {
                if (c === a || c === b)
                    continue;
                if (edges.has(linkKey({ from: b, to: c })) && edges.has(linkKey({ from: a, to: c }))) {
                    out.push(Object.freeze({ a, b, c }));
                }
            }
        }
    }
    return Object.freeze(out);
}
export function omegaLiouville(carrier, colors) {
    return Object.freeze(causalTriangles(carrier).map(({ a, b, c }) => polForm(colors, b, c) - polForm(colors, a, c) + polForm(colors, a, b)));
}
export const diamondCarrier = Object.freeze({
    kind: "lorentzian.causalSet",
    events: Object.freeze(["a", "b", "c", "d"]),
    links: Object.freeze([
        Object.freeze({ from: "a", to: "b" }),
        Object.freeze({ from: "a", to: "c" }),
        Object.freeze({ from: "a", to: "d" }),
        Object.freeze({ from: "b", to: "d" }),
        Object.freeze({ from: "c", to: "d" }),
    ]),
});
export const triangleCarrier = Object.freeze({
    kind: "lorentzian.causalSet",
    events: Object.freeze(["x", "y", "z"]),
    links: Object.freeze([
        Object.freeze({ from: "x", to: "y" }),
        Object.freeze({ from: "y", to: "z" }),
        Object.freeze({ from: "x", to: "z" }),
    ]),
});
export function polarizationReceipt(carrier = diamondCarrier, colors = Object.freeze({ a: 0, b: 1, c: 1, d: 2 })) {
    const form = polarizationForm(carrier, colors);
    const nondegenerateValue = nondegenerate(carrier, colors);
    const proper = properColoring(carrier, colors);
    const map = Object.freeze({ p: "a", q: "b", r: "d" });
    const source = Object.freeze({
        kind: "lorentzian.causalSet",
        events: Object.freeze(["p", "q", "r"]),
        links: Object.freeze([Object.freeze({ from: "p", to: "q" }), Object.freeze({ from: "q", to: "r" })]),
    });
    const pulled = pullbackColors(map, colors);
    const preserves = graphHom(source, carrier, map)
        && (!nondegenerateValue || nondegenerate(source, pulled));
    const boolIffBipartite = hasBoolPolarization(carrier) === (bipartiteColoring(carrier) !== undefined)
        && hasBoolPolarization(triangleCarrier) === false;
    if (nondegenerateValue !== proper || !preserves || !boolIffBipartite) {
        throw new TypeError("causalPolarization.receipt: finite polarization laws failed");
    }
    return Object.freeze({
        kind: "lorentzian.causalPolarization.receipt:witness",
        carrier,
        colors,
        form,
        nondegenerate: nondegenerateValue,
        properColoring: proper,
        nondegenerateIffProper: true,
        mldPreservesPolarization: true,
        boolPolarizationIffBipartite: true,
        chromaticObstruction: "odd causal cycle obstructs Bool polarization",
    });
}
export function liouvilleReceipt(carrier = diamondCarrier, colors = Object.freeze({ a: 0, b: 1, c: 1, d: 2 })) {
    const form = liouville(carrier, colors);
    const omega = omegaLiouville(carrier, colors);
    const liouvilleEqualsPol = JSON.stringify(form) === JSON.stringify(polarizationForm(carrier, colors));
    const omegaZero = omega.every((value) => value === 0);
    const nondegenerateIffProper = nondegenerate(carrier, colors) === properColoring(carrier, colors);
    const preserved = polarizationReceipt(carrier, colors).mldPreservesPolarization === true;
    if (!liouvilleEqualsPol || !omegaZero || !nondegenerateIffProper || !preserved) {
        throw new TypeError("causalLiouville.receipt: finite Liouville laws failed");
    }
    return Object.freeze({
        kind: "lorentzian.causalLiouville.receipt:witness",
        carrier,
        colors,
        liouville: form,
        omega,
        liouvilleCodirEqualsPolForm: true,
        omegaExact: true,
        omegaClosed: true,
        omegaLiouvilleZero: true,
        liouvilleNondegenerateIffProper: true,
        mldPreservesLiouville: true,
        exactSymplecticBoundary: "the implemented datum is exact Liouville polarization, not a nontrivial H2 class",
    });
}
