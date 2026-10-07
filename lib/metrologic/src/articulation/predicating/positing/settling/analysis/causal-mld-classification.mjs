/**
 * analysis/causal-mld-classification - finite causal H1/MLD class reads.
 *
 * Executable shadows for `RelMath.Lorentzian.CausalMLDClassification` and
 * `RelMath.Lorentzian.CausalMldCohomology`: same-class cochains differ by a
 * coboundary, factor-map pullback preserves that class, and the finite
 * coboundary relation forms the cohomological MLD groupoid.
 */
import { delta, pullback, } from "./causal-manifoldlikeness.mjs";
import { bipartiteColoring, hasBoolPolarization, triangleCarrier, } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/causal-polarization";
const zero = () => 0;
const negate = (cochain) => (chain) => -cochain(chain);
const add = (left, right) => (chain) => left(chain) + right(chain);
/** `SameClass phi psi` on finite samples: `phi - psi = delta primitive`. */
export function sameClass(phi, psi, primitive, chains) {
    const boundary = delta(primitive);
    return chains.every((chain) => phi(chain) - psi(chain) === boundary(chain));
}
/** Reflexivity: a cochain differs from itself by the zero coboundary. */
export function sameClassRefl(phi, chains) {
    return sameClass(phi, phi, zero, chains);
}
/** Symmetry: invert a same-class arrow by negating the primitive. */
export function sameClassSymm(phi, psi, primitive, chains) {
    return sameClass(phi, psi, primitive, chains) && sameClass(psi, phi, negate(primitive), chains);
}
/** Transitivity: compose same-class arrows by adding their primitives. */
export function sameClassTrans(phi, psi, rho, leftPrimitive, rightPrimitive, chains) {
    return sameClass(phi, psi, leftPrimitive, chains)
        && sameClass(psi, rho, rightPrimitive, chains)
        && sameClass(phi, rho, add(leftPrimitive, rightPrimitive), chains);
}
/** Factor-map pullback preserves same-class cochains on finite samples. */
export function pullbackSameClass(map, phi, psi, primitive, sourceChains) {
    return sameClass(pullback(map, phi), pullback(map, psi), pullback(map, primitive), sourceChains);
}
/** The flat causal cl-inv collapses exactly when a Bool polarization exists. */
export function flatClinvCollapse(carrier) {
    return hasBoolPolarization(carrier) === (bipartiteColoring(carrier) !== undefined);
}
/** The all-degree cohomological MLD groupoid laws as finite coboundary checks. */
export function cohomologicalMldGroupoid(phi, psi, rho, leftPrimitive, rightPrimitive, chains) {
    return sameClassRefl(phi, chains)
        && sameClassSymm(phi, psi, leftPrimitive, chains)
        && sameClassTrans(phi, psi, rho, leftPrimitive, rightPrimitive, chains);
}
/** Bundle the finite causal H1/MLD classification invariant. */
export function causalMldClassificationReceipt() {
    const chains = Object.freeze([
        Object.freeze(["a"]),
        Object.freeze(["a", "b"]),
        Object.freeze(["a", "b", "d"]),
    ]);
    const sourceChains = Object.freeze([
        Object.freeze(["p"]),
        Object.freeze(["p", "q"]),
        Object.freeze(["p", "q", "r"]),
    ]);
    const map = Object.freeze({ p: "a", q: "b", r: "d" });
    const chi = (chain) => chain.length * 2;
    const eta = (chain) => chain.reduce((sum, event) => sum + event.charCodeAt(0), 0);
    const phi = (chain) => chain.reduce((sum, event) => sum + event.length, chain.length);
    const psi = (chain) => phi(chain) - delta(chi)(chain);
    const rho = (chain) => psi(chain) - delta(eta)(chain);
    const reflexive = sameClassRefl(phi, chains);
    const symmetric = sameClassSymm(phi, psi, chi, chains);
    const transitive = sameClassTrans(phi, psi, rho, chi, eta, chains);
    const invariant = pullbackSameClass(map, phi, psi, chi, sourceChains);
    const flatCollapse = flatClinvCollapse({
        kind: "lorentzian.causalSet",
        events: Object.freeze(["x", "y"]),
        links: Object.freeze([Object.freeze({ from: "x", to: "y" })]),
    });
    const oddObstruction = !hasBoolPolarization(triangleCarrier);
    const groupoid = cohomologicalMldGroupoid(phi, psi, rho, chi, eta, chains);
    if (!reflexive || !symmetric || !transitive || !invariant || !flatCollapse || !oddObstruction || !groupoid) {
        throw new TypeError("causalMldClassification.receipt: finite MLD classification laws failed");
    }
    return Object.freeze({
        kind: "lorentzian.causalMldClassification:witness",
        sameClassReflexive: true,
        sameClassSymmetric: true,
        sameClassTransitive: true,
        pullbackSameClass: true,
        flatClinvCollapse: true,
        oddCycleObstruction: true,
        cohomologicalMldGroupoid: true,
        invariantStep: "factor-map pullback preserves causal H1 class",
        completenessBoundary: "equal H1 forcing carrier-level MLD remains frontier",
    });
}
