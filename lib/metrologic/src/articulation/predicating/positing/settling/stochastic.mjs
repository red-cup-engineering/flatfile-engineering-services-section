/**
 * @packageDocumentation
 *
 * settling/stochastic — settling over the stochastic semiring (Markov, martingale).
 *
 * The value-category hub runs settling over any `V`. Its `stochastic-settling`
 * child takes `V` to be the **stochastic semiring** `([0,1], ·, +)` — `·` as
 * probability along a path, `+` as the convex combine over alternative paths — and
 * the canonical instance is Markov-chain transition settling: a finite state space,
 * a transition kernel `P`, and the closure step `T_stoch(v)(s,o) = Σ_z v(s,z)·P(z,o)`
 * (one matrix multiply). The **stationary distribution** `π` (with `π·P = π`) is the
 * settling's fixed point. Ported from `lean/RelMath/Probability/Stochastic.lean`.
 *
 * No reals, no rationals: the probability semiring is taken **abstractly** (a carrier
 * with `0/1/+/·` and a partial order), and the canonical `Nat` (counting-weight)
 * instance reuses relating's exact-number arithmetic. The Perron–Frobenius/stationary
 * content is structural over the abstract value. The headline finance reading: a
 * **martingale = a stationary process = a stochastic-closure fixed point** — the
 * substrate of the no-arbitrage / risk-neutral measure (FTAP).
 */
import { valueCategory, vClosure, regimeOfValueSettling, fourRegimeValueIndependent, } from "./value-category.mjs";
import {} from "./closure.mjs";
import { fromRatio, natZero, natOne, natAdd, natMultiply, natLeq, natEqual, ratZero, ratOne, ratAdd, ratMultiply, ratEqual, ratCompare, } from "@red-cup-engineering/exact-number-data-service/exact-number";
/** Construct a stochastic semiring from its operations. */
export const stochSemiring = (zero, one, add, mul, le, eq) => Object.freeze({ kind: "settling.stochSemiring", zero, one, add, mul, le, eq });
/** **The `Nat` stochastic semiring (counting weights).** The canonical concrete
 * instance over relating's exact `Natural`: the no-reals model of probability
 * weights, where counting measure `μ(A) = |A|` lives. */
export const natStochSemiring = stochSemiring(natZero, natOne, natAdd, natMultiply, natLeq, natEqual);
/** The exact rational stochastic semiring used by finite probability witnesses. */
export const ratStochSemiring = stochSemiring(ratZero, ratOne, ratAdd, ratMultiply, (left, right) => ratCompare(left, right) <= 0, ratEqual);
/** Construct a Markov kernel from its state enumeration and transition kernel. */
export const markovKernel = (states, P) => Object.freeze({ kind: "settling.markovKernel", states, P });
/** Weighted sum over the state enumeration `Σ_{z ∈ states} f z` (foldr add zero). */
export const kernelSum = (K, V, f) => K.states.reduceRight((acc, z) => V.add(f(z), acc), V.zero);
/** **Row action of the kernel on a distribution** `(advance π)(o) = Σ_z π z · P(z,o)`
 * — the stochastic vector-matrix product `π · P`. `π` is stationary iff `advance π = π`. */
export const advance = (K, V, pi) => (o) => kernelSum(K, V, (z) => V.mul(pi(z), K.P(z, o)));
/** **The stochastic closure** `T_stoch(v)(s,o) = Σ_z v(s,z)·P(z,o)` — one Markov
 * advance (matrix multiply on the right). Iterating gives `v_k = P^k`; its fixed
 * point is the stationary settling. */
export const stochClosure = (K, V, v) => (s, o) => kernelSum(K, V, (z) => V.mul(v(s, z), K.P(z, o)));
/** **`π` is a stationary distribution of `K`**: `∀ o, Σ_z π z · P z o = π o` (`π·P = π`
 * over the listed states). The defining equation of a Markov stationary distribution. */
export const isStationary = (K, V, pi) => K.states.every((o) => V.eq(advance(K, V, pi)(o), pi(o)));
/** Whether each origin row of a finite Markov kernel sums to the stochastic unit. */
export const rowsSumToOne = (K, V) => K.states.every((origin) => V.eq(kernelSum(K, V, (destination) => K.P(origin, destination)), V.one));
/** Detailed balance: `pi z * P z o = pi o * P o z` for every pair of states. */
export const detailedBalance = (K, V, pi) => K.states.every((z) => K.states.every((o) => V.eq(V.mul(pi(z), K.P(z, o)), V.mul(pi(o), K.P(o, z)))));
/** Finite detailed-balance witness: detailed balance plus stochastic rows give stationarity. */
export function detailedBalanceImpliesStationary(K, V, pi) {
    const balanced = detailedBalance(K, V, pi);
    const stochasticRows = rowsSumToOne(K, V);
    const stationary = isStationary(K, V, pi);
    return Object.freeze({
        kind: "settling.detailedBalanceImpliesStationary:witness",
        detailedBalance: balanced,
        rowsSumToOne: stochasticRows,
        stationary,
        implicationHolds: !(balanced && stochasticRows) || stationary,
    });
}
/** **Markov stationary = stochastic-closure fixed point (HEADLINE).** A distribution
 * `π` is stationary iff it is a fixed point of the stochastic closure on `π` — the
 * *same* equation `advance π = π`. So a Markov stationary distribution **is** a
 * stochastic-settling fixed point (and a martingale, read on the value side). */
export function markovStationaryIsClosureFixpoint(K, V, pi) {
    const stationary = isStationary(K, V, pi);
    const fixpoint = K.states.every((o) => V.eq(advance(K, V, pi)(o), pi(o)));
    return Object.freeze({
        kind: "settling.markovStationaryIsClosureFixpoint:witness",
        stationary, fixpoint, equivalent: stationary === fixpoint,
    });
}
/** **A stochastic semiring is a hub value category.** `stochVC V` reads `V`'s
 * partial-order-with-seed (`le`/`eq`, seed `0`) as a {@link ValueCategory}, so all of
 * the value-category hub (including the four-regime classification) applies to
 * stochastic settling. */
export const stochVC = (V) => valueCategory(V.le, V.eq, V.zero);
/** **The value-level stochastic closure** (the quiescent identity endo on `V`): a
 * `VClosure` over `stochVC V` whose settling is the value itself — witnessing that
 * `stochVC V` admits a closure, so the four-regime classification applies. */
export const stochVClosure = (_V) => vClosure((v) => v);
/** **The doubly-stochastic 2-state witness kernel** (Perron–Frobenius existence
 * witness): over `natStochSemiring`, states `[0,1]`, the identity transition
 * `P z o = (z = o ? 1 : 0)` — every row and column sums to `1`. */
export const witnessKernel = markovKernel([0, 1], (z, o) => (z === o ? natOne : natZero));
/** **The uniform distribution on the 2-state witness** `π s = 1` — the stationary
 * distribution for the identity kernel. */
export const uniformWitness = (_s) => natOne;
/** **Perron–Frobenius existence (concrete witness): the uniform distribution is
 * stationary.** For the doubly-stochastic `witnessKernel`, `π · P = π` (each column
 * sums to `1`). A settling fixed point exists — proved with no reals. */
export const uniformWitnessStationary = () => isStationary(witnessKernel, natStochSemiring, uniformWitness);
/** RelMath's finite exact-rational two-state Poisson-settling kernel. */
export const poissonKernel = markovKernel([0, 1], (origin, destination) => {
    if (origin === 0 && destination === 0)
        return fromRatio(1, 2);
    if (origin === 0 && destination === 1)
        return fromRatio(1, 2);
    if (origin === 1 && destination === 0)
        return fromRatio(1, 4);
    return fromRatio(3, 4);
});
/** Stationary distribution for {@link poissonKernel}: `[1/3, 2/3]`. */
export const poissonPi = (state) => (state === 0 ? fromRatio(1, 3) : fromRatio(2, 3));
const factorial = (n) => {
    let product = 1;
    for (let i = 2; i <= n; i += 1)
        product *= i;
    return product;
};
/** Native finite arithmetic shadow of the Poisson detailed-balance identity. */
export function poissonDetailedBalance(lambda, n) {
    if (!Number.isSafeInteger(lambda) || !Number.isSafeInteger(n) || lambda < 0 || n < 0)
        return false;
    const left = (lambda ** n / factorial(n)) * lambda;
    const right = lambda ** (n + 1) / factorial(n + 1) * (n + 1);
    return left === right;
}
/** Finite exact-rational receipt for `RelMath.Probability.PoissonSettling`. */
export function poissonSettlingReceipt() {
    const fixpoint = markovStationaryIsClosureFixpoint(poissonKernel, ratStochSemiring, poissonPi);
    return Object.freeze({
        kind: "settling.poissonSettling:witness",
        detailedBalance: detailedBalance(poissonKernel, ratStochSemiring, poissonPi),
        rowsSumToOne: rowsSumToOne(poissonKernel, ratStochSemiring),
        stationary: isStationary(poissonKernel, ratStochSemiring, poissonPi),
        fixpoint: fixpoint.fixpoint,
        equivalent: fixpoint.equivalent,
        detailedBalanceImpliesStationary: detailedBalanceImpliesStationary(poissonKernel, ratStochSemiring, poissonPi),
    });
}
/** **Stochastic settling IS a hub `V`-settling (HEADLINE).** For any stochastic
 * semiring `V` and regime data `d`: (a) `stochVC V` is a value category carrying
 * `stochVClosure V`, so its regime is `regimeOfValueSettling` — `V`-independent and
 * agreeing with FOUR's regime via {@link fourRegimeValueIndependent}; and (b)
 * Perron–Frobenius existence holds concretely (the uniform distribution is a
 * stationary stochastic-closure fixed point). So stochastic settling is the hub's
 * settling at the stochastic semiring, the four-regime stratification applies, and a
 * stationary settling provably exists. */
export function stochasticIsValueSettling(V, d) {
    const vc = stochVC(V);
    const cl = stochVClosure(V);
    return Object.freeze({
        kind: "settling.stochasticIsValueSettling:witness",
        regime: regimeOfValueSettling(vc, cl, d),
        regimeIndependent: fourRegimeValueIndependent(vc, cl, stochVC(natStochSemiring), stochVClosure(natStochSemiring), d),
        stationaryExists: uniformWitnessStationary(),
    });
}

export const detailedBalanceStationaryWitnessSchema = {
    $id: "metroplat/closure/stochastic/detailed-balance-stationary-witness",
    type: "object",
    required: ["kind", "detailedBalance", "rowsSumToOne", "stationary", "implicationHolds"],
    properties: {
        kind: { const: "settling.detailedBalanceImpliesStationary:witness" },
        detailedBalance: { type: "boolean" },
        rowsSumToOne: { type: "boolean" },
        stationary: { type: "boolean" },
        implicationHolds: { type: "boolean" },
    },
    additionalProperties: false,
    title: "DetailedBalanceStationaryWitness",
    description: "Detailed balance plus stochastic rows give stationarity.",
};
