import { readingFamilies, knowledgeJoinReading, knowledgeMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_BOTTOM, TRUTH_TOP } from "../../../../../reading-points.mjs";
/**
 * analysis/quantale-enriched-sheaf - finite executable shadow of
 * RelMath.Cohomology.QuantaleEnrichedSheaf.
 *
 * Lean builds a commutative unital quantale on FOUR/Charge, Q-categories,
 * Q-functors, q-fuzzy equivalence composition, and the degree-0 enriched
 * Laplacian fixed-point witness. This module exposes the finite charge-quantale
 * instance and bounded Q-category/equivalence receipts.
 */
const values = readingFamilies.knowledge;
const value = (name) => name;
const nameOf = (name) => value(name);
export const mul = (left, right) => knowledgeMeetReading(value(left), value(right));
export const sup = (members) => members.reduce((accumulator, member) => knowledgeJoinReading(value(accumulator), value(member)), KNOWLEDGE_BOTTOM);
export const le = (left, right) => sup([left, right]) === right;
const subsets = (items) => {
    const count = 2 ** items.length;
    return Object.freeze(Array.from({ length: count }, (_, maskValue) => Object.freeze(items.filter((_, index) => (maskValue & (1 << index)) !== 0))));
};
const key = (from, to) => `${from}->${to}`;
export function qcat(objects, hom) {
    const obj = Object.freeze([...objects]);
    if (obj.length === 0)
        throw new TypeError("qcat: at least one object is required");
    for (const x of obj) {
        if (x.length === 0)
            throw new TypeError("qcat: object names must be nonempty");
        for (const y of obj) {
            const h = hom[key(x, y)];
            if (h === undefined)
                throw new TypeError(`qcat: missing hom ${key(x, y)}`);
            nameOf(h);
        }
    }
    return Object.freeze({ kind: "quantaleEnrichedSheaf.qcat", objects: obj, hom: Object.freeze({ ...hom }) });
}
export function hom(cat, from, to) {
    const h = cat.hom[key(from, to)];
    if (h === undefined)
        throw new TypeError(`hom: missing hom ${key(from, to)}`);
    return h;
}
export function qcatReflexive(cat) {
    return cat.objects.every((x) => le(KNOWLEDGE_TOP, hom(cat, x, x)));
}
export function qcatCompositional(cat) {
    return cat.objects.every((x) => cat.objects.every((y) => cat.objects.every((z) => le(mul(hom(cat, x, y), hom(cat, y, z)), hom(cat, x, z)))));
}
export function qfunctor(source, target, mapInput) {
    for (const x of source.objects) {
        if (!target.objects.includes(mapInput[x] ?? ""))
            throw new TypeError(`qfunctor: ${x} maps outside target`);
    }
    const preserves = source.objects.every((x) => source.objects.every((y) => le(hom(source, x, y), hom(target, mapInput[x] ?? "", mapInput[y] ?? ""))));
    if (!preserves)
        throw new TypeError("qfunctor: hom preservation failed");
    return Object.freeze({
        kind: "quantaleEnrichedSheaf.qfunctor",
        sourceObjects: source.objects,
        targetObjects: target.objects,
        map: Object.freeze({ ...mapInput }),
        preservesHomsUpward: true,
    });
}
export function composeFunctor(source, middle, target, left, right) {
    const mapInput = {};
    for (const x of source.objects) {
        const mid = right.map[x];
        if (mid === undefined || !middle.objects.includes(mid))
            throw new TypeError("composeFunctor: right map mismatch");
        const out = left.map[mid];
        if (out === undefined || !target.objects.includes(out))
            throw new TypeError("composeFunctor: left map mismatch");
        mapInput[x] = out;
    }
    return qfunctor(source, target, mapInput);
}
export function oneObjectQCat() {
    return qcat(["unit"], Object.freeze({ [key("unit", "unit")]: KNOWLEDGE_TOP }));
}
export function discreteQCat(objects = ["a", "b"]) {
    const homs = {};
    for (const x of objects)
        for (const y of objects)
            homs[key(x, y)] = x === y ? KNOWLEDGE_TOP : KNOWLEDGE_BOTTOM;
    return qcat(objects, homs);
}
export function readingQuantaleReceipt() {
    const allSubsets = subsets(values);
    const pairs = values.flatMap((a) => values.map((b) => [a, b]));
    const triples = values.flatMap((a) => values.flatMap((b) => values.map((c) => [a, b, c])));
    const leReflexive = values.every((a) => le(a, a));
    const leTransitive = triples.every(([a, b, c]) => !le(a, b) || !le(b, c) || le(a, c));
    const leAntisymmetric = pairs.every(([a, b]) => !le(a, b) || !le(b, a) || a === b);
    const supUpperBound = allSubsets.every((family) => family.every((member) => le(member, sup(family))));
    const supLeastUpperBound = allSubsets.every((family) => values.every((candidate) => !family.every((member) => le(member, candidate)) || le(sup(family), candidate)));
    const mulAssociative = triples.every(([a, b, c]) => mul(mul(a, b), c) === mul(a, mul(b, c)));
    const mulCommutative = pairs.every(([a, b]) => mul(a, b) === mul(b, a));
    const oneIsUnit = values.every((a) => mul(KNOWLEDGE_TOP, a) === a && mul(a, KNOWLEDGE_TOP) === a);
    const mulDistributesOverSup = values.every((a) => allSubsets.every((family) => mul(a, sup(family)) === sup(family.map((member) => mul(a, member)))));
    const mulMonotone = pairs.every(([a, aPrime]) => pairs.every(([b, bPrime]) => !le(a, aPrime) || !le(b, bPrime) || le(mul(a, b), mul(aPrime, bPrime))));
    if (!leReflexive || !leTransitive || !leAntisymmetric || !supUpperBound || !supLeastUpperBound
        || !mulAssociative || !mulCommutative || !oneIsUnit || !mulDistributesOverSup || !mulMonotone) {
        throw new TypeError("readingQuantaleReceipt: finite reading quantale laws failed");
    }
    return Object.freeze({
        kind: "quantaleEnrichedSheaf.readingQuantale:witness",
        carrier: values,
        bottom: KNOWLEDGE_BOTTOM,
        top: KNOWLEDGE_TOP,
        one: KNOWLEDGE_TOP,
        multiplication: "knowledge-meet",
        order: "knowledge",
        leReflexive: true,
        leTransitive: true,
        leAntisymmetric: true,
        supUpperBound: true,
        supLeastUpperBound: true,
        mulAssociative: true,
        mulCommutative: true,
        oneIsUnit: true,
        mulDistributesOverSup: true,
        mulMonotone: true,
    });
}
export function qcategoryReceipt() {
    const one = oneObjectQCat();
    const discrete = discreteQCat();
    const identityMap = Object.fromEntries(discrete.objects.map((object) => [object, object]));
    const identityFunctor = qfunctor(discrete, discrete, identityMap);
    const composedFunctor = composeFunctor(discrete, discrete, discrete, identityFunctor, identityFunctor);
    const oneObjectReflexive = qcatReflexive(one);
    const oneObjectComposition = qcatCompositional(one);
    const discreteReflexive = qcatReflexive(discrete);
    const discreteComposition = qcatCompositional(discrete);
    if (!oneObjectReflexive || !oneObjectComposition || !discreteReflexive || !discreteComposition) {
        throw new TypeError("qcategoryReceipt: Q-category laws failed");
    }
    return Object.freeze({
        kind: "quantaleEnrichedSheaf.qcategory:witness",
        oneObject: one,
        discrete,
        identityFunctor,
        composedFunctor,
        oneObjectReflexive: true,
        oneObjectComposition: true,
        discreteReflexive: true,
        discreteComposition: true,
        identityPreservesHoms: true,
        compositionPreservesHoms: true,
    });
}
export function qFuzzyEquivalenceReceipt(leftGrade = TRUTH_TOP, rightGrade = TRUTH_BOTTOM) {
    const compositeGrade = mul(leftGrade, rightGrade);
    const strictGrade = KNOWLEDGE_TOP;
    const one = oneObjectQCat();
    const roundTripBoundsHold = le(compositeGrade, hom(one, "unit", "unit")) && le(strictGrade, hom(one, "unit", "unit"));
    const compositionMultipliesGrade = compositeGrade === KNOWLEDGE_BOTTOM;
    const strictGradeReducesToRoundTripUnit = strictGrade === KNOWLEDGE_TOP && le(strictGrade, hom(one, "unit", "unit"));
    if (!roundTripBoundsHold || !compositionMultipliesGrade || !strictGradeReducesToRoundTripUnit) {
        throw new TypeError("qFuzzyEquivalenceReceipt: q-fuzzy equivalence laws failed");
    }
    return Object.freeze({
        kind: "quantaleEnrichedSheaf.qFuzzyEquivalence:witness",
        leftGrade,
        rightGrade,
        compositeGrade,
        strictGrade,
        compositionMultipliesGrade: true,
        strictGradeReducesToRoundTripUnit: true,
        roundTripBoundsHold: true,
    });
}
export const laplacian = (weight, x) => mul(x, weight);
export function h0LaplacianReceipt(weight = TRUTH_TOP) {
    const laplacianTable = Object.freeze(Object.fromEntries(values.map((x) => [x, laplacian(weight, x)])));
    const fixedPoints = Object.freeze(values.filter((x) => laplacianTable[x] === x));
    const laplacianIdempotent = values.every((x) => laplacian(weight, laplacian(weight, x)) === laplacian(weight, x));
    const fixedPointsClosedUnderJoin = fixedPoints.every((x) => fixedPoints.every((y) => fixedPoints.includes(sup([x, y]))));
    if (!laplacianIdempotent || !fixedPointsClosedUnderJoin) {
        throw new TypeError("h0LaplacianReceipt: fixed-point laws failed");
    }
    return Object.freeze({
        kind: "quantaleEnrichedSheaf.h0Laplacian:witness",
        weight,
        fixedPoints,
        laplacianTable,
        laplacianIdempotent: true,
        fixedPointsClosedUnderJoin: true,
    });
}
export function receipt() {
    return Object.freeze({
        kind: "quantaleEnrichedSheaf.receipt:witness",
        quantale: readingQuantaleReceipt(),
        qcategory: qcategoryReceipt(),
        fuzzyEquivalence: qFuzzyEquivalenceReceipt(),
        h0: h0LaplacianReceipt(),
        openFrontier: Object.freeze([
            "The runtime receipt checks the concrete finite FOUR/Charge quantale; arbitrary complete quantales remain Lean/proof-side.",
            "Q-categories and Q-functors are finite table carriers here, not a general enriched-category kernel.",
            "Full enriched Cech cohomology over arbitrary sites remains proof/topology work; SEN carries the degree-0 Laplacian fixed-point core.",
        ]),
    });
}
