---
title: "Migration map: every call site of the journal store and its new form"
description: "Every call site, in every repository of the workspace, of the semiotic-eavt segment store, the semantic-record journal and computer-system-engine's journal facade, listed as file:line with the form of store.md that replaces it."
date-created: 2026-10-12
type: specification
status: designed; each repository's rows are realized by feltos-node specification section 8 items 1 to 5
owner: semiotic-eavt-services-section
answers:
  - multi-agent-computer-platform-engineering-services-section/content/text/documents/specifications/feltos-node.md (section 8, item 1: consumers moved and the replaced code deleted in the same change)
basis:
  - "store.md (this directory): the operations, layout and deletions this map applies."
  - "feltos-node.md section 8: each item is one repository's change, landed with its consumers moved and the replaced code deleted in the same change."
provenance:
  authors:
    - red-cup-engineer-senior-claude
  office: Red Cup Engineer Senior
  not-the-leaders-words: "An agent's specification derived from the Leader's statements quoted in store.md."
---

# Migration map

## 1. How the sites were found

The importers of `@red-cup-engineering/semiotic-eavt-services-section` and `@red-cup-engineering/computer-system-engine` were read from the importers of the superrepo's `pnpm-lock.yaml` (112 workspace packages). In each outermost package directory, `git grep -n -o` ran from that directory (so inside the submodule where the directory is one: feltos, koios-news, prediction-market, data, and the rest) for every symbol of the current store API:

- the semantic-record journal: `createSemanticRecordJournal`, `createSettlementStore`, `querySettlementRecords`, `querySemanticRecords`, `querySemanticRecordCategories`, `recordSemanticRecord`, `semanticRecordFeed`, `readSemanticRecordsSince`, `journalCursorStart`, `iterateSemanticRecordsThroughDate`, `semanticRecordRevisionThroughDate`, `queryJournalDay`, `createTermIndex`, `createFieldIndex`, and the handle's `.record(`, `.query(`, `.queryCategories(`, `.readSince(`, `.records(` in each file that builds one;
- the EAVT feeds: `appendSeavtEntries`, `readSeavtEntries`, `readSeavtEntriesAtPath`, `iterateSeavtEntriesThroughDate`, `readSeavtEntriesThroughDate`, `admitJsonlOnce`, `readAdmittingJsonl`, `appendDurably`;
- the segment store and witness: `segment*`, `foldSegmentStatements*`, `projectSegmentStatements`, `threadFrontier`, `threadWitnesses`, `journalWitness`, `parseJournalWitness`, `eventForRow`, `rowFromStatement`, `kindFeeds`, `tailKindFeeds`, `withDirectoryLock`;
- the paths: `artifactStoreRoot`, `journalDirectoryOf`, `journalFeedPath`, `undatedJournalFeed`, `journalIndexDirectory`, `settlementRootOf`, `isStoreArea`;
- computer-system-engine's facade: `openJournal`, `FilesystemJournal`, `.appendRows(`, `.appendEvents(`, `.storePacket(`, `.readHead(`, `.readWitness(`, `.readArtifact(`, and `journal.feed|scan|scanFrom|positionBefore|scanAll|scanCausal*|scanTerritory|revision*|listFeeds|dateStatus|discoverRoots|admissionSpan|enclosingRoot|sourceStatus|project*|commitRecord|readState*|mementoStatePath|describe|logArtifact|read*|readPacket`;
- the exchange: `settlementHoldings`, `settlementTransfer`, `mergeSettlementTransfer`.

Excluded: `node_modules`, `dist`, `content`, `data`, `lib/legacy` and `**/historical-*` copies of packages (parked code that is not a workspace member), prose and `package.json`. HTTP `res.writeHead(` hits were removed. A call site is one `file:line` that holds at least one symbol; an import line counts as a site.

The list is the work of the moving changes, and each repository's change re-runs the same `git grep` and ends when it finds none: the receiving check of every row is **zero hits of the symbols above in its repository**. A package that imports the store and is not in the lockfile appears in that run and is moved by the same rule.

## 2. The forms

Every site is one of these. The store functions are those of `store.md` section 3; `type`, `object` and `name` are chosen by the rule after the table.

| form | the current API | becomes |
|---|---|---|
| **S1** | the semantic-record handle: `createSemanticRecordJournal({root, objectKind})`, `createSettlementStore`, `querySettlementRecords`, `querySemanticRecords`, `querySemanticRecordCategories`, `recordSemanticRecord`, `semanticRecordFeed`, and the handle's `.record`, `.query`, `.queryCategories`, `.records` | The construction line is deleted; `root` and `type` go to each call. `.record({category, record, recordedAt, told, relation, causes, origin})` becomes `put(root, type, {...record, causes, told?})` where `told` is a member only when it is not `{for:true, against:false}`, `origin` is the member `by` where the record does not already carry its author, and `recordedAt` is the member `at` where the record does not carry its time. A `relation` is dropped unless a reader reads it; a reader's relation is a field of the record. `.query({category})` becomes `each(root, type)` for a reader of every record of the type, `walk(root, type, readHead(root, type, name).frontier)` for a reader of a thread, or `readLog` for a reader by time. The old query returned `{id, record, causes}`; `each` and `walk` return `{address, record}` and `causes` is in the record. |
| **S2** | the cursor reads: `.readSince`, `readSemanticRecordsSince`, `journalCursorStart`, `iterateSemanticRecordsThroughDate`, `semanticRecordRevisionThroughDate`, `queryJournalDay`, `kindFeeds`, `tailKindFeeds` | `readLog(root, type, date, {from})`. The cursor is the reader's `(date, next)`. A revision is the head's frontier (equal frontiers are equal readings). |
| **S3** | EAVT feed files and side logs: `appendSeavtEntries`, `readSeavtEntries`, `readSeavtEntriesAtPath`, `iterateSeavtEntriesThroughDate`, `readSeavtEntriesThroughDate`, `admitJsonlOnce`, `readAdmittingJsonl`, `appendDurably` | `append(root, type, {at, ...fields})` and `readLog`. A row is written as the plain fields its readers read (`{at, e, a, v}` with `e`, `a`, `v` plain JSON, not SEN terms); a reader that wants terms applies `jsonToTerm` after reading. A side file written by hand beside the store is written with `append` or `put` and deleted. |
| **S4** | the facade's write: `openJournal(root)`, `FilesystemJournal`, `.appendRows(action, rows, {at, subject, caller, eventCauses, rootName})`, `.appendEvents` | For each row, `extend(root, type, subject, {e, a, v, t}, {causes: eventCauses})` where `type` is the plain name of `action` (the feed) and `subject` is the thread. A row that has no thread and no reader by time is `put(root, type, {e, a, v, t})`. |
| **S5** | thread reads: `journal.scanCausalSubject(root, subject, through, init, fold, {withSource})`, `journal.revisionOfSubject`, `journal.readAsOf` | `walk(root, type, readHead(root, type, subject).frontier)` with the fold applied to each record, causes first when the fold needs it (collect, reverse). `withSource` is dropped: a record's source is its address. `revisionOfSubject` is the head's frontier. |
| **S6** | feed reads: `journal.feed`, `.sourceStatus`, `.scan`, `.scanFrom`, `.positionBefore`, `.scanAll`, `.listFeeds`, `.dateStatus`, `.describe`, `.logArtifact`, `.read` | `readLog(root, type, date, {from})`, `logDates(root, type)`; `sourceStatus` is `logDates` containing the date; `positionBefore` is the byte position `next` that a reader keeps or `max(0, size - bytes)` from `fs.statSync` on the log file at the next line start; a feed handle is `(type, date)`. |
| **S7** | territory scans: `journal.scanCausal`, `.scanCausalAll`, `.scanCausalThroughDate`, `.scanCausalTerritory`, `.scanTerritory`, `.revisionThroughDate`, `.discoverRoots`, `.admissionSpan`, `.enclosingRoot` | There is no scan across types and dates in causal order. A reader that folded a territory reads `heads(root, type)` and `walk`s each, or `each(root, type)` for a type, or `readLog` over a date range for a time reader. `discoverRoots` and `enclosingRoot` are path arithmetic on `layout`. `admissionSpan` is deleted. |
| **S8** | reading and writing bytes by address: `journal.readWitness`, `.readArtifact`, `.readPacket`, `.storePacket`, `.readWitness(`, `.readArtifact(` | `get(root, type, address)` for a record; content custody `get`/`putIfAbsent` by `ni:` address for bytes. A witness is a record. |
| **S9** | projections and derived state: `journal.projectState`, `.projectRecord`, `.projectDomainRecord`, `.commitRecord`, `.readState`, `.readStateArtifact`, `.mementoStatePath`, `.projectPath` | The owner of the reading computes it from records and writes it with `writeHead(root, object, name, ...)` when a consumer reads it as state, or `put` when the world remembers it; the store keeps no projection. A projection that only mirrored a feed is deleted. |
| **S10** | stream heads: `.readHead(at, namespace, key)`, `.writeHead` | `readHead(root, object, name)`, `writeHead(root, object, name, head, {expect})`. The date partition and the sha256 file name go: the name is the thread's name. |
| **S11** | settlement exchange: `settlementHoldings`, `settlementTransfer`, `mergeSettlementTransfer` | `pull(root, remote, object, {limit})`; the serving side answers `heads(root, object)` and `get(root, type, address)`. |
| **S12** | paths: `artifactStoreRoot`, `journalDirectoryOf`, `journalFeedPath`, `undatedJournalFeed`, `journalIndexDirectory`, `settlementRootOf`, `settlementRootOfStore`, `isStoreArea` | `layout`: `logFile(root, type, date)`, `logDirectory(root, type)`, `recordDirectory(root, type)`, `bucketFile(root, type, address)`, `stateFile(root, object, name)`, `stateDirectory(root, object)`. `isStoreArea` is deleted (no store area is a sibling of a kind). `journalIndexDirectory` is deleted. |
| **S13** | search structures: `createTermIndex`, `createFieldIndex` | Leave the package. A term index is a derived readout owned by the feature that searches; a field lookup is `readHead(root, object, <field value>)`. |
| **S14** | `withDirectoryLock` | `lock` of the store (the same exclusive-create lock). |
| **D1** | the witness and segment machinery: `journalWitness`, `parseJournalWitness`, `eventForRow`, `rowFromStatement`, `segmentAdmit`, `segmentWitness`, `segmentStatements`, `foldSegmentStatements*`, `projectSegmentStatements`, `segmentState`, `segmentArtifact`, `threadFrontier`, `threadWitnesses`, `recordConfiguredSemanticRecord`, `recordAdmittedSemanticRecord`, `projectSemanticRecords`, `semanticRecordCandidates` | Deleted with the module that holds it. A test that exercised it is deleted; its laws that remain true are re-stated against the store (ST-1 to ST-18). A consumer that constructed a witness to seed a test (feltos `core-laws`, enterprise-host `check-memory-budget`) puts a record. |

**Choosing the type.** The type of a site is the plain name of what the old call recorded. From the old `(objectKind, category)`: drop the namespace (everything up to the last dot) and the version (`.v1`) and the suffix `-record` or `.record` from the kind; where one kind held several categories, the category names the type (`claim`, `move`, `source-evidence`) with the short kind as prefix when the category alone is not a kind of thing; a category that carried an instance (a peer's name, a day) becomes a field. Examples: `forecasting.forecast-record` / `forecasting.forecast` is `forecast`; `forecasting.calibration-record` is `forecast-calibration`; `personal.financial-dispatch` / `dispatch` is `financial-dispatch`; `561-group.kalshi.desk.v1` with categories `decision`, `fill`, `order-intent`, `refusal` is `kalshi-decision`, `kalshi-fill`, `kalshi-order-intent`, `kalshi-refusal`; `red-cup-engineering.news-property-newsroom-day.v1` with `claim`, `source-evidence`, `manuscript-candidate` is `newsroom-claim`, `newsroom-source-evidence`, `newsroom-manuscript-candidate`; `knowing.claims` / `claim` is `claim`; `work-arena-move` / `move` is `work-arena-move`; `enterprise` with `contact`, `order`, ... is `enterprise-contact`, `enterprise-order`, ...; `metroplat.clock.schedule` is `clock-schedule`; `federated-work-admission` with the disposition as category is `federated-work-admission` with a `disposition` field. A site whose old category named an instance (`work-replication`'s `category: peer`) is not a type; section 4 says what it becomes.

**Records or logs.** A site that recorded something the world must remember is a `put`. A site that also has a reader by time adds one `append` of `{at, of, ...}` with the fields that reader reads. A site whose data is read only as a current value is `writeHead`. A site whose written data no call site in this map reads is deleted: the write goes, and its readers with it.

## 3. Counts

A site is one `file:line`. Counts are of the lines in the repository, outside `semiotic-eavt` itself.

| repository or package | sites | in src | in test | files |
|---|---:|---:|---:|---:|
| semiotic-eavt-services-section (itself, section 4) | 126 import lines | | | 38 |
| computer-system-engine | 207 | 112 | 95 | 24 |
| organizing (agent-organization-engine/lib/organizing) | 65 | 32 | 33 | 8 |
| feltos | 248 | 149 | 99 | 41 |
| feltos-enterprise-host | 94 | 48 | 46 | 19 |
| metroplat | 164 | 59 | 105 | 23 |
| kalshi-services-section (with forecasting-service and kalshi-stake-path-service) | 45 | 39 | 6 | 11 |
| emsenn-treasury-services-section | 4 | 4 | 0 | 1 |
| koios-news-services-section (with its nested services) | 100 | 50 | 50 | 22 |
| the other 46 packages, three other agent-organization-engine libraries (animating, communicating, knowing) and the witness-journal services of eavt-services-section | 435 | 377 | 58 | 116 |
| **all outside semiotic-eavt** | **1,362** | **870** | **492** | **265** |

## 4. semiotic-eavt-services-section itself

The package has 74 files (40 in `src`, 30 in `test`, 4 in `scripts`); 38 of them hold 126 import lines of the store's own modules. Their fates:

| files | fate |
|---|---|
| `src/journal/filesystem/segment-store.mjs`, `segment-bytes.mjs`, `events.mjs`, `feed-tail.mjs` | deleted |
| `src/journal/substrate.mjs`, `witness.mjs`, `event.mjs`, `judgment.mjs`, `causal-graph.mjs`, `packet.mjs` | deleted (a causal walk is `walk`) |
| `src/journal/store-root.mjs` | replaced by `src/layout.mjs` (the paths of store.md section 4) |
| `src/journal/filesystem/directory-lock.mjs` | becomes `src/lock.mjs` |
| `src/semantic-record.mjs`, `record-semantic-record.mjs`, `record-configured-semantic-record.mjs`, `admit-semantic-record.mjs`, `query-semantic-records.mjs`, `read-semantic-records-since.mjs`, `iterate-semantic-records.mjs`, `query-journal-day.mjs`, `check-semantic-record-references.mjs`, `check-semantic-record-responses.mjs`, `inventory-semantic-record-retirement.mjs`, `replay-semantic-record-retirement.mjs`, `admit-jsonl-once.mjs`, `term-index.mjs`, `field-index.mjs`, `append-seavt-entries.mjs`, `read-seavt-entries.mjs`, `read-seavt-entries-at-path.mjs`, `command.mjs` | deleted |
| `src/identity/site.mjs`, `identity/primitive-articulation.mjs` | deleted; `identity/index.mjs` re-exports `artifact` and `text-document` only |
| `src/identity/artifact.mjs`, `identity/text-document.mjs`, `admit-seavt-row.mjs`, `normalize-seavt-row.mjs`, `bind-json-template.mjs`, `profile.mjs` | kept |
| new | `src/store.mjs`, `src/layout.mjs`, `src/lock.mjs`, `src/exchange.mjs` |
| `scripts/carry-located-indexes.mjs`, `file-instance-feeds-by-type.mjs`, `file-journal-store-by-kind.mjs`, `unpack-segments.mjs` | deleted (the converter lives on its own branch, store-conversion.md section 1) |
| `test/*.test.mjs` (30) | deleted with their subjects, except `seavt-carriers.test.mjs` and the row cases of `deep-list-admission.test.mjs`, which test kept codecs; new tests for ST-1 to ST-18 |
| `package.json` | `exports` lose every removed module and gain `./store`, `./layout`, `./lock`, `./exchange`; the dependencies on `computer-file-engineering`, `json-schema` and `eavt` shrink to what the kept modules import |

The neighbouring eavt-services-section package changes its stem law with the store (`store.md` section 9): `src/data-artifact-address.mjs`, `src/log-path.mjs`.

## 5. computer-system-engine

`src/journal/` is the other half of the current API: a facade and a store over the same files. It goes with the semiotic-eavt store.

| file | fate |
|---|---|
| `journal/journal.mjs` (`FilesystemJournal`, `openJournal`, `journal`) | deleted; its callers use `store` (rows S4 to S10) |
| `journal/filesystem/write-journal-store.mjs`, `source-owner.mjs`, `migrate.mjs`, `territory-cache.mjs`, `legacy-codec.mjs`, `types.mjs`, `index.mjs` (packet paths and size limits) | deleted |
| `journal/frontier.mjs`, `journal/section.mjs` | deleted; a frontier is a head and a section is a `walk` |
| `journal/exchange.mjs` | replaced by `pull` in semiotic-eavt's `exchange.mjs`; `scripts/system-federate.mjs` calls `pull` |
| `journal/projections.mjs`, `credential-record.mjs`, `raft-record.mjs` | rewritten onto `put`, `writeHead` and `readHead` (S9): credentials and raft records are records, their current standing a head |
| `journal/service-lifecycle/` | rewritten onto `append` of `service-lifecycle` lines |
| `journal/filesystem/heads.mjs` | deleted; heads are `store.readHead` |
| `journal/filesystem/operations/`, `journal/reading/`, `journal/data-artifact-schema.mjs`, `journal/diagnostics.mjs`, `journal/projection-profile.mjs` | rebased on `layout` where they compute paths; those that only describe schema stay |
| `rpc/arrival-store.mjs`, `rpc/actor-processing.mjs`, `rpc/capability-assertions.mjs`, `rpc/contract-evidence.mjs`, `rpc/journal-witness.mjs` | rewritten onto `put`, `extend`, `append` as the rows below say; `journal-witness.mjs` (a witness of every RPC call) writes a log line only for the operations a console reads, and nothing for a call no consumer reads |
| tests (`journal-*.test.mjs`, `node-peering`, `settlement-pull`, `rpc-capability-assertions`) | deleted with their subjects or rewritten against `store` and `pull` |

## 6. Types and threads for the named repositories

The rows below name the thread and the type for the sites of the repositories the work names. The file lists in section 7 give each site's line.

**organizing** (`lib/organizing`). `enterprise/store.mjs`: `enterprise-<category>` records (S1). `enterprise/outcomes.mjs`: `work-arena-move` records with a head per arena thread, `work-outcome` records with a `work-outcome` log line `{at, of, verdict}` for reads by period (S1, S2); the standing index `writeStandingIndex` is deleted. `work/recurring.mjs`: `clock-schedule` records with a head per schedule, and `schedule-run-state` for the last run; the occurrence and outcome journal (`metroplat.clock`) is deleted, and the heartbeat and `run-due` read the schedule and the run state (feltos-node item 5). `work/service-line.mjs`: records `autonomy-incident`, `human-boundary`, `pipeline-event`, `repair-request`. `agency/source-provenance.mjs`: record `agency-source-projection`.

**feltos.** Most of its writes go to one feed, `claim-session` (`claimSessionFeed.name`), with the thread chosen by `subject`: `structured-work-intent-<slug>` (`work/structured-intent.mjs`), the allocation, assignment, execution, discharge, result-proposal and provider-delegation-authority subjects (`work/agency-work-*.mjs`, `work/work-discharge.mjs`, `work/work-result-proposal.mjs`, `work/provider-delegation-authority.mjs`), `claude-session-<id>` (`agents/sessions/claude-code`), the codex session (`agents/sessions/codex`), the worker's encounter claims (`agents/worker.mjs`) and the claims service (`claims/service.mjs`). The type is `claim-session` and the thread is the subject: S4 becomes `extend(root, "claim-session", subject, row, {causes})`, S5 becomes `walk` from `readHead(root, "claim-session", subject)`. The feeds other than `claim-session` are their own types: `hook-event` (a log, read by the fleet service by time: S6), `encounter` (`encounter/store.mjs`: `encounter-result` records with a head per run, S4, S10), `agent-session-token-usage` (`agents/sessions/token-usage`: the `session-token-usage-state` head per session, S4, S6, S9), and the feed named by `work/service.mjs` (S6, S7). `work/work-board.mjs`: `work-arena-move` (S1), the thread's head the arena thread's. `work/dispatch-readout.mjs`, `work/allocation-control.mjs`, `work/work-acceptance-readout.mjs`, `work/enterprise-loop.mjs`: S5, S2 (`claim-session` log lines by date). `agents/context.mjs`, `agents/feed-readout.mjs`: S4, S6, S9. `content-mill/newsroom*`: `newsroom-<category>` records (S1). `work/sign-roadmap-journal.mjs`: `sign-roadmap` log lines (S3). `lean/*`: S9.

**feltos-enterprise-host.** `held-delivery.mjs`: `held-peer-delivery` records, with the delivery cursor a head `held-delivery-state/<peer digest>.json` and the held page a `readLog` of the type's log (S1, S2); `kindFeeds` and the store-root paths are deleted. `federated-work.mjs`: `federated-work-admission` and `work-arena-move` records (S1). `work-replication.mjs`: `work-arena-move` read by `each`; the delivered-set (`category: <peer>` records and the earlier `work-peer-shipped.jsonl`) is deleted, and peers converge by `pull`; the pull cursor is a head `work-pull-state/<peer digest>.json`. `peer-liveness.mjs`: `peer-liveness` records carrying `told` and a head per peer. `receiver-independence.mjs`, `conurbation-readout.mjs`: S6, S7. `serve-instance.mjs`: S11, serving `heads` and `get` over HTTP. `scripts/check-memory-budget.mjs`: seeds `put`s instead of witnesses.

**metroplat.** `offices.mjs`: the incumbency claims are `office-incumbency` records in a thread per `office:<office>:recognition:<actor>` (S4, S5); the rules journal (`metroplat.rules`, category `rule`, whose `told` marks a retired rule) is `rule` records with `told` and a head `rule-state/<rule id>.json`, read by `heads` (S1); the character inbox (`admitCharacterInboxMessage`) is `character-inbox-message` records in a thread per character (S4, S5). `world-tellings.mjs`, `metroplex-tellings.mjs`: read `work-arena-move` by `each` or by `pull`'s fresh addresses; the in-memory set of moves already told is deleted, and what has been told to a peer is the peer's head (S1, S11). `arrival-processing.mjs`: `arrival` records and `arrival` log lines, the body bytes in custody (S4, S6, S8). `bodies.mjs`: `body-mail` records (S4, S5). `world-pulse.mjs`, `metroplex-pulse.mjs`: `readLog` from a held position (S6). `resources/read-write-verbs.mjs`: S9 and S4. `http/ws-session.mjs`, `sites/hole/record.mjs`: S4. `scripts/metroplat-serve.mjs`: S11 and S9. Tests move with their subjects.

**kalshi.** `services/kalshi-stake-path-service`: `one-log.mjs` becomes `put` of `kalshi-decision`, `kalshi-fill`, `kalshi-order-intent`, `kalshi-order-acknowledged`, `kalshi-refusal`, `kalshi-game-shadow` records, with `causes` for a fill citing its order intent, and `queryJournalDay` becomes `readLog` of a `kalshi-desk` log; `desk-layout.mjs` uses `layout.logFile`. `services/forecasting-service`: `forecast`, `forecast-calibration`, `forecasting-cycle` records. `src/seavt-log.mjs`, `scripts/kalshi-sources.mjs`: `append` of `kalshi-source` lines (S3, S12). `src/market-facts.mjs`: `put` of `kalshi-market-fact` records and `writeHead` of the market's current reading (S4, S9).

**treasury** (`emsenn-treasury-services-section`). `src/financial-dispatch.mjs`: `financial-dispatch` records (S1).

**koios** (`koios-news-services-section`). `src/news-line/*`, `src/claim-cells.mjs`, `src/boundary.mjs`, `src/market-research*.mjs`: `newsroom-<category>` and `koios-record` records (S1); `services/*/record-journal.mjs` and the contract files: `createSettlementStore` becomes `put` of `editorial-assessment`, `web-source`, `web-source-discovery`, `koios-launch-state`, `inbox-arrival` records; the tests that `querySettlementRecords` become `each`.

**The other packages.** Each is S1 with the type named by the rule of section 2 (`alpaca-services-section`, `stripe`, `tips`, `x402`, `forecasting`, `hive-*`, `key-management`, `corpus-management`, `web-advertising`, `crowdfunding`, `turntide-islands-discord-platform`, `ruinfold.play.561.group`, `group-operations`, the `apps/assist`, `knowledge-system-server`'s review and revision journals, `computer-inference-engine`'s purchase, settlement and ledger journals, `computer-web-server`'s discord store, ...), except: `admitJsonlOnce` / `readAdmittingJsonl` (`computer-inference-engine/src/dispatch/expected-resolution-pricing.mjs`, `google-flow-services-section/src/flow-credits.mjs`, `capability-pricing-service/src/observation-journal.mjs`) are S3: the source JSONL is a log, written with `append` and read with `readLog`; `createTermIndex` / `createFieldIndex` (`markdown-engineering-services-section/src/vault/full-text-index.mjs`, `knowledge-system-server/src/search/revision-journal.mjs`, `computer-web-server/src/admission/discord-store.mjs`) are S13: the discord store's lookup is a head named by the looked-up value, held under the exclusive lock the store already takes; `agent-harness`'s `scripts/fold-harness-*.mjs` read logs (S3); `agent-harness/src/hooks/*` use heads (S10) and S4; `computer-code-development-engine`'s monitoring and knowledge journals are S4, S5 and S7 (the territory scans become `heads` and `walk`).

## 7. The sites

Each row is a file and, by form, the lines and the symbol on each. The replacement of a line is its form in section 2. Packages are grouped as in section 3.

### computer-system-engine

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/apps/computer-system-engine`

- `scripts/system-federate.mjs` — S11: 20 mergeSettlementTransfer, 20 settlementHoldings, 20 settlementTransfer, 43 settlementTransfer, 62 settlementHoldings, 66 mergeSettlementTransfer
- `src/journal/credential-record.mjs` — S9: 20 projectDomainRecord
- `src/journal/exchange.mjs` — S11: 43 settlementHoldings, 54 settlementTransfer, 76 mergeSettlementTransfer · S12: 16 isStoreArea, 29 isStoreArea
- `src/journal/filesystem/heads.mjs` — S12: 8 journalDirectoryOf, 8 journalIndexDirectory, 12 journalIndexDirectory, 12 journalDirectoryOf
- `src/journal/filesystem/migrate.mjs` — D1: 16 journalWitness, 132 journalWitness · S12: 17 journalDirectoryOf, 76 journalDirectoryOf
- `src/journal/filesystem/source-owner.mjs` — D1: 22 parseJournalWitness, 761 parseJournalWitness, 867 parseJournalWitness, 1405 parseJournalWitness · S12: 26 journalDirectoryOf, 877 journalDirectoryOf
- `src/journal/filesystem/write-journal-store.mjs` — D1: 32 journalWitness, 32 parseJournalWitness, 97 eventForRow, 108 rowFromStatement, 118 segmentAdmit, 120 segmentArtifact, 121 segmentWitness, 123 segmentStatements, 124 foldSegmentStatements, 125 foldSegmentStatementsFrom, 126 projectSegmentStatements, 322 segmentArtifact, 373 parseJournalWitness, 464 segmentWitness, 484 segmentStatements, 500 projectSegmentStatements, 537 segmentAdmit, 543 journalWitness, 570 eventForRow, 591 foldSegmentStatements, 592 rowFromStatement, 995 rowFromStatement, 1165 foldSegmentStatementsFrom, 1166 rowFromStatement · S12: 61 artifactStoreRoot, 61 isStoreArea, 61 journalDirectoryOf, 61 undatedJournalFeed, 184 artifactStoreRoot, 211 artifactStoreRoot, 222 artifactStoreRoot, 663 isStoreArea, 676 journalDirectoryOf, 685 isStoreArea, 713 journalDirectoryOf, 714 undatedJournalFeed, 825 isStoreArea, 839 journalDirectoryOf, 858 journalDirectoryOf, 866 journalDirectoryOf, 931 undatedJournalFeed, 938 journalDirectoryOf, 958 journalDirectoryOf, 1304 artifactStoreRoot
- `src/journal/journal.mjs` — S12: 48 artifactStoreRoot, 48 journalDirectoryOf, 48 settlementRootOf, 48 undatedJournalFeed, 130 undatedJournalFeed, 135 undatedJournalFeed, 181 journalDirectoryOf, 488 settlementRootOf, 509 artifactStoreRoot · S4: 96 FilesystemJournal, 198 openJournal, 199 FilesystemJournal, 209 openJournal, 212 openJournal · S8: 209 .readWitness, 212 .readArtifact
- `src/journal/projections.mjs` — S6: 23 scan, 33 scan, 57 describe, 58 logArtifact, 64 scan, 70 scan · S9: 61 mementoStatePath, 75 mementoStatePath, 95 projectDomainRecord
- `src/journal/raft-record.mjs` — S9: 21 projectDomainRecord
- `src/journal/section.mjs` — S6: 8 read
- `src/journal/service-lifecycle/index.mjs` — S4: 8 openJournal, 15 openJournal, 15 .appendRows, 34 openJournal, 34 .appendRows
- `src/rpc/actor-processing.mjs` — S4: 9 openJournal, 194 openJournal, 194 .appendRows · S6: 90 feed, 95 sourceStatus, 97 scan
- `src/rpc/arrival-store.mjs` — S4: 9 openJournal, 264 openJournal, 268 .appendRows · S6: 217 scan, 282 describe, 284 scan, 308 feed · S8: 26 .storePacket, 156 readPacket · S9: 314 projectPath
- `src/rpc/capability-assertions.mjs` — S4: 8 openJournal, 37 openJournal, 37 .appendRows · S5: 55 scanCausalSubject
- `src/rpc/contract-evidence.mjs` — S4: 3 openJournal, 18 openJournal, 18 .appendRows · S5: 37 scanCausalSubject
- `src/rpc/journal-witness.mjs` — S4: 5 openJournal, 45 openJournal, 67 .appendRows · S6: 17 feed
- `test/journal-append-identity-harness.mjs` — S4: 26 openJournal, 42 openJournal, 47 .appendRows, 52 .appendRows, 55 .appendRows, 97 openJournal, 100 .appendRows · S6: 68 feed, 69 read, 70 scan, 102 feed, 104 scan, 107 scan, 124 feed, 126 scan · S7: 71 scanCausal, 79 scanCausalTerritory
- `test/journal-filesystem-pure-laws.test.mjs` — D1: 12 eventForRow, 12 rowFromStatement, 27 eventForRow, 27 rowFromStatement, 29 eventForRow, 31 rowFromStatement, 34 eventForRow, 36 eventForRow, 37 eventForRow, 42 rowFromStatement, 44 rowFromStatement, 48 eventForRow, 52 rowFromStatement, 52 eventForRow
- `test/journal-territory-cache.test.mjs` — S4: 8 openJournal, 37 openJournal, 37 .appendRows, 55 openJournal, 55 .appendRows, 77 openJournal, 77 .appendRows, 96 openJournal, 96 .appendRows, 100 openJournal, 100 .appendRows, 141 openJournal, 141 .appendRows, 142 openJournal, 142 .appendRows, 157 openJournal, 157 .appendRows, 179 openJournal, 179 .appendRows, 197 openJournal, 197 .appendRows, 215 openJournal, 215 .appendRows, 219 openJournal, 219 .appendRows, 251 openJournal, 251 .appendRows, 266 openJournal, 267 openJournal, 267 .appendRows, 288 openJournal, 289 openJournal, 289 .appendRows · S5: 42 scanCausalSubject · S7: 60 scanCausalTerritory, 68 scanCausalTerritory, 81 scanCausalTerritory, 105 scanTerritory, 109 scanTerritory, 118 scanTerritory, 149 scanCausalTerritory, 162 scanCausalTerritory, 184 scanCausalAll, 190 scanCausalAll, 201 scanCausalAll, 224 scanCausalAll, 228 scanCausalAll, 235 scanCausalAll, 259 scanCausalTerritory, 276 scanCausalTerritory, 298 scanCausalTerritory
- `test/journal-verified-content.test.mjs` — D1: 8 eventForRow, 15 eventForRow, 40 eventForRow, 62 eventForRow · S12: 10 journalFeedPath, 14 journalFeedPath · S4: 7 openJournal, 17 openJournal, 17 .appendEvents, 33 openJournal, 41 .appendEvents · S7: 37 scanCausalTerritory, 38 scanTerritory, 46 scanCausalTerritory, 54 scanCausalAll, 61 scanCausalTerritory, 64 scanCausalTerritory, 70 scanCausalTerritory, 72 scanCausalTerritory
- `test/node-peering.test.mjs` — S4: 7 openJournal, 106 openJournal, 107 openJournal · S6: 106 feed, 107 feed
- `test/rpc-capability-assertions.test.mjs` — S12: 10 journalDirectoryOf, 25 journalDirectoryOf · S4: 11 openJournal, 172 openJournal, 172 .appendRows, 217 openJournal, 217 .appendRows
- `test/settlement-pull.test.mjs` — S11: 7 settlementHoldings, 7 settlementTransfer, 7 mergeSettlementTransfer, 38 settlementHoldings, 39 mergeSettlementTransfer, 40 settlementTransfer, 65 settlementHoldings

### organizing (agent-organization-engine/lib/organizing)

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/apps/agent-organization-engine/lib/organizing`

- `src/agency/source-provenance.mjs` — S1: 13 createSemanticRecordJournal, 229 createSemanticRecordJournal, 239 .record, 242 .query, 254 .query
- `src/enterprise/outcomes.mjs` — S1: 36 createSemanticRecordJournal, 200 createSemanticRecordJournal, 219 createSemanticRecordJournal, 200 .query, 223 .queryCategories, 242 .record
- `src/enterprise/store.mjs` — S1: 10 createSemanticRecordJournal, 17 createSemanticRecordJournal, 41 .record, 48 .query, 57 .queryCategories
- `src/work/recurring.mjs` — S1: 54 createSemanticRecordJournal, 69 createSemanticRecordJournal, 72 createSemanticRecordJournal, 308 .query, 401 .record, 494 .record, 500 .record, 522 .record
- `src/work/service-line.mjs` — S1: 29 createSemanticRecordJournal, 71 createSemanticRecordJournal, 135 createSemanticRecordJournal, 72 .query, 77 .record, 85 .record, 86 .record, 138 .query, 208 .record
- `test/agency/source-provenance.test.mjs` — S1: 11 createSemanticRecordJournal, 93 createSemanticRecordJournal, 113 createSemanticRecordJournal, 105 .record, 115 .query, 131 .query, 134 .query, 147 .query, 160 .query, 172 .query, 180 .query, 190 .query, 197 .query, 198 .record, 211 .query, 216 .query, 226 .query, 238 .query, 250 .query, 257 .query, 272 .query, 282 .query, 331 .query, 358 .query
- `test/enterprise/native-work-outcome.test.mjs` — S6: 162 read
- `test/work-arena-opening-source.test.mjs` — S1: 6 createSemanticRecordJournal, 15 createSemanticRecordJournal, 20 createSemanticRecordJournal, 92 createSemanticRecordJournal, 17 .record, 18 .query, 21 .record, 92 .query, 93 .query

### agent-organization-engine/lib/animating

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/apps/agent-organization-engine/lib/animating`

- `src/becoming/doing/working/software-change/mission/program.mjs` — S1: 9 createSemanticRecordJournal, 455 createSemanticRecordJournal, 456 .record
- `src/becoming/doing/working/software-change/mission/trajectory-memory.mjs` — S1: 3 createSemanticRecordJournal, 37 createSemanticRecordJournal, 272 createSemanticRecordJournal, 37 .query, 272 .record

### agent-organization-engine/lib/communicating

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/apps/agent-organization-engine/lib/communicating`

- `src/language/catalog-operations.mjs` — S4: 12 openJournal, 108 openJournal, 108 .appendRows · S7: 129 scanTerritory · S8: 61 readArtifact, 62 readArtifact

### agent-organization-engine/lib/knowing

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/apps/agent-organization-engine/lib/knowing`

- `src/claims.mjs` — S1: 5 createSemanticRecordJournal, 18 createSemanticRecordJournal, 21 .query, 51 .record

### feltos

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/services/multi-agent-computer-system-engineering-services-section/services/multi-agent-computer-platform-engineering-services-section/apps/feltos`

- `scripts/assay-native-outcome-boundary.mjs` — S4: 17 openJournal
- `src/agents/context.mjs` — S6: 86 scan, 153 feed, 158 sourceStatus, 160 scan, 188 scan, 213 feed, 214 sourceStatus · S9: 92 commitRecord, 178 projectPath
- `src/agents/feed-readout.mjs` — S4: 6 openJournal, 94 openJournal, 94 .appendRows · S6: 34 listFeeds, 46 sourceStatus, 69 feed, 70 sourceStatus, 104 dateStatus, 108 listFeeds, 126 sourceStatus, 132 scan · S9: 71 readState, 142 projectPath, 158 projectRecord, 173 projectPath
- `src/agents/sessions/claude-code/fleet/service.mjs` — S4: 38 openJournal, 379 openJournal, 379 .appendRows · S6: 61 feed, 62 sourceStatus, 106 sourceStatus, 107 scan, 120 feed, 126 listFeeds, 153 sourceStatus, 155 scan, 204 sourceStatus · S9: 63 projectState
- `src/agents/sessions/claude-code/service.mjs` — S4: 44 openJournal, 260 openJournal, 260 .appendRows
- `src/agents/sessions/codex/service.mjs` — S4: 50 openJournal, 497 openJournal, 497 .appendRows
- `src/agents/sessions/token-usage/service.mjs` — S4: 7 openJournal, 178 openJournal, 178 .appendRows · S6: 139 sourceStatus, 194 feed, 195 sourceStatus, 202 scan
- `src/agents/worker.mjs` — S4: 40 openJournal, 258 openJournal, 258 .appendRows · S7: 86 scanCausalThroughDate
- `src/claims/service.mjs` — S4: 7 openJournal, 17 openJournal, 17 .appendRows
- `src/content-mill/newsroom.mjs` — S1: 8 createSemanticRecordJournal, 78 createSemanticRecordJournal, 96 createSemanticRecordJournal, 111 .query, 247 .query
- `src/content-mill/newsroom/evidence.mjs` — S1: 2 createSemanticRecordJournal, 72 createSemanticRecordJournal, 15 .query
- `src/content-mill/newsroom/manuscript.mjs` — S1: 4 createSemanticRecordJournal, 213 createSemanticRecordJournal, 418 createSemanticRecordJournal, 39 .query, 61 .record, 83 .query, 239 .query, 242 .query, 243 .query, 246 .query, 263 .record, 371 .record, 484 .record
- `src/content-mill/newsroom/settlement.mjs` — S1: 17 createSemanticRecordJournal, 39 createSemanticRecordJournal, 59 createSemanticRecordJournal, 128 createSemanticRecordJournal, 26 .record, 45 .record, 65 .record, 173 .record
- `src/encounter/store.mjs` — S10: 18 .readHead · S4: 5 openJournal, 18 openJournal, 170 openJournal, 187 .appendRows · S6: 20 feed · S8: 124 readArtifact
- `src/work/agency-work-allocation.mjs` — S4: 7 openJournal, 212 openJournal, 212 .appendRows · S5: 34 scanCausalSubject, 200 scanCausalSubject
- `src/work/agency-work-assignment.mjs` — S4: 3 openJournal, 55 openJournal, 55 .appendRows · S5: 32 scanCausalSubject
- `src/work/agency-work-execution.mjs` — S4: 3 openJournal, 29 openJournal, 29 .appendRows
- `src/work/allocation-control.mjs` — S5: 224 scanCausalSubject
- `src/work/dispatch-readout.mjs` — S7: 181 revisionThroughDate, 188 scanCausalThroughDate
- `src/work/enterprise-loop.mjs` — S5: 64 scanCausalSubject, 81 scanCausalSubject, 125 scanCausalSubject
- `src/work/provider-delegation-authority.mjs` — S4: 9 openJournal, 155 openJournal, 155 .appendRows · S8: 162 readWitness
- `src/work/service.mjs` — S4: 11 openJournal · S5: 338 scanCausalSubject · S6: 108 feed, 118 sourceStatus, 164 listFeeds, 179 scan, 311 sourceStatus, 355 listFeeds · S7: 120 scanCausal, 314 scanCausal, 333 scanCausalAll, 361 scanCausalAll
- `src/work/sign-roadmap-journal.mjs` — S3: 12 appendSeavtEntries, 13 iterateSeavtEntriesThroughDate, 56 iterateSeavtEntriesThroughDate, 157 appendSeavtEntries, 203 appendSeavtEntries
- `src/work/structured-intent.mjs` — S4: 4 openJournal, 139 openJournal, 193 .appendRows, 285 openJournal, 285 .appendRows · S5: 144 scanCausalSubject, 163 scanCausalSubject, 226 scanCausalSubject, 253 scanCausalSubject
- `src/work/work-acceptance-readout.mjs` — S5: 74 scanCausalSubject · S7: 73 scanCausalThroughDate · S8: 51 readWitness
- `src/work/work-board.mjs` — S1: 14 createSemanticRecordJournal, 45 createSemanticRecordJournal, 46 .query, 106 .record
- `src/work/work-discharge.mjs` — S4: 5 openJournal, 138 openJournal, 138 .appendRows · S5: 198 scanCausalSubject
- `src/work/work-result-proposal.mjs` — S4: 3 openJournal, 194 openJournal, 194 .appendRows · S5: 89 scanCausalSubject, 102 scanCausalSubject, 127 scanCausalSubject, 212 scanCausalSubject
- `test/agency-work-pump.test.mjs` — S5: 204 scanCausalSubject, 715 scanCausalSubject, 720 scanCausalSubject, 756 scanCausalSubject, 835 scanCausalSubject · S6: 497 listFeeds, 501 listFeeds
- `test/content-mill-manuscript.test.mjs` — S1: 6 createSemanticRecordJournal, 21 createSemanticRecordJournal, 72 createSemanticRecordJournal, 106 createSemanticRecordJournal, 126 createSemanticRecordJournal, 158 createSemanticRecordJournal, 29 .query, 31 .query, 34 .query, 39 .query, 41 .query, 44 .query, 96 .query, 118 .query, 119 .query, 140 .query, 141 .record
- `test/content-mill-newsroom.test.mjs` — S1: 26 createSemanticRecordJournal, 169 createSemanticRecordJournal, 214 createSemanticRecordJournal, 644 createSemanticRecordJournal, 170 .query, 171 .query, 176 .query, 215 .query, 644 .query
- `test/core-laws.test.mjs` — D1: 30 journalWitness, 30 parseJournalWitness, 47 journalWitness, 51 parseJournalWitness, 68 journalWitness, 69 journalWitness, 71 journalWitness, 72 journalWitness, 88 journalWitness, 89 journalWitness
- `test/held-work-intake.test.mjs` — S5: 80 revisionOfSubject, 81 revisionOfSubject, 127 revisionOfSubject, 128 revisionOfSubject, 157 revisionOfSubject, 187 revisionOfSubject
- `test/inference-streaming.test.mjs` — S4: 16 openJournal, 148 openJournal, 299 openJournal, 305 openJournal · S6: 147 feed, 298 feed, 304 feed
- `test/sign-roadmap-journal-source.test.mjs` — S3: 12 readSeavtEntries, 13 appendSeavtEntries, 51 readSeavtEntries, 62 appendSeavtEntries, 68 appendSeavtEntries, 77 appendSeavtEntries, 105 appendSeavtEntries, 106 readSeavtEntries, 115 readSeavtEntries, 117 readSeavtEntries, 125 appendSeavtEntries
- `test/sign-roadmap.test.mjs` — S3: 13 readSeavtEntries, 92 readSeavtEntries
- `test/support/mash-seed-member.mjs` — S3: 4 appendSeavtEntries, 25 appendSeavtEntries
- `test/term-catalog.test.mjs` — S8: 68 readArtifact
- `test/work-board-provenance.test.mjs` — S1: 13 createSemanticRecordJournal, 91 createSemanticRecordJournal, 106 createSemanticRecordJournal, 151 createSemanticRecordJournal, 236 createSemanticRecordJournal, 262 createSemanticRecordJournal, 278 createSemanticRecordJournal, 91 .query, 107 .record, 152 .record, 168 .query, 195 .query, 237 .record, 263 .record, 264 .query, 270 .query, 279 .record, 281 .record, 291 .query · S5: 47 scanCausalSubject
- `test/work-result-source-owner.test.mjs` — S4: 8 openJournal, 263 openJournal, 263 .appendRows, 284 openJournal, 284 .appendRows · S5: 83 scanCausalSubject, 184 revisionOfSubject, 189 scanCausalSubject, 204 revisionOfSubject, 239 scanCausalSubject, 267 revisionOfSubject, 274 revisionOfSubject

### feltos-enterprise-host

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/services/multi-agent-computer-system-engineering-services-section/services/multi-agent-computer-platform-engineering-services-section/apps/feltos-enterprise-host`

- `scripts/check-activitypub-node.mjs` — S5: 99 scanCausalSubject, 135 scanCausalSubject, 136 scanCausalSubject
- `scripts/check-memory-budget.mjs` — D1: 28 journalWitness, 62 journalWitness
- `src/conurbation-readout.mjs` — S7: 8 discoverRoots, 9 admissionSpan
- `src/federated-work.mjs` — S1: 6 createSemanticRecordJournal, 79 createSemanticRecordJournal, 383 createSemanticRecordJournal, 80 .record, 387 .record
- `src/held-delivery.mjs` — D1: 4 parseJournalWitness, 123 parseJournalWitness · S1: 1 createSemanticRecordJournal, 28 createSemanticRecordJournal, 60 createSemanticRecordJournal, 34 .query, 51 .record, 71 .query, 97 .query, 98 .record · S12: 5 journalDirectoryOf, 115 journalDirectoryOf · S2: 2 journalCursorStart, 6 kindFeeds, 66 journalCursorStart, 116 kindFeeds, 131 journalCursorStart
- `src/peer-liveness.mjs` — S1: 109 createSemanticRecordJournal, 110 .query, 116 .record
- `src/receiver-independence.mjs` — S6: 121 read
- `src/serve-instance.mjs` — S11: 31 mergeSettlementTransfer, 31 settlementHoldings, 31 settlementTransfer, 597 settlementHoldings, 598 mergeSettlementTransfer, 599 settlementTransfer
- `src/work-replication.mjs` — S1: 27 createSemanticRecordJournal, 180 createSemanticRecordJournal, 186 createSemanticRecordJournal, 198 createSemanticRecordJournal, 265 createSemanticRecordJournal, 283 createSemanticRecordJournal, 290 createSemanticRecordJournal, 42 .query, 181 .query, 187 .record, 285 .query, 290 .record
- `test/held-delivery-journal.test.mjs` — S1: 5 createSemanticRecordJournal, 187 createSemanticRecordJournal, 191 .record
- `test/native-received-outcome.test.mjs` — S4: 7 openJournal, 120 openJournal, 120 .appendRows · S5: 240 revisionOfSubject, 254 revisionOfSubject, 269 revisionOfSubject, 277 revisionOfSubject, 292 revisionOfSubject, 297 revisionOfSubject, 383 revisionOfSubject, 390 revisionOfSubject
- `test/peer-liveness.test.mjs` — S1: 6 createSemanticRecordJournal, 21 createSemanticRecordJournal, 32 .query
- `test/receiver-independence.test.mjs` — S1: 11 createSemanticRecordJournal, 122 createSemanticRecordJournal, 122 .query, 129 .record · S6: 130 read
- `test/resident-reconciliation.test.mjs` — S1: 14 createSemanticRecordJournal, 62 createSemanticRecordJournal, 64 .record
- `test/work-homes-per-store.test.mjs` — S1: 6 createSemanticRecordJournal, 19 createSemanticRecordJournal, 20 .record
- `test/work-open-provenance.test.mjs` — S1: 10 createSemanticRecordJournal, 77 createSemanticRecordJournal, 95 createSemanticRecordJournal, 144 createSemanticRecordJournal, 158 createSemanticRecordJournal, 165 createSemanticRecordJournal, 77 .query, 95 .query, 145 .query, 159 .query, 164 .query, 166 .query
- `test/work-outcome-optional-coordinate.test.mjs` — S6: 92 read, 101 read
- `test/work-peer-standing.test.mjs` — S1: 10 createSemanticRecordJournal, 41 createSemanticRecordJournal, 41 .query
- `test/work-replication.test.mjs` — S1: 6 createSemanticRecordJournal, 16 createSemanticRecordJournal, 151 createSemanticRecordJournal, 210 createSemanticRecordJournal, 18 .record, 151 .query, 211 .query

### metroplat

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/services/multi-agent-computer-system-engineering-services-section/services/multi-agent-computer-platform-engineering-services-section/services/agentic-enterprise-computer-platform-engineering-services-section/apps/metroplat`

- `.probe-rpc.mjs` — S6: 3 feed, 7 scanFrom, 9 scanFrom
- `scripts/metroplat-serve.mjs` — S11: 45 mergeSettlementTransfer, 45 settlementHoldings, 45 settlementTransfer, 232 settlementHoldings, 233 mergeSettlementTransfer, 234 settlementTransfer
- `scripts/record-cold-red-gate-metroplat-deployment.mjs` — S1: 2 createSemanticRecordJournal, 18 createSemanticRecordJournal, 18 .record
- `src/arrival-processing.mjs` — S4: 11 openJournal, 197 openJournal, 197 .appendRows · S6: 36 describe, 37 feed, 42 scan
- `src/bodies.mjs` — S4: 13 openJournal, 52 openJournal, 52 .appendRows · S5: 36 scanCausalSubject · S6: 81 feed, 82 sourceStatus, 83 scan
- `src/http/ws-session.mjs` — S4: 18 openJournal, 30 openJournal, 30 .appendRows
- `src/metroplex-pulse.mjs` — S6: 197 feed, 199 positionBefore, 200 scanFrom
- `src/metroplex-tellings.mjs` — S1: 24 createSemanticRecordJournal, 251 createSemanticRecordJournal, 260 .query
- `src/offices.mjs` — S1: 49 createSemanticRecordJournal, 612 createSemanticRecordJournal, 617 .query, 1132 .record · S4: 31 openJournal, 129 openJournal, 129 .appendRows, 853 openJournal, 853 .appendRows, 877 openJournal, 877 .appendRows · S5: 139 revisionOfSubject, 149 scanCausalSubject, 191 revisionOfSubject, 196 scanCausalSubject, 860 scanCausalSubject
- `src/resources/read-write-verbs.mjs` — S4: 66 openJournal, 624 openJournal, 624 .appendRows · S6: 121 sourceStatus · S7: 475 enclosingRoot · S9: 116 projectRecord, 128 projectState
- `src/sites/hole/record.mjs` — S4: 6 openJournal, 16 openJournal, 25 openJournal, 25 .appendRows
- `src/world-pulse.mjs` — S6: 197 feed, 199 positionBefore, 200 scanFrom
- `src/world-tellings.mjs` — S1: 24 createSemanticRecordJournal, 271 createSemanticRecordJournal, 280 .query
- `test/agency-work-allocation.test.mjs` — S4: 11 openJournal, 189 openJournal, 192 openJournal, 307 openJournal, 309 openJournal, 332 openJournal, 332 .appendRows, 364 openJournal, 364 .appendRows, 431 openJournal, 431 .appendRows · S5: 276 scanCausalSubject · S6: 188 feed, 306 feed
- `test/agent-worker-encounter.test.mjs` — S4: 19 openJournal, 93 openJournal, 93 .appendRows, 166 openJournal, 166 .appendRows, 215 openJournal, 215 .appendRows, 387 openJournal, 407 openJournal · S6: 387 feed, 406 feed
- `test/app-smoke.test.mjs` — S7: 182 scanTerritory, 244 scanTerritory
- `test/arrival-admission-cli.test.mjs` — S4: 8 openJournal, 54 openJournal, 73 openJournal, 91 openJournal, 115 openJournal · S6: 17 feed
- `test/bodies.test.mjs` — S4: 9 openJournal, 69 openJournal, 70 .appendRows, 90 openJournal, 91 .appendRows
- `test/journal-filesystem.test.mjs` — D1: 11 journalWitness, 30 journalWitness, 300 journalWitness, 341 parseJournalWitness, 342 parseJournalWitness, 374 journalWitness, 377 journalWitness · S12: 17 artifactStoreRoot, 18 journalDirectoryOf, 19 journalFeedPath, 20 journalIndexDirectory, 23 settlementRootOf, 45 journalDirectoryOf, 49 journalFeedPath, 50 settlementRootOf, 51 artifactStoreRoot, 51 journalDirectoryOf, 55 artifactStoreRoot, 56 settlementRootOf, 64 artifactStoreRoot, 64 settlementRootOf, 67 artifactStoreRoot, 294 artifactStoreRoot, 322 journalIndexDirectory, 322 artifactStoreRoot · S4: 12 openJournal, 76 openJournal, 77 .appendEvents, 78 .appendEvents, 96 openJournal, 97 .appendRows, 101 .appendRows, 248 openJournal, 249 .appendRows, 270 openJournal, 274 .appendEvents, 278 .appendEvents, 290 openJournal, 291 .appendEvents, 299 .appendEvents, 309 .appendEvents, 320 openJournal, 320 .appendEvents, 326 openJournal, 327 openJournal, 327 .appendEvents, 341 openJournal, 343 openJournal, 343 .appendEvents, 363 openJournal, 364 openJournal, 374 openJournal, 385 openJournal, 385 .appendEvents, 405 openJournal · S5: 85 readAsOf · S6: 80 read, 106 scanAll, 255 read, 276 read, 279 read, 280 read · S8: 259 readArtifact
- `test/monitoring-filesystem.test.mjs` — D1: 13 journalWitness, 13 parseJournalWitness, 47 journalWitness, 47 parseJournalWitness · S4: 22 openJournal, 22 FilesystemJournal, 47 openJournal, 47 FilesystemJournal
- `test/rpc.test.mjs` — S4: 17 openJournal, 250 openJournal · S6: 249 feed, 264 scan
- `test/structured-work-intent.test.mjs` — S4: 8 openJournal, 352 openJournal · S5: 262 scanCausalSubject · S6: 352 feed

### kalshi-services-section

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-web-engineering-services-section/services/web-platform-services-section/services/web3-platform-services-section/web3-gambling-platform-services-section/services/kalshi-services-section`

- `scripts/kalshi-sources.mjs` — S12: 18 journalFeedPath, 32 journalFeedPath
- `services/forecasting-service/apps/forecast-weather-markets-cli.mjs` — S1: 10 createSemanticRecordJournal, 49 createSemanticRecordJournal, 77 .query, 197 .query, 205 .query, 216 .record, 236 .query
- `services/forecasting-service/apps/forecasting-daily-cycle.mjs` — S1: 9 createSemanticRecordJournal, 30 createSemanticRecordJournal, 59 .query, 95 .query, 103 .query, 125 .record
- `services/forecasting-service/scripts/record-forecast.mjs` — S1: 5 createSemanticRecordJournal, 29 createSemanticRecordJournal, 30 .record
- `services/forecasting-service/scripts/score-forecast.mjs` — S1: 2 createSemanticRecordJournal, 22 createSemanticRecordJournal, 71 createSemanticRecordJournal, 23 .query, 72 .record
- `services/forecasting-service/test/forecasting-daily-cycle.test.mjs` — S1: 6 createSemanticRecordJournal, 101 createSemanticRecordJournal, 102 .query
- `services/forecasting-service/test/record-and-score.test.mjs` — S1: 6 createSemanticRecordJournal, 79 createSemanticRecordJournal, 80 .query
- `services/kalshi-stake-path-service/src/desk-layout.mjs` — S12: 16 journalFeedPath, 23 journalFeedPath, 25 journalFeedPath
- `services/kalshi-stake-path-service/src/one-log.mjs` — S1: 22 createSemanticRecordJournal, 50 createSemanticRecordJournal, 55 .record · S2: 3 queryJournalDay
- `src/market-facts.mjs` — S4: 4 openJournal, 4 .appendRows · S9: 6 projectState
- `src/seavt-log.mjs` — S12: 18 journalFeedPath, 27 journalFeedPath · S3: 17 appendSeavtEntries, 19 appendDurably, 31 appendSeavtEntries, 43 appendSeavtEntries, 46 appendDurably

### emsenn-treasury-services-section

Package directory: `public-services-section/services/personal-services-section/services/emsenn-services-section/services/emsenn-economic-services-section/services/emsenn-treasury-services-section`

- `src/financial-dispatch.mjs` — S1: 9 createSemanticRecordJournal, 21 createSemanticRecordJournal, 22 .query, 25 .record

### koios-news-services-section

Package directory: `public-services-section/services/public-media-services-section/services/public-news-media-services-section/services/koios-news-services-section`

- `services/activitypub-retained-inbox-provider/scripts/admit-set-of-inbox-arrivals.mjs` — S1: 10 createSemanticRecordJournal, 63 createSemanticRecordJournal · S2: 63 .readSince
- `services/independent-editorial-assessment/src/contract-editorial-assessment.mjs` — S1: 17 createSettlementStore, 31 createSettlementStore, 34 .record
- `services/independent-editorial-assessment/src/record-journal.mjs` — S1: 1 createSettlementStore, 1 querySettlementRecords, 7 createSettlementStore, 8 querySettlementRecords
- `services/independent-editorial-assessment/test/contract-editorial-assessment.test.mjs` — S1: 8 querySettlementRecords, 85 querySettlementRecords, 86 querySettlementRecords, 87 querySettlementRecords, 107 querySettlementRecords, 212 querySettlementRecords, 237 querySettlementRecords
- `services/koios-intelligence-briefing/src/launch-state-record.mjs` — S1: 2 createSemanticRecordJournal, 10 createSemanticRecordJournal, 17 createSemanticRecordJournal, 35 .record, 51 .query
- `services/web-source-acquisition/src/contract-public-source-discovery.mjs` — S1: 6 createSettlementStore, 42 createSettlementStore, 44 .record
- `services/web-source-acquisition/src/contract-public-web-source.mjs` — S1: 8 createSettlementStore, 39 createSettlementStore, 41 .record
- `services/web-source-acquisition/src/record-journal.mjs` — S1: 3 createSettlementStore, 3 querySettlementRecords, 9 createSettlementStore, 10 querySettlementRecords
- `services/web-source-acquisition/test/contract-public-source-discovery.test.mjs` — S1: 6 querySettlementRecords, 134 querySettlementRecords
- `services/web-source-acquisition/test/contract-public-web-source.test.mjs` — S1: 6 querySettlementRecords, 110 querySettlementRecords
- `src/boundary.mjs` — S1: 5 createSemanticRecordJournal, 29 createSemanticRecordJournal, 34 createSemanticRecordJournal, 30 .query, 34 .record
- `src/claim-cells.mjs` — S1: 16 createSemanticRecordJournal, 98 createSemanticRecordJournal, 100 .query
- `src/market-research.mjs` — S1: 2 createSemanticRecordJournal, 31 createSemanticRecordJournal, 68 .record, 70 .record
- `src/news-line/reporting.mjs` — S1: 2 createSemanticRecordJournal, 20 createSemanticRecordJournal, 28 .query, 38 .record
- `src/news-line/stages.mjs` — S1: 35 createSemanticRecordJournal, 96 createSemanticRecordJournal, 175 createSemanticRecordJournal, 230 createSemanticRecordJournal, 256 createSemanticRecordJournal, 275 createSemanticRecordJournal, 385 createSemanticRecordJournal, 185 .query, 200 .record, 214 .record, 385 .query
- `src/news-line/submissions.mjs` — S1: 3 createSemanticRecordJournal, 26 createSemanticRecordJournal, 56 .record
- `test/article-reporting.test.mjs` — S1: 16 createSemanticRecordJournal, 20 createSemanticRecordJournal, 29 .query, 31 .query, 32 .query, 33 .query, 38 .query, 41 .query, 44 .query, 59 .record
- `test/draft-headline-binding.test.mjs` — S1: 6 createSemanticRecordJournal, 29 createSemanticRecordJournal, 41 .record
- `test/evidence-replay.test.mjs` — S1: 6 createSemanticRecordJournal, 6 semanticRecordFeed, 12 createSemanticRecordJournal, 22 semanticRecordFeed, 13 .record, 14 .record, 15 .query, 21 .query, 25 .query
- `test/reporter-custody-guard.test.mjs` — S1: 6 createSemanticRecordJournal, 18 createSemanticRecordJournal, 21 .record, 32 .query, 37 .query, 54 .record
- `test/reporter-new-story.test.mjs` — S1: 6 createSemanticRecordJournal, 24 createSemanticRecordJournal, 19 .record
- `test/reporter-supplied-claims.test.mjs` — S1: 6 createSemanticRecordJournal, 24 createSemanticRecordJournal, 57 createSemanticRecordJournal, 57 .query, 62 .query, 63 .query, 68 .query, 75 .query, 82 .query, 88 .query

### other: 561-group-operations-services-section/apps/group-operations

Package directory: `561-group-services-section/services/561-group-operations-services-section/apps/group-operations`

- `scripts/run-financial-fleet-pulse.mjs` — S1: 9 createSemanticRecordJournal, 16 createSemanticRecordJournal, 101 createSemanticRecordJournal, 26 .record, 34 .record, 42 .query, 53 .record, 60 .record, 69 .record, 71 .query, 74 .record, 77 .query, 79 .record, 81 .query, 83 .record, 86 .record, 93 .record, 102 .query
- `src/acceptance.mjs` — S6: 150 read, 201 read
- `src/trading-fleet-network.mjs` — S1: 13 createSemanticRecordJournal, 44 createSemanticRecordJournal, 48 .record
- `src/work-arena-law-operation.mjs` — S1: 20 createSemanticRecordJournal, 112 createSemanticRecordJournal, 113 .query

### other: agent-harness-computer-system-engineering-services-section

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/services/agent-harness-computer-system-engineering-services-section`

- `scripts/fold-harness-lifecycle.mjs` — S1: 17 querySemanticRecordCategories, 77 querySemanticRecordCategories
- `scripts/fold-harness-turns.mjs` — S3: 12 readSeavtEntriesAtPath, 78 readSeavtEntriesAtPath
- `services/codex-harness-services-section/src/operations.mjs` — S4: 11 openJournal, 81 openJournal, 81 .appendRows · S5: 91 scanCausalSubject
- `src/carrier/inference-receiving-carrier.mjs` — S1: 27 createSemanticRecordJournal, 127 createSemanticRecordJournal, 128 .query, 179 .record
- `src/harness-lifecycle.mjs` — S1: 3 createSemanticRecordJournal, 62 createSemanticRecordJournal, 77 .record, 116 .record, 135 .record, 169 .query, 170 .query
- `src/hooks/read-demand.mjs` — S12: 17 artifactStoreRoot, 54 artifactStoreRoot · S6: 58 scanFrom
- `src/hooks/service.mjs` — S10: 53 .readHead, 167 .readHead · S4: 17 openJournal, 210 openJournal, 214 .appendRows, 243 openJournal
- `src/run-causal-set.mjs` — S12: 15 artifactStoreRoot, 69 artifactStoreRoot, 106 artifactStoreRoot · S6: 107 scan
- `src/utterances.mjs` — S12: 22 artifactStoreRoot, 93 artifactStoreRoot · S6: 94 scan
- `test/fold-harness-lifecycle.test.mjs` — S3: 13 appendSeavtEntries, 33 appendSeavtEntries
- `test/fold-harness-turns.test.mjs` — S3: 14 appendSeavtEntries, 32 appendSeavtEntries

### other: alpaca-services-section

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-web-engineering-services-section/services/web-platform-services-section/services/web2-platform-services-section/services/web2-financial-platform-services-section/services/web2-financial-brokerage-platform-services-section/services/alpaca-services-section`

- `scripts/record-cold-red-gate-paper-loop-deployment.mjs` — S1: 2 createSemanticRecordJournal, 17 createSemanticRecordJournal, 17 .record
- `services/alpaca-esther-paper-redistributor-loop/src/run-loop.mjs` — S1: 14 createSemanticRecordJournal, 50 createSemanticRecordJournal, 64 createSemanticRecordJournal, 50 .record, 65 .query
- `services/alpaca-esther-paper-redistributor-loop/test/journal.test.mjs` — S1: 7 createSemanticRecordJournal, 28 createSemanticRecordJournal, 44 createSemanticRecordJournal, 28 .query, 44 .query
- `services/alpaca-esther-paper-trading-loop/src/run-loop.mjs` — S1: 11 createSemanticRecordJournal, 45 createSemanticRecordJournal, 45 .record
- `services/alpaca-esther-paper-trading-loop/test/journal.test.mjs` — S1: 7 createSemanticRecordJournal, 20 createSemanticRecordJournal, 48 createSemanticRecordJournal, 20 .query, 48 .query
- `services/virtuals-brokerage-products-border/scripts/run-virtuals-production.mjs` — S1: 4 createSemanticRecordJournal, 14 createSemanticRecordJournal, 26 .record
- `src/union-runtime.mjs` — S1: 6 createSemanticRecordJournal, 37 createSemanticRecordJournal, 38 .record

### other: apply-peg-ladder-service

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-blockchain-system-services-section/services/hive-engineering-services-section/services/internal-market-services-section/services/apply-peg-ladder-service`

- `src/apply-peg-ladder.mjs` — S1: 4 createSemanticRecordJournal, 51 createSemanticRecordJournal, 63 createSemanticRecordJournal, 66 .record, 102 .record, 112 .record

### other: attention-allocation-readout-service

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/semiotic-computer-system-services-section/services/semiotic-agent-services-section/services/attention-services-section/services/attention-allocation-readout-service`

- `src/record-journal.mjs` — S1: 1 createSemanticRecordJournal, 12 createSemanticRecordJournal, 15 .record
- `test/contract-attention-allocation.test.mjs` — S1: 10 createSemanticRecordJournal, 78 createSemanticRecordJournal, 79 .query, 80 .query

### other: brokerage-independent-witness-and-books

Package directory: `engineering-services-section/services/financial-engineering-services-section/services/venue-algebra-services-section/services/prediction-market-engineering-services-section/services/brokerage-independent-witness-and-books`

- `src/witness.mjs` — S1: 2 createSemanticRecordJournal, 6 createSemanticRecordJournal, 8 .query, 8 .record, 9 .query, 9 .record

### other: capability-pricing-service

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/semiotic-computer-system-services-section/services/semiotic-agent-services-section/services/semiotic-agent-capability-services-section/services/capability-pricing-service`

- `src/observation-journal.mjs` — S1: 4 createSemanticRecordJournal, 23 createSemanticRecordJournal, 24 .query, 27 .record · S3: 3 admitJsonlOnce, 3 readAdmittingJsonl, 30 admitJsonlOnce, 34 readAdmittingJsonl

### other: cast-set-of-votes-service

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-blockchain-system-services-section/services/hive-engineering-services-section/services/curation-services-section/services/cast-set-of-votes-service`

- `scripts/cast-set-of-votes.mjs` — S1: 3 createSemanticRecordJournal, 18 createSemanticRecordJournal, 33 createSemanticRecordJournal, 84 .record, 93 .record

### other: cloudflare-activitystreams-operation-services-section

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-web-engineering-services-section/services/web-platform-services-section/services/cloud-services-section/services/cloudflare-services-section/services/cloudflare-activitystreams-operation-services-section`

- `src/boundary-witness.mjs` — S1: 9 createSemanticRecordJournal, 22 createSemanticRecordJournal, 29 .record, 40 .query, 45 .query

### other: computer-code-development-system-services-section/apps/computer-code-development-engine

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-code-development-system-services-section/apps/computer-code-development-engine`

- `src/agent/service.mjs` — S6: 185 feed, 186 sourceStatus, 191 scan, 448 feed, 449 sourceStatus, 453 scan · S8: 438 readPacket
- `src/knowledge/anchored-findings.mjs` — S4: 16 openJournal, 225 openJournal, 225 .appendRows · S5: 130 scanCausalSubject
- `src/monitoring/operations.mjs` — S4: 11 openJournal, 846 openJournal, 846 .appendRows · S6: 292 feed, 293 sourceStatus, 294 scan · S7: 265 scanCausalTerritory
- `src/monitoring/source-code/lexicon/fold.mjs` — S7: 103 scanTerritory
- `test/checkout-health-dispatch-readout.test.mjs` — S7: 103 scanCausalTerritory
- `test/monitoring-source-code.test.mjs` — S4: 15 openJournal, 340 openJournal, 341 .appendRows, 398 openJournal, 399 .appendRows · S7: 1816 scanCausalTerritory · S8: 1763 readArtifact, 1767 readArtifact, 1773 readArtifact

### other: computer-inference-system-services-section/apps/computer-inference-engine

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-inference-system-services-section/apps/computer-inference-engine`

- `src/dispatch/expected-resolution-pricing.mjs` — S3: 3 admitJsonlOnce, 3 readAdmittingJsonl, 44 admitJsonlOnce, 45 readAdmittingJsonl
- `src/dispatch/inference-purchase.mjs` — S1: 3 createSemanticRecordJournal, 49 createSemanticRecordJournal, 90 createSemanticRecordJournal, 77 .record, 89 .query, 90 .query
- `src/dispatch/witness-journal-settlement-store.mjs` — S1: 3 createSemanticRecordJournal, 35 createSemanticRecordJournal, 38 .query, 40 .record
- `src/media/account-artifact-capacity.mjs` — S6: 53 read
- `src/media/allowance-ledger.mjs` — S6: 63 read, 64 read, 65 read, 70 read, 83 read
- `src/media/ledger-journal.mjs` — S1: 16 createSemanticRecordJournal, 45 createSemanticRecordJournal, 48 .record, 49 .query
- `src/openai/pricing/operations.mjs` — S6: 18 feed, 19 sourceStatus, 23 scan
- `test/dispatch/inference-purchase.test.mjs` — S1: 6 createSemanticRecordJournal, 19 createSemanticRecordJournal, 19 .record

### other: computer-knowledge-systems-services-section/apps/graphical-knowledge-game-server

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-knowledge-systems-services-section/apps/graphical-knowledge-game-server`

- `src/review-store.mjs` — S1: 6 createSemanticRecordJournal, 55 createSemanticRecordJournal, 60 .query, 71 .record

### other: computer-knowledge-systems-services-section/apps/knowledge-system-server

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-knowledge-systems-services-section/apps/knowledge-system-server`

- `src/directory-readout/index.mjs` — S4: 20 openJournal, 476 openJournal, 476 .appendRows · S9: 482 projectState, 486 projectRecord
- `src/search/revision-journal.mjs` — S1: 13 createSemanticRecordJournal, 74 createSemanticRecordJournal, 97 .query, 101 .query, 105 .query, 110 .query, 132 .record, 180 .record, 191 .record · S13: 14 createTermIndex, 15 createFieldIndex, 75 createTermIndex, 124 createFieldIndex
- `src/search/service.mjs` — S7: 105 scanTerritory

### other: computer-language-systems-engineering-services-section

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-language-systems-engineering-services-section`

- `services/language-message-runtime-service/scripts/record-nlnet-language-fiber-ratification.mjs` — S1: 4 createSemanticRecordJournal, 24 createSemanticRecordJournal, 25 .record
- `services/language-message-runtime-service/scripts/record-semiotic-language-model-salvage-campaign.mjs` — S1: 4 createSemanticRecordJournal, 47 createSemanticRecordJournal, 48 .record
- `services/language-message-runtime-service/scripts/record-verifier-honesty-wedge-campaign.mjs` — S1: 4 createSemanticRecordJournal, 46 createSemanticRecordJournal, 64 createSemanticRecordJournal, 47 .record, 65 .record
- `services/language-message-runtime-service/src/legacy-linguistics-relational-wire.js` — S1: 8 createSemanticRecordJournal, 35 createSemanticRecordJournal, 36 .record

### other: computer-ledger-system-services-section/apps/farolfi

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-economic-systems-engineering-services-section/services/computer-accounting-systems-engineering-services-section/services/computer-ledger-system-services-section/apps/farolfi`

- `src/accountable-transaction/projection.mjs` — S9: 21 projectDomainRecord
- `src/accountable-transaction/purchase-record.mjs` — S9: 6 projectDomainRecord
- `test/accountable-purchase.test.mjs` — S4: 7 FilesystemJournal, 47 FilesystemJournal, 48 .appendRows, 54 .appendRows

### other: computer-networking-engineering-services-section

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-networking-engineering-services-section`

- `services/activitypub-services-section/src/journal-custody.mjs` — S1: 5 createSemanticRecordJournal, 146 createSemanticRecordJournal, 220 createSemanticRecordJournal, 71 .query, 85 .record, 114 .query, 131 .record, 135 .record, 149 .query, 192 .record, 210 .record
- `services/x402-services-section/apps/market-561-group/scripts/serve-market.mjs` — S1: 4 createSemanticRecordJournal, 30 createSemanticRecordJournal, 41 .record, 46 .record
- `services/x402-services-section/apps/x402-hive-exit-tightness-seller-cli.mjs` — S1: 4 createSemanticRecordJournal, 28 createSemanticRecordJournal, 32 .record
- `services/x402-services-section/scripts/assay-x402-facilitator.mjs` — S1: 9 createSemanticRecordJournal, 30 createSemanticRecordJournal, 31 .record
- `services/x402-services-section/src/hive/exit-tightness-sale-ledger.mjs` — S1: 2 createSemanticRecordJournal, 55 createSemanticRecordJournal, 22 .query, 57 .record
- `src/object-capability/captp/index.mjs` — S4: 403 openJournal

### other: computer-web-engineering-services-section/apps/computer-web-server

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-web-engineering-services-section/apps/computer-web-server`

- `src/admission/discord-store.mjs` — S1: 13 createSemanticRecordJournal, 110 createSemanticRecordJournal, 39 .record, 59 .query · S13: 14 createFieldIndex, 25 createFieldIndex · S14: 15 withDirectoryLock, 118 withDirectoryLock
- `test/admission-discord-store.test.mjs` — S1: 7 createSemanticRecordJournal, 27 createSemanticRecordJournal, 27 .query

### other: consumption-hedge-service

Package directory: `engineering-services-section/services/financial-engineering-services-section/services/consumption-hedge-service`

- `apps/consumption-hedge-cli.mjs` — S1: 9 createSemanticRecordJournal, 40 createSemanticRecordJournal, 44 .query, 45 .query, 46 .query, 56 .record

### other: corpus-management-service

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/services/computer-content-engineering-services-section/services/corpus-management-service`

- `src/contract-prior-research-recovery.js` — S1: 10 createSemanticRecordJournal, 42 createSemanticRecordJournal, 43 .record, 247 .query
- `src/manage-project-corpus-knowledge.js` — S1: 7 createSemanticRecordJournal, 33 createSemanticRecordJournal, 34 .record, 65 .record, 66 .record, 67 .record
- `src/sweep-firm-corpus.js` — S1: 13 createSemanticRecordJournal, 251 createSemanticRecordJournal, 256 createSemanticRecordJournal, 251 .record, 257 .query, 262 .record

### other: crowdfunding-services-section

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-web-engineering-services-section/services/web-platform-services-section/services/web2-platform-services-section/services/crowdfunding-services-section`

- `src/journal.mjs` — S1: 8 createSemanticRecordJournal, 12 createSemanticRecordJournal, 21 .record, 35 .query

### other: divination-computer-system-service

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/semiotic-computer-system-services-section/services/divination-computer-system-service`

- `src/daily-reading-witness.mjs` — S3: 5 appendSeavtEntries, 23 appendSeavtEntries

### other: ebook-engineering-services-section

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/services/computer-content-engineering-services-section/services/computer-documents-engineering-services-section/services/ebook-engineering-services-section`

- `scripts/record-founding.mjs` — S1: 11 createSemanticRecordJournal, 20 createSemanticRecordJournal, 23 createSemanticRecordJournal, 31 createSemanticRecordJournal, 79 .record

### other: emsenn-one-of-one-artifacts-services-section

Package directory: `public-services-section/services/personal-services-section/services/emsenn-services-section/services/emsenn-one-of-one-artifacts-services-section`

- `src/journal.mjs` — S1: 3 createSemanticRecordJournal, 6 createSemanticRecordJournal, 10 createSemanticRecordJournal, 19 .record, 33 .query

### other: ethereum-engineering-services-section

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-blockchain-system-services-section/services/ethereum-engineering-services-section`

- `test/contract-public-wallet-observation.test.mjs` — S1: 8 querySettlementRecords, 145 querySettlementRecords

### other: flatfile-resource-graph-service

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/services/computer-content-engineering-services-section/services/flatfile-resource-graph-service`

- `src/operator/edit.mjs` — S3: 10 appendSeavtEntries, 132 appendSeavtEntries, 214 appendSeavtEntries

### other: gemini-notebook-services-section

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-inference-system-services-section/services/gemini-services-section/services/gemini-notebook-services-section`

- `services/persistent-notebook-enterprise/src/artifact-exchange.mjs` — S1: 6 querySettlementRecords, 16 querySettlementRecords
- `services/persistent-notebook-enterprise/src/explainer-backend.mjs` — S1: 4 querySettlementRecords, 10 querySettlementRecords
- `services/persistent-notebook-enterprise/src/notebooklm-provider-client.mjs` — S1: 3 querySettlementRecords, 16 querySettlementRecords
- `services/persistent-notebook-enterprise/src/video-backend.mjs` — S1: 4 querySettlementRecords, 9 querySettlementRecords
- `services/persistent-notebook-enterprise/test/notebook.test.mjs` — S1: 7 querySettlementRecords, 135 querySettlementRecords, 151 querySettlementRecords, 192 querySettlementRecords

### other: google-flow-services-section

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-inference-system-services-section/services/google-flow-services-section`

- `src/flow-credits.mjs` — S3: 25 admitJsonlOnce, 25 readAdmittingJsonl, 68 admitJsonlOnce, 69 readAdmittingJsonl

### other: hive-fleet-operations-service

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-blockchain-system-services-section/services/hive-engineering-services-section/services/hive-fleet-operations-service`

- `src/core/journal.mjs` — S1: 9 createSemanticRecordJournal, 20 createSemanticRecordJournal, 26 .record, 31 .query
- `test/contract-fleet-observation.test.mjs` — S1: 4 querySettlementRecords, 69 querySettlementRecords, 70 querySettlementRecords
- `test/opportunity-feed.test.mjs` — S1: 7 querySettlementRecords, 162 querySettlementRecords

### other: hive-peg-ladder-cycle-service

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-blockchain-system-services-section/services/hive-engineering-services-section/services/internal-market-services-section/services/hive-peg-ladder-cycle-service`

- `apps/peg-ladder-cycle.mjs` — S1: 9 createSemanticRecordJournal, 34 createSemanticRecordJournal, 48 createSemanticRecordJournal, 67 .record, 116 .record

### other: key-management-services-section

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-blockchain-system-services-section/services/key-management-services-section`

- `scripts/create-wallet.mjs` — S1: 14 createSemanticRecordJournal, 143 createSemanticRecordJournal, 144 .record
- `scripts/sign-with-wallet.mjs` — S1: 10 createSemanticRecordJournal, 122 createSemanticRecordJournal, 123 .record

### other: lean-system-services-section

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-proofing-system-services-section/services/lean-system-services-section`

- `src/operations.mjs` — S4: 2 openJournal, 14 openJournal, 14 .appendRows

### other: markdown-engineering-services-section

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/services/computer-content-engineering-services-section/services/typed-computer-content-engineering-services-section/services/computer-text-data-services-section/services/markdown-engineering-services-section`

- `services/markdown-vault-services-section/services/markdown-vault-bundle-services-section/scripts/bundle-markdown-vault-carriers.mjs` — S1: 4 createSemanticRecordJournal, 78 createSemanticRecordJournal, 79 .record
- `src/vault/full-text-index.mjs` — S13: 1 createTermIndex, 23 createTermIndex

### other: npm-workspace-publication-service

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-node-services-section/services/jsnode-packaging-services-section/services/npm-services-section/services/npm-registry-services-section/services/npm-workspace-publication-service`

- `scripts/publish-package.mjs` — S1: 12 createSemanticRecordJournal, 714 createSemanticRecordJournal, 729 .record

### other: obsmetrological-services-section/apps/obsmetrologia-change-bundle-qualification

Package directory: `science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/apps/obsmetrologia-change-bundle-qualification`

- `src/contract-change-bundle-qualification.mjs` — S1: 209 createSettlementStore, 210 createSettlementStore, 50 .record

### other: pool-service

Package directory: `engineering-services-section/services/financial-engineering-services-section/services/pool-service`

- `src/receipts.mjs` — S1: 2 createSemanticRecordJournal, 13 createSemanticRecordJournal, 14 .record

### other: public-web-games-services-section/sites/ruinfold.play.561.group

Package directory: `public-services-section/services/public-media-services-section/services/public-games-services-section/services/public-web-games-services-section/sites/ruinfold.play.561.group`

- `src/server.mjs` — S1: 22 createSemanticRecordJournal, 237 createSemanticRecordJournal, 238 .record

### other: route-directed-yield-service

Package directory: `engineering-services-section/services/financial-engineering-services-section/services/route-directed-yield-service`

- `src/mandate-execution.mjs` — S1: 9 createSemanticRecordJournal, 50 createSemanticRecordJournal, 52 .record

### other: run-hive-curation-cycle-service

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-blockchain-system-services-section/services/hive-engineering-services-section/services/curation-services-section/services/run-hive-curation-cycle-service`

- `scripts/run-hive-curation-cycle.mjs` — S1: 5 createSemanticRecordJournal, 44 createSemanticRecordJournal, 76 .record

### other: software-trajectory-memory-service

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-code-engineering-services-section/services/computer-code-development-services-section/services/software-trajectory-memory-service`

- `src/memory.mjs` — S1: 3 createSemanticRecordJournal, 36 createSemanticRecordJournal, 271 createSemanticRecordJournal, 36 .query, 271 .record

### other: stripe-services-section

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-web-engineering-services-section/services/web-platform-services-section/services/web2-platform-services-section/services/web2-financial-platform-services-section/services/web2-payment-platform-services-section/services/stripe-services-section`

- `src/service.mjs` — S1: 6 createSemanticRecordJournal, 146 createSemanticRecordJournal, 149 .record, 218 .query, 253 .record
- `test/service.test.mjs` — S1: 8 createSemanticRecordJournal, 23 createSemanticRecordJournal, 23 .query

### other: structural-claims-register-services-section

Package directory: `561-group-services-section/services/561-group-operations-services-section/services/structural-claims-register-services-section`

- `src/operations.mjs` — S1: 14 createSemanticRecordJournal, 26 createSemanticRecordJournal, 27 .query, 32 .record

### other: tips-services-section

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-web-engineering-services-section/services/web-platform-services-section/services/web2-platform-services-section/services/web2-financial-platform-services-section/services/web2-payment-platform-services-section/services/tips-services-section`

- `scripts/book-tip.mjs` — S1: 15 createSemanticRecordJournal, 79 createSemanticRecordJournal, 80 .record, 87 .query
- `scripts/verify-tip-receipt.mjs` — S1: 56 createSemanticRecordJournal, 58 createSemanticRecordJournal, 59 .query
- `test/book-tip.test.mjs` — S1: 75 createSemanticRecordJournal, 79 createSemanticRecordJournal, 91 .query

### other: turntide-islands-discord-platform

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-web-engineering-services-section/services/web-platform-services-section/services/web2-platform-services-section/services/web2-social-platform-services-section/services/discord-services-section/services/turntide-islands-discord-platform`

- `src/turntide-software-system/settlement-witness.mjs` — S1: 7 querySettlementRecords, 14 querySettlementRecords
- `src/turntide-software-system/vault-payment.mjs` — S1: 5 querySettlementRecords, 34 querySettlementRecords, 35 querySettlementRecords, 206 .record, 211 .record, 220 .records, 245 .records
- `src/turntide-software-system/zelo-civic-service.mjs` — S1: 5 createSemanticRecordJournal, 98 createSemanticRecordJournal, 44 .query, 58 .query
- `test/fixtures/turntide-governance-journal.mjs` — S1: 9 createSemanticRecordJournal, 116 createSemanticRecordJournal, 118 .record

### other: web-advertising-system-engineering-services-section

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-web-engineering-services-section/services/web-advertising-system-engineering-services-section`

- `scripts/sync-ad-receipts-to-journal.mjs` — S1: 3 createSemanticRecordJournal, 22 createSemanticRecordJournal, 23 .query, 30 .record

### other: web-tufte-gui-services-section/apps/assist

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-web-engineering-services-section/services/web-tufte-gui-services-section/apps/assist`

- `src/journal.mjs` — S1: 1 recordSemanticRecord, 2 querySemanticRecordCategories, 21 recordSemanticRecord, 33 querySemanticRecordCategories
- `src/store.mjs` — S1: 4 recordSemanticRecord, 8 recordSemanticRecord, 9 querySemanticRecords, 52 querySemanticRecords, 54 recordSemanticRecord
- `test/store.test.mjs` — S1: 9 querySemanticRecords, 91 querySemanticRecords

### other: yanagi-services-section/blockchain-trashpanda-services-section

Package directory: `public-services-section/services/public-media-services-section/services/public-personality-services-section/services/yanagi-services-section/blockchain-trashpanda-services-section`

- `src/settlement-witness.mjs` — S1: 4 createSemanticRecordJournal, 24 createSemanticRecordJournal, 36 createSemanticRecordJournal, 24 .record, 37 .query

### eavt-services-section (neighbours of semiotic-eavt)

Package directory: `engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/services/computer-content-engineering-services-section/services/computer-serialized-content-engineering-services-section/services/json-services-section/services/jsonl-services-section/services/eavt-services-section`

- `services/witness-journal-services-section/services/witness-journal-document-service/src/witness-journal-document.mjs` — S1: 165 querySettlementRecords, 174 querySettlementRecords, 124 .query
- `services/witness-journal-services-section/services/witness-journal-document-service/test/document.test.mjs` — S1: 4 querySettlementRecords, 20 querySettlementRecords, 34 querySettlementRecords
- `services/witness-journal-services-section/services/witness-journal-document-service/test/filesystem-provider.test.mjs` — S1: 10 querySettlementRecords, 27 querySettlementRecords

## 8. Imports of computer-system-engine journal modules

These import lines name a module of `computer-system-engine/journal` by specifier and use symbols outside the list of section 1. They are counted in section 3. The module `journal/data-artifact-schema` (schema descriptions only) stays and needs no change, so its four importers (`feltos/src/lean/schema.mjs:39`, `feltos/src/lean/view.mjs:62`, `metroplat/src/lsp/operation.mjs:36`, `knowledge-system-server/src/directory-readout/boundary/schema.mjs:4`) are not sites.

| site | module | becomes |
|---|---|---|
| `feltos/src/lean/tex/workspace-service.mjs:30`, `metroplat/scripts/metroplat-serve.mjs:19`, `metroplat/src/mcp-options.mjs:8` | `journal/service-lifecycle` | the lifecycle writer over `append` of `service-lifecycle` lines (S3) |
| `feltos/src/agents/feed-readout.mjs:12`, `feltos/src/agents/sessions/token-usage/service.mjs:8`, `metroplat/src/resources/read-write-verbs.mjs:69`, `metroplat/test/monitoring-filesystem.test.mjs:34` | `journal/projections` | S9: the owner computes its reading from records and writes the state it needs |
| `feltos/src/encounter/store.mjs:4`, `metroplat/test/monitoring-filesystem.test.mjs:19` | `journal/section` | S5: `walk` from the thread's head |
| `metroplat/test/monitoring-filesystem.test.mjs:18` | `journal/frontier` | S5: a head's frontier |
| `computer-code-development-engine/src/agent/service.mjs:8`, `metroplat/test/rpc.test.mjs:18`, `metroplat/test/monitoring-filesystem.test.mjs:20,21` | `journal/reading`, `journal/reading/rpc-sequence` | S6: the RPC sequence is read from a log with `readLog` |
| `metroplat/test/monitoring-filesystem.test.mjs:23` | `journal/filesystem/operations` | S12: `layout` |
| `metroplat/test/monitoring-filesystem.test.mjs:35,36,37` | `journal/projection-profile`, `journal/credential-record`, `journal/raft-record` | S9 |
