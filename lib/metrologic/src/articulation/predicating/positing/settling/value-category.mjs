/**
 * settling/value-category — settling over a value category `V` (the universal `F_U` over `V`).
 *
 * The spine settles **readings**: the closure `cl = ◇∘□` iterates on the FOUR
 * bilattice to its fixed point. The corpus's `continuous-valued-settling` node
 * generalizes this — settling is parametric in a **value category** `V`, and the
 * *same* settling dynamics run over any complete/residuated lattice of values
 * (the Lawvere quantale, a continuous lattice, fuzzy `[0,1]`, the four-valued
 * bilattice FOUR, or the Boolean `{0,1}`). Settling is the universal closure `F_U`
 * *over* `V`. Ported faithfully from `lean/RelMath/Value/SettlingOverValueCategory.lean`
 * (and the slice of `ClosureOrdinalRegime.lean` it depends on) into the relating
 * substrate — relating's settling was hardwired to the `Charge`/`Valuation`
 * bilattice; this is the layer that lets a settling run over an arbitrary `V`.
 *
 * The corpus's key claim is a **uniformity**: the four-regime stratification of the
 * closure ordinal `κ` — strict(finite) / Scott / transfinite-bounded / aperiodic —
 * is **`V`-independent**. Which regime a settling lands in is decided by `κ`
 * (equivalently by the decidable `ClosureRegimeData`), and that decision never
 * looks at `V`. `V = {0,1}` (Boolean) and `V = FOUR` (Reading) both recover the
 * standard bilattice settling spine.
 *
 * No free data. relating's `ClosureRegime` values are reused, not re-introduced.
 * The Lean carries each structure's laws as proof fields; the faithful TS analog
 * is (a) **finite-exhaustion law judgments** (`partialOrderOver`, `closureOver`)
 * that witness the laws over a sample — the full carrier for a finite `V`, exactly
 * the `decide` the Lean uses — and (b) **smart constructors** that *refuse* to
 * admit data violating the corpus constraints (`closureRegimeData` rejects a finite
 * base that is not Scott-continuous / countably-cofinal, so an invalid datum is
 * unconstructible, as the Lean's proof fields make it). Formalizes
 * `content/.../settling/content/continuous-valued-settling/continuous-valued-settling.md`.
 *
 * This is a finite/sample-checked Node surface. It does not implement a full
 * continuous quantale runtime or prove laws for arbitrary host functions.
 *
 * @packageDocumentation
 */
import { closureRegimeName, finiteClosureRegime, scottClosureRegime, transfiniteClosureRegime, aperiodicClosureRegime, } from "./closure.mjs";
import { readingFamilies, samePoint, knowledgeJoinReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
/** Construct a value category from its order, equality, and seed. */
export const valueCategory = (le, eq, bot) => Object.freeze({ kind: "settling.valueCategory", le, eq, bot });
/** Check that a value category's `le` is a partial order over a finite sample
 * (the full carrier, for a finite `V`). Reflexive at each point; transitive over
 * each ordered triple; antisymmetric (`le a b ∧ le b a → eq a b`) over each pair. */
export function partialOrderOver(V, sample) {
    for (const a of sample) {
        if (!V.le(a, a))
            return Object.freeze({ kind: "settling.valueCategory.partialOrder-obstruction", law: "reflexive", points: Object.freeze([a]) });
    }
    for (const a of sample)
        for (const b of sample) {
            if (V.le(a, b) && V.le(b, a) && !V.eq(a, b)) {
                return Object.freeze({ kind: "settling.valueCategory.partialOrder-obstruction", law: "antisymmetric", points: Object.freeze([a, b]) });
            }
            for (const c of sample) {
                if (V.le(a, b) && V.le(b, c) && !V.le(a, c)) {
                    return Object.freeze({ kind: "settling.valueCategory.partialOrder-obstruction", law: "transitive", points: Object.freeze([a, b, c]) });
                }
            }
        }
    return Object.freeze({ kind: "settling.valueCategory.partialOrder:witness", sample: Object.freeze([...sample]) });
}
/** Construct a `V`-enriched closure from its endomap. */
export const vClosure = (op) => Object.freeze({ kind: "settling.vClosure", op });
/** Check that a `VClosure` is inflationary, monotone, and idempotent over a finite
 * sample (the full carrier, for a finite `V`) — the decision the Lean's
 * `infl/mono/idem` proof fields make. */
export function closureOver(V, T_, sample) {
    for (const a of sample) {
        if (!V.le(a, T_.op(a)))
            return Object.freeze({ kind: "settling.vClosure.law-obstruction", law: "inflationary", points: Object.freeze([a]) });
        if (!V.eq(T_.op(T_.op(a)), T_.op(a)))
            return Object.freeze({ kind: "settling.vClosure.law-obstruction", law: "idempotent", points: Object.freeze([a]) });
    }
    for (const a of sample)
        for (const b of sample) {
            if (V.le(a, b) && !V.le(T_.op(a), T_.op(b))) {
                return Object.freeze({ kind: "settling.vClosure.law-obstruction", law: "monotone", points: Object.freeze([a, b]) });
            }
        }
    return Object.freeze({ kind: "settling.vClosure.law:witness", sample: Object.freeze([...sample]) });
}
/** The **settling** of a value under a `V`-closure: its fixed point from a seed,
 * `settle v = cl v`. The universal `F_U` over `V`, evaluated at `v`. (Named
 * `settleOverValue` to avoid colliding with the spine's charge-level `settle`.) */
export const settleOverValue = (T_, value) => T_.op(value);
/** **The settling is a fixed point.** Witnesses `cl (settle v) = settle v` (the
 * closure's idempotence). */
export function settleFixedPoint(V, T_, value) {
    const settled = settleOverValue(T_, value);
    const resettled = T_.op(settled);
    return V.eq(resettled, settled)
        ? Object.freeze({ kind: "settling.valueCategory.settleFixedPoint:witness", seed: value, settled })
        : Object.freeze({ kind: "settling.valueCategory.settleFixedPoint-obstruction", seed: value, settled, resettled });
}
/** **The settling is the least fixed point above the seed.** Given a candidate `x`
 * with `seed ≤_V x` and `op x = x`, witnesses `settle seed ≤_V x` — the
 * least-upper-bound character of the settled value. Refuses the check when its
 * hypotheses fail (so the witness genuinely certifies the least-fixed-point law). */
export function settleLeast(V, T_, seed, bound) {
    const settled = settleOverValue(T_, seed);
    if (!V.le(seed, bound))
        return Object.freeze({ kind: "settling.valueCategory.settleLeast-obstruction", reason: "seed-not-below-bound", seed, settled, bound });
    if (!V.eq(T_.op(bound), bound))
        return Object.freeze({ kind: "settling.valueCategory.settleLeast-obstruction", reason: "bound-not-fixed", seed, settled, bound });
    if (!V.le(settled, bound))
        return Object.freeze({ kind: "settling.valueCategory.settleLeast-obstruction", reason: "settled-not-below-bound", seed, settled, bound });
    return Object.freeze({ kind: "settling.valueCategory.settleLeast:witness", seed, settled, bound });
}
/** Admit regime data, enforcing the corpus constraints `finiteBase → scottContinuous`
 * and `finiteBase → countableCofinality` (a finite base forces both). Returns an
 * obstruction rather than admitting invalid data — the runtime analog of the Lean's
 * `fin_scott` / `fin_cof` proof fields. */
export function closureRegimeData(scottContinuous, finiteBase, countableCofinality) {
    if (finiteBase && !scottContinuous)
        return Object.freeze({ kind: "settling.closureRegimeData-obstruction", constraint: "finiteBase→scottContinuous" });
    if (finiteBase && !countableCofinality)
        return Object.freeze({ kind: "settling.closureRegimeData-obstruction", constraint: "finiteBase→countableCofinality" });
    return Object.freeze({ kind: "settling.closureRegimeData:witness", data: Object.freeze({ kind: "settling.closureRegimeData", scottContinuous, finiteBase, countableCofinality }) });
}
/** **Classify** regime data into its regime via the corpus equivalences: strict
 * (finite, `κ<ω`) if the base is finite; else Scott (`κ=ω`) if Scott-continuous;
 * else transfinite-bounded (`ω<κ<ω₁`) if countably cofinal; else aperiodic (`κ≥ω₁`).
 * Reuses relating's existing `ClosureRegime` values. */
export function classifyRegime(d) {
    if (d.finiteBase)
        return finiteClosureRegime;
    if (d.scottContinuous)
        return scottClosureRegime;
    if (d.countableCofinality)
        return transfiniteClosureRegime;
    return aperiodicClosureRegime;
}
/** **The four-regime dichotomy.** For any regime data, the classifier lands in one
 * of the four regimes and each is selected by exactly its corpus condition — the
 * four conditions mutually exclusive and jointly exhaustive. */
export function fourRegimeDichotomy(d) {
    const strict = d.finiteBase;
    const scott = d.scottContinuous && !d.finiteBase;
    const transfiniteBounded = !d.scottContinuous && d.countableCofinality;
    const aperiodic = !d.scottContinuous && !d.countableCofinality;
    const regime = classifyRegime(d);
    const flags = [strict, scott, transfiniteBounded, aperiodic];
    const exactlyOne = flags.filter(Boolean).length === 1;
    const matches = (strict && regime === finiteClosureRegime)
        || (scott && regime === scottClosureRegime)
        || (transfiniteBounded && regime === transfiniteClosureRegime)
        || (aperiodic && regime === aperiodicClosureRegime);
    return Object.freeze({
        kind: "settling.fourRegimeDichotomy",
        data: d, regime, strict, scott, transfiniteBounded, aperiodic,
        exclusiveAndExhaustive: exactlyOne && matches,
    });
}
/** **The regime of a settling over `V`, factored through `κ`'s data only.** Takes
 * the value category and the closure as parameters it *ignores*: `regimeOfValueSettling
 * V T d = classifyRegime d`. This is the `V`-independence — the function does not
 * read `V` or `T`. */
export function regimeOfValueSettling(_V, _T, d) {
    return classifyRegime(d);
}
/** **The four-regime classification is `V`-independent (HEADLINE).** For any value
 * category `V₁,V₂` and closures `T₁,T₂`, `regimeOfValueSettling` on the same data is
 * identical (it is `classifyRegime d` regardless of `V`/`T`), and the full
 * {@link fourRegimeDichotomy} holds. So the strict/Scott/transfinite/aperiodic
 * classification is `V`-parametric in statement but `V`-independent in content —
 * decided by the closure ordinal `κ` alone. Checks the independence across the two
 * supplied instances and returns the shared regime + dichotomy. */
export function fourRegimeValueIndependent(V1, T1, V2, T2, d) {
    const left = regimeOfValueSettling(V1, T1, d);
    const right = regimeOfValueSettling(V2, T2, d);
    if (left !== right)
        return Object.freeze({ kind: "settling.valueIndependentRegime-obstruction", left, right });
    return Object.freeze({ kind: "settling.valueIndependentRegime:witness", data: d, regime: left, dichotomy: fourRegimeDichotomy(d) });
}
/** Whether the settling-associated sheaf's `H¹` vanishes in a regime: `true` in the
 * strict and Scott regimes, `false` in the transfinite-bounded and aperiodic regimes
 * (where the cohomological content concentrates). The corpus's regime-dependent
 * cohomology table — the structural ground of "no-arbitrage = H¹ = 0" in the settled
 * regimes. */
export function cohomologyVanishesInRegime(regime) {
    const name = closureRegimeName(regime);
    return name === "strict" || name === "scott";
}
/* ──────────────────────────────────────────────────────────────────────────
 * (D) Boolean `{0,1}` and FOUR (Reading) recover the spine
 *
 * `V = Bool` and `V = ChargeValue` are both value categories, and the standard
 * bilattice settling is the `V = FOUR` case: a reading join-closure is a `VClosure`
 * over `readingValueCategory` whose settle from the seed reaches the target.
 * ────────────────────────────────────────────────────────────────────────── */
/** Value-level knowledge order on readings: `a ≤ₖ b ⇔ a ∨ₖ b = b`. */
const readingKnowledgeLeq = (left, right) => samePoint(knowledgeJoinReading(left, right), right);
/** **`V = FOUR` is a value category.** The bilattice `ChargeValue` read as a value
 * category: order the knowledge order `≤ₖ`, equality `samePoint`, seed the
 * knowledge-bottom `absurd` (`⊥ₖ`). The value category the spine settles over. */
export const readingValueCategory = valueCategory(readingKnowledgeLeq, samePoint, "absurd");
/** The full reading carrier (the four values) — the finite sample the law judgments
 * exhaust over. */
export const readingSample = readingFamilies.knowledge;
/** **Lift a reading knowledge-join to a `VClosure` over `V = FOUR`.** `op a = k ∨ₖ a`
 * (possibilize toward `k`) is inflationary, monotone, and idempotent in `≤ₖ` — the
 * canonical reading settling closure. Settling `⊥ₖ` under it reaches `k`. */
export const knowledgeJoinVClosure = (k) => vClosure((a) => knowledgeJoinReading(k, a));
/** **`V = {0,1}` is a value category.** Boolean read as a value category: order
 * `a ≤ b ⇔ ¬a ∨ b`, equality `===`, seed `false` (`⊥`). The minimal value category
 * the regime claim quantifies over. */
export const booleanValueCategory = valueCategory((a, b) => !a || b, (a, b) => a === b, false);
/** The full Boolean carrier — the sample the law judgments exhaust over. */
export const booleanSample = Object.freeze([false, true]);
/** A boolean join-closure `op a = k ∨ a` — the `V = {0,1}` settling toward `k`. */
export const booleanJoinVClosure = (k) => vClosure((a) => k || a);
/** Witness the spine recovery for a chosen target reading `k`: the value-category and
 * closure laws over the finite carriers, and `settleOverValue (k ∨ₖ ·) ⊥ₖ = k`. */
export function spineRecovery(k) {
    const closure = knowledgeJoinVClosure(k);
    const settled = settleOverValue(closure, readingValueCategory.bot);
    return Object.freeze({
        kind: "settling.spineRecovery:witness",
        readingPartialOrder: partialOrderOver(readingValueCategory, readingSample),
        booleanPartialOrder: partialOrderOver(booleanValueCategory, booleanSample),
        readingClosureLaws: closureOver(readingValueCategory, closure, readingSample),
        settledTarget: k,
        reachesTarget: samePoint(settled, k),
    });
}
const assertNaturalNumber = (value, label) => {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new RangeError(`${label}: expected a safe natural number`);
    }
    return value;
};
/** The support map `supp n = (0 < n)`: magnitude to existence. */
export function support(n) {
    return 0 < assertNaturalNumber(n, "support");
}
export function divides(divisor, magnitude) {
    const d = assertNaturalNumber(divisor, "divides.divisor");
    const c = assertNaturalNumber(magnitude, "divides.magnitude");
    return d === 0 ? c === 0 : c % d === 0;
}
/** The non-divisibility witness `D ∤ C`: magnitude information Boolean support forgets. */
export function magnitudeWitness(divisor, magnitude) {
    return !divides(divisor, magnitude);
}
const booleanAdd = (left, right) => left || right;
const booleanMul = (left, right) => left && right;
const boolLe = (left, right) => booleanAdd(left, right) === right;
export function countingDequantizationReceipt(sampleInput = Object.freeze([0, 1, 2, 3, 5])) {
    const sample = Object.freeze([...sampleInput].map((value) => assertNaturalNumber(value, "countingDequantizationReceipt.sample")));
    if (!sample.includes(0) || !sample.includes(1)) {
        throw new TypeError("countingDequantizationReceipt: sample must include 0 and 1");
    }
    const supports = Object.freeze(sample.map(support));
    const boolStochIdempotent = [false, true].every((value) => booleanAdd(value, value) === value);
    const natStochNotIdempotent = 1 + 1 !== 1;
    const mapsZero = support(0) === false;
    const mapsOne = support(1) === true;
    const mapsAddToOr = sample.every((a) => sample.every((b) => support(a + b) === booleanAdd(support(a), support(b))));
    const mapsMulToAnd = sample.every((a) => sample.every((b) => support(a * b) === booleanMul(support(a), support(b))));
    const monotone = sample.every((a) => sample.every((b) => !(a <= b) || boolLe(support(a), support(b))));
    const diamondApexCount = 5;
    const diamondApexSupport = support(diamondApexCount);
    if (!boolStochIdempotent || !natStochNotIdempotent || !mapsZero || !mapsOne || !mapsAddToOr || !mapsMulToAnd || !monotone || !diamondApexSupport) {
        throw new TypeError("countingDequantizationReceipt: support homomorphism laws failed");
    }
    return Object.freeze({
        kind: "settling.dequantization.counting:witness",
        sample,
        support: supports,
        boolStochIdempotent: true,
        natStochNotIdempotent: true,
        mapsZero: true,
        mapsOne: true,
        mapsAddToOr: true,
        mapsMulToAnd: true,
        monotone: true,
        diamondApexCount: 5,
        diamondApexSupport: true,
        exactDiscreteEndpoint: true,
        continuousMaslovFrontier: "real-power interpolation remains proof/frontier work",
    });
}
/** Bundle the finite Node shadow of `RelMath.Value.MagnitudeWitness`. */
export function magnitudeWitnessReceipt(divisorInput = 2) {
    const divisor = assertNaturalNumber(divisorInput, "magnitudeWitnessReceipt.divisor");
    if (divisor < 2)
        throw new RangeError("magnitudeWitnessReceipt: divisor must be at least 2");
    const divisibleMagnitude = divisor;
    const nondivisibleMagnitude = divisor + 1;
    const supportDivisible = support(divisibleMagnitude);
    const supportNondivisible = support(nondivisibleMagnitude);
    const supportSame = supportDivisible === supportNondivisible;
    const divisibleWitness = magnitudeWitness(divisor, divisibleMagnitude);
    const nondivisibleWitness = magnitudeWitness(divisor, nondivisibleMagnitude);
    const witnessOne = magnitudeWitness(divisor, 1);
    const witnessZero = magnitudeWitness(divisor, 0);
    const diamondBoundaryMagnitude = 1;
    const diamondInteriorMagnitude = 0;
    const diamondBoundaryWitness = magnitudeWitness(divisor, diamondBoundaryMagnitude);
    const diamondInteriorWitness = magnitudeWitness(divisor, diamondInteriorMagnitude);
    if (!supportDivisible ||
        !supportNondivisible ||
        !supportSame ||
        divisibleWitness !== false ||
        nondivisibleWitness !== true ||
        witnessOne !== true ||
        witnessZero !== false ||
        diamondBoundaryWitness !== true ||
        diamondInteriorWitness !== false) {
        throw new TypeError("magnitudeWitnessReceipt: finite magnitude witness laws failed");
    }
    return Object.freeze({
        kind: "settling.dequantization.magnitudeWitness:witness",
        theoremSuppBlindToDvd: "RelMath.Dequantization.supp_blind_to_dvd",
        theoremWitnessOne: "RelMath.Dequantization.witness_one",
        theoremWitnessZero: "RelMath.Dequantization.witness_zero",
        theoremDiamondBoundaryWitness: "RelMath.Dequantization.diamond_boundary_witness",
        theoremDiamondInteriorNoWitness: "RelMath.Dequantization.diamond_interior_no_witness",
        divisor,
        divisibleMagnitude,
        nondivisibleMagnitude,
        supportDivisible: true,
        supportNondivisible: true,
        supportSame: true,
        divisibleWitness: false,
        nondivisibleWitness: true,
        witnessOne: true,
        witnessZero: false,
        diamondBoundaryMagnitude: 1,
        diamondInteriorMagnitude: 0,
        diamondBoundaryWitness: true,
        diamondInteriorWitness: false,
        dequantizationForgetsDivisibility: true,
    });
}

export const closureRegimeDataSchema = {
    $id: "metroplat/closure/value-category/closure-regime-data",
    type: "object",
    required: ["kind", "scottContinuous", "finiteBase", "countableCofinality"],
    properties: {
        kind: { const: "settling.closureRegimeData" },
        scottContinuous: { type: "boolean" },
        finiteBase: { type: "boolean" },
        countableCofinality: { type: "boolean" },
    },
    additionalProperties: false,
    title: "ClosureRegimeData",
    description: "The regime-determining flags of a closure: Scott continuity, finite base, countable cofinality.",
};
export const closureRegimeDataObstructionSchema = {
    $id: "metroplat/closure/value-category/closure-regime-data-obstruction",
    type: "object",
    required: ["kind", "constraint"],
    properties: {
        kind: { const: "settling.closureRegimeData-obstruction" },
        constraint: { enum: ["finiteBase→scottContinuous", "finiteBase→countableCofinality"] },
    },
    additionalProperties: false,
    title: "ClosureRegimeDataObstruction",
    description: "The regime data violates the finiteBase-implies-scottContinuous/countableCofinality constraint.",
};
