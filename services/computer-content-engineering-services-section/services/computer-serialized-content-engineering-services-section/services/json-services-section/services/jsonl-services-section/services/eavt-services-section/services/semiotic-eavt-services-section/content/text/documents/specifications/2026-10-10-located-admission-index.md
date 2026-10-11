---
title: "The located admission index: journal records at locations computed from their proof-path addresses"
description: "Research note, EARS requirements, layout specification and migration for the segment store's causal-admission index v3, which replaces the v2 root index (every admitted witness id held in memory) with buckets and ledgers whose paths are computed from addresses."
date-created: 2026-10-10
type: specification
status: realized in src/journal/filesystem/segment-store.mjs; measured on a synthetic 45-day journal
owner: semiotic-eavt-services-section
basis:
  - "The Leader, 2026-10-10: flat files organized by proof path addressing, so a formula predicts where files will be rather than keeping indexes, hot or cold."
  - "bare-cedar-fog requirement feltos-runs-in-32-mb-with-a-64-mb-startup-peak (cells history-free, computed-location, no-index)"
  - "semiotic-content-address-system specification 2026-10-10-ni-path-formula (ni-path-v1, conformance/ni-path-v1.json)"
---

# The located admission index

## 1. Research note: what the v2 store held and why it grew

The v2 store kept four append-only files under `index/causal-admission/v2/` and read each whole into one
in-process structure per root (`rootIndex`):

| v2 structure | held per | measured |
|---|---|---|
| `admitted.jsonl` -> packed digest table, feed numbers, per-feed entry arrays | every witness ever admitted | 990,000 ids: 48 MB of typed arrays plus about 10 MB of heap (FeltOS node, synthetic 45-day journal, 2026-10-10); about 1.0 M ids, 109 MB file on Bare Cedar Fog |
| `pending.jsonl` -> Map of id to entries, `dependents` Map | every witness that ever waited | 25.8 MB file on Bare Cedar Fog |
| `blocked.jsonl`, `artifacts.jsonl` -> Maps | every blocked witness, every explicit artifact | small today, unbounded |

Every reader paid for it: `segmentStatements` and `projectSegmentStatements` loaded the whole admitted
table to check one feed for loss. The live node's heap exhaustion (2026-10-10, 512 MB cap) had this
table as one of its standing costs. The table answered three questions, each of which an address
already locates:

1. *Was witness w admitted, and into which feeds?* — w is an NI address; its facts can live in the
   file `ni-path-v1` names for w.
2. *Has a feed lost witnesses?* — the feed's address is its proof path; a ledger beside it can say how
   large its segment was after each admission.
3. *Which feeds exist?* — the date directories of the proof path list them.

## 2. Requirements (EARS)

- **LAI-1 (ubiquitous).** The segment store shall locate each admission fact (admitted, blocked, pending,
  waiting, artifact, pending source) in the bucket file that `ni-path-v1` computes from the fact's key.
- **LAI-2 (ubiquitous).** The segment store shall keep no index from witness id to feed or to location,
  in memory or on disk.
- **LAI-3 (ubiquitous).** The JavaScript memory the segment store holds for a root shall not grow with the
  number of witnesses the root has admitted; its caches shall be bounded by fixed budgets (located
  buckets 4 MB, decoded segments 4 MB, typed projections 6 MB).
- **LAI-4 (event-driven).** When a witness is admitted into a feed, the segment store shall write the
  witness's segment line durably before the feed's ledger line `{id, end}` and the witness's admitted
  bucket line `{id, log}`.
- **LAI-5 (unwanted behaviour).** If a feed's segment is missing or smaller than the last `end` its ledger
  records, then the segment store shall refuse to read the feed.
- **LAI-6 (event-driven).** When a pending witness's cause is admitted by any process, the segment store
  shall find the witness through the cause's waiting bucket and admit it.
- **LAI-7 (state-driven).** While a root holds a v2 index and no v3 marker, the segment store shall carry
  the v2 lines into buckets and ledgers before it answers, holding at most 4 MB of lines at a time, and
  shall carry v2 lines appended later at the next question.
- **LAI-8 (state-driven).** While a root holds segments and no index at all, the segment store shall
  rebuild the admitted buckets and ledgers from its segments.
- **LAI-9 (ubiquitous).** The segment store's buckets shall reproduce `conformance/ni-path-v1.json` of
  semiotic-content-address-system (NIP-5).

## 3. Layout (v3)

```text
<settlement>/data/logs/                        the store (store-root artifactStoreRoot)
  <kind>-logs/<date>-admit-<kind>.jsonl.witnesses   segment: {id, observation} per line
  <kind>-logs/<date>-admit-<kind>.jsonl.admitted    ledger: {id, end} per admission
<settlement>/data/state/log-state/             the logs' state (store-root journalIndexDirectory)
  causal-admission/v3/formula.json                  {formula: "ni-path-v1", carried: {v2 offsets}}
  causal-admission/v3/<kind>/sha-256/<d0 d1>.jsonl  buckets, kind in
      admitted  {id, log}                  keyed by id
      blocked   {id, obstruction}          keyed by id
      pending   {id, log, statement, missing}  keyed by id
      waiting   {dependency, id, log}      keyed by dependency
      artifacts {ref, canonicalText}       keyed by ref
      sources   {ref, id, log}             keyed by ref (sources a pending statement carries)
  segment-verified/v1.jsonl                         verification checkpoints (unchanged)
  heads/<date>/<namespace>/                         stream heads (computer-system-engine)
```

`log` paths are relative to the store. The admission facts are not logs. They are what the store
derives from its logs in order to admit and read them, so they sit in the state tier of the settlement that
physically holds the logs. Where `data/logs` links into machine state, the state lives there too and never
enters the repository. `d` is the key's NI digest (a non-NI key is located by the NI of its UTF-8 bytes).
Every file is append-only canonical JSON lines written by `appendDurably` (crash-tail repair unchanged).

Questions and the one file each opens:

| question | opens |
|---|---|
| is w admitted / into which feeds | `admitted/<bucket(w)>` |
| is w blocked | `blocked/<bucket(w)>` |
| w's pending entries (none once admitted or blocked) | `pending/<bucket(w)>` (+ the two above) |
| who waits on c | `waiting/<bucket(c)>` |
| explicit artifact r | `artifacts/<bucket(r)>` |
| a pending statement's source r | `sources/<bucket(r)>`, then that witness's pending bucket |
| has feed f lost witnesses | the tail of `f.admitted` and the size of `f.witnesses` |
| which feeds exist through date t | the dated file names of the kind directories (`<kind>-logs/<date>-…`) through t |

## 4. Migration (v2 to v3)

Performed by the store itself, in the process that first touches a root (no operator step):

1. Under `v3/carrying.lock` (exclusive create; a lock older than ten minutes is taken over), stream each v2
   file from the offset `formula.json` records (0 at first), appending each line to its bucket; pending
   lines also write their waiting and sources lines. At most 4 MB of lines are buffered.
2. For each feed the carried lines name, append a ledger line `{carried: "v2", end}` with the segment's
   current size (1 when the segment is missing, so its read fails closed as v2 made it).
3. fsync every written file, then atomically replace `formula.json` with the new offsets.
4. On every later question, if `v2/admitted.jsonl` has grown past the recorded offset (a v2 writer still
   running), carry the new lines the same way.

A crash midway leaves duplicate lines on the next carry; readers deduplicate by key. v2 files are left
in place (read-only history); deleting them after a release has run on v3 is safe and not required.

Measured on a copy of the synthetic 45-day journal (990,000 admitted ids): the carry took 18-20 s once,
inside the node's first start, holding at most the 4 MB buffer.

## 5. Measured effect (FeltOS node, synthetic 45-day journal, Node 24, 2026-10-10)

| | v2 | v3 |
|---|---|---|
| node steady JavaScript memory after GC (t+170 s) | 222 MB (arrayBuffers 48 MB) | 119 MB (arrayBuffers 0.1 MB) |
| of which this store | ~58 MB | ~4 MB (bounded caches) |
| node with an empty journal (floor) | 118 MB | 118 MB |

The remaining 119 MB is not this store's: compiled modules (~53 MB), the agency registry holder (~21 MB),
and catalog contracts (see the bare-cedar-fog requirement's measured record).
