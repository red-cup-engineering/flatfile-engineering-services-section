/**
 * analysis/evidence — exact information reads of reading distributions.
 *
 * Reading histograms (exact rational probabilities over Belnap's FOUR), the
 * expected evidence coordinates (truth/falsity presence, knowledge height,
 * conflict), the prior→posterior coordinate delta, absolute continuity (finite
 * divergence ⇔ support containment), the majorization (mixedness) order — which
 * settles every Schur-concave entropy comparison at once and exposes genuine
 * incomparability — joint distributions with mutual-information factorization,
 * coordinate distortion, and screening-off (conditional independence given a
 * boundary). Exact throughout; how much an obstruction is in bits is a boundary read.
 */
import { count, fromNatural, natIsZero, natZero, ratAdd, ratEqual, ratMultiply, ratSign, ratSubtract, rational, ratZero, successor, } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { readingFamilies, sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
const zero = () => ratZero;
const present = (value, side) => sidesOfReading(value)[side];
/** Exact histogram of reading values. */
export function readingDistribution(values) {
    if (values.length === 0)
        throw new TypeError("an empty collection presents no distribution");
    const total = count(values);
    const bins = readingFamilies.knowledge.map((value) => {
        const tally = count(values.filter((candidate) => candidate === value));
        return Object.freeze({ kind: "meme-analysis.evidence.bin", value, count: tally, probability: rational(fromNatural(tally), fromNatural(total)) });
    });
    return Object.freeze({ kind: "meme-analysis.evidence.distribution", total, bins: Object.freeze(bins) });
}
/** The reading histogram of a fixed-point reading's information entries. */
export function informationDistribution(information) {
    return readingDistribution(information.entryCarrier.entries.map((entry) => entry.value));
}
/** Expectations of the bedrock reading coordinates, exactly. */
export function evidenceCoordinates(distribution) {
    let truth = zero();
    let falsity = zero();
    let conflict = zero();
    for (const bin of distribution.bins) {
        if (present(bin.value, 0))
            truth = ratAdd(truth, bin.probability);
        if (present(bin.value, 1))
            falsity = ratAdd(falsity, bin.probability);
        if (present(bin.value, 0) && present(bin.value, 1))
            conflict = ratAdd(conflict, bin.probability);
    }
    return Object.freeze({ kind: "meme-analysis.evidence.coordinates", distribution, truth, falsity, knowledge: ratAdd(truth, falsity), conflict });
}
/** Exact movement of evidence coordinates from prior to posterior. */
export function evidenceDelta(prior, posterior) {
    const before = evidenceCoordinates(prior);
    const after = evidenceCoordinates(posterior);
    return Object.freeze({
        kind: "meme-analysis.evidence.coordinatesDelta",
        prior: before,
        posterior: after,
        truthDelta: ratSubtract(after.truth, before.truth),
        falsityDelta: ratSubtract(after.falsity, before.falsity),
        knowledgeDelta: ratSubtract(after.knowledge, before.knowledge),
        conflictDelta: ratSubtract(after.conflict, before.conflict),
    });
}
/** Support containment of `from` within `to` (finite divergence ⇔ witness). */
export function absoluteContinuity(from, to) {
    const escaping = from.bins
        .filter((bin, index) => !natIsZero(bin.count) && natIsZero(to.bins[index].count))
        .map((bin) => bin.value);
    if (escaping.length > 0) {
        return Object.freeze({ kind: "meme-analysis.evidence.absoluteContinuity-obstruction", from, to, escaping: Object.freeze(escaping) });
    }
    return Object.freeze({ kind: "meme-analysis.evidence.absoluteContinuity:witness", from, to });
}
const descendingPrefixSums = (distribution) => {
    const sorted = distribution.bins.map((bin) => bin.probability).sort((left, right) => ratSign(ratSubtract(right, left)));
    const sums = [];
    let running = zero();
    for (const probability of sorted) {
        running = ratAdd(running, probability);
        sums.push(running);
    }
    return sums;
};
/** The mixedness (majorization) order, exactly. */
export function mixedness(left, right) {
    const leftSums = descendingPrefixSums(left);
    const rightSums = descendingPrefixSums(right);
    let leftExceedsAt = 0;
    let rightExceedsAt = 0;
    for (let prefix = 0; prefix < leftSums.length; prefix += 1) {
        const sign = ratSign(ratSubtract(leftSums[prefix], rightSums[prefix]));
        if (sign > 0 && leftExceedsAt === 0)
            leftExceedsAt = prefix + 1;
        if (sign < 0 && rightExceedsAt === 0)
            rightExceedsAt = prefix + 1;
    }
    if (leftExceedsAt > 0 && rightExceedsAt > 0) {
        return Object.freeze({ kind: "meme-analysis.evidence.mixedness-incomparable", left, right, leftExceedsAtPrefix: leftExceedsAt, rightExceedsAtPrefix: rightExceedsAt });
    }
    const relation = leftExceedsAt > 0 ? "rightMoreMixed" : rightExceedsAt > 0 ? "leftMoreMixed" : "equallyMixed";
    return Object.freeze({ kind: "meme-analysis.evidence.mixedness", left, right, relation });
}
/** Exact joint histogram of (source, reproduction) reading pairs. */
export function readingJoint(pairs) {
    if (pairs.length === 0)
        throw new TypeError("an empty collection presents no joint distribution");
    const support = readingFamilies.knowledge;
    const total = count(pairs);
    const cells = support.flatMap((source) => support.map((reproduction) => {
        const tally = count(pairs.filter(([left, right]) => left === source && right === reproduction));
        return Object.freeze({ kind: "meme-analysis.evidence.jointCell", source, reproduction, count: tally, probability: rational(fromNatural(tally), fromNatural(total)) });
    }));
    return Object.freeze({
        kind: "meme-analysis.evidence.joint",
        total,
        cells: Object.freeze(cells),
        sourceMarginal: readingDistribution(pairs.map(([source]) => source)),
        reproductionMarginal: readingDistribution(pairs.map(([, reproduction]) => reproduction)),
    });
}
/** Exact factorization check of a joint against its marginals. */
export function independence(joint) {
    const support = readingFamilies.knowledge;
    for (const cell of joint.cells) {
        const sourceIndex = support.findIndex((value) => value === cell.source);
        const reproductionIndex = support.findIndex((value) => value === cell.reproduction);
        const product = ratMultiply(joint.sourceMarginal.bins[sourceIndex].probability, joint.reproductionMarginal.bins[reproductionIndex].probability);
        if (!ratEqual(cell.probability, product)) {
            return Object.freeze({
                kind: "meme-analysis.evidence.independence-obstruction",
                joint,
                source: cell.source,
                reproduction: cell.reproduction,
                jointProbability: cell.probability,
                productProbability: product,
            });
        }
    }
    return Object.freeze({ kind: "meme-analysis.evidence.independence:witness", joint });
}
/** Per-side disagreement of two reading coordinates, in {0, 1/2, 1}. */
export function coordinateDistortion(left, right) {
    let disagreements = natZero;
    if (present(left, 0) !== present(right, 0))
        disagreements = successor(disagreements);
    if (present(left, 1) !== present(right, 1))
        disagreements = successor(disagreements);
    return rational(fromNatural(disagreements), fromNatural(count(sidesOfReading(left))));
}
/** Expected coordinate distortion of a joint, exactly. */
export function expectedDistortion(joint) {
    let expected = zero();
    for (const cell of joint.cells) {
        if (natIsZero(cell.count))
            continue;
        expected = ratAdd(expected, ratMultiply(cell.probability, coordinateDistortion(cell.source, cell.reproduction)));
    }
    return expected;
}
/** Exact joint histogram of (internal, boundary, external) reading triples. */
export function readingTriple(triples) {
    if (triples.length === 0)
        throw new TypeError("an empty collection presents no triple distribution");
    const support = readingFamilies.knowledge;
    const total = count(triples);
    const cells = support.flatMap((internal) => support.flatMap((boundary) => support.map((external) => {
        const tally = count(triples.filter(([i, b, e]) => i === internal && b === boundary && e === external));
        return Object.freeze({ kind: "meme-analysis.evidence.tripleCell", internal, boundary, external, count: tally, probability: rational(fromNatural(tally), fromNatural(total)) });
    })));
    return Object.freeze({ kind: "meme-analysis.evidence.triple", total, cells: Object.freeze(cells) });
}
/** Conditional independence of internal and external given the boundary, exactly. */
export function screeningOff(triple) {
    const marginal = (predicate) => triple.cells.filter(predicate).reduce((sum, cell) => ratAdd(sum, cell.probability), zero());
    for (const cell of triple.cells) {
        const boundaryMass = marginal((candidate) => candidate.boundary === cell.boundary);
        const internalBoundary = marginal((candidate) => candidate.internal === cell.internal && candidate.boundary === cell.boundary);
        const boundaryExternal = marginal((candidate) => candidate.boundary === cell.boundary && candidate.external === cell.external);
        const throughBoundary = ratMultiply(cell.probability, boundaryMass);
        const aroundBoundary = ratMultiply(internalBoundary, boundaryExternal);
        if (!ratEqual(throughBoundary, aroundBoundary)) {
            return Object.freeze({
                kind: "meme-analysis.evidence.screeningOff-obstruction",
                triple,
                internal: cell.internal,
                boundary: cell.boundary,
                external: cell.external,
                throughBoundary,
                aroundBoundary,
            });
        }
    }
    return Object.freeze({ kind: "meme-analysis.evidence.screeningOff:witness", triple });
}
