---
title: "Converting a settlement store to the new store"
description: "The one conversion of an existing settlement store: which facts and feed lines become records, heads and logs (work threads, ledger entries, office acts, schedule state, encounter results), how references are rewritten, and the rest, which is deleted."
date-created: 2026-10-12
type: specification
status: designed; run once per world by feltos-node specification section 8, items 6 and 7
owner: semiotic-eavt-services-section
answers:
  - multi-agent-computer-platform-engineering-services-section/content/text/documents/specifications/feltos-node.md (sections 7 and 8, items 6 and 7)
  - system debts log-kinds-name-instances, log-files-name-their-act-and-kind-again, sen-json-bridge-multiplies-every-record
basis:
  - "store.md (this directory): the store, its layout and what it deletes."
  - "feltos-node.md section 7: each world is converted once; the journal store is deleted; no reader of the old layout is kept."
  - "Measured 2026-10-11 on the laptop's copy of the Bare Cedar Fog settlement store (561-group-services-section/data/logs, 851 kind directories, 5.2 GB)."
provenance:
  authors:
    - red-cup-engineer-senior-claude
  office: Red Cup Engineer Senior
  not-the-leaders-words: "An agent's specification derived from the Leader's statements quoted in store.md."
---

# Converting a settlement store

## 1. What converts and where the converter lives

A settlement store, in the earlier layout, is `data/logs/<kind>-logs/` (witness segments, ledgers, packed segments, packets, objects) with its derived state in `data/state/log-state/` (admission facts, checkpoints, thread membership, stream heads), and the clock's reservations and last runs in `data/state/clock/`. It converts to the layout of `store.md`: records under `data/records/`, heads and state under `data/state/`, and the few logs that have a reader under `data/logs/`. Everything else is deleted.

The converter is `scripts/convert-settlement.mjs`. It lives on a branch forked from the last commit of `semiotic-eavt-services-section` that holds the earlier store, with `store.mjs` and `layout.mjs` of the new store added to it. It reads the earlier layout with the earlier store's own readers (`segmentWitness`, `segmentStatements`, the admitted buckets), and writes with the new store. The branch is never merged. `main` holds no reader of the earlier layout. The branch is deleted after the second world converts.

```text
convert-settlement.mjs --settlement <root> [--into <root>] [--dry-run] [--report <file>]
```

`--into` writes the converted records and heads into a different settlement root; it is how the records of a retired instance are carried into the world that keeps them (section 6).

## 2. The rule that decides a kind

A kind of the earlier store converts when a call site named in `store-migration-map.md` reads it. It converts into the form that call site reads:

- read by thread (a head and its causes): **records** of a type, **heads** named by the thread;
- read by value or by identity, all at once: **records** of a type;
- read by time: **records** and a **log** of lines `{at, of, ...}`;
- read as "where it stands now": **state**, the newest value only.

A kind no call site reads is deleted. A kind with a reader on one world and none on the other converts on the world where it is read.

## 3. How a row becomes a record

The earlier store holds each act as a witness line: `{bytes, core, id, kind, observation: {address, causes, claim, payload, seat, time, referencedArtifacts}, sources}`. Two claims occur.

**`semantic-record.*` witnesses** (the semantic-record journal). `observation.payload` is the row `[e, a, v, t]` as SEN terms. `e` is the record's old identity, `a` its category, `v` the record's JSON through the JSON-to-SEN bridge, `t` its time. The record is `termToJson(v)`. The claim `semantic-record.<charge>` gives the charge; `told` is added as a member `{for, against}` (from `sidesOfReading("extremal", charge)`) unless it is the default `{for: true, against: false}`.

**`metroplat.eavt.row` witnesses** (`appendRows`). `observation.payload` is the row `[e, a, v, t]` as plain JSON. The record is `{"e": e, "a": a, "v": v, "t": t}`, the row the consumers' parsers already read. The row's entity `e` is the thread's name where the kind is a thread.

In both, the record's `causes` are the witness's `observation.causes` translated to new addresses (section 4). Nothing else of the witness survives: not `bytes`, `core`, `id`, `kind`, `sources`, `referencedArtifacts`, `address`, `claim`, `seat`, `time`. A witness that appears many times with the same row (one intent's claim row was witnessed 170 times) becomes one record, because equal JSON is one address.

## 4. Rewriting references

Every address in the earlier store is the address of a witness or of an identity under the earlier law. None is valid in the new store, whose address is `semanticId(record)` of the record with its causes. The converter rewrites every reference: each cause, and each string value inside a record that is exactly a canonical `ni:///sha-256;<43 characters>` address of something the converter converts.

It runs in two passes. Both keep their tables in files bucketed by `ni-path-v1`, deleted when the run ends. The converter holds no table in memory.

1. **Pass 1.** For each converting kind, stream its witnesses and write `old identity -> old witness id` and `old witness id -> log position` lines to `data/logs/convert-logs/map/`. Nothing is converted yet.
2. **Pass 2.** For each witness in thread and date order, convert its record: before it can be addressed, each reference in it is resolved through the map to the witness it names, and that witness is converted first (recursively; the stack holds the depth of one thread, not the store). The converted record is `put`; the line `old witness id -> new address` and `old identity -> new address` are written to `data/logs/convert-logs/done/`. A reference that resolves to no witness of a converting kind (it names a deleted kind, a state file, an artifact in custody) is left as it was; the report counts it. A cause that has no witness in the earlier store is dropped and counted: it was unresolvable there too.

The result is a tamper-evident chain that is new in every address, with no address of the earlier store inside it except references to things that do not convert.

## 5. What each kind becomes

Counts and sizes are those of the laptop's copy of the Bare Cedar Fog store, 2026-10-11, in the earlier layout. A converted record is about one eleventh of its witness line (a requirement of 4 KB of JSON was a 44 KB line). Cold Red Gate is converted from its own store by the same table; its kinds are listed by its conversion report, and a kind not in this table converts by the rule of section 2.

### Work threads, ledger entries, office acts, encounter results (records, heads)

| earlier kind | size | becomes | thread and head |
|---|---|---|---|
| `structured-work-intent-<id>-logs` (826 directories) and `actor-<ni>-logs` | 341 MB | records of type `claim-session`: one per distinct row (claim-session rows, withdrawals, declarations), with an additional Metrologic claim/evidence and SignCell projection retaining the original told sides and provenance | the thread is the writer's subject (`structured-work-intent-<slug>`); head `data/state/claim-session-state/<subject>.json` with the frontier of the thread's maximal records; a thread whose last record is a withdrawal gets `closed: true`. Plus a log line `{at, thread, of}` per record in `claim-session-logs/<date>.jsonl`, for the dispatch readout that reads the ledger by date. |
| `work-arena-move-logs` | 83 MB | records of type `work-arena-move`: the move, with `thread`, `edition` and `serves` references rewritten | the thread is the arena thread, named by the new address of its opening move; head `work-arena-move-state/<digest>.json` |
| `work-outcome-logs` | 17 MB | records of type `work-outcome`; each record's `told` carries the judgment's charge | none; log `work-outcome-logs/<date>.jsonl` lines `{at, of, verdict}` for reads by judged period |
| `office-incumbency-logs` | 0.1 MB | records of type `office-incumbency`: the claim row | thread is the row's `e` (`office:<office>:recognition:<actor>`); head `office-incumbency-state/<e>.json` |
| `capability-assertions-logs` | 7 MB | original source evidence and, only where the EAVT coordinates define a proposition, a Metrologic claim and SignCell projection | source entity/value use stable content-addressed `Mark` typed references; the exact original `a` term is the predicate. The old assertion and its telling remain epistemic source material; it never enters the current capability-authority thread |
| `encounter-logs` (and the 67 per-run feeds already filed into it) | 2 MB | records of type `encounter-result`: opened, finished and failed rows | thread is the run (`run.id`); head `encounter-result-state/<digest>.json` |
| `enterprise-logs` | 0.1 MB | records of types `enterprise-contact`, `enterprise-order`, `enterprise-party`, `enterprise-resource`, `enterprise-cost`, `enterprise-settlement`, `enterprise-signature`, `enterprise-bid`, `enterprise-control`, one per category | none |
| `character-inbox-logs`, `body-records-logs` | 0.6 MB | records of types `character-inbox-message`, `body-mail` | thread is the character; head `character-inbox-state/<character>.json` |
| `knowing.claims-logs` | 19 MB | source evidence and, for admitted propositions, a Metrologic claim and SignCell projection | admitted propositions retain their typed subject/object references and predicate. EAVT rows use content-addressed `Mark` references for `e` and `v`, and preserve `termToJson(a)` as the exact predicate. Evidence remains separate from the proposition; its source telling supplies independent `for` and `against` witnesses. An expression without admitted proposition coordinates remains evidence with its original telling and is not assigned a fabricated relation. |
| `anchored-findings-logs` | 3.4 MB | records of type `anchored-finding` | thread is the finding subject; head `anchored-finding-state/<name>.json` |
| `codex-tasks-logs` | 5.9 MB | records of type `codex-task` | thread is the task id; head `codex-task-state/<id>.json` |
| `lean-checks-logs` | 1 MB | records of type `lean-check` | thread is the check id; head `lean-check-state/<id>.json` |
| `inference-receiving-attempt-logs` | 0.1 MB | records of type `inference-receiving-attempt` | none |
| `metroplat.clock.schedule-logs` | 23 MB | records of type `clock-schedule`: each distinct definition, caused by the one it replaced, with original source evidence and a SignCell projection only when proposition coordinates are admitted | thread is the schedule id; head `clock-schedule-state/<schedule>.json`; any epistemic cell uses stable typed terms and the original EAVT predicate coordinate |

An enterprise `setting` row is not a record: the newest value for each (enterprise, axis) is state `enterprise-setting-state/<enterprise>-<axis>.json`, and the earlier values, each with the prose the board wrote beside it, are deleted.

### Schedule state (state)

| earlier | becomes |
|---|---|
| `data/state/clock/last/<schedule>.json` (54 files) | `schedule-run` record `{at, schedule, occurrence?, attempt?, ok}` using the original `ranAt` source clock |
| `data/state/clock/reservations/<schedule>/<occurrence>.json` and `.outcome.json` (183 MB) | not received into the current store by this converter; retained only in original custody, so the one-time conversion remains incomplete for these clock states |
| `metroplat.clock-logs` (occurrences and outcomes, 271 MB) | Metrologic source evidence and a SignCell projection only for rows with admitted proposition coordinates; no old occurrence or outcome becomes an actionable current `schedule-run` |

### State folded once

| earlier | size | becomes |
|---|---|---|
| `agent-session-token-usage-logs` | 634 MB | `data/state/session-token-usage-state/<session>.json` with the session's folded totals; the rows are deleted |
| `character-masks-logs`, `harness-carriers-logs` (rewritten at every boot with the same content) | 180 MB | `data/state/character-mask-state/<character>.json`, `data/state/harness-carrier-state/<character>.json` with the newest row's value; the history is deleted |

### Logs (lines)

| earlier | becomes |
|---|---|
| `service-lifecycle-logs` | `service-lifecycle-logs/<date>.jsonl`, one line `{at, service, event, ok}` per row |
| `arrival-logs` (677 MB) and the packets they cite | a record of type `arrival` per distinct arrival (`from`, `kind`, `received`, and `body`, the `ni:` address of its bytes) and a line `{at, from, kind, of}` in `arrival-logs/<date>.jsonl`; each cited packet's bytes go to content custody under their address; packets no row cites are deleted |
| `witness-journal-seavt-logs` (plain EAVT rows) | `witness-journal-logs/<date>.jsonl`, one line `{at, e, a, v}` per row with `termToJson` applied to terms |

### Deleted with no replacement

`work-peer-delivery-logs` (5.8 MB; peers converge by heads, so the delivered-set is not kept), `journal-object-logs`, `journal-packet-logs` (2.8 GB, apart from the packets above), `data/state/log-state/` in full, and every kind directory the table does not name. The settlement then holds under `data/logs` only the lines of section 5's log rows, written after conversion.

## 6. The records of a retired instance

Cold Red Gate's conversion carries in the records of the retired instance `ops.bindinggenerations.net`. The converter runs on that instance's settlement with `--into` set to Cold Red Gate's root. The records land in Cold Red Gate's buckets by `put`; a record Cold Red Gate already holds is not written again, because it has the same address. A thread both hold gets the maximal frontier of the two. The retired instance's logs are deleted with the rest.

## 7. Order and verification

1. Stop the node.
2. `--dry-run`: pass 1, then pass 2 into a scratch root named by the operator on the same volume (never under `/tmp`), and the report. The report states, per type, the records read, the records written, the duplicates collapsed, the references rewritten, the references left, the causes dropped, and the heads written.
3. The real run, into the settlement root. Every step is idempotent: `put` of equal JSON writes nothing, heads are rewritten with `expect` unset, the maps are rebuilt.
4. Verify, before anything is deleted:
   - for each type, `each` yields as many records as the report says were written;
   - for each head, `walk` from its frontier reaches as many records as the earlier thread held distinct rows, with `missing` only where the report dropped a cause;
   - a sample of one hundred records per type is read back with `get`, and each hashes to its address.
5. Delete the earlier layout: the kind directories not named in the table, the segments and ledgers and packets of those named, `data/state/log-state/`, `data/state/clock/reservations/` and `data/state/clock/last/`, and the conversion maps. If verification failed nothing is deleted.
6. Start the node on the release that holds the new store only. It refuses a root that still holds `data/state/log-state` or `data/journals`.

The converter's memory is the stream of one segment and the recursion of one thread. Its tables are files, found by the formula, so the conversion of a 5 GB store does not hold 5 GB of anything.

## 8. What is left in the settlement

Under `data/records`: the types of section 5, as `<type>-records/sha-256/<d0 d1>.jsonl`, tracked. Under `data/state`: the heads and state of section 5, as `<object>-state/<name>.json`, tracked. Under `data/logs`: only `claim-session`, `work-outcome`, `service-lifecycle`, `arrival` and `witness-journal` day files, and whatever the node appends after the release. No directory is named for an instance; no file name repeats its kind or its act; no hash is the name of a directory except the formula's own two-character buckets.
