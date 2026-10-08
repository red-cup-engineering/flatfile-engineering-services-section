/**
 * geometry/spatial/cut-and-project — 1-D cut-and-project schemes over ℤ².
 *
 * A scheme is an irrational quadratic slope α. A site (m,n) projects physically
 * to m + nα (the cut) and internally to its Galois conjugate m + nᾱ; an internal
 * window decides which sites are realized — acceptance is a judgment, not a hidden
 * filter. The accepted physical coordinates form a model set whose gap spectrum
 * is the aperiodic order the scheme produces.
 */
import { fromInt, fromInteger, intAdd } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { quadraticAddRational, quadraticCompare, quadraticConjugate, quadraticEqual, quadraticIsRational, quadraticLeq, quadraticLess, quadraticScale, quadraticSubtract, sameRadicand, } from "@red-cup-engineering/exact-number-data-service/quadratic";
/** Construct a scheme; throws if the slope is rational (a rational cut is periodic). */
export const cutProjectScheme = (slope) => {
    if (quadraticIsRational(slope))
        throw new TypeError("cutProjectScheme: slope must be irrational — a rational cut is periodic");
    return Object.freeze({ kind: "meme-geometry.cutProject.scheme", slope });
};
/** Construct a lattice site from integer coordinates. */
export const latticeSite = (unit, slopeCount) => Object.freeze({ kind: "meme-geometry.cutProject.latticeSite", unit: fromInt(unit), slopeCount: fromInt(slopeCount) });
/** Translate a site by integer offsets. */
export const translateSite = (site, unit, slopeCount) => Object.freeze({ kind: "meme-geometry.cutProject.latticeSite", unit: intAdd(site.unit, fromInt(unit)), slopeCount: intAdd(site.slopeCount, fromInt(slopeCount)) });
/** The cut: (m, n) ↦ m + nα. */
export const physicalProjection = (scheme, site) => quadraticAddRational(quadraticScale(scheme.slope, fromInteger(site.slopeCount)), fromInteger(site.unit));
/** Internal space: (m, n) ↦ m + nᾱ (the conjugate of the cut). */
export const internalProjection = (scheme, site) => quadraticConjugate(physicalProjection(scheme, site));
/** Construct a half-open window; throws if bounds differ in field or are not ordered. */
export const acceptanceWindow = (lower, upper) => {
    if (!sameRadicand(lower, upper))
        throw new TypeError("acceptanceWindow: bounds live in one field");
    if (!quadraticLess(lower, upper))
        throw new TypeError("acceptanceWindow: lower must be strictly below upper");
    return Object.freeze({ kind: "meme-geometry.cutProject.window", lower, upper });
};
/** Whether a site is accepted by a window. */
export function windowAcceptance(scheme, site, window) {
    if (!sameRadicand(scheme.slope, window.lower))
        throw new TypeError("windowAcceptance: scheme and window fields differ");
    const internal = internalProjection(scheme, site);
    return quadraticLeq(window.lower, internal) && quadraticLess(internal, window.upper)
        ? Object.freeze({ kind: "meme-geometry.cutProject.acceptance:witness", site, physical: physicalProjection(scheme, site), internal })
        : Object.freeze({ kind: "meme-geometry.cutProject.acceptance-obstruction", site, internal, window });
}
/** All sites within |coords| ≤ radius the window admits, ordered by physical coordinate. */
export function modelSet(scheme, window, radius) {
    const accepted = [];
    for (let unit = -radius; unit <= radius; unit += 1) {
        for (let slopeCount = -radius; slopeCount <= radius; slopeCount += 1) {
            const judgment = windowAcceptance(scheme, latticeSite(unit, slopeCount), window);
            if (judgment.kind === "meme-geometry.cutProject.acceptance:witness")
                accepted.push(judgment);
        }
    }
    accepted.sort((left, right) => quadraticCompare(left.physical, right.physical));
    return Object.freeze({ kind: "meme-geometry.cutProject.modelSet", scheme, window, accepted: Object.freeze(accepted) });
}
/** The model set restricted to physical coordinates in [lower, upper]. */
export function restrictModelSet(carrier, lower, upper) {
    return Object.freeze({
        kind: "meme-geometry.cutProject.modelSet",
        scheme: carrier.scheme,
        window: carrier.window,
        accepted: Object.freeze(carrier.accepted.filter((witness) => quadraticLeq(lower, witness.physical) && quadraticLeq(witness.physical, upper))),
    });
}
/** Successive gaps as a word over the distinct (ascending) gap lengths. */
export function gapSpectrum(carrier) {
    const gaps = [];
    for (let index = 1; index < carrier.accepted.length; index += 1) {
        gaps.push(quadraticSubtract(carrier.accepted[index].physical, carrier.accepted[index - 1].physical));
    }
    const distinct = [];
    for (const gap of gaps)
        if (!distinct.some((seen) => quadraticEqual(seen, gap)))
            distinct.push(gap);
    distinct.sort(quadraticCompare);
    const word = gaps.map((gap) => distinct.findIndex((seen) => quadraticEqual(seen, gap)));
    return Object.freeze({ kind: "meme-geometry.cutProject.gapSpectrum", gaps: Object.freeze(gaps), distinct: Object.freeze(distinct), word: Object.freeze(word) });
}
/** Refute one period over the sampled gap word (finite: refutes one period, not global aperiodicity). */
export function refutePeriod(spectrum, period) {
    if (!Number.isSafeInteger(period) || period < 1)
        throw new TypeError("refutePeriod: period must be a positive integer");
    for (let index = 0; index + period < spectrum.word.length; index += 1) {
        if (spectrum.word[index] !== spectrum.word[index + period]) {
            return Object.freeze({ kind: "meme-geometry.cutProject.aperiodicity:witness", period, mismatchIndex: index });
        }
    }
    return Object.freeze({ kind: "meme-geometry.cutProject.aperiodicity-obstruction", period });
}

/** The gap word is not periodic with this period (a mismatch was found). */
export const aperiodicityWitnessSchema = {
  $id: "metroplat/calculus/predicating/geometry/spatial/aperiodicity-witness",
  type: "object",
  required: ["kind", "period", "mismatchIndex"],
  properties: {
    kind: { const: "meme-geometry.cutProject.aperiodicity:witness" },
    period: { type: "number" },
    mismatchIndex: { type: "number" },
  },
  additionalProperties: false,
  title: "AperiodicityWitness",
  description: "A period was refuted at a mismatch index over the sampled gap word.",
};

/** The period was not refuted over the sampled stretch. */
export const aperiodicityObstructionSchema = {
  $id: "metroplat/calculus/predicating/geometry/spatial/aperiodicity-obstruction",
  type: "object",
  required: ["kind", "period"],
  properties: {
    kind: { const: "meme-geometry.cutProject.aperiodicity-obstruction" },
    period: { type: "number" },
  },
  additionalProperties: false,
  title: "AperiodicityObstruction",
  description: "A period was not refuted over the sampled stretch.",
};
