// witness-journal-invocation-service — one namespace's scripted-invocation witness.
//
// A scripted invocation (caller, verb, args, an optional action descriptor,
// a value, and a time) becomes exactly one witness-journal entry: E=caller,
// A={verb, args, action?}, V=value, T=at. This module owns only the
// invocation-specific cut: how one invocation becomes one entry, and which
// dated, namespace-scoped feed it lands in. It performs no witnessing or
// journal I/O itself — that is witness-journal-entry-service's and
// witness-journal-log-service's job, both depended on here, not
// reimplemented.
//
// Witnessing an invocation is deliberately best-effort: a witness failure
// must never change the action's own output, so witnessInvocation never
// throws.
//
// Note on scope: the original `services/invocation-ledger`'s `Invocation`
// type carried an `action` field typed as relating's own `MorphismCarrier`
// (an SEN-notation-adjacent type from relating's category machinery, not
// SEN notation itself). This extraction does not depend on relating or on
// the relation-model-notation section, so `action` here is untyped JSON —
// any caller that has a real morphism/action descriptor can pass its JSON
// form; this package makes no claim about its internal shape.

import { eavtRow as entry } from "../../../../../scripts/admit-row.mjs";
import { appendEavtEntries } from "../../../../../scripts/append-eavt-entries.mjs";
import { readEavtJournal } from "../../../../../scripts/read-eavt-journal.mjs";
import { latestState as latestPerCell } from "../../../../../scripts/latest-state.mjs";

/**
 * @typedef {{
 *   readonly caller: import("../../../../../../../../../src/index.mjs").JsonValue,
 *   readonly verb: string,
 *   readonly args: Record<string, import("../../../../../../../../../src/index.mjs").JsonValue>,
 *   readonly action?: import("../../../../../../../../../src/index.mjs").JsonValue,
 *   readonly value: import("../../../../../../../../../src/index.mjs").JsonValue,
 *   readonly at: import("../../../../../../../../../src/index.mjs").JsonValue,
 * }} Invocation
 */

/** A filesystem-safe leaf slug for a namespace term (drops a leading scope `@`). */
function slug(namespace) {
  return namespace.replace(/^@/, "").replace(/[^A-Za-z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "") || "invocation";
}

/**
 * The dated feed name one namespace's invocations land in for one day:
 * `<date>-<slug(namespace)>-log`. Pure — no I/O, no path resolution against
 * a root; witness-journal-log-service owns turning a feed name into a path.
 *
 * @param {string} namespace
 * @param {import("../../../../../../../../../src/index.mjs").JsonValue} at
 * @returns {string}
 */
export function feedNameFor(namespace, at) {
  return `${typeof at === "string" && /^\d{4}-\d{2}-\d{2}/u.test(at) ? at.slice(0, 10) : "0000-00-00"}-${slug(namespace)}-log`;
}

/**
 * Build the one witness-journal entry an invocation cellizes to: a single
 * grain-of-change EAVT row, E=caller, A={verb, args, action?}, V=value,
 * T=at. Pure.
 *
 * @param {Invocation} invocation
 * @returns {import("@red-cup-engineering/eavt/row").WitnessJournalEntry}
 */
export function invocationEntry(invocation) {
  const predicate = {
    verb: invocation.verb,
    args: invocation.args,
    ...(invocation.action === undefined ? {} : { action: invocation.action }),
  };
  return entry({ e: invocation.caller, a: predicate, v: invocation.value, t: invocation.at });
}

/**
 * Witness one invocation under a namespace's dated journal. Best-effort: a
 * witness failure (a bad root, an unwritable filesystem, a malformed
 * invocation) is swallowed and reported as zero rows appended, never
 * thrown — the caller's own action must not be affected by a witness
 * failure.
 *
 * @param {string} dataRoot
 * @param {string} namespace
 * @param {Invocation} invocation
 * @returns {{ readonly appended: number }}
 */
export function witnessInvocation(dataRoot, namespace, invocation) {
  try {
    const feed = feedNameFor(namespace, invocation.at);
    return appendEavtEntries({ root: dataRoot, feed, entries: [invocationEntry(invocation)], at: invocation.at });
  } catch {
    return { appended: 0 };
  }
}

/**
 * Build the dispatch hook that persists invocations under a data root —
 * the seam a scripted boundary's dispatcher plugs a witness sink into
 * without depending on this package's shape beyond one function call.
 *
 * @param {string} dataRoot
 * @param {string} namespace
 * @returns {(invocation: Invocation) => void}
 */
export function filesystemInvocationWitness(dataRoot, namespace) {
  return (invocation) => {
    witnessInvocation(dataRoot, namespace, invocation);
  };
}

/**
 * Read one namespace's traced invocation journal for the day named by `at`.
 * Never throws: a missing or unreadable journal reads as empty, matching
 * witness-journal-log-service's own law for a missing journal.
 *
 * @param {string} dataRoot
 * @param {string} namespace
 * @param {import("../../../../../../../../../src/index.mjs").JsonValue} at
 * @returns {readonly { readonly entry: import("@red-cup-engineering/eavt/row").WitnessJournalEntry, readonly trace: number }[]}
 */
export function readInvocations(dataRoot, namespace, at) {
  try {
    return readEavtJournal({ root: dataRoot, feed: feedNameFor(namespace, at), at });
  } catch {
    return [];
  }
}

/**
 * Build a reader for "today's" invocation journal, evaluated at call time —
 * the live-tail reading a running process wants, without pinning `at` up
 * front.
 *
 * @param {string} dataRoot
 * @param {string} namespace
 * @param {() => string} [now]
 * @returns {() => readonly { readonly entry: import("@red-cup-engineering/eavt/row").WitnessJournalEntry, readonly trace: number }[]}
 */
export function filesystemInvocationLogReader(dataRoot, namespace, now = () => new Date().toISOString()) {
  return () => readInvocations(dataRoot, namespace, now());
}

/**
 * Project the current state of one namespace's invocation journal for the
 * day named by `at`: one latest-wins answer per (caller, {verb,args,
 * action?}) cell. A thin composition over witness-journal-state-service's
 * `latestPerCell` — this module still performs no folding of its own.
 *
 * @param {string} dataRoot
 * @param {string} namespace
 * @param {import("../../../../../../../../../src/index.mjs").JsonValue} at
 * @returns {ReturnType<typeof latestPerCell>}
 */
export function projectInvocations(dataRoot, namespace, at) {
  return latestPerCell({ entries: readInvocations(dataRoot, namespace, at).map((traced) => traced.entry) });
}
