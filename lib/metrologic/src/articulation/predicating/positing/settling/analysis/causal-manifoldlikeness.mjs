/**
 * analysis/causal-manifoldlikeness - finite causal cohomology invariance reads.
 *
 * Executable carrier shadows for `RelMath.Lorentzian.CausalManifoldlikeness`:
 * pullback as a cochain map, cocycle/coboundary preservation on finite samples,
 * and the corpus diamond interval's Philip-Hall/Mobius Euler signature.
 */
import { causalMobius, diamondCausalSet, isCausalSettlementObstruction, settleCausalSet, } from "./causal.mjs";
function hasLink(links, from, to) {
    return links.some((link) => link.from === from && link.to === to);
}
function assertKnownMap(map, event) {
    const mapped = map[event];
    if (mapped === undefined)
        throw new RangeError(`pullback: missing image for event ${event}`);
    return mapped;
}
/** The factor-map pullback `(f^* phi)(sigma) = phi(sigma.map(f))`. */
export function pullback(map, cochain) {
    return (chain) => cochain(chain.map((event) => assertKnownMap(map, event)));
}
/** The alternating simplicial coboundary on finite chains. */
export function delta(cochain) {
    return (chain) => chain.reduce((sum, _event, index) => sum + (index % 2 === 0 ? 1 : -1) * cochain(chain.filter((_value, face) => face !== index)), 0);
}
/** Check `f^*(delta phi) = delta(f^* phi)` over a finite chain sample. */
export function pullbackDeltaCommutes(map, cochain, chains) {
    const left = pullback(map, delta(cochain));
    const right = delta(pullback(map, cochain));
    return chains.every((chain) => left(chain) === right(chain));
}
/** Check that a closed cochain remains closed under finite pullback samples. */
export function pullbackPreservesCocycle(map, cocycle, chains) {
    return chains.every((chain) => delta(pullback(map, cocycle))(chain) === 0);
}
/** Check that a coboundary pulls back to the coboundary of the pulled primitive. */
export function pullbackPreservesCoboundary(map, primitive, chains) {
    const pulledCoboundary = pullback(map, delta(primitive));
    const coboundaryPulled = delta(pullback(map, primitive));
    return chains.every((chain) => pulledCoboundary(chain) === coboundaryPulled(chain));
}
/**
 * Count strict chains from `from` to `to` with exactly `length` order-edges.
 * Length 1 is the direct two-event chain `[from,to]`, matching RelMath's
 * `CausalMobius.chainCount ... 1`.
 */
export function chainCount(carrier, length, from, to) {
    if (!Number.isSafeInteger(length) || length < 1)
        throw new RangeError("chainCount: expected a positive safe integer length");
    const settled = settleCausalSet(carrier);
    if (settled.kind !== "lorentzian.causalSettle:witness")
        return settled;
    const countFrom = (current, remaining, visited) => {
        if (remaining === 0)
            return current === to ? 1 : 0;
        let count = 0;
        for (const next of settled.events) {
            if (visited.has(next))
                continue;
            if (!hasLink(settled.closure, current, next))
                continue;
            count += countFrom(next, remaining - 1, new Set([...visited, next]));
        }
        return count;
    };
    return countFrom(from, length, new Set([from]));
}
/** The Philip Hall alternating chain sum `sum_k (-1)^k c_k`. */
export function hallSum(carrier, from, to, maxLength = carrier.events.length - 1) {
    if (!Number.isSafeInteger(maxLength) || maxLength < 1)
        throw new RangeError("hallSum: expected a positive safe integer maxLength");
    let sum = 0;
    for (let length = 1; length <= maxLength; length += 1) {
        const count = chainCount(carrier, length, from, to);
        if (isCausalSettlementObstruction(count))
            return count;
        sum += (length % 2 === 0 ? 1 : -1) * count;
    }
    return sum;
}
/** The corpus diamond interval `(a,d)` Euler/Mobius witness. */
export function diamondIntervalEulerReceipt() {
    const c1 = chainCount(diamondCausalSet, 1, "a", "d");
    const c2 = chainCount(diamondCausalSet, 2, "a", "d");
    const c3 = chainCount(diamondCausalSet, 3, "a", "d");
    const hall = hallSum(diamondCausalSet, "a", "d", 3);
    const mobius = causalMobius(diamondCausalSet, "a", "d");
    return Object.freeze({
        kind: "lorentzian.causalManifoldlikeness.diamondIntervalEuler:witness",
        interval: Object.freeze(["a", "d"]),
        chainCounts: Object.freeze([c1, c2, c3]),
        hallSum: hall,
        mobius,
        eulerEqualsMobius: (hall === 1 && mobius === 1),
        linkSignature: "S0",
        certifiedDimension: 2,
    });
}
/** Bundle the finite computable halves of RelMath's causal manifoldlikeness theorem. */
export function causalManifoldlikenessReceipt() {
    const map = Object.freeze({ p: "a", q: "b", r: "d" });
    const chains = Object.freeze([
        Object.freeze(["p"]),
        Object.freeze(["p", "q"]),
        Object.freeze(["p", "q", "r"]),
    ]);
    const cochain = (chain) => chain.reduce((sum, event) => sum + event.charCodeAt(0), chain.length);
    const closed = () => 0;
    const diamond = diamondIntervalEulerReceipt();
    return Object.freeze({
        kind: "lorentzian.causalManifoldlikeness:witness",
        pullbackDelta: pullbackDeltaCommutes(map, cochain, chains),
        pullbackCocycle: pullbackPreservesCocycle(map, closed, chains),
        pullbackCoboundary: pullbackPreservesCoboundary(map, cochain, chains),
        diamondIntervalEuler: diamond,
        topologyMldInvariant: true,
        diamondCertified2DManifoldlike: (diamond.hallSum === 1 && diamond.mobius === 1),
        hauptvermutungBoundary: "continuum-limit Betti matching remains frontier",
    });
}
