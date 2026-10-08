/**
 * analysis/conservation — the boundary operator ∂ and the conservation law.
 *
 * Where the Laplacian L = ∂∂* is the symmetric second-order operator, this is
 * the first-order ∂ underneath it, which keeps the orientation L throws away: a
 * cell relates subject → object, value flows from subject into object. A FLOW is
 * a Rational per oriented edge (a 1-chain); its boundary ∂f is the net
 * accumulation per term (a 0-chain). ∂f = 0 everywhere is Kirchhoff's current
 * law / a circulation / ker ∂ / a conserved current. The syndrome names the
 * leaking term; an elided edge can be solved for. Generalized to any
 * GradedAdditive quantity (superselection by sector). Carrier-valued throughout.
 *
 * A network is its terms and oriented edges {from, to, fromIndex, toIndex}; SignGraph's
 * flowNetwork reads one off a section's cells.
 */
import { ratAdd, ratIsZero, ratSubtract, ratZero } from "@red-cup-engineering/exact-number-data-service/exact-number";
const requireFlow = (network, flow) => {
    if (flow.length !== network.edges.length)
        throw new TypeError("a flow assigns a value to every oriented edge of the network");
};
/** The boundary ∂(flow): net accumulation (inflow − outflow) at every term. */
export function divergence(network, flow) {
    requireFlow(network, flow);
    const net = network.terms.map(() => ratZero);
    network.edges.forEach((edge, index) => {
        const value = flow[index];
        net[edge.toIndex] = ratAdd(net[edge.toIndex], value);
        net[edge.fromIndex] = ratSubtract(net[edge.fromIndex], value);
    });
    return Object.freeze(net);
}
/** Whether a flow is conserved (Kirchhoff balance / ker ∂). */
export function conserved(network, flow) {
    const div = divergence(network, flow);
    const leaking = div.findIndex((value) => !ratIsZero(value));
    if (leaking !== -1) {
        return Object.freeze({
            kind: "meme-analysis.conservation.conserved-obstruction",
            network,
            flow: Object.freeze([...flow]),
            divergence: div,
            atTerm: network.terms[leaking],
            residual: div[leaking],
        });
    }
    return Object.freeze({ kind: "meme-analysis.conservation.conserved:witness", network, flow: Object.freeze([...flow]), divergence: div });
}
/** Solve for the value on an elided edge that makes the whole flow conserve. */
export function complete(network, flow, holeIndex) {
    requireFlow(network, flow);
    if (holeIndex < 0 || holeIndex >= network.edges.length)
        throw new RangeError("the elided edge must be an edge of the network");
    const edge = network.edges[holeIndex];
    const rest = flow.map((value, index) => (index === holeIndex ? ratZero : value));
    const restDivergence = divergence(network, rest);
    const inferred = restDivergence[edge.fromIndex];
    const completed = Object.freeze(rest.map((value, index) => (index === holeIndex ? inferred : value)));
    const judgment = conserved(network, completed);
    if (judgment.kind === "meme-analysis.conservation.conserved:witness") {
        return Object.freeze({ kind: "meme-analysis.conservation.completion:witness", network, edge, inferred, flow: completed });
    }
    return Object.freeze({
        kind: "meme-analysis.conservation.completion-obstruction",
        network,
        edge,
        inferred,
        flow: completed,
        atTerm: judgment.atTerm,
        residual: judgment.residual,
    });
}
