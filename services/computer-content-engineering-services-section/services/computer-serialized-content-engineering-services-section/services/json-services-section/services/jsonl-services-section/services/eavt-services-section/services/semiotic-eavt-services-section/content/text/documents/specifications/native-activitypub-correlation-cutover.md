# ActivityPub correlation receiving and first cutover

Status: local paired source proposal, with genuine original/current consumer and wrapper tests. It is not published or selected for a host. The prior published Data181da976 and Computer947a5afe source remains separate and retained.

## Exact source formats and preserved input

The native source is Computer947a5afe's journal-custody blob13bca0b8ea67de7841684dddc1fab7e9a77eb13d and Data74a17ffa's native store-core SHA256 6b6aff7436268affc37ba636f50924d326d4971bf9384b0b5b51805104e06d6d. The witnessed source is AP909751a's journal-custody blob b645e7983a1bfcb7b86ef319bf351f5000d8c212. That historical provider has no requestNi, retainRequest, reply metadata or replyFor API. None is presumed.

The original provider identity must agree with actual custody markers. Native custody/records/state and historical bodies/journals/witnesses are distinct. Absent markers, wrong provider identity and mixed representations refuse before receiving. Native failure never triggers historical fallback. The configured original artifact still binds all historical providers through the existing first-cutover procedure.

A native input is a dedicated AP journal with inbox/outbox/follower records, ordinary files/directories and immutable body custody. Other record types, nonempty logs, undeclared cross-reference causes, existing conversion scratch, corrupt rows, conflicting receipt identities and missing body custody refuse. Closed, non-single, typed or missing-record source inbox/outbox heads refuse; existing undeclared correlation heads also refuse. Rebuilding cannot silently reopen or discard frontier state.

Historical witnessed conversion uses its original verified parser/projection and exact cited body custody. Pre-witness feeds and non-held inbox/outbox rows require separate receiving and refuse instead of disappearing. Original follower denial semantics remain as published. All original trees stay unchanged. Candidate construction uses a separate, absent same-volume directory; failed candidates remain separate.

## Native observable baseline and migration

The native reader's raw lexical timestamp comparison remains primary. No timestamp is normalized or invented. Original store traversal gives bucket formula order followed by valid physical line order. Conversion takes two inbox passes with existing temporary disk bucket maps. A receipt is bound to one exact original record address; a differing record sharing its key refuses.

Every original physical inbox occurrence produces one candidate record with a unique nonnegative safe-integer sourceOrder equal to original traversal ordinal, including repeated physical occurrences. Inbox collection ties use sourceOrder, retaining every original list/page row despite changed record addresses.

Every correlated copy of one receipt gets the same replyOrder: its LAST original occurrence ordinal. Correlation heads compare raw lexical at, then replyOrder, then the existing receipt key. This preserves original last-reply selection for repeated older lines, same-bucket and cross-bucket ties, and reversed clocks. Null local recipients retain inbox custody without invented reply audiences.

Receipt-key and unrelated inbox heads are translated with their exact original head timestamps. Bodies and receipt IDs remain exact. Native outbox records retain addresses and wire bytes. Request heads select FIRST by original at/traversal after first-per-activity reduction, independent of last-reply selection. The target consumer recomputes request identity from its immutable wire and reuses that wire and its original message/activity identifiers.

## Witnessed receiving into the new correlation law

The historical consumer has no correlation lookup. Conversion derives only coordinates proved by the current owner's unchanged activityPubReplyCoordinates parser, which verifies the existing SEN carrier. A valid ordinary activity that does not yield verified reply coordinates remains ordinary custody, without new correlation authority. Malformed JSON, noncanonical body bytes, wrong body receipts and conflicting receipt identities refuse.

Every distinct verified inbox witness remains one row; a physical replay of the same witness deduplicates under the source query law. Equal-time source traversal is carried as sourceOrder. A derived reply gets that same ordinal as replyOrder. The new lookup chooses raw lexical at, then ordinal and receipt key. Receipt heads choose the greatest matching body row, so duplicate retain reuses an existing identity without retiming it. Distinct witnesses for identical bodies remain visible in full list/page history. No historical requestNi or request head is inferred from outbox contents.

The original witnessed query compares timestamp strings with localeCompare. Canonical ISO instants agree with native raw lexical order. Exceptional spellings are checked against original timestamps using existing temporary bucket maps; any ordering disagreement refuses. Strings remain byte-for-byte unchanged. This avoids claiming that sourceOrder can repair differently ordered unequal timestamps. Canonical histories require linear passes plus bucket-map operations; exceptional timestamp cross-checks may be quadratic but hold only one timestamp at a time.

Current inbox get and duplicate retain receive every candidate historical body before qualification. Genuine tests compare complete old/new pages, body and receipt identities, equal-time duplicate witnesses, reverse clocks, request-identity absence, malformed custody and unverified semantic content.

## New native writes and recovery

The paired ActivityPub owner implements:

- Raw lexical at remains primary.
- replyOrder is a validated nonnegative safe integer. A new receipt proposes observed winner.replyOrder + 1, or0 without a winner. Exhaustion refuses before acknowledgment.
- Existing receipt-key head CAS with expect:null stabilizes one immutable record/order. Replay reuses it. Concurrent proposals may share an ordinal; exact receipt keys provide the final deterministic tie.
- Reply-head expected-frontier CAS joins the greatest verified row. Stale replay cannot obtain a new order or regress the winner. Bounded contention refuses without acknowledging success; retry joins the same stable receipt.
- A request head fixes the original durable wire before activity-ID head repair. Reuse verifies the immutable wire and returns the original transmission identifiers.

Put-before-head interruption can leave a durable record, visible through each/list. It is preserved and is not described as nonexistent. The guarantee is no partial successful acknowledgment or fabricated retransmission. The owner qualifies genuine body/record/head crash and concurrent-writer boundaries, including the immutable body supplier's sidecar repair.

New native rows omit migration sourceOrder. At equal collection time they follow stopped-source received history. Native/native collection ties keep existing bucket order. Future reply-head ties follow the declared semantic law, not mutable physical bucket positions.

## Existing first-cutover and queue route

The existing convert-settlement entry point classifies AP before loading a historical witness decoder. Native inputs use the native receiver; witnessed inputs use verified witness receiving. Both emit the established OneTimeStoreConversion report and use the same existing queue rules. The first-cutover wrapper gives AP candidates a journal pathname so the actual current consumer can reopen them before binding.

Ready queue bytes are admitted through the existing current SEN transport reader and copied exactly into isolated receiving custody. Original queue paths, indexes and message identities stay in place. Nonempty claimed custody refuses; unadmitted or archived pending messages prevent qualification. No queue is treated as empty without inspecting its explicit original path. The CLI requires --queue and ordinary ready/claimed directories before either receiver writes candidate custody. The genuine queue constructor eagerly creates both directories even when never enqueued; that initialized empty queue qualifies. Missing queue selection or required directories refuses instead of being counted as zero.

The wrapper's immutable /gnu/store provider gate, original-artifact binding, stopped-writer requirement, source digests, cohort preflight, bind and restore phases remain. Real local converter outputs exercise actual bind/restore with isolated operation journals. Tests preserve original/candidate/failed trees across interruptions; a later acknowledged write or consumed queue message refuses rollback for the whole cohort. Those journals do not claim completed Guix prepare. The actual immutable-provider prepare remains outstanding and correctly rejects local provider directories.

## Cost, pairing and remaining qualification

Runtime lookup opens a bounded number of named heads, addressed records and immutable bodies. Addressed get still streams its bucket: files opened and working memory are bounded, while read bytes/time grow with bucket size. No persistent index, byte-position order, runtime historical reader or deployment receipt is added.

Conversion checks source metadata again before qualification. Complete selected Guix graph/build receiving, real prepare against retained custody and actual host quiescence remain required before adoption. Local tests authorize no host operation, release selection, live conversion or transport activation.

Portable opt-in tests require explicit MIGRATION_OLD_STORE, MIGRATION_NEW_STORE, MIGRATION_OLD_ACTIVITYPUB, MIGRATION_NEW_ACTIVITYPUB for witnessed inputs; MIGRATION_NATIVE_SOURCE_STORE, MIGRATION_NATIVE_SOURCE_ACTIVITYPUB, MIGRATION_TARGET_STORE and MIGRATION_TARGET_ACTIVITYPUB for native inputs; and MIGRATION_FIXTURE_PARENT on the same suitable volume. No missing provider is silently skipped. The paired provider and test hashes are frozen in the separate review manifest.
