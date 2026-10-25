/**
 * settling/certificate — catalog realizers and bounded certificate observations.
 *
 * The mathematical providers are Computing's `ObsmetrologiaComputing.RegimeGate`
 * and `ObsmetrologiaComputing.RegimeCycle`, retaining the `Obsmetrologia`
 * declaration namespace. Ahead/germ proofs quantify over their actual carriers,
 * every stage and, for germs, every index of a total record sequence. The
 * catalog below supplies their JavaScript realizers; this module does not prove
 * universal source-to-program correspondence.
 *
 * - `regimeRank`, `regimeGate`, `regimeHasGap`: a local finite encoding of the
 *   declared canonical profiles (`RegimeGate.*`, `gap_flags_split`). These
 *   profile flags do not classify an arbitrary supplied process.
 * - `nextStage`, `turn`, `advanceTurn`: the spine as a cycle, and positions on
 *   the spiral as local runtime helpers. A stage does not determine a regime.
 * - `residueBump`, `residueLaps`, `carriedRecord`, `residueReading`: the residue
 *   settling hands back to articulating, its closed form
 *   (`iterSeq_residueBump`), and its dichotomy (`residue_dichotomy`,
 *   `balanced_residue_holds_bias`, `unbalanced_residue_drifts`).
 * - `aheadCertificate`, `germCertificate`: the two shapes of a limit proof as
 *   carrier data, instantiated from the declarations that inhabit them
 *   (`omega_ahead`, `residue_germ_ahead`).
 * - `spotCheckCertificate`: the bounded check a runtime can make of a
 *   certificate's universal fields over a finite prefix of its orbit.
 * - `closeByCertificate`: an `ordinal.closure.carrier` closed at the certified
 *   completion, with no orbit search.
 *
 * A certificate here is not a proof. Constructors require an exact catalog name,
 * check the decidable parameter guards and issue an immutable object. Consumers
 * accept only objects issued by this module instance, then check a finite prefix.
 * A callable seed is not thereby proved pure or total; safe-integer guards do
 * not implement unbounded Nat arithmetic. A supplied process is compared only
 * on that prefix, using the certificate's equality. None of these observations
 * proves that process's universal regime or behavior beyond the observed prefix.
 *
 * @example
 * ```js
 * import * as certificate from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/certificate";
 * import { record } from "@red-cup-engineering/computer-data-engineering-services-section/four";
 *
 * const omega = certificate.aheadCertificate("Obsmetrologia.omega_ahead");
 * omega.limit; // { pos: null, neg: 0 } — told true ω times, never told false
 *
 * const seed = () => record(0, 0);
 * const germ = certificate.germCertificate("Obsmetrologia.residue_germ_ahead", { residue: record(1, 1), seed });
 * certificate.closeByCertificate(germ).search.regime.kind; // "ordinal.closure.regime.aperiodic"
 * ```
 */
import { record, recordAdd, topMass } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { aperiodicClosureRegime, closureRegimeName, closureRegimeNamed, omegaOrdinal, spineStages, transfiniteClosureRegime } from "./closure.mjs";

const regimeNameOf = (regime) => closureRegimeName(typeof regime === "string" ? closureRegimeNamed(regime) : regime);
const natural = (value, caller) => {
    if (!Number.isSafeInteger(value) || value < 0)
        throw new RangeError(`${caller}: expected a natural number, not ${String(value)}`);
    return value;
};

/* ── (A) The tower and its gate ─────────────────────────────────────────── */

const rankByName = Object.freeze({ strict: 0, scott: 1, "transfinite-bounded": 2, aperiodic: 3 });
/** The local finite profile encoding: strict 0, Scott 1,
 * transfinite-bounded 2, aperiodic 3. Accepts a regime value or its name. */
export const regimeRank = (regime) => rankByName[regimeNameOf(regime)];

const gateFlagsByName = Object.freeze({
    strict: Object.freeze({ hasFixedPoint: true, attainedAtFiniteStage: true, weaklyQuiescent: true }),
    scott: Object.freeze({ hasFixedPoint: false, attainedAtFiniteStage: false, weaklyQuiescent: false }),
    "transfinite-bounded": Object.freeze({ hasFixedPoint: true, attainedAtFiniteStage: false, weaklyQuiescent: true }),
    aperiodic: Object.freeze({ hasFixedPoint: false, attainedAtFiniteStage: false, weaklyQuiescent: true }),
});
/** **The unattained-settling gate** (`RegimeGate`). Whether the regime's canonical
 * dynamic has a fixed point, whether a finite stage reaches it, and whether the
 * orbit collapses to one class under some relation. From those come `gate` (clean
 * settling; equal to `cohomologyVanishesInRegime`), `hasGap`, and the gap's shape:
 * `"ahead"` when a fixed point exists unreached, `"germ"` when only a class
 * exists (`gap_flags_split`). These are declared canonical profile flags. */
export function regimeGate(regime) {
    const name = regimeNameOf(regime);
    const { hasFixedPoint, attainedAtFiniteStage, weaklyQuiescent } = gateFlagsByName[name];
    const attained = hasFixedPoint && attainedAtFiniteStage;
    const hasGap = weaklyQuiescent && !attained;
    return Object.freeze({
        kind: "ordinal.closure.regimeGate",
        regime: name,
        rank: rankByName[name],
        hasFixedPoint,
        attainedAtFiniteStage,
        weaklyQuiescent,
        gate: attained || !weaklyQuiescent,
        hasGap,
        shape: !hasGap ? "none" : hasFixedPoint ? "ahead" : "germ",
    });
}
/** Whether this declared canonical profile has a gap: exactly local rank ≥ 2. */
export const regimeHasGap = (regime) => regimeGate(regime).hasGap;

/* ── (B) The spine as a cycle ───────────────────────────────────────────── */

const nextByStage = Object.freeze({ articulating: "predicating", predicating: "positing", positing: "settling", settling: "articulating" });
/** The next local spine stage, returning from settling to articulating.
 * This scheduling cycle assigns no mathematical regime to a stage. */
export function nextStage(stage) {
    const next = nextByStage[stage];
    if (!next)
        throw new TypeError(`nextStage: not a spine stage: ${JSON.stringify(stage)}`);
    return next;
}
/** A local position on the spiral: the lap, and the stage within it. */
export function turn(lap, stage) {
    if (!spineStages.includes(stage))
        throw new TypeError(`turn: not a spine stage: ${JSON.stringify(stage)}`);
    return Object.freeze({ kind: "ordinal.closure.turn", lap: natural(lap, "turn"), stage });
}
/** One step along the spiral: a spine step within the lap, or the return from
 * settling, which opens the next lap. */
export const advanceTurn = (position) => turn(position.stage === "settling" ? position.lap + 1 : position.lap, nextStage(position.stage));

/* ── (C) The residue ────────────────────────────────────────────────────── */

const isZeroResidue = (residue) => residue.pos === 0 && residue.neg === 0;
/** Add one residue to every term of a record sequence (`Record.residueBump`). */
export const residueBump = (residue) => (sequence) => (n) => recordAdd(sequence(n), residue);
/** The record `k` laps add (`Record.scale`). */
export const scaleResidue = (residue, k) => record(residue.pos * natural(k, "scaleResidue"), residue.neg * k);
/** **The tiling**, in closed form: `k` laps of `residueBump c` from `s` add `k`
 * copies of the residue to every term (`iterSeq_residueBump`). No lap is iterated. */
export const residueLaps = (residue, k, sequence) => {
    const laid = scaleResidue(residue, k);
    return (n) => recordAdd(sequence(n), laid);
};
/** The record sequence a spiral position carries from seed `s`: one residue per
 * completed lap, using the original fixed-residue closed form. */
export const carriedRecord = (residue, sequence, position) => residueLaps(residue, position.lap, sequence);
/** **The residue dichotomy, read off one record.** A zero residue makes the spiral
 * a circle that settles at stage zero. Any other residue makes it a germ: it never
 * repeats, has no fixed point, and stays in one class (`residue_dichotomy`, under
 * its natural-record hypotheses). A balanced residue holds every term's truth bias while laying down
 * `massPerLap` contradiction mass (`balanced_residue_holds_bias`). An unbalanced
 * one drifts the bias by `driftPerLap` (`unbalanced_residue_drifts`). */
export function residueReading(residue) {
    const circle = isZeroResidue(residue);
    return Object.freeze({
        kind: "ordinal.closure.residueReading",
        residue,
        shape: circle ? "circle" : "germ",
        regime: circle ? "strict" : "aperiodic",
        balanced: residue.pos === residue.neg,
        massPerLap: topMass(residue),
        driftPerLap: residue.pos - residue.neg,
    });
}

/* ── (D) Completed records — the transfinite-bounded carrier ────────────── */

/** A completed record: extended tallies, where `null` is the point at infinity ω
 * (`ORecord`, whose tallies are `Option Nat` with `none` for ω). */
export const completedRecord = (pos, neg) => Object.freeze({
    kind: "ordinal.closure.completedRecord",
    pos: pos === null ? null : natural(pos, "completedRecord"),
    neg: neg === null ? null : natural(neg, "completedRecord"),
});
const extendedLeq = (left, right) => right === null || (left !== null && left <= right);
/** The knowledge order on completed records (`ORecord.OKLE`). */
export const completedRecordLeq = (left, right) => extendedLeq(left.pos, right.pos) && extendedLeq(left.neg, right.neg);
/** Equality of completed records. */
export const completedRecordEq = (left, right) => left.pos === right.pos && left.neg === right.neg;
/** The tally increment on completed records, with `ω + 1 = ω` (`ORecord.osuccPos`). */
export const completedSuccPos = (value) => completedRecord(value.pos === null ? null : value.pos + 1, value.neg);

/* ── (E) The two certificate shapes and their catalog ───────────────────── */

/**
 * The declarations that inhabit a certificate, by name. Each entry gives the
 * certificate's shape, its regime, the decidable hypotheses its parameters must
 * meet, and the realizer that builds the carrier data from them. These guards
 * do not discharge the totality/purity obligation for a JavaScript seed. Entries may
 * capture consumed values before validation and canonicalize them after it.
 * The realizer receives the same owned parameters the certificate retains.
 * Only this catalog issues certificates accepted by the local consumers.
 */
const catalog = Object.freeze({
    "Obsmetrologia.omega_ahead": Object.freeze({
        shape: "ahead",
        regime: transfiniteClosureRegime,
        family: "completed-tally-increment",
        hypotheses: () => [],
        realize: () => ({
            leq: completedRecordLeq,
            eq: completedRecordEq,
            step: completedSuccPos,
            orbit: (k) => completedRecord(natural(k, "omegaOrbit"), 0),
            limit: completedRecord(null, 0),
        }),
    }),
    "Obsmetrologia.residue_germ_ahead": Object.freeze({
        shape: "germ",
        regime: aperiodicClosureRegime,
        family: "residue-bump",
        // Capture getters once. Never retain a caller's mutable residue or descriptors.
        capture: ({ residue, seed }) => ({
            seed,
            residue: residue && { pos: residue.pos, neg: residue.neg },
        }),
        // Lean Record has two Nat tallies; this runtime admits nonnegative safe integers.
        hypotheses: ({ residue, seed }) => [
            ...(residue && Number.isSafeInteger(residue.pos) && residue.pos >= 0 && Number.isSafeInteger(residue.neg) && residue.neg >= 0 ? [] : ["residue-is-a-record"]),
            ...(typeof seed === "function" ? [] : ["seed-is-a-record-sequence"]),
            ...(residue && isZeroResidue(residue) ? ["residue-ne-kBot"] : []),
        ],
        // Only validated coordinates reach record(): absent tallies must not default to zero.
        canonicalize: ({ residue, seed }, parameters) => {
            const owned = { seed, residue: record(residue.pos, residue.neg) };
            // Preserve shallow metadata only after admission, without rereading consumed getters.
            for (const key of Reflect.ownKeys(Object(parameters))) {
                if (key !== "residue" && key !== "seed" && Object.prototype.propertyIsEnumerable.call(parameters, key))
                    Object.defineProperty(owned, key, { value: parameters[key], enumerable: true, configurable: true, writable: true });
            }
            return owned;
        },
        realize: ({ residue, seed }) => ({
            step: residueBump(residue),
            orbit: (k) => residueLaps(residue, natural(k, "residueOrbit"), seed),
            representative: seed,
            residue,
            // `DomByW` carries its bound, and the bound is the residue. Stage `k` lies
            // under the seed lifted by `k` residues. The seed lies under stage `k`
            // with bound zero (`residue_dichotomy`, third arm).
            collapse: (k) => Object.freeze({ pointUnderRepresentative: scaleResidue(residue, k), representativeUnderPoint: record(0, 0) }),
        }),
    }),
});
/** The names of the declarations the runtime accepts as certificates. */
export const certifiedDeclarations = Object.freeze(Object.keys(catalog));

// A public kind or a copied object is not evidence that this catalog issued it.
// Keep admission local to this module; wire data is reconstructed by certificateOf.
const issuedCertificates = new WeakSet();
const catalogEntry = (declaration) => typeof declaration === "string" && Object.hasOwn(catalog, declaration)
    ? catalog[declaration]
    : undefined;

function instantiate(shape, declaration, parameters) {
    const entry = catalogEntry(declaration);
    if (!entry)
        return Object.freeze({ kind: `ordinal.closure.${shape}Certificate-obstruction`, declaration, reason: "not-a-certified-declaration" });
    if (entry.shape !== shape)
        return Object.freeze({ kind: `ordinal.closure.${shape}Certificate-obstruction`, declaration, reason: `declaration-is-${entry.shape}-shaped` });
    const captured = entry.capture ? entry.capture(parameters) : parameters;
    const failed = entry.hypotheses(captured);
    if (failed.length > 0)
        return Object.freeze({ kind: `ordinal.closure.${shape}Certificate-obstruction`, declaration, reason: "hypotheses-fail", failed: Object.freeze(failed) });
    const owned = Object.freeze(entry.canonicalize ? entry.canonicalize(captured, parameters) : { ...captured });
    const certificate = Object.freeze({
        kind: `ordinal.closure.${shape}Certificate`,
        declaration,
        family: entry.family,
        regime: entry.regime,
        parameters: owned,
        ...entry.realize(owned),
    });
    issuedCertificates.add(certificate);
    return certificate;
}
/** **An ahead certificate** (`AheadCertificate`): a completion no finite stage
 * reaches (*impossible*), above every stage and below every bound (*necessary*),
 * and fixed by the step (*determined*). Built from a catalog declaration of the
 * ahead shape, or an obstruction naming why not. */
export const aheadCertificate = (declaration, parameters = {}) => instantiate("ahead", declaration, parameters);
/** **A germ certificate** (`GermCertificate`): a completion that is a class, not a
 * point. The orbit moves at every stage and the step fixes nothing, yet every
 * stage is mutually dominated by one representative. Built from a catalog
 * declaration of the germ shape, or an obstruction naming why not. A residue-bump
 * certificate owns an immutable snapshot of its validated residue; changing the
 * caller's residue requires constructing a new certificate. */
export const germCertificate = (declaration, parameters = {}) => instantiate("germ", declaration, parameters);
/** A certificate of whichever shape its declaration inhabits, or an obstruction.
 * For callers that hold a declaration name as data and do not know its shape in
 * advance. Transport declaration/parameter data and reconstruct at the receiving
 * module instance; a copied or foreign issued object is not locally admitted. */
export const certificateOf = (declaration, parameters = {}) => instantiate(catalogEntry(declaration)?.shape ?? "unknown", declaration, parameters);

const recordSequenceEqOn = (left, right, width) => {
    for (let n = 0; n < width; n += 1) {
        const a = left(n);
        const b = right(n);
        if (a.pos !== b.pos || a.neg !== b.neg)
            return false;
    }
    return true;
};
const dominatedOn = (lower, upper, bound, width) => {
    for (let n = 0; n < width; n += 1) {
        const lifted = recordAdd(upper(n), bound);
        if (lower(n).pos > lifted.pos || lower(n).neg > lifted.neg)
            return false;
    }
    return true;
};
/**
 * **The bounded check a runtime can make of a certificate.** The universal fields
 * hold in Lean for every `k`. Here they are evaluated over the first `stages`
 * orbit points, and over the first `width` terms when the carrier is a sequence.
 * An ahead certificate is checked for unreached, below, and fixed. A germ
 * certificate is checked for moving, collapse under its carried bounds, and the
 * step leaving the representative unfixed. Only a locally issued certificate is
 * admitted; a witness records this finite observation, not universal validity of
 * a JavaScript seed, arithmetic implementation or supplied process.
 */
export function spotCheckCertificate(certificate, { stages = 16, width = 8 } = {}) {
    if (!issuedCertificates.has(certificate))
        return Object.freeze({ kind: "ordinal.closure.certificateSpotCheck-obstruction", reason: "not-a-certificate", certificate });
    natural(stages, "spotCheckCertificate");
    natural(width, "spotCheckCertificate");
    const failures = [];
    switch (certificate.kind) {
        case "ordinal.closure.aheadCertificate":
            for (let k = 0; k < stages; k += 1) {
                const point = certificate.orbit(k);
                if (certificate.eq(point, certificate.limit))
                    failures.push(Object.freeze({ field: "unreached", stage: k }));
                if (!certificate.leq(point, certificate.limit))
                    failures.push(Object.freeze({ field: "below", stage: k }));
                if (!certificate.eq(certificate.step(point), certificate.orbit(k + 1)))
                    failures.push(Object.freeze({ field: "orbit-follows-step", stage: k }));
            }
            if (!certificate.eq(certificate.step(certificate.limit), certificate.limit))
                failures.push(Object.freeze({ field: "fixed" }));
            break;
        case "ordinal.closure.germCertificate":
            for (let k = 0; k < stages; k += 1) {
                const point = certificate.orbit(k);
                const next = certificate.orbit(k + 1);
                if (recordSequenceEqOn(next, point, width))
                    failures.push(Object.freeze({ field: "moving", stage: k }));
                if (!recordSequenceEqOn(certificate.step(point), next, width))
                    failures.push(Object.freeze({ field: "orbit-follows-step", stage: k }));
                const { pointUnderRepresentative, representativeUnderPoint } = certificate.collapse(k);
                if (!dominatedOn(point, certificate.representative, pointUnderRepresentative, width) || !dominatedOn(certificate.representative, point, representativeUnderPoint, width))
                    failures.push(Object.freeze({ field: "collapse", stage: k }));
            }
            if (recordSequenceEqOn(certificate.step(certificate.representative), certificate.representative, width))
                failures.push(Object.freeze({ field: "unfixed" }));
            break;
        default:
            return Object.freeze({ kind: "ordinal.closure.certificateSpotCheck-obstruction", reason: "not-a-certificate", certificate });
    }
    return failures.length === 0
        ? Object.freeze({ kind: "ordinal.closure.certificateSpotCheck:witness", declaration: certificate.declaration, stages, width })
        : Object.freeze({ kind: "ordinal.closure.certificateSpotCheck-obstruction", declaration: certificate.declaration, stages, width, failures: Object.freeze(failures) });
}

/* ── (F) Closing by certificate ─────────────────────────────────────────── */

/**
 * **Close a process at its certified completion.** Returns the same
 * `ordinal.closure.carrier` shape `closeOrdinalProcess` returns. Its value is the
 * certificate's limit, or for a germ the class the representative stands for. Its
 * search is a certificate witness that reads the certificate's regime. No orbit
 * is searched. The orbit field holds only the spot-checked prefix.
 *
 * Pass `process` to bind the certificate to a closure process the caller already
 * has. The process's endomorphism is then spot-checked against the certificate's
 * step along the prefix, using the certificate's equality, and a disagreement is
 * an obstruction. Omit it to close the certificate's own dynamic. An agreeing
 * supplied process remains unproved outside that prefix, including at the limit;
 * constructor origin also does not prove a seed closure's lifetime purity.
 */
export function closeByCertificate(certificate, { process, stages = 16, width = 8 } = {}) {
    if (!issuedCertificates.has(certificate))
        return Object.freeze({ kind: "ordinal.closure.certificateClosure-obstruction", reason: "not-a-certificate", certificate });
    const spotCheck = spotCheckCertificate(certificate, { stages, width });
    if (spotCheck.kind !== "ordinal.closure.certificateSpotCheck:witness")
        return Object.freeze({ kind: "ordinal.closure.certificateClosure-obstruction", reason: "spot-check-failed", certificate, spotCheck });
    const ahead = certificate.kind === "ordinal.closure.aheadCertificate";
    const orbit = [];
    for (let k = 0; k < stages; k += 1) {
        const point = certificate.orbit(k);
        if (process) {
            const stepped = process.endomorphism(point);
            const agrees = ahead ? certificate.eq(stepped, certificate.orbit(k + 1)) : recordSequenceEqOn(stepped, certificate.orbit(k + 1), width);
            if (!agrees)
                return Object.freeze({ kind: "ordinal.closure.certificateClosure-obstruction", reason: "process-disagrees-with-certificate", certificate, stage: k });
        }
        orbit.push(Object.freeze({ kind: "ordinal.closure.orbitPoint", stage: k, value: point }));
    }
    const value = ahead
        ? certificate.limit
        : Object.freeze({ kind: "ordinal.closure.germ", representative: certificate.representative, residue: certificate.residue });
    const search = Object.freeze({
        kind: "ordinal.closure.certificateSearch:witness",
        declaration: certificate.declaration,
        shape: ahead ? "ahead" : "germ",
        ordinal: ahead ? omegaOrdinal() : null,
        regime: certificate.regime,
        spotCheck,
    });
    return Object.freeze({ kind: "ordinal.closure.carrier", process: process ?? null, value, orbit: Object.freeze(orbit), search, stabilization: null, certificate });
}
