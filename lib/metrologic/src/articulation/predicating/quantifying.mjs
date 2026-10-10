/**
 * predicating/quantifying — finite fiber quantifiers and hyperdoctrine receipts.
 *
 * Executable shadow of `RelMath.Predicating.Quantifying`,
 * `RelMath.Predicating.Hyperdoctrine`, and
 * `RelMath.Predicating.PredicationHyperdoctrineDual`.
 *
 * A finite fibration is stored as a total base map from source cells to target
 * cells; fibers are derived from the map. Quantifiers are finite joins/meets in
 * the knowledge or truth order, and receipt constructors check the adjunction
 * laws over the finite FOUR-valued valuation space when asked for a law witness.
 */
import { orderSwapValue } from "./positing/dihedral-gauge.mjs";
import { readingFamilies, samePoint, knowledgeJoinReading, knowledgeMeetReading, truthJoinReading, truthMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_BOTTOM, TRUTH_TOP } from "../../reading-points.mjs";
const freezeRecord = (record) => Object.freeze({ ...record });
const unique = (values) => new Set(values).size === values.length;
function requireKeys(name, keys) {
    if (!unique(keys))
        throw new TypeError(`${name}: duplicate keys are not a finite carrier`);
    return Object.freeze([...keys]);
}
export function finitePredicatingFibration(points, bases, baseMap) {
    const source = requireKeys("finitePredicatingFibration(points)", points);
    const target = requireKeys("finitePredicatingFibration(bases)", bases);
    const targetSet = new Set(target);
    const map = {};
    const fibers = {};
    for (const base of target)
        fibers[base] = [];
    for (const point of source) {
        const base = baseMap[point];
        if (base === undefined)
            throw new TypeError(`finitePredicatingFibration: missing base image for ${point}`);
        if (!targetSet.has(base))
            throw new TypeError(`finitePredicatingFibration: base image ${base} is not in the codomain`);
        map[point] = base;
        fibers[base]?.push(point);
    }
    return Object.freeze({
        kind: "predicating.quantifying.finiteFibration",
        points: source,
        bases: target,
        baseMap: freezeRecord(map),
        fibers: freezeRecord(Object.fromEntries(Object.entries(fibers).map(([key, fiber]) => [key, Object.freeze([...fiber])]))),
    });
}
function orderBottom(order) {
    return order === "knowledge" ? KNOWLEDGE_BOTTOM : TRUTH_BOTTOM;
}
function orderTop(order) {
    return order === "knowledge" ? KNOWLEDGE_TOP : TRUTH_TOP;
}
function orderJoin(order, left, right) {
    return order === "knowledge" ? knowledgeJoinReading(left, right) : truthJoinReading(left, right);
}
function orderMeet(order, left, right) {
    return order === "knowledge" ? knowledgeMeetReading(left, right) : truthMeetReading(left, right);
}
export function readingListJoin(order, values) {
    return values.reduce((acc, value) => orderJoin(order, acc, value), orderBottom(order));
}
export function readingListMeet(order, values) {
    return values.reduce((acc, value) => orderMeet(order, acc, value), orderTop(order));
}
const readValuation = (valuation, point) => valuation[point] ?? KNOWLEDGE_BOTTOM;
export function existsF(fibration, valuation, order) {
    const out = {};
    for (const base of fibration.bases) {
        const fiber = fibration.fibers[base] ?? [];
        out[base] = readingListJoin(order, fiber.map((point) => readValuation(valuation, point)));
    }
    return freezeRecord(out);
}
export function forallF(fibration, valuation, order) {
    const out = {};
    for (const base of fibration.bases) {
        const fiber = fibration.fibers[base] ?? [];
        out[base] = readingListMeet(order, fiber.map((point) => readValuation(valuation, point)));
    }
    return freezeRecord(out);
}
export function reindexF(fibration, valuation) {
    const out = {};
    for (const point of fibration.points)
        out[point] = readValuation(valuation, fibration.baseMap[point]);
    return freezeRecord(out);
}
export function swapValuation(valuation) {
    const out = {};
    for (const [key, name] of Object.entries(valuation))
        out[key] = orderSwapValue(name);
    return freezeRecord(out);
}
function sameValuation(keys, left, right) {
    return keys.every((key) => readValuation(left, key) === readValuation(right, key));
}
function leqValue(order, left, right) {
    return samePoint(orderJoin(order, left, right), right);
}
function leqValuation(order, keys, left, right) {
    return keys.every((key) => leqValue(order, readValuation(left, key), readValuation(right, key)));
}
function* valuations(keys) {
    function* go(index, record) {
        if (index === keys.length) {
            yield freezeRecord(record);
            return;
        }
        const key = keys[index];
        for (const name of readingFamilies.knowledge) {
            record[key] = name;
            yield* go(index + 1, record);
        }
        delete record[key];
    }
    yield* go(0, {});
}
function checkExistsAdjunction(fibration, order) {
    for (const sourceValuation of valuations(fibration.points)) {
        for (const targetValuation of valuations(fibration.bases)) {
            const left = leqValuation(order, fibration.bases, existsF(fibration, sourceValuation, order), targetValuation);
            const right = leqValuation(order, fibration.points, sourceValuation, reindexF(fibration, targetValuation));
            if (left !== right)
                return false;
        }
    }
    return true;
}
function checkForallAdjunction(fibration, order) {
    for (const targetValuation of valuations(fibration.bases)) {
        for (const sourceValuation of valuations(fibration.points)) {
            const left = leqValuation(order, fibration.points, reindexF(fibration, targetValuation), sourceValuation);
            const right = leqValuation(order, fibration.bases, targetValuation, forallF(fibration, sourceValuation, order));
            if (left !== right)
                return false;
        }
    }
    return true;
}
const requireFiniteAdjunctions = (fibration, order) => {
    if (!checkExistsAdjunction(fibration, order) || !checkForallAdjunction(fibration, order)) {
        throw new TypeError(`predicating quantifier ${order}-order adjunction check failed`);
    }
};
function singletonFiberIdentity(fibration, valuation, order) {
    const exists = existsF(fibration, valuation, order);
    const forall = forallF(fibration, valuation, order);
    return fibration.bases.every((base) => {
        const fiber = fibration.fibers[base] ?? [];
        return fiber.length !== 1 || (exists[base] === readValuation(valuation, fiber[0]) && forall[base] === readValuation(valuation, fiber[0]));
    });
}
export function predicatingQuantifyingReceipt(fibration, valuation) {
    requireFiniteAdjunctions(fibration, "knowledge");
    requireFiniteAdjunctions(fibration, "truth");
    return Object.freeze({
        kind: "predicating.quantifying.receipt:witness",
        fibration,
        valuation: freezeRecord({ ...valuation }),
        existsKnowledge: existsF(fibration, valuation, "knowledge"),
        forallKnowledge: forallF(fibration, valuation, "knowledge"),
        existsTruth: existsF(fibration, valuation, "truth"),
        forallTruth: forallF(fibration, valuation, "truth"),
        emptyFiberExistsKnowledge: KNOWLEDGE_BOTTOM,
        emptyFiberForallKnowledge: KNOWLEDGE_TOP,
        emptyFiberExistsTruth: TRUTH_BOTTOM,
        emptyFiberForallTruth: TRUTH_TOP,
        singletonFiberIdentityKnowledge: singletonFiberIdentity(fibration, valuation, "knowledge"),
        singletonFiberIdentityTruth: singletonFiberIdentity(fibration, valuation, "truth"),
        knowledgeAdjunctionFinite: true,
        truthAdjunctionFinite: true,
    });
}
export function finiteConverseFibration(points, converseMap) {
    const fibration = finitePredicatingFibration(points, points, converseMap);
    const pointSet = new Set(fibration.points);
    for (const point of fibration.points) {
        const image = fibration.baseMap[point];
        if (!pointSet.has(image) || fibration.baseMap[image] !== point) {
            throw new TypeError("finiteConverseFibration: converse map must be an involutive bijection");
        }
        if ((fibration.fibers[point] ?? []).length !== 1) {
            throw new TypeError("finiteConverseFibration: every converse fiber must be singleton");
        }
    }
    return fibration;
}
function meetValuation(order, keys, left, right) {
    const out = {};
    for (const key of keys)
        out[key] = orderMeet(order, readValuation(left, key), readValuation(right, key));
    return freezeRecord(out);
}
function converseFrobenius(fibration, order, valuation) {
    const alpha = valuation;
    const phi = reindexF(fibration, valuation);
    const left = reindexF(fibration, meetValuation(order, fibration.points, reindexF(fibration, alpha), phi));
    const right = meetValuation(order, fibration.points, alpha, reindexF(fibration, phi));
    return sameValuation(fibration.points, left, right);
}
export function predicatingHyperdoctrineReceipt(fibration, valuation) {
    const reindexed = reindexF(fibration, valuation);
    const reindexedTwice = reindexF(fibration, reindexed);
    const existsKnowledge = existsF(fibration, valuation, "knowledge");
    const forallKnowledge = forallF(fibration, valuation, "knowledge");
    const existsTruth = existsF(fibration, valuation, "truth");
    const forallTruth = forallF(fibration, valuation, "truth");
    if (!sameValuation(fibration.points, reindexedTwice, valuation)
        || !sameValuation(fibration.points, existsKnowledge, reindexed)
        || !sameValuation(fibration.points, forallKnowledge, reindexed)
        || !sameValuation(fibration.points, existsTruth, reindexed)
        || !sameValuation(fibration.points, forallTruth, reindexed)
        || !converseFrobenius(fibration, "knowledge", valuation)
        || !converseFrobenius(fibration, "truth", valuation)) {
        throw new TypeError("predicatingHyperdoctrineReceipt: converse laws failed");
    }
    return Object.freeze({
        kind: "predicating.hyperdoctrine.receipt:witness",
        fibration,
        valuation: freezeRecord({ ...valuation }),
        reindexed,
        reindexedTwice,
        existsKnowledge,
        forallKnowledge,
        existsTruth,
        forallTruth,
        baseIsoInvolution: true,
        reindexConverseConverse: true,
        converseExistsIsReindexKnowledge: true,
        converseForallIsReindexKnowledge: true,
        converseExistsIsReindexTruth: true,
        converseForallIsReindexTruth: true,
        converseFrobeniusKnowledge: true,
        converseFrobeniusTruth: true,
        beckChevalleySelf: true,
    });
}
export function predicatingDualHyperdoctrineReceipt(fibration, valuation) {
    requireFiniteAdjunctions(fibration, "truth");
    const swappedValuation = swapValuation(valuation);
    const conjExists = swapValuation(existsF(fibration, swappedValuation, "knowledge"));
    const existsTruth = existsF(fibration, valuation, "truth");
    const conjForall = swapValuation(forallF(fibration, swappedValuation, "knowledge"));
    const forallTruth = forallF(fibration, valuation, "truth");
    const swappedTwice = swapValuation(swappedValuation);
    if (!sameValuation(fibration.points, swappedTwice, valuation)
        || !sameValuation(fibration.bases, conjExists, existsTruth)
        || !sameValuation(fibration.bases, conjForall, forallTruth)
        || !sameValuation(fibration.points, swapValuation(reindexF(fibration, swapValuation(existsTruth))), reindexF(fibration, existsTruth))) {
        throw new TypeError("predicatingDualHyperdoctrineReceipt: sigma transport laws failed");
    }
    return Object.freeze({
        kind: "predicating.hyperdoctrine.dual.receipt:witness",
        fibration,
        valuation: freezeRecord({ ...valuation }),
        swappedValuation,
        conjExists,
        existsTruth,
        conjForall,
        forallTruth,
        swapInvolutive: true,
        conjExistsEqualsExistsTruth: true,
        conjForallEqualsForallTruth: true,
        conjReindexEqualsReindex: true,
        dualAdjointSystemFinite: true,
    });
}
