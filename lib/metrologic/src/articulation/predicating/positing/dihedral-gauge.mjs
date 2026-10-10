import { readingFamilies, readingOfSides, samePoint, sidesOfReading, conflateReading, gauge, gaugeElementNames, knowledgeJoinReading, knowledgeMeetReading, negateReading, truthJoinReading, truthMeetReading, knowledgeLeqReading, truthLeqReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_BOTTOM, TRUTH_TOP } from "../../../reading-points.mjs";
/**
 * positing/dihedral-gauge — D4 as the value-level symmetry surface of FOUR.
 *
 * The FOUR reading algebra has two visible gauges. `bilattice-charge` carries the
 * Klein-four gauge K4 = `{ id, negation, conflation, double }`: the symmetries
 * that act within the two orders. Each K4 element preserves or reverses the
 * knowledge order and the truth order, but it carries knowledge order to
 * knowledge order and truth order to truth order; it never leaves an order. K4 is
 * missing the one symmetry of FOUR that exchanges the two orders.
 *
 * `orderSwapValue` is that missing symmetry: keep the truth side, complement the
 * falsity side. It witnesses the order-isomorphism
 * `(FOUR, knowledge) ~= (FOUR, truth)`, swapping `absurd <-> active` and
 * `potential <-> stable`. It belongs to neither order's automorphism group
 * precisely because it exchanges them.
 *
 * Adjoining `orderSwapValue` to K4 yields the order-eight dihedral gauge: the
 * full symmetry group of FOUR as a doubly ordered set, the bilattice square. The
 * order-preserving coset is K4. The order-swapping coset is
 * `{ order-swap, order-swap-negation, order-swap-conflation, order-swap-double }`,
 * each acting as `gauge(k, orderSwapValue(value))`. The defining dihedral
 * relation exposed here is `order-swap · negation · order-swap = conflation`;
 * the swapped coset contains the two diagonal reflections and the two quarter
 * rotations.
 *
 * The public API is deliberately value-level. The order-swap complements one
 * evidence side, and accumulated witness lists do not carry enough information to
 * perform that complement lawfully. Use this module to read the finite symmetry
 * algebra of admitted reading values, not to rewrite evidence carriers.
 *
 * The Lean side has the fuller proof object in `RelMath.Positing.D4Gauge`, with
 * `KleinFourGauge` and `OrderSwapDuality` supplying the upstream pieces. This
 * module is the Node carrier surface: names, action, multiplication by action
 * composition, fixed sets, coset effects, and witness-shaped reads for the
 * cross-order isomorphism and the defining conjugation law.
 *
 * @packageDocumentation
 */

/**
 * The order-swap involution σ: ⟨truth, falsity⟩ ↦ ⟨truth, ¬falsity⟩ — keep the
 * truth side, complement the falsity side. The cross-order iso
 * (FOUR, ≤knowledge) ≅ (FOUR, ≤truth); it swaps `absurd ↔ active` and
 * `potential ↔ stable`, and belongs to neither order's automorphism group.
 */
export function orderSwapValue(value) {
    const [truth, falsity] = sidesOfReading(value);
    return readingOfSides("knowledge", truth, !falsity);
}
const orderSwapCoset = ["order-swap", "order-swap-negation", "order-swap-conflation", "order-swap-double"];
/** All eight D₄ element names: the order-preserving K₄ coset, then the order-swapping
 * K₄·σ coset. */
export const dihedralElementNames = Object.freeze([...gaugeElementNames, ...orderSwapCoset]);
const isGaugeElementName = (element) => gaugeElementNames.includes(element);
/**
 * Apply a D₄ element to a reading value. The order-preserving coset K₄ acts by
 * `gauge`; the order-swapping coset K₄·σ acts by `gauge(k, σ value)` — σ first, then
 * the Klein-four part.
 */
export function dihedral(element, value) {
    switch (element) {
        case "order-swap":
            return orderSwapValue(value);
        case "order-swap-negation":
            return gauge("negation", orderSwapValue(value));
        case "order-swap-conflation":
            return gauge("conflation", orderSwapValue(value));
        case "order-swap-double":
            return gauge("double", orderSwapValue(value));
        default:
            return gauge(element, value);
    }
}
const permutationOf = (element) => readingFamilies.knowledge.map((name) => dihedral(element, name));
const elementForPermutation = (permutation) => dihedralElementNames.find((element) => permutationOf(element).every((image, index) => image === permutation[index]));
/**
 * The dihedral multiplication g·h, DERIVED from the action: the unique element whose
 * action equals `dihedral(g, dihedral(h, ·))`. Throws if the composite leaves D₄ —
 * which it cannot, so a successful return also witnesses closure.
 */
export function dihedralMul(left, right) {
    const composite = readingFamilies.knowledge.map((name) => dihedral(left, dihedral(right, name)));
    const found = elementForPermutation(composite);
    if (!found)
        throw new TypeError(`dihedralMul: ${left}·${right} left D₄ — the gauge is not closed`);
    return found;
}
/** The reading values fixed by a D₄ element. */
export const dihedralFixedSet = (element) => Object.freeze(readingFamilies.knowledge.filter((value) => samePoint(dihedral(element, value), value)));
/** The order effect of a D₄ element: K₄ preserves each order, K₄·σ swaps them. */
export const dihedralOrderEffect = (element) => isGaugeElementName(element) ? "order-preserving" : "order-swapping";
/**
 * Witness that σ is the cross-order isomorphism at `(left, right)`:
 * `left ≤knowledge right ⟺ σ left ≤truth σ right`.
 */
export function orderSwapIso(left, right) {
    const swappedLeft = orderSwapValue(left);
    const swappedRight = orderSwapValue(right);
    const knowledgeLeq = knowledgeLeqReading(left, right);
    const truthLeqSwapped = truthLeqReading(swappedLeft, swappedRight);
    return knowledgeLeq === truthLeqSwapped
        ? Object.freeze({
            kind: "dihedral-gauge.orderSwapIso:witness",
            left,
            right,
            swappedLeft,
            swappedRight,
            knowledgeLeq,
        })
        : Object.freeze({
            kind: "dihedral-gauge.orderSwapIso-obstruction",
            left,
            right,
            swappedLeft,
            swappedRight,
            knowledgeLeq,
            truthLeqSwapped,
        });
}
const allReadingPairs = (predicate) => readingFamilies.knowledge.every((left) => readingFamilies.knowledge.every((right) => predicate(left, right)));
/** Bundle the finite Node shadow of `RelMath.Positing.OrderSwapDuality`. */
export function orderSwapDualityReceipt() {
    const swapTable = Object.freeze(Object.fromEntries(readingFamilies.knowledge.map((value) => [value, orderSwapValue(value)])));
    const involutive = readingFamilies.knowledge.every((value) => samePoint(orderSwapValue(orderSwapValue(value)), value));
    const distinctFromK4 = gaugeElementNames.every((element) => readingFamilies.knowledge.some((value) => !samePoint(orderSwapValue(value), gauge(element, value))));
    const swapsBounds = swapTable[KNOWLEDGE_BOTTOM] === TRUTH_BOTTOM &&
        swapTable[TRUTH_BOTTOM] === KNOWLEDGE_BOTTOM &&
        swapTable[TRUTH_TOP] === KNOWLEDGE_TOP &&
        swapTable[KNOWLEDGE_TOP] === TRUTH_TOP;
    const knowledgeToTruthIso = allReadingPairs((left, right) => knowledgeLeqReading(left, right) === truthLeqReading(orderSwapValue(left), orderSwapValue(right)));
    const truthToKnowledgeIso = allReadingPairs((left, right) => truthLeqReading(left, right) === knowledgeLeqReading(orderSwapValue(left), orderSwapValue(right)));
    const knowledgeJoinTransport = allReadingPairs((left, right) => samePoint(orderSwapValue(knowledgeJoinReading(left, right)), truthJoinReading(orderSwapValue(left), orderSwapValue(right))));
    const knowledgeMeetTransport = allReadingPairs((left, right) => samePoint(orderSwapValue(knowledgeMeetReading(left, right)), truthMeetReading(orderSwapValue(left), orderSwapValue(right))));
    const truthJoinConjugate = allReadingPairs((left, right) => samePoint(truthJoinReading(left, right), orderSwapValue(knowledgeJoinReading(orderSwapValue(left), orderSwapValue(right)))));
    const truthMeetConjugate = allReadingPairs((left, right) => samePoint(truthMeetReading(left, right), orderSwapValue(knowledgeMeetReading(orderSwapValue(left), orderSwapValue(right)))));
    const canonicalJoinClosureTransport = readingFamilies.knowledge.every((target) => readingFamilies.knowledge.every((value) => samePoint(orderSwapValue(knowledgeJoinReading(target, orderSwapValue(value))), truthJoinReading(orderSwapValue(target), value))));
    const settleJoinClosureTransport = readingFamilies.knowledge.every((target) => samePoint(orderSwapValue(knowledgeJoinReading(target, KNOWLEDGE_BOTTOM)), truthJoinReading(orderSwapValue(target), TRUTH_BOTTOM)));
    if (!involutive ||
        !distinctFromK4 ||
        !swapsBounds ||
        !knowledgeToTruthIso ||
        !truthToKnowledgeIso ||
        !knowledgeJoinTransport ||
        !knowledgeMeetTransport ||
        !truthJoinConjugate ||
        !truthMeetConjugate ||
        !canonicalJoinClosureTransport ||
        !settleJoinClosureTransport) {
        throw new TypeError("orderSwapDualityReceipt: finite order-swap laws failed");
    }
    return Object.freeze({
        kind: "dihedral-gauge.orderSwapDuality:witness",
        theoremInvolution: "RelMath.Reading.swap_swap",
        theoremKnowledgeTruthIso: "RelMath.Reading.swap_kle_tle",
        theoremTruthKnowledgeIso: "RelMath.Reading.swap_tle_kle",
        theoremJoinK: "RelMath.Reading.swap_joinK",
        theoremMeetK: "RelMath.Reading.swap_meetK",
        theoremClosureTransport: "RelMath.Reading.toTClosure_joinClosure_op",
        theoremSettleTransport: "RelMath.Reading.swap_settle_joinClosure",
        swapTable,
        involutive: true,
        distinctFromK4: true,
        swapsBounds: true,
        knowledgeToTruthIso: true,
        truthToKnowledgeIso: true,
        knowledgeJoinTransport: true,
        knowledgeMeetTransport: true,
        truthJoinConjugate: true,
        truthMeetConjugate: true,
        canonicalJoinClosureTransport: true,
        settleJoinClosureTransport: true,
    });
}
/**
 * Witness the defining dihedral relation σ∼σ = − at a value: conjugating negation by
 * the order-swap yields conflation. This is the relation that makes ⟨K₄, σ⟩ the
 * dihedral group D₄ rather than an abelian extension.
 */
export function dihedralConjugation(value) {
    const conjugate = orderSwapValue(negateReading(orderSwapValue(value)));
    const conflation = conflateReading(value);
    return samePoint(conjugate, conflation)
        ? Object.freeze({ kind: "dihedral-gauge.conjugation:witness", value, conjugate, conflation })
        : Object.freeze({ kind: "dihedral-gauge.conjugation-obstruction", value, conjugate, conflation });
}
const knowledgeComparable = (left, right) => knowledgeLeqReading(left, right) || knowledgeLeqReading(right, left);
const truthComparable = (left, right) => truthLeqReading(left, right) || truthLeqReading(right, left);
/**
 * Witness that a D₄ element is in the order-swapping coset K₄·σ — the non-trivial
 * class of `D₄/K₄ ≅ ℤ/2`. Direction-agnostically: for every pair, `a, b` are
 * knowledge-comparable ⟺ `g a, g b` are truth-comparable (so `g` carries the
 * ≤knowledge-incomparable pair {potential, active} onto the ≤truth-incomparable pair
 * {absurd, stable}). The first failing pair is the obstruction, which every
 * order-preserving K₄ element produces.
 */
export function dihedralSwapsOrders(element) {
    for (const left of readingFamilies.knowledge) {
        for (const right of readingFamilies.knowledge) {
            if (knowledgeComparable(left, right) !== truthComparable(dihedral(element, left), dihedral(element, right))) {
                return Object.freeze({ kind: "dihedral-gauge.swapsOrders-obstruction", element, left, right });
            }
        }
    }
    return Object.freeze({ kind: "dihedral-gauge.swapsOrders:witness", element });
}
const sameValueName = samePoint;
const allDistinctPermutations = () => {
    const seen = new Set();
    for (const element of dihedralElementNames)
        seen.add(permutationOf(element).join("|"));
    return seen.size === dihedralElementNames.length;
};
const actionIsHomomorphism = () => dihedralElementNames.every((left) => dihedralElementNames.every((right) => readingFamilies.knowledge.every((value) => sameValueName(dihedral(dihedralMul(left, right), value), dihedral(left, dihedral(right, value))))));
const multiplicationIsAssociative = () => dihedralElementNames.every((left) => dihedralElementNames.every((middle) => dihedralElementNames.every((right) => dihedralMul(dihedralMul(left, middle), right) === dihedralMul(left, dihedralMul(middle, right)))));
const identityIsTwoSided = () => dihedralElementNames.every((element) => dihedralMul("id", element) === element && dihedralMul(element, "id") === element);
const inverseTable = () => {
    const entries = dihedralElementNames.map((element) => {
        const inverse = dihedralElementNames.find((candidate) => dihedralMul(candidate, element) === "id" && dihedralMul(element, candidate) === "id");
        if (!inverse)
            throw new TypeError(`d4GaugeReceipt: no inverse for ${element}`);
        return [element, inverse];
    });
    return Object.freeze(Object.fromEntries(entries));
};
const elementIsInK4 = (element) => isGaugeElementName(element);
const elementIsInSwapCoset = (element) => !isGaugeElementName(element);
const k4IsClosed = () => gaugeElementNames.every((left) => gaugeElementNames.every((right) => elementIsInK4(dihedralMul(left, right))));
const cosetBitIsHomomorphism = () => dihedralElementNames.every((left) => dihedralElementNames.every((right) => elementIsInSwapCoset(dihedralMul(left, right)) === (elementIsInSwapCoset(left) !== elementIsInSwapCoset(right))));
const orderEffectTable = () => Object.freeze(Object.fromEntries(dihedralElementNames.map((element) => [element, dihedralOrderEffect(element)])));
/** Bundle the finite Node shadow of `RelMath.D4.d4_is_dihedral` and `d4_is_aut_four`. */
export function d4GaugeReceipt() {
    const inverses = inverseTable();
    const rotation = "order-swap-negation";
    const reflection = "order-swap";
    const rotationSquared = dihedralMul(rotation, rotation);
    const reflectionSquared = dihedralMul(reflection, reflection);
    const reflectedRotation = dihedralMul(dihedralMul(reflection, rotation), reflection);
    const swapNegationSwap = dihedralMul(dihedralMul(reflection, "negation"), reflection);
    const negSwap = dihedralMul("negation", reflection);
    const swapNeg = dihedralMul(reflection, "negation");
    if (!allDistinctPermutations())
        throw new TypeError("d4GaugeReceipt: action is not faithful");
    if (!actionIsHomomorphism())
        throw new TypeError("d4GaugeReceipt: action is not a homomorphism");
    if (!multiplicationIsAssociative())
        throw new TypeError("d4GaugeReceipt: multiplication is not associative");
    if (!identityIsTwoSided())
        throw new TypeError("d4GaugeReceipt: identity is not two-sided");
    if (dihedralMul(rotationSquared, rotationSquared) !== "id") {
        throw new TypeError("d4GaugeReceipt: rotation must have fourth power identity");
    }
    if (reflectionSquared !== "id")
        throw new TypeError("d4GaugeReceipt: reflection must square to identity");
    if (reflectedRotation !== inverses[rotation]) {
        throw new TypeError("d4GaugeReceipt: reflection must conjugate rotation to its inverse");
    }
    if (swapNegationSwap !== "conflation") {
        throw new TypeError("d4GaugeReceipt: order-swap conjugated negation must be conflation");
    }
    if (negSwap === swapNeg)
        throw new TypeError("d4GaugeReceipt: D4 witness must be non-abelian");
    if (!k4IsClosed())
        throw new TypeError("d4GaugeReceipt: K4 coset must be closed");
    if (!cosetBitIsHomomorphism())
        throw new TypeError("d4GaugeReceipt: coset bit must be a homomorphism");
    return Object.freeze({
        kind: "dihedral-gauge.d4:witness",
        theoremDihedral: "RelMath.D4.d4_is_dihedral",
        theoremAutFour: "RelMath.D4.d4_is_aut_four",
        elements: dihedralElementNames,
        orderEight: true,
        faithfulAction: true,
        actionHomomorphism: true,
        associative: true,
        identity: true,
        inverses,
        rotation,
        reflection,
        rotationSquared,
        rotationFourthIsIdentity: true,
        reflectionSquaredIsIdentity: true,
        reflectionConjugatesRotationToInverse: true,
        swapNegationSwapIsConflation: true,
        nonAbelian: true,
        k4Coset: gaugeElementNames,
        swapCoset: orderSwapCoset,
        cosetPartition: true,
        k4Closed: true,
        cosetBitHomomorphism: true,
        orderEffects: orderEffectTable(),
    });
}
