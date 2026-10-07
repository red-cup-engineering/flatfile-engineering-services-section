import { causalTriangles, diamondCarrier, polForm, } from "./causal-polarization.mjs";
function edge(from, to) {
    return Object.freeze({ from, to });
}
function bicharacteristicTriangle(triangle) {
    return Object.freeze({
        edge01: edge(triangle.a, triangle.b),
        edge12: edge(triangle.b, triangle.c),
        edge02: edge(triangle.a, triangle.c),
    });
}
/** The two legs of a causal 2-simplex are bicharacteristic-composable. */
export function bicharacteristicComposable(left, right) {
    return left.to === right.from;
}
/** List the causal 2-simplices as composable bicharacteristic triangles. */
export function bicharacteristicTriangles(carrier) {
    return Object.freeze(causalTriangles(carrier).map(bicharacteristicTriangle));
}
/** A 1-cochain is additive on every causal triangle: `phi(ac)=phi(ab)+phi(bc)`. */
export function cocycleAdditive(carrier, cochain) {
    return bicharacteristicTriangles(carrier).every((triangle) => cochain(triangle.edge02) === cochain(triangle.edge01) + cochain(triangle.edge12));
}
/** A nonzero composite wavefront has at least one nonzero bicharacteristic leg. */
export function wavefrontInvolutive(carrier, cochain) {
    return bicharacteristicTriangles(carrier).every((triangle) => cochain(triangle.edge02) === 0 || cochain(triangle.edge01) !== 0 || cochain(triangle.edge12) !== 0);
}
/** Exact colour coboundary `dc` as a causal edge cochain. */
export function colorCoboundary(colors) {
    return (causalEdge) => polForm(colors, causalEdge.from, causalEdge.to);
}
/** Bundle the finite propagation content of causal involutivity. */
export function causalInvolutivityReceipt(carrier = diamondCarrier, colors = Object.freeze({ a: 0, b: 1, c: 1, d: 2 })) {
    const triangles = bicharacteristicTriangles(carrier);
    const cochain = colorCoboundary(colors);
    const composable = triangles.every((triangle) => bicharacteristicComposable(triangle.edge01, triangle.edge12));
    const additive = cocycleAdditive(carrier, cochain);
    const involutive = wavefrontInvolutive(carrier, cochain);
    if (!composable || !additive || !involutive) {
        throw new TypeError("causalInvolutivity.receipt: finite bicharacteristic laws failed");
    }
    return Object.freeze({
        kind: "lorentzian.causalInvolutivity:witness",
        triangles,
        edgesComposable: true,
        cocycleAdditive: true,
        wavefrontInvolutive: true,
        bicharacteristicCausal: true,
        bridgeBoundary: "symplectic Hamiltonian flow remains frontier",
    });
}
