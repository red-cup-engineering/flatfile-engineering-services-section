/**
 * settling/closure — bounded ordinal closure as carrier data.
 *
 * This module is the Node-side workbench for processes that can be read as
 * repeated application of a monotone endomorphism on a caller-supplied lattice.
 * It does not try to be a general ordinal runtime. It gives ordinary Node code
 * an observable closure carrier: the orbit from bottom, the searched
 * stabilization stage, and a finite / Scott / transfinite regime read when the
 * bounded search finds a witness.
 *
 * Ordinals are built as zero / successor / labelled limit with a fundamental
 * sequence; a `Lattice<T>` carries bottom, leq, join, eq, and a stabilizing sup;
 * a `ClosureProcessCarrier<T>` is an endomorphism over that lattice with a
 * search horizon. `closeOrdinalProcess` iterates from bottom, recording the
 * finite orbit it actually evaluates, then probes finite and labelled limit
 * stages for stabilization. The result is a witness or obstruction, never an
 * implicit claim that all transfinite behavior has been decided.
 *
 * @example
 * ```js
 * import * as settling from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling";
 *
 * const eq = (left, right) => left === right;
 * const lattice = {
 *   bottom: 0,
 *   leq: (left, right) => left <= right,
 *   join: (left, right) => Math.max(left, right),
 *   eq,
 *   sup: settling.stabilizingSup({ eq }),
 * };
 *
 * const process = settling.closureProcess(lattice, (value) => Math.min(3, value + 1));
 * const closed = settling.closeOrdinalProcess(process);
 *
 * closed.search.kind; // "ordinal.closure.stabilizationSearch:witness"
 * closed.search.regime.kind; // "ordinal.closure.regime.finite"
 * ```
 *
 * @see closeOrdinalProcess
 */
import { natIsZero, natZero, predecessor, successor, members, toCount } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { closureRegimeNames } from "@red-cup-engineering/computer-data-engineering-services-section/closure-regime";
import { opaqueWitness as mark } from "../opaque-coincidence.mjs";
const naturalFromInternalBound = (bound) => {
    let value = natZero;
    for (let index = 0; index < bound; index += 1)
        value = successor(value);
    return value;
};
const defaultFiniteStages = naturalFromInternalBound(64);
const defaultLimitBlocks = naturalFromInternalBound(4);
const omegaMultipleOrdinalLabel = (multiplier) => Object.freeze({ kind: "ordinal.closure.omegaMultipleLabel", multiplier });
const omegaSquaredOrdinalLabel = () => Object.freeze({ kind: "ordinal.closure.omegaSquaredLabel" });
/** The zero ordinal. */
export const zeroOrdinal = Object.freeze({ kind: "ordinal.closure.ordinal.zero" });
/** The successor of an ordinal. */
export const successorOrdinal = (predecessorOrdinal) => Object.freeze({ kind: "ordinal.closure.ordinal.successor", predecessor: predecessorOrdinal });
/** An ordinal label wrapping a mark. */
export const ordinalLabel = (label) => Object.freeze({ kind: "ordinal.closure.ordinalLabel", mark: label });
/** A limit ordinal from a label and a fundamental sequence. */
export const limitOrdinal = (label, fundamentalSequence) => Object.freeze({ kind: "ordinal.closure.ordinal.limit", label, fundamentalSequence });
/** The finite ordinal of value n. */
export const finiteOrdinal = (n) => {
    let ordinal = zeroOrdinal;
    for (const _member of members(n))
        ordinal = successorOrdinal(ordinal);
    return ordinal;
};
/** The ordinal obtained by applying successor n times. */
export const ordinalPlusFinite = (ordinal, n) => {
    let out = ordinal;
    for (const _member of members(n))
        out = successorOrdinal(out);
    return out;
};
/** Omega: the limit whose fundamental sequence enumerates the finite ordinals. */
export const omegaOrdinal = () => limitOrdinal(ordinalLabel(mark(omegaMultipleOrdinalLabel(successor(natZero)))), (n) => finiteOrdinal(n));
/** Omega times k. */
export const omegaMultipleOrdinal = (k) => natIsZero(k)
    ? zeroOrdinal
    : limitOrdinal(ordinalLabel(mark(omegaMultipleOrdinalLabel(k))), (n) => ordinalPlusFinite(omegaMultipleOrdinal(predecessor(k)), n));
/** Omega squared. */
export const omegaSquaredOrdinal = () => limitOrdinal(ordinalLabel(mark(omegaSquaredOrdinalLabel())), (n) => omegaMultipleOrdinal(n));
/** Whether an ordinal is zero. */
export const isZeroOrdinal = (ordinal) => ordinal.kind === "ordinal.closure.ordinal.zero";
/** Whether an ordinal is a successor. */
export const isSuccessorOrdinal = (ordinal) => ordinal.kind === "ordinal.closure.ordinal.successor";
/** Whether an ordinal is a limit. */
export const isLimitOrdinal = (ordinal) => ordinal.kind === "ordinal.closure.ordinal.limit";
/** The finite closure regime value. */
export const finiteClosureRegime = Object.freeze({ kind: "ordinal.closure.regime.finite" });
/** The Scott closure regime value. */
export const scottClosureRegime = Object.freeze({ kind: "ordinal.closure.regime.scott" });
/** The transfinite closure regime value. */
export const transfiniteClosureRegime = Object.freeze({ kind: "ordinal.closure.regime.transfinite" });
/** The aperiodic closure regime value. */
export const aperiodicClosureRegime = Object.freeze({ kind: "ordinal.closure.regime.aperiodic" });
/** The four stages of the language spine, in the order the spine composes them. */
export const spineStages = Object.freeze(["articulating", "predicating", "positing", "settling"]);
const regimePrefix = "ordinal.closure.regime.";
const nameByKindSuffix = Object.freeze({ finite: "strict", scott: "scott", transfinite: "transfinite-bounded", aperiodic: "aperiodic" });
const regimeByName = Object.freeze({ strict: finiteClosureRegime, scott: scottClosureRegime, "transfinite-bounded": transfiniteClosureRegime, aperiodic: aperiodicClosureRegime });
/** The four closure regimes by their Obsmetrologia names, in order of completion cost:
 * the data layer's `ClosureRegime` (`closure-regime`). These are the only names a regime
 * is spoken by outside this module. */
export { closureRegimeNames };
/** A closure regime's Obsmetrologia name. */
export function closureRegimeName(regime) {
    const name = typeof regime?.kind === "string" && regime.kind.startsWith(regimePrefix) ? nameByKindSuffix[regime.kind.slice(regimePrefix.length)] : undefined;
    if (!name) throw new TypeError(`closureRegimeName: not a closure regime: ${JSON.stringify(regime)}`);
    return name;
}
/** The closure regime an Obsmetrologia name names. */
export function closureRegimeNamed(name) {
    const regime = regimeByName[name];
    if (!regime) throw new TypeError(`closureRegimeNamed: not a closure regime name: ${JSON.stringify(name)}`);
    return regime;
}
const stageByName = Object.freeze({ strict: "settling", scott: "positing", "transfinite-bounded": "predicating", aperiodic: "articulating" });
/** The stage a closure regime belongs to: strict is settling, Scott is positing,
 * transfinite-bounded is predicating, aperiodic is articulating (Obsmetrologia
 * `Stage.regime`). Each regime is one stage's, not a kind of settling. Accepts a
 * regime value or its name. */
export function stageOfRegime(regime) {
    return stageByName[closureRegimeName(typeof regime === "string" ? closureRegimeNamed(regime) : regime)];
}
/** The closure regime a stage's work lives in. */
export function regimeOfStage(stage) {
    switch (stage) {
        case "articulating": return aperiodicClosureRegime;
        case "predicating": return transfiniteClosureRegime;
        case "positing": return scottClosureRegime;
        case "settling": return finiteClosureRegime;
        default: throw new TypeError(`regimeOfStage: not a spine stage: ${JSON.stringify(stage)}`);
    }
}
/** Construct a stabilization search horizon. */
export const closureStabilizationSearchHorizon = (finiteStages, limitBlocks) => Object.freeze({ kind: "ordinal.closure.stabilizationSearchHorizon", finiteStages, limitBlocks });
/**
 * Construct a closure process.
 *
 * The default horizon checks 64 finite stages and 4 labelled omega-multiple
 * limit blocks before the final omega-squared probe.
 */
/**
 * Construct a closure process. Whether the endomorphism is Scott-continuous is
 * external data the process states, not a shape read off any ordinal
 * (`Ord.regimeOfOrdHonest`): it is what decides, at a limit stage, between a
 * Scott settling and a transfinite-bounded one. Unwitnessed, it is not assumed.
 */
export const closureProcess = (lattice, endomorphism, horizon = closureStabilizationSearchHorizon(defaultFiniteStages, defaultLimitBlocks), scottContinuous = false) => Object.freeze({ kind: "ordinal.closure.process", lattice, endomorphism, horizon, scottContinuous: scottContinuous === true });
/** Construct a search block. */
export const closureSearchBlock = (base, finiteStages) => Object.freeze({ kind: "ordinal.closure.searchBlock", base, finiteStages });
/** The ordered search blocks for a horizon. */
export function closureSearchBlocks(horizon) {
    return Object.freeze([
        closureSearchBlock(zeroOrdinal, horizon.finiteStages),
        ...members(horizon.limitBlocks).map((member) => closureSearchBlock(omegaMultipleOrdinal(successor(member)), horizon.finiteStages)),
    ]);
}
/** Whether an ordinal is finite, by stripping its successor chain. */
export function finiteOrdinalJudgment(ordinal) {
    let current = ordinal;
    let value = natZero;
    while (current.kind === "ordinal.closure.ordinal.successor") {
        value = successor(value);
        current = current.predecessor;
    }
    return current.kind === "ordinal.closure.ordinal.zero"
        ? Object.freeze({ kind: "ordinal.closure.finiteOrdinal:witness", ordinal, value })
        : Object.freeze({ kind: "ordinal.closure.finiteOrdinal-obstruction", ordinal, residue: current });
}
function approx(lattice, phi, ordinal) {
    switch (ordinal.kind) {
        case "ordinal.closure.ordinal.zero":
            return lattice.bottom;
        case "ordinal.closure.ordinal.successor":
            return phi(approx(lattice, phi, ordinal.predecessor));
        case "ordinal.closure.ordinal.limit":
            return lattice.sup((n) => approx(lattice, phi, ordinal.fundamentalSequence(n)));
    }
}
/** The closure approximant of a process at an ordinal stage. */
export const closureApproximant = (process, ordinal) => approx(process.lattice, process.endomorphism, ordinal);
const closureOrbitPoint = (stage, value) => Object.freeze({ kind: "ordinal.closure.orbitPoint", stage, value });
function* closureOrbit(lattice, phi) {
    let value = lattice.bottom;
    let stage = zeroOrdinal;
    yield closureOrbitPoint(stage, value);
    for (;;) {
        value = phi(value);
        stage = successorOrdinal(stage);
        yield closureOrbitPoint(stage, value);
    }
}
/**
 * The finite closure orbit of a process, yielded from bottom by successor
 * iteration.
 *
 * This generator does not visit limit stages; limit-stage reads are performed by
 * `closureStabilizationAt` and `closeOrdinalProcess` through the lattice `sup`.
 */
export function* closureOrbitOfProcess(process) {
    yield* closureOrbit(process.lattice, process.endomorphism);
}
/**
 * A bounded-friendly `sup` helper: return the first sequence value equal to its
 * predecessor.
 *
 * This is useful for finite examples whose limit approximation eventually
 * repeats. It is not a mathematical supremum for arbitrary infinite chains.
 */
export const stabilizingSup = (lattice) => (sequence) => {
    let previous = sequence(natZero);
    for (let index = successor(natZero);; index = successor(index)) {
        const current = sequence(index);
        if (lattice.eq(current, previous))
            return current;
        previous = current;
    }
};
/**
 * The regime a closure ordinal reads under its process's Scott-continuity
 * witness (`Ord.regimeOfOrdHonest`): a finite ordinal is strict; an infinite one
 * is Scott when the process is Scott-continuous, else transfinite-bounded. Every
 * ordinal this workbench builds has a countable cofinal witness
 * (`exists_countable_cofinal_witness`), so an observed ordinal never reads
 * aperiodic.
 */
export function closureRegimeOfOrdinal(ordinal, scottContinuous) {
    if (finiteOrdinalJudgment(ordinal).kind === "ordinal.closure.finiteOrdinal:witness")
        return finiteClosureRegime;
    return scottContinuous === true ? scottClosureRegime : transfiniteClosureRegime;
}
/** Whether a process stabilizes at an ordinal (approximant equals its successor). */
export function closureStabilizationAt(process, ordinal) {
    const value = closureApproximant(process, ordinal);
    const successorValue = closureApproximant(process, successorOrdinal(ordinal));
    return process.lattice.eq(successorValue, value)
        ? Object.freeze({ kind: "ordinal.closure.stabilization:witness", ordinal, value, successor: successorValue })
        : Object.freeze({ kind: "ordinal.closure.stabilization-obstruction", searchedThrough: ordinal, value, successor: successorValue });
}
/** The finite readout of any closure-engine result: stabilization, finite stage, regime. */
export function closureReadout(closure) {
  const stabilized = closure.stabilization.kind === "ordinal.closure.stabilization:witness";
  const ordinal = stabilized ? closure.stabilization.ordinal : closure.stabilization.searchedThrough;
  const finite = finiteOrdinalJudgment(ordinal);
  const regime = closureRegimeOfOrdinal(ordinal, closure.process.scottContinuous);
  return Object.freeze({
    kind: "ordinal.closure.readout",
    stabilization: stabilized ? "witness" : "obstruction",
    stage: finite.kind === "ordinal.closure.finiteOrdinal:witness" ? toCount(finite.value) : null,
    regime: closureRegimeName(regime),
  });
}

/**
 * Run the bounded stabilization search over a process.
 *
 * The function records the finite successor orbit it evaluates, then checks the
 * configured finite and limit blocks for a stabilization witness. A returned
 * obstruction means "not found within this horizon", not "no fixed point
 * exists".
 */
export function closeOrdinalProcess(process) {
    const at = (ordinal) => closureApproximant(process, ordinal);
    const orbit = [];
    const closeAt = (stabilization) => {
        const regime = closureRegimeOfOrdinal(stabilization.ordinal, process.scottContinuous);
        const search = Object.freeze({
            kind: "ordinal.closure.stabilizationSearch:witness",
            ordinal: stabilization.ordinal,
            regime,
            stabilization,
        });
        return Object.freeze({ kind: "ordinal.closure.carrier", process, value: stabilization.value, orbit: Object.freeze(orbit), search, stabilization });
    };
    const closeWitness = (stabilization) => {
        switch (stabilization.kind) {
            case "ordinal.closure.stabilization:witness":
                return closeAt(stabilization);
        }
    };
    {
        let value = process.lattice.bottom;
        let ordinal = zeroOrdinal;
        orbit.push(closureOrbitPoint(ordinal, value));
        for (const _stage of members(process.horizon.finiteStages)) {
            const successorValue = process.endomorphism(value);
            if (process.lattice.eq(successorValue, value)) {
                return closeAt(Object.freeze({ kind: "ordinal.closure.stabilization:witness", ordinal, value, successor: successorValue }));
            }
            ordinal = successorOrdinal(ordinal);
            value = successorValue;
            orbit.push(closureOrbitPoint(ordinal, value));
        }
    }
    for (const block of closureSearchBlocks(process.horizon)) {
        const base = block.base;
        switch (base.kind) {
            case "ordinal.closure.ordinal.zero":
                continue;
            case "ordinal.closure.ordinal.limit": {
                const closed = closeWitness(closureStabilizationAt(process, base));
                if (closed)
                    return closed;
                break;
            }
        }
        for (const member of members(block.finiteStages)) {
            const closed = closeWitness(closureStabilizationAt(process, ordinalPlusFinite(base, member)));
            if (closed)
                return closed;
        }
    }
    const omegaSquare = omegaSquaredOrdinal();
    const omegaSquareClosure = closeWitness(closureStabilizationAt(process, omegaSquare));
    if (omegaSquareClosure)
        return omegaSquareClosure;
    const searchedThrough = omegaMultipleOrdinal(successor(process.horizon.limitBlocks));
    const value = at(searchedThrough);
    const stabilization = Object.freeze({
        kind: "ordinal.closure.stabilization-obstruction",
        searchedThrough,
        value,
        successor: at(successorOrdinal(searchedThrough)),
    });
    const search = Object.freeze({
        kind: "ordinal.closure.stabilizationSearch-obstruction",
        searchedThrough,
        stabilization,
    });
    return Object.freeze({ kind: "ordinal.closure.carrier", process, value, orbit: Object.freeze(orbit), search, stabilization });
}
