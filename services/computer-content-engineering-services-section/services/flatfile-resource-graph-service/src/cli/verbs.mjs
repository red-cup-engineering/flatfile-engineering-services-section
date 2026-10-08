// M10 (design spec S12): CLI verb parity, debitum/officium split (S8).
// Every verb here is a pure function — it only reads/computes/returns or
// throws, exactly the design's Family D discipline ("no process-exit
// machinery"). Each verb used to take a corpus `root` and read the kernel
// itself (record-store.mjs's getRecord, event-log.mjs's readSeavt,
// replay.mjs's replayEventLog, read-flatfiles.mjs's loadFlatfiles) — which
// made every one of these functions kernel by that reach, despite the
// module's own text touching no effect directly, per the house's
// hull/kernel split (data/records/house-architecture-norms.json,
// "hull-never-imports-kernel"). Each read is a value the caller can pass, so
// every verb here now takes that value instead of `root`: the kernel reads
// move to scripts/flatfile-resource-graph.mjs, the executable adapter that
// is the process boundary anyway (argv parsing, stdout, exit codes) — the
// same split the module tree draws between cli/*.py's PORTED VERBATIM verb
// files and cli/_runner.py's dispatch shell.
//
// Scope, stated explicitly (never a silent gap): the design's own
// apps/jsfars module tree (spec S9) names "validate, lint, show, search,
// witness, witness-log, discharge, replay" for cli/jsfars.mjs, but lists
// no analyze/ directory anywhere in JS's module tree — bm25 search is
// gen-1 Python-only territory (S6's provenance triage: "analyze/ (all
// modules) — Port near-verbatim" is a pyfars-only row). `search` is
// therefore not implemented here; runValidate/runLint/runShow/runWitness/
// runWitnessLog/runDischarge/runReplay are. See this app's README STATUS
// section for the block, stated the same way.

import { discharge as computeDischarge } from "../kernel/discharge.mjs";
import { validateWitness } from "../kernel/witness.mjs";
import { composeRules } from "../closure/rules/compose-rules.mjs";

// Debitum (design spec S8): the sigma battery alone, a MUST-constraint
// pass over a corpus root — gen-1's `closure/rule/*` minus the two
// dropped ad hoc rules (S6), composed by closure/rules/compose-rules.mjs.
// JS carries exactly one rule set today (no separate MUST-only vs.
// style-only split the way gen-1's Python closure/rule/ package draws
// one), so validate and lint are the same debitum battery under two
// names — a documented scope decision (README STATUS), not a hidden gap:
// `officium.md`'s warning is about conflating debitum with officium
// (discharge), not about splitting debitum into finer sub-batteries,
// which nothing in the design spec requires JS to do yet.
// `loaded` is read-flatfiles.mjs's loadFlatfiles(root, options) result,
// { notes, diagnostics }, read by the caller at the kernel edge.
export function runValidate(loaded, options = {}) {
  const { notes, diagnostics: parseDiagnostics } = loaded;
  const ruleDiagnostics = composeRules(notes, options);
  return { notes: notes.length, diagnostics: [...parseDiagnostics, ...ruleDiagnostics] };
}

export const runLint = runValidate;

// One flatfile's parsed Tier A record, by slug or by its corpus-relative
// path — null when no such note exists among `notes` (read-flatfiles.mjs's
// loadFlatfiles(root).notes, read by the caller).
export function runShow(notes, target) {
  return notes.find((note) => note.slug === target || note.path === target) ?? null;
}

// One Witness, already read from the record store by its own
// content-identity id (record-store.mjs's getRecord(root, witnessId), by
// the caller) — re-validated here (the same shape/id-round-trip check
// replay.mjs's fold already runs per witness). `record` is null when the
// store had nothing at that id; this returns null right back, and throws
// when the record exists but fails validateWitness.
export function runWitness(record) {
  if (record === null) return null;
  return validateWitness(record);
}

// The raw SEAVT rows for one channel/day partition (event-log.mjs's
// readSeavt, read by the caller, unchanged), each row's v resolved to its
// full witness body from `witnessesById` — a caller-supplied lookup built
// from record-store.mjs's getRecord over the ids those same rows name — a
// lower-level view than runReplay's folded belief/registry/witness state,
// one journal partition file at a time rather than the whole log.
export function runWitnessLog(rows, witnessesById) {
  return rows.map((row) => ({
    ...row,
    entry: { ...row.entry, witness: witnessesById[row.entry.v] ?? null },
  }));
}

// Deterministic replay (replay.mjs's replayEventLog, read by the caller) of
// root's whole event log, reshaped for CLI/JSON output: FOUR values as
// their [positive, negative] evidence-bit pairs, plus the canonical replay
// digest (replay.mjs's serializeState, run by the caller since it is itself
// pure — bytes, hex-encoded) two independent replays of the same log agree
// on.
export function runReplay(state, digest) {
  return {
    belief: Object.fromEntries(
      Object.entries(state.belief).map(([target, value]) => [target, [value.positiveEvidence, value.negativeEvidence]]),
    ),
    records: state.records,
    witnesses: state.witnesses,
    digest,
  };
}

// Officium (design spec S8): the full H*_t fixed point for one record —
// {operative, sat_shadow, tr_shadow, free_shadow}, never coerced to a
// boolean — folded from root's whole event log (replay.mjs's
// replayEventLog, read by the caller) via discharge.mjs. Strictly stronger
// than a clean runValidate/runLint pass; recordId may name either a Tier B
// record or a Witness (discharge.mjs's sigmaHolds/deltaHolds accept both,
// per record-types.mjs's own FOREIGN_TIER_B_TYPES carve-out for Witness).
// { found: false } when recordId resolves to neither.
export function runDischarge(state, recordId) {
  const record = state.records[recordId] ?? state.witnesses[recordId];
  if (record === undefined) return { found: false, recordId, state: null };
  const records = Object.values(state.records);
  const witnesses = Object.values(state.witnesses);
  return { found: true, recordId, state: computeDischarge(record, records, witnesses) };
}
