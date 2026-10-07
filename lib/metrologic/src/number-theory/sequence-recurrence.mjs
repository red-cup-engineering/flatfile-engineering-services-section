/**
 * analysis/sequence-recurrence - recurring verb chains over an actor's own
 * admitted step stream.
 *
 * An `AdmittedStep` is one verb invocation an actor (a caller, a session) ran,
 * reduced to what recurrence needs: the verb, a structure-only shape of its
 * arguments (key set, never raw values), and whether the step's own outcome
 * validated cleanly. This module finds bounded-length (`minLength`..
 * `maxLength`, default 2..6) contiguous verb chains that recur — the same
 * chain appearing at least twice, counting only occurrences where every step
 * in the window validated — and reports each as a `SequenceCandidate`
 * carrying its support (occurrence count), the distinct actors that ran it,
 * one representative argument shape per step, and an honest count of how
 * many occurrences of the same chain were excluded for carrying an
 * invalid step.
 *
 * A shorter chain is dropped in favor of a longer one that always carries it
 * (same support, contiguous containment) — the standard maximal-repeat
 * reading: report the longest recurring pattern, not every sub-window of it.
 *
 * This module answers ONE question — which verb chains recur with validated
 * outcomes — and nothing about whether a chain should become a skill. That
 * judgment, if it is ever made, belongs to a separate, operator-ruled step.
 */
export const DEFAULT_MIN_CHAIN_LENGTH = 2;
export const DEFAULT_MAX_CHAIN_LENGTH = 6;
const CHAIN_KEY_SEPARATOR = "→";
function streamsByActor(steps) {
    const byActor = new Map();
    for (const step of steps) {
        const list = byActor.get(step.actor);
        if (list === undefined)
            byActor.set(step.actor, [step]);
        else
            list.push(step);
    }
    return byActor;
}
/** Every length-`length` contiguous window across every actor's own stream, grouped by chain. */
function occurrencesByChain(byActor, length) {
    const byChain = new Map();
    for (const [actor, list] of byActor) {
        for (let start = 0; start + length <= list.length; start += 1) {
            const window = list.slice(start, start + length);
            const chain = Object.freeze(window.map((step) => step.verb));
            const key = chain.join(CHAIN_KEY_SEPARATOR);
            const occurrence = Object.freeze({
                actor,
                validated: window.every((step) => step.validated),
                argShapes: Object.freeze(window.map((step) => step.argShape)),
            });
            const entry = byChain.get(key);
            if (entry === undefined)
                byChain.set(key, { chain, occurrences: [occurrence] });
            else
                entry.occurrences.push(occurrence);
        }
    }
    return byChain;
}
/** Raw (pre-maximality-pruning) candidates at one fixed chain length: every
 *  chain with at least two validated-clean occurrences, carrying its own
 *  honest exclusion count. */
function rawCandidatesAtLength(byActor, length) {
    const out = [];
    for (const { chain, occurrences } of occurrencesByChain(byActor, length).values()) {
        const clean = occurrences.filter((occurrence) => occurrence.validated);
        if (clean.length < 2)
            continue;
        const sessions = Object.freeze([...new Set(clean.map((occurrence) => occurrence.actor))].sort());
        out.push(Object.freeze({
            chain,
            support: clean.length,
            sessions,
            argShapes: clean[0].argShapes,
            excludedInvalid: occurrences.length - clean.length,
        }));
    }
    return out;
}
/** Whether `shorter` occurs as a contiguous sub-chain of `longer`. */
function isContiguousSubchain(shorter, longer) {
    if (shorter.length >= longer.length)
        return false;
    for (let offset = 0; offset + shorter.length <= longer.length; offset += 1) {
        if (shorter.every((verb, index) => longer[offset + index] === verb))
            return true;
    }
    return false;
}
/**
 * Find recurring verb chains, bounded `minLength`..`maxLength` (default
 * 2..6), over each actor's own ordered admitted-step stream. See this
 * module's own docstring for the maximality and witness-exclusion rules.
 */
export function recurringVerbSequences(steps, options = {}) {
    const minLength = options.minLength ?? DEFAULT_MIN_CHAIN_LENGTH;
    const maxLength = options.maxLength ?? DEFAULT_MAX_CHAIN_LENGTH;
    if (!Number.isSafeInteger(minLength) || minLength < 1) {
        throw new RangeError("recurringVerbSequences: minLength must be a safe integer >= 1");
    }
    if (!Number.isSafeInteger(maxLength) || maxLength < minLength) {
        throw new RangeError("recurringVerbSequences: maxLength must be a safe integer >= minLength");
    }
    const byActor = streamsByActor(steps);
    const byLength = new Map();
    for (let length = minLength; length <= maxLength; length += 1) {
        byLength.set(length, rawCandidatesAtLength(byActor, length));
    }
    const maximal = [];
    for (let length = minLength; length <= maxLength; length += 1) {
        const longer = byLength.get(length + 1) ?? [];
        for (const candidate of byLength.get(length) ?? []) {
            const subsumed = longer.some((other) => other.support === candidate.support && isContiguousSubchain(candidate.chain, other.chain));
            if (!subsumed)
                maximal.push(candidate);
        }
    }
    maximal.sort((left, right) => right.support - left.support
        || right.chain.length - left.chain.length
        || left.chain.join(CHAIN_KEY_SEPARATOR).localeCompare(right.chain.join(CHAIN_KEY_SEPARATOR)));
    return Object.freeze({
        kind: "metroplat.sequenceRecurrence.measurement",
        minLength,
        maxLength,
        candidates: Object.freeze(maximal.map((candidate) => Object.freeze({
            kind: "metroplat.sequenceRecurrence.candidate",
            chain: candidate.chain,
            support: candidate.support,
            sessions: candidate.sessions,
            argShapes: candidate.argShapes,
            excludedInvalid: candidate.excludedInvalid,
        }))),
    });
}
