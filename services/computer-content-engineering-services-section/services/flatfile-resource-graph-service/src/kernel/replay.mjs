import { readdirSync } from "node:fs";
import path from "node:path";
import { canonicalize } from "./identity.mjs";
import { getRecord } from "./record-store.mjs";
import { TIER_B_RECORD_TYPES, validateRecord } from "./record-types.mjs";
import { validateWitness } from "./witness.mjs";
import { readEavtJournal } from "@red-cup-engineering/eavt/read-eavt-journal";
import { FOUR, four, joinKnowledgeWire } from "@red-cup-engineering/computer-data-services-section/four";

// Deterministic replay: fold the append-only event log into in-memory
// state (design spec S4, S11; Addendum ruling 5). "Events are the source
// of truth. The working model is a cache" — this module builds the
// cache, over PyFARS's own kernel/replay.py algorithm exactly, adapted
// to FARS's Node realization's split custody: readSeavt/streamSeavt (composed, never
// reimplemented, from the EAVT journal reader) give only the bare SEAVT
// quad — a witness's full body, including the details a record-creation
// witness nests it under, lives in kernel/record-store.mjs's
// content-addressed store, keyed by the SEAVT row's own v coordinate
// (record-store.mjs's own header comment explains why: the composed
// journal-log service's appendSeavt normalizes every row down to
// {e,a,v,t}, so a fuller body cannot ride along inside the row itself,
// the way PyFARS's own hand-written journal line can afford to nest it).
//
// Three folds run together, in one pass over the log's global trace order:
//
//   - belief, per proposition (a witness's target): the FOUR
//     knowledge-order join of every witness's four_after
//     (kernel/four.mjs's joinKnowledgeWire) — re-derived here from the raw
//     evidence bits, never trusted from a witness's own self-reported
//     four_before.
//   - records, the Tier B record registry: recovered from witnessed
//     record-creation events, the only way a non-Witness Tier B record
//     ever enters the log (Addendum ruling 5). The convention: a
//     record-creation witness carries the created record's full wire
//     form under details.record, and witnesses that record's own id as
//     its target — mirroring operator/edit.mjs's Tier A convention
//     (target = the thing that came to exist) for Tier B.
//   - witnesses, every Witness this trace resolved, indexed by its own
//     id. kernel/discharge.mjs's deltaHolds needs the full witness set
//     for a target to fold its WIT chain (witChainClosed) — this is the
//     seam that supplies it without re-reading the log a second time.
//
// Corpus projection (a future kernel/projector module's
// apply(state, witness) -> state) is a named seam, not implemented here
// — this tree has no kernel/projector module yet, and inventing one is
// out of scope for this milestone. Projector names the seam;
// replayEventLog's project option is where a real one plugs in later.
// Left at its default of null, replay folds to belief + registry state
// only, exactly as this milestone's brief requires.
//
// Two failure modes are refused, never silently skipped (design spec
// S11):
//
//   - a corrupted line — a witness id the record store cannot resolve,
//     a physical SEAVT row that disagrees with the witness content it
//     names, a Witness that fails its own shape/id-round-trip check
//     (kernel/witness.mjs's validateWitness), an SRN-grammar violation
//     the composed reader itself refuses to parse, or a record-creation
//     witness whose nested record fails record-types.mjs's
//     validateRecord or disagrees with its own witness's target —
//     raises CorruptedLogLineError.
//   - a causally-reordered log — a witness for some proposition whose
//     before_digest does not match the after_digest of that same
//     proposition's immediately preceding witness in trace order —
//     raises CausalOrderViolation.
//
// Replaying an identical log twice from empty state produces
// canonically byte-identical state (serializeState); see
// test/replay.test.mjs.

const RECORD_DETAILS_KEY = "record";

export class ReplayError extends Error {
  constructor(message, code) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

// A journal line could not be folded: a witness id the record store
// cannot resolve, a physical SEAVT row that disagrees with the witness
// content it names, a Witness that fails its own shape/id check, an
// SRN-grammar violation the composed reader itself refuses to parse, or
// a witnessed record-creation whose nested record is invalid or
// disagrees with its own witness.
export class CorruptedLogLineError extends ReplayError {
  constructor(message) {
    super(message, "corrupted-log-line");
  }
}

// A witness's before_digest does not match the after_digest of the
// immediately preceding witness for the same proposition in trace order
// — the log's append order contradicts the causal chain it claims to
// record.
export class CausalOrderViolation extends ReplayError {
  constructor(message) {
    super(message, "causal-order-violation");
  }
}

export const EMPTY_STATE = Object.freeze({ belief: Object.freeze({}), records: Object.freeze({}), witnesses: Object.freeze({}) });

function safeReaddir(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return [];
    throw error;
  }
}

function datedDirs(dir) {
  return safeReaddir(dir).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

// Every channel with at least one journal line under root, named for its
// feed file's stem, in sorted (thus deterministic) order — the same
// data/logs/<YYYY>/<MM>/<DD>/<feed>.jsonl layout the EAVT journal's
// logPathFor writes.
export function channelsOf(root) {
  const logsDir = path.join(root, "data", "logs");
  const channels = new Set();
  for (const year of datedDirs(logsDir)) {
    for (const month of datedDirs(path.join(logsDir, year))) {
      for (const day of datedDirs(path.join(logsDir, year, month))) {
        for (const entry of safeReaddir(path.join(logsDir, year, month, day))) {
          if (entry.isFile() && entry.name.endsWith(".jsonl")) channels.add(entry.name.slice(0, -".jsonl".length));
        }
      }
    }
  }
  return [...channels].sort();
}

// Every day-partition (YYYY-MM-DD) holding a channel's journal file
// under root, sorted — the per-channel day sequence readSeavt/streamSeavt
// need an at value to address one file at a time.
function daysOf(root, channel) {
  const logsDir = path.join(root, "data", "logs");
  const days = [];
  for (const year of datedDirs(logsDir)) {
    for (const month of datedDirs(path.join(logsDir, year))) {
      for (const day of datedDirs(path.join(logsDir, year, month))) {
        const hasChannel = safeReaddir(path.join(logsDir, year, month, day))
          .some((entry) => entry.isFile() && entry.name === `${channel}.jsonl`);
        if (hasChannel) days.push(`${year}-${month}-${day}`);
      }
    }
  }
  return days.sort();
}

// One channel's full journal, across every day it was ever written to,
// in day-partition-then-append order — streamSeavt itself already gives
// append order within one (channel, day) file (its own derived trace);
// concatenating days in sorted order extends that to the whole channel.
function readChannel(root, channel) {
  const lines = [];
  for (const day of daysOf(root, channel)) {
    try {
      for (const { entry } of readEavtJournal({ root: root, feed: channel, at: `${day}T00:00:00Z` })) lines.push(entry);
    } catch (error) {
      throw new CorruptedLogLineError(`channel ${channel}: unreadable journal line: ${error.message}`);
    }
  }
  return lines;
}

// Every line across channels, in global trace (causal) order. Each
// channel's own lines already come out of readChannel in deterministic
// day-partition-then-append order; a stable sort on witnessed time (t)
// keeps that per-channel order for ties and interleaves channels by when
// they were witnessed — a deterministic total order, since the inputs to
// the sort are themselves already deterministic.
function trace(root, channels) {
  const lines = [];
  for (const channel of channels) lines.push(...readChannel(root, channel));
  return lines.slice().sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
}

// The Tier B record a record-creation witness names, or null when
// witness is an ordinary Tier A witness. Validates the nested record and
// its agreement with its own witness before ever entering the registry —
// a malformed or misattributed record-creation event is corruption, not
// a record to silently drop.
function recordOf(witness) {
  const details = witness.details;
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const record = details[RECORD_DETAILS_KEY];
  if (record === undefined || record === null) return null;
  if (typeof record !== "object" || Array.isArray(record) || !TIER_B_RECORD_TYPES.includes(record.type)) return null;
  try {
    validateRecord(record);
  } catch (error) {
    throw new CorruptedLogLineError(`witness ${witness.id}: witnessed record-creation is invalid: ${error.message}`);
  }
  if (record.id !== witness.target) {
    throw new CorruptedLogLineError(`witness ${witness.id} targets ${witness.target} but witnesses the creation of record ${record.id}`);
  }
  return record;
}

// Fold root's event log into a ReplayState, from empty state, across
// every channel in options.channels (every channel on disk, by default
// — channelsOf). Deterministic: replaying an identical log twice from
// empty state produces canonically byte-identical state
// (serializeState).
//
// A corrupted line raises CorruptedLogLineError; a witness whose
// before_digest contradicts the trace-order chain for its proposition
// raises CausalOrderViolation. Neither is ever silently skipped.
//
// options.project is the projector seam (design spec S4, S5 step 11) —
// when given, it folds alongside belief/registry, once per witness in
// trace order, as (state, witness) -> state; left null (the default),
// replay folds to belief + registry state only, per this milestone's
// scope.
export function replayEventLog(root, { channels = null, project = null } = {}) {
  const resolvedChannels = channels !== null ? [...channels] : channelsOf(root);
  let belief = {};
  let records = {};
  let witnesses = {};
  const lastAfterDigest = new Map();

  for (const entry of trace(root, resolvedChannels)) {
    const witness = getRecord(root, entry.v);
    if (witness === null) {
      throw new CorruptedLogLineError(`journal line names witness ${entry.v}, which the record store does not resolve`);
    }
    try {
      validateWitness(witness);
    } catch (error) {
      throw new CorruptedLogLineError(`invalid Witness: ${error.message}`);
    }
    if (witness.target !== entry.e || witness.operator !== entry.a || witness.id !== entry.v) {
      throw new CorruptedLogLineError(`journal line {e:${entry.e},a:${entry.a},v:${entry.v}} disagrees with witness ${witness.id} {target:${witness.target},operator:${witness.operator}}`);
    }

    const target = witness.target;
    const beforeDigest = witness.before_digest;
    if (lastAfterDigest.has(target) && beforeDigest !== lastAfterDigest.get(target)) {
      throw new CausalOrderViolation(
        `${target}: witness ${witness.id}'s before_digest ${JSON.stringify(beforeDigest)} does not match the preceding witness's after_digest ${JSON.stringify(lastAfterDigest.get(target))}`,
      );
    }
    lastAfterDigest.set(target, witness.after_digest);

    const afterFour = four(witness.four_after[0], witness.four_after[1]);
    belief = { ...belief, [target]: joinKnowledgeWire(belief[target] ?? FOUR.neither, afterFour) };
    witnesses = { ...witnesses, [witness.id]: witness };

    const record = recordOf(witness);
    if (record !== null) records = { ...records, [record.id]: record };

    if (project !== null) {
      const projected = project({ belief, records, witnesses }, witness);
      belief = { ...projected.belief };
      records = { ...projected.records };
      witnesses = { ...projected.witnesses };
    }
  }

  return { belief, records, witnesses };
}

// Canonical bytes for state: the same NFC-normalize/sort-keys/
// safe-integer canonicalization kernel/identity.mjs's canonicalize uses
// for content identity, compact-serialized. Two replays of the same log
// from empty state produce byte-identical output from this function —
// the determinism guarantee design spec S11 requires.
export function serializeState(state) {
  const body = {
    belief: Object.fromEntries(
      Object.entries(state.belief).map(([target, value]) => [target, [value.positiveEvidence, value.negativeEvidence]]),
    ),
    records: Object.fromEntries(Object.entries(state.records).map(([id, record]) => [id, { ...record }])),
    witnesses: Object.fromEntries(Object.entries(state.witnesses ?? {}).map(([id, witness]) => [id, { ...witness }])),
  };
  return Buffer.from(JSON.stringify(canonicalize(body)), "utf8");
}


