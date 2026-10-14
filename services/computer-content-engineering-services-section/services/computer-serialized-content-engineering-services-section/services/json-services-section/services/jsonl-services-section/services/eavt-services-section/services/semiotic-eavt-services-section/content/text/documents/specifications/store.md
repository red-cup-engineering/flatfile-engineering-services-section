---
title: "The store: records, logs and heads, found by address"
description: "The semiotic-eavt store: content-addressed records at the path the ni-path formula computes, plain per-type day logs, and heads as state records named by the thing they head. Nothing in it grows with history, no reader keeps an index, and a record exists exactly when its file line exists."
date-created: 2026-10-12
type: specification
status: designed; the store module is built (src/store.mjs, layout.mjs, exchange.mjs), consumers and deletions follow in later waves; realizes feltos-node specification section 8, item 1
owner: semiotic-eavt-services-section
answers:
  - multi-agent-computer-platform-engineering-services-section/content/text/documents/specifications/feltos-node.md (sections 4, 5 and 8 item 1)
  - multi-agent-computer-platform-engineering-services-section/content/requirements/feltos-runs-in-32-mb-with-a-64-mb-startup-peak.json
  - system debts log-kinds-name-instances, log-files-name-their-act-and-kind-again, sen-json-bridge-multiplies-every-record, side-logs-are-hand-rolled-beside-the-seavt-journal, feltos-node-exceeds-its-memory-budget
companions:
  - store-migration-map.md (every call site of the current API and its new form)
  - store-conversion.md (the one conversion of an existing settlement store)
basis:
  - "Leader, 2026-10-10: \"get stuff our flatfiles properly organized by proof path addressing so able to use formula to \\\"predict\\\" where files will be rather than keeping indexes, hot or cold.\""
  - "Leader, 2026-10-11: \"proof path addressing, CHL directionality via yoneda embedding, combined with our content addressing, means we do NOT NEED TO HAVE THINGS HOT IN MEMORY NOR DO WE NEED INDEXES.\""
  - "Leader, 2026-10-11: \"222k 'Facts' IS OBVIOUSLY ... SLOPWARE\"; logs must be \"relatively readable sane flatfiles\"; \"who the fuck puts hashes in fucking folder names\"."
  - "Leader, 2026-10-10: \"FeltOS should use about 32mb of RAM at most once started, with a 64mb startup spike acceptable.\""
  - "rule section-data-is-filed-by-type: data/logs/<type>-logs/, data/records/<type>-records/, data/state/<object>-state/; no journals directory, no date directory above the type."
  - "rule records-and-state-are-tracked: data/records and data/state are tracked; only data/logs stays on the machine."
  - "glossary content-addressed-store: put, get, has; content equals address; path layout is deterministic; indexes are derivable and never load-bearing."
  - "semiotic-content-address-system, ni-path-v1 (conformance/ni-path-v1.json): a record's bucket file is computed from its address."
provenance:
  authors:
    - red-cup-engineer-senior-claude
  office: Red Cup Engineer Senior
  not-the-leaders-words: "An agent's specification derived from the Leader's statements quoted under basis."
---

# The store

## 1. What the store is

The store is the set of files a settlement keeps under `data/records`, `data/state` and `data/logs`, and the one module that writes and reads them. It has three kinds of file and no other:

- A **record** is an immutable JSON object, found by its content address.
- A **head** is a small mutable file naming where a thread of records ends.
- A **log** line is one plain JSON line, appended to the day's file of its type.

A reader that holds an address computes the one file that holds it and opens that file. A reader that holds a thread's name opens the thread's head and follows causes back from it. Nothing is looked up in a table, because no table exists, in memory or on disk. A record exists if and only if its line is in its bucket file; existence is admission.

An object is determined by the arrows into it, which are its causes. A record carries its causes. Nothing carries the converse: there is no table of what follows a record, no waiting set, no admission fact. A reader goes where the arrows go, from effect to cause, and the direction needs no index.

## 2. The three kinds of file

By the data law (`section-data-is-filed-by-type`, `records-and-state-are-tracked`):

| kind | what it is | path under the settlement root | tracked | written by |
|---|---|---|---|---|
| record | what the world remembers: a fact, an act's result, an entry; immutable, content-addressed | `data/records/<type>-records/sha-256/<d0 d1>.jsonl` | yes | `put` |
| state | where a thing stands now: a thread's head, a schedule's last run, a looked-up value | `data/state/<object>-state/<name>.json` | yes | `writeHead` |
| log | an act in time that some consumer reads in time order | `data/logs/<type>-logs/<date>.jsonl` | no | `append` |

Content-addressed objects are records. They are what the world must remember, they never change, and a later record names them by address. Heads are state. A head is the current condition of a thread and is replaced when the thread advances. Logs are the only untracked files; a settlement whose `data/logs` is a link into machine state keeps its logs there.

Bulk bytes (a fetched page, a media file, an arrival packet's raw body) are not records. They are held by immutable content custody (`uri-services-section/services/ni-services-section/services/immutable-content-custody-service`), keyed by their `ni:` address. A record or a log line names such bytes by address.

A **type** names a kind of thing: `claim-session`, `work-arena-move`, `office-incumbency`, `encounter-result`, `clock-schedule`. It is plain lowercase words joined by hyphens, each at most 24 characters and the whole at most 64. It never contains an identifier, hash, date, run, session, peer, dot, version or namespace. The directory name is `dataKindDirectoryName(tier, type)` of eavt-services-section: `<type>-records`, `<type>-state` (the *object* of a head is the type of the thread it heads), `<type>-logs`. A thing that varies per instance is a field of a record or the name of a head file, never a directory.

## 3. Operations

The module is `@red-cup-engineering/semiotic-eavt-services-section/store`. Every function is synchronous. `root` is the settlement root that contains `data/`.

| operation | does |
|---|---|
| `put(root, type, record) -> address` | Writes the record once. |
| `get(root, type, address) -> record or undefined` | Returns the record the address names. |
| `has(root, type, address) -> boolean` | Whether a verified line for the address exists. |
| `each(root, type) -> generator of {address, record}` | Streams every record of a type from its existing NI buckets, in bucket order. |
| `walk(root, type, from, {limit}) -> generator` | Reads a thread: starts at the addresses `from` (a head's frontier) and follows causes. |
| `append(root, type, line) -> void` | Appends one line to the day's log of the type. |
| `readLog(root, type, date, {from}) -> generator of {line, next}` | Streams a day's lines from a byte position; `next` is the position after the line. |
| `logDates(root, type) -> generator of date` | The dates that have a log, in order, from the directory listing. |
| `readHead(root, object, name) -> head or undefined` | Reads one head. |
| `writeHead(root, object, name, head, {expect}) -> void` | Replaces one head atomically. |
| `extend(root, object, name, record, {causes}) -> address` | The one write path for a thread: puts the record and advances the head. |
| `heads(root, object) -> generator of {name, head}` | Streams the heads of a type of thread from the directory listing. |
| `pull(root, remote, object, {limit}) -> summary` | Converges with a peer by heads (section 8). |

**put.** The record is a JSON object of at most 65,536 bytes in canonical form (RFC 8785). Its address is `semanticId(record)` of the semiotic content address (`computer-content-address-engineering-services-section`): the `ni:///sha-256;` name of the canonical CBOR bytes of the record. `put` computes the bucket file with `niBucketPath(address, "ni-path-v1")` under `data/records/<type>-records/`, streams that file looking for a complete line that begins `{"id":"<address>"` and whose record hashes to the address, and returns the address without writing if it finds one. Otherwise it appends one line, `{"id":"<address>","record":<canonical JSON>}` and a newline, in a single write on a descriptor opened with `O_APPEND`, flushes it to disk, and returns the address. If the file's last byte is not a newline (a write that a crash cut short) the write begins with a newline, which makes the cut fragment a line of its own that permissive readers skip and strict discovery refuses. `put` checks nothing about the record's causes. It writes no other file.

**get.** Opens the one bucket file, streams it in 64 KiB chunks, and returns the record of the first complete line that begins `{"id":"<address>"` and whose record hashes to the address. A bucket file that is absent, or holds no such line, gives `undefined`: the record has not arrived. A matching line whose record does not hash to the address is corruption; `get` skips it, and throws `StoreCorruption` only when no valid line follows. The record returned is exactly the JSON that was put.

**has.** `get` without returning the record.

**each.** Opens the bucket files of the type in name order, and yields the records in each in file order. It lists existing bucket names once into a 512-byte presence bitmap, opens only those buckets, and holds one chunk and one record. The bitmap is discarded when discovery ends. It is the only way to read every record of a type, it costs the size of the type, and it is not an index. A reader that wants the latest records, or the records of a period, reads a log or a head; it does not `each` a type and sort.

**Strict discovery.** `each(root, type, {strict: true})` and `heads(root, object, {strict: true})` retain their streaming bounds but refuse malformed, unverifiable or unavailable evidence instead of silently omitting it. Record discovery also refuses incomplete and overlong lines; head discovery validates every frontier. Strict record/head leaf entries must be regular files. They are opened with no-follow and nonblocking flags and checked on that same descriptor before reading; symbolic leaf links, FIFOs and directories are refused. A platform without those flags refuses strict discovery. This does not change the separately supported log-directory placement. Genuine missing files/directories remain absent, while `ENOTDIR` and other filesystem failures propagate. Structural corruption messages name the path, not the record contents. Existing calls without `strict` retain their permissive behavior.

A strict iterator is complete only after successful exhaustion. A yielded prefix followed by an error is not a complete reading. Discovery is not an atomic snapshot across writers or heads: an authority consumer must name its scope, fully validate referenced records, refuse missing/truncated walks, and perform its own final current-source check. Unchanged head contents do not certify unchanged availability of their referenced bytes.

**walk.** `from` is a list of addresses. `walk` reads each, then the records named by each record's `causes`, and so on, visiting every address once, and yields `{address, record}` in effects-first order (a record before the causes it names). The walk stops after `limit` records (default 256) and yields `{truncated: true}`. An address whose line is absent, including one that disappears between traversal and emission, is yielded as `{address, type, missing: true}` and the walk continues with the rest. A reader that needs causes first collects the walk, bounded by the limit, and reverses it. `walk` visits at most `limit` addresses, and that set is the only memory it holds beyond a chunk and a record.

**append.** The line is one JSON object, at most 4,096 bytes serialized, with an `at` member that is an ISO 8601 UTC timestamp. `append` serializes `at` first, takes the date from its first ten characters, and appends the line and a newline to `data/logs/<type>-logs/<date>.jsonl` in a single write on an `O_APPEND` descriptor. It does not flush to disk. A log is never rewritten, truncated or compacted by the store.

**readLog and logDates.** `readLog` reads a day's file from byte `from` (0 for the start) and yields complete lines only; the consumer keeps `next` as its cursor, a pair of (date, byte position) that it holds itself. `logDates` lists the type's directory.

**readHead, writeHead, heads.** A head is the file `data/state/<object>-state/<name>.json`. `name` is the thread's name as the world names it; characters unsafe in a file name (`/`, `#`, `%`) are percent-encoded, and a thread known by an address is named by that address's 43-character digest. `writeHead` takes a lock file `<name>.json.lock` (created exclusively; a lock older than 30 seconds is taken over), reads the current head, checks `expect` (absent: no check; `null`: the head must not exist; a list: the current frontier must equal it), writes `<name>.json.tmp` and renames it over the head, and releases the lock. If `expect` does not hold it throws `HeadConflict` and changes nothing. `heads` lists the directory and reads each file, so it costs the number of live threads of the type, not their history.

**extend.** `extend(root, object, name, record, {causes})` is how a thread grows. Under the head's lock it reads the head's frontier, puts the record with `causes` set to the given causes (default: the whole frontier, so the record follows everything the writer saw), and writes the head with the frontier `(old frontier minus the record's causes) plus the new address`. It returns the address. The type of the thread's records is `object`.

## 4. Layout

```text
<settlement>/data/
  records/<type>-records/sha-256/<d0 d1>.jsonl     one line per record, appended; up to 4096 files per type
  state/<object>-state/<name>.json                 one head per thread
  logs/<type>-logs/<date>.jsonl                    one line per logged act, appended
```

There is nothing else under these three directories. The store writes no file for admission, no ledger, no checkpoint, no segment, no lock outside a head's momentary lock file, no cache.

**Record bucket line.**

```json
{"id":"ni:///sha-256;u5yPnxwoHIiZsq13NeBOHvWCiRwXdQlnP6hFB3vgBv8","record":{"at":"2026-10-12T01:02:03.456Z","by":"emsenn/services/561-group/services/561-group-services-section#chief-engineering-officer","causes":["ni:///sha-256;LPJNul-wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ"],"move":"promise","thread":"ni:///sha-256;LPJNul-wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ"}}
```

The line is the JSON value and its address, about 70 bytes more than the JSON alone. The file is read with `less`. A bucket is `sha-256/<d0 d1>.jsonl`, the formula's own path: the algorithm, then the first two characters of the digest.

**Head file.**

```json
{"name":"request-z4hhneigzmyuzza1ieuobj1q","frontier":["ni:///sha-256;u5yPnxwoHIiZsq13NeBOHvWCiRwXdQlnP6hFB3vgBv8"],"at":"2026-10-12T01:02:03.456Z"}
```

`frontier` is the list of the thread's maximal records, sorted; an entry is an address, or `{"type","id"}` where the thread crosses types. `closed: true` may be added by the writer that puts a thread's terminal record, so that a reader listing open threads skips it from the head alone. A head holds addresses and that flag; it never holds a copy of a record's contents.

**Log line.**

```json
{"at":"2026-10-12T01:02:03.456Z","schedule":"clock-heartbeat","outcome":"ok","ms":38}
```

**Git.** A section's repository marks `data/records/**/*.jsonl` with `merge=union`, so two checkouts that appended to the same bucket merge by keeping both sets of lines. A record's line is the same wherever it was written, so the union is the set of records.

**Case.** The formula uses base64url, which is case-sensitive; stores live on case-sensitive file systems, as every machine of the house does.

## 5. Addresses and verification

The address of a record is `semanticId(record)`. Content equals address: `get` recomputes the address from the JSON it reads and refuses a line that does not match. The type is not part of the address; the same JSON put under two types is two files with one address, and a reference names the type when it leaves the referrer's own.

**References.** A `causes` entry (or any field that names another record) is a string, the address of a record of the referrer's own type, or an object `{"type": "<type>", "id": "<address>"}` for a record of another. `walk` follows both.

**Typed identity.** `identifyJsonSemanticContent` (the SEN envelope identity) is not used by the store. A record that must also carry a typed semantic identity carries it as a member. The JSON-to-SEN bridge (`jsonToTerm`) remains a codec for consumers that reason in semiotic expression notation; it is applied to a record after it is read, in memory, and a term is never stored. This closes `sen-json-bridge-multiplies-every-record`: a record's line is its JSON, not 11 times its JSON.

**Size.** A record over 65,536 bytes of canonical JSON is refused. Larger content is bytes in content custody, named by address from a small record.

## 6. Threads

A thread is a set of records that follow one another by causes: a work intent's ledger, a work arena thread's moves, an office's incumbency claims, an encounter run. The thread's name is the world's name for the thing: the intent's id, the arena thread's id (the address of its opening move), the office's id.

**Writing.** `extend` puts the next record with its causes and advances the head. Two writers that extend the same head at once, one after the other under the lock, make a chain; two nodes that extend the same thread without having seen each other make two maximal records, and the frontier holds both. Nothing coordinates them: the records are monotone facts.

**Reading.** `readHead(root, type, name)` gives the frontier; `walk(root, type, frontier)` reads the thread, newest causes first, as far as the reader needs. A reader that wants the standing of a thread folds the walk. A reader that wants whether the thread changed compares frontiers: equal frontiers are equal readings, since every address is the content of its record and its causes. This replaces the revision strings of `revisionOfSubject` and `revisionThroughDate`.

**Listing.** A board of threads is `heads(root, type)` with each head's walk read to the depth the board needs. The cost is the number of open threads, and a thread whose head says `closed` is skipped without a walk.

**A record whose cause has not arrived.** `put` stores it as written. Nothing is held, queued or recorded for it. A reader that walks to the missing cause gets `{missing: true}` for that address and decides what a thread with a hole means for its question: a judge of the thread's legality reads such a thread as not yet judgeable; a reader that wants only the newest record is unaffected. When the cause arrives it arrives as a `put` of the same JSON, which has the address the effect already names, and the next walk passes through it. No process notices the arrival, because none was waiting. Cycles cannot occur: a record's address depends on its causes' addresses.

**Validity.** The store checks that a record is JSON of the right size and that its line hashes to its address. It does not judge a record's legality, its causes' types, or whether a cause is itself blocked. Those are judgments of the consumer that folds the thread (the work arena's legal-move rule, an office's incumbency rule), made at read time over the records that exist.

**Idempotence.** A request that must be applied once (the old `interaction` unique slot) carries its request identity in its record; the same request is the same record and the same address, so `put` writes it once. An effect chain that admits one successor per predecessor is `extend` with `expect` set to the predecessor's frontier: the second successor gets `HeadConflict`.

## 7. Logs

A log line is an act that some consumer reads in time order: a service's start and stop, a schedule's run, a token count per turn, an operation's receipt that a console tails. An act that no consumer reads is not logged. A clock tick that runs nothing writes nothing.

**What a line holds.** The line holds what its readers need and `at`. It does not hold a claim, a seat, a time apart from `at`, causes, a payload wrapper, source artifacts, a witness body or any copy of a rule, an invocation or an output. What is too large or too important to be a few fields is a record, and the line names it by address (`"of": "<address>"`); bytes are named by their `ni:` address from content custody. A line is at most 4,096 bytes; a writer with more puts a record and logs its address.

**Who reads by time.** A reader that follows a log keeps its own cursor: the date and `next` of its last line. It does not scan a type for lines since a time; it opens the day files from its cursor on. A reader that wants a period reads the day files of the period.

**Examples of what is logged:** `service-lifecycle` (`at`, `service`, `event`, `ok`), `schedule-run` (`at`, `schedule`, `outcome`, `ms`), `claim-session` (`at`, `thread`, `of`, for the dispatch readout that reads the ledger by date), `work-outcome` (`at`, `of`, `verdict`, for reads by judged period), `arrival` (`at`, `from`, `kind`, `of`). The record behind a line is a `put`; the line is the time-ordered handle.

**Logs are local.** A peer never receives a log. Peers converge on records through heads (section 8).

## 8. Exchange between peers

Two nodes converge on a type of thread by exchanging heads and the records the heads reach. No node lists what it holds.

`pull(root, remote, object, {limit})` does, for at most `limit` heads of a page:

1. Ask `remote.heads(object)` for `{name, frontier}` pairs.
2. For each pair whose frontier differs from the local head: walk the remote frontier with `remote.get(type, address)`, putting each record, stopping at every address the local store already `has`.
3. Write the local head with the frontier made of the maximal addresses of the old frontier and the remote's: an address that appears as a cause, within the records walked or the local ones read back to the meeting point, of another is dropped.

The work is bounded by how far the two threads diverge. The remote is anything that answers `heads(object)` and `get(type, address)`: another node over HTTP or A2A, a directory of files. The transfer unit is a head and a record, not a day's holdings. `settlementHoldings`, `settlementTransfer` and `mergeSettlementTransfer` are replaced by it.

## 9. What is deleted

Everything below leaves the package in the change that realizes this specification. No reader of the earlier layout remains.

- Admission facts and every store of them: the located buckets (`admitted`, `blocked`, `pending`, `waiting`, `artifacts`, `sources` under `data/state/log-state/causal-admission/v3`), the earlier v2 index files, the carry from v2 to v3, the formula marker.
- Ledgers (`<date>-admit-<kind>.jsonl.admitted`), verification checkpoints (`segment-verified`), packed segments (`.packed.json`, hole punching, frame readers), thread membership facts (`threads/`), the pending and waiting sets, the blocked-witness machinery and the causal substrate that promoted quarantined witnesses.
- The witness: `journalWitness`, `parseJournalWitness`, the witness core, the site constitution, the primitive articulation, the six source artifacts per row, the unique-slot command, and `bytes`, `core`, `observation`, `address`, `payload` as stored members.
- The segment store, its reading caches (4 MB, 4 MB and 6 MB budgets), its `.witnesses` files, its oversized-packet area (`journal-packet-logs`) and object area (`journal-object-logs`), and `data/state/log-state` entirely.
- The semantic-record journal: `createSemanticRecordJournal`, `recordSemanticRecord`, `createSettlementStore`, `querySettlementRecords`, `querySemanticRecords`, the category queries, `readSemanticRecordsSince` and its cursors, `iterateSemanticRecordsThroughDate`, `queryJournalDay`, `admitJsonlOnce`, the configured and admitted record commands, the reference and response checks, the retirement inventory and replay.
- The term index and the field index. A search index is a derived readout owned by the feature that searches; a lookup by field value is a head named by the value.
- Per-instance feeds, dotted or versioned kinds, act and kind repeated in a log's file name (`<date>-admit-<kind>`), date directories above the type, and the `journals` directory.
- The scripts `carry-located-indexes`, `file-instance-feeds-by-type`, `file-journal-store-by-kind`, `unpack-segments`, and their tests.
- In computer-system-engine, the `journal` facade and `FilesystemJournal`, `write-journal-store`, `source-owner`, the territory cache, the frontier and section readers, the settlement exchange by holdings, and the projections that wrote derived state beside a feed (the migration map names each file).
- Compatibility behavior of every kind: no reader of `data/logs/**/*.witnesses`, no fallback to `data/journals`, no shim from an old signature to a new one. A root that still holds `data/state/log-state` or `data/journals` is refused with the instruction to convert it (`store-conversion.md`).

**Kept**: `identity/artifact` (`artifactId`, `addressArtifact`, `verifyArtifact`, `isArtifactRef`) and `identity/text-document`, as content-address helpers; the SEAVT row codecs `admit-seavt-row`, `normalize-seavt-row`, `bind-json-template` and `profile`, which build and check rows and touch no file; the exclusive-create lock of `directory-lock`, as `lock`. **New**: `store`, `layout` (the paths of section 4, built from `dataKindDirectoryName` and the tier table, replacing `store-root`), `exchange`.

eavt-services-section's `data-artifact-address` changes its stem law with it: a day log's file name is `<date>.jsonl` (the act `admit`/`settle`/`commit` and the subject leave the file name; the directory already names the kind and the tier), `parseArtifactStem` reads `<date>` alone, and `dataKindDirectoryName` refuses a subject that is not a type.

## 10. Memory and cost

**What the store holds in memory.** Nothing between calls: no map, set, table, cache, buffer pool, open descriptor, watcher or timer survives a call. A call holds at most one 64 KiB read chunk, one record (at most 65,536 bytes) with its canonical bytes (about the same), and, for `walk`, the addresses it has visited (at most `limit` of them, 52 bytes each, with `limit` 256 by default). A call in flight is therefore bounded by about 0.3 MiB, and the node bounds store calls in flight to 8 (the host, feltos-node item 4), so the store's contribution is at most about 2.5 MiB while any number of records, lines, heads, days and types are on disk. It is below the 32 MB budget by that fixed amount, and it does not move as history grows. `process.memoryUsage()` of a node whose store holds ten million records differs from the same node with an empty store by the calls in flight and nothing more.

**What a call costs in bytes read.** `get`, `has` and `put`: one bucket file, `N / 4096` lines of a type of `N` records, 1 KB per line is 250 KB at one million records; streamed. `walk`: one bucket per step. `readLog`: the bytes of the day from the cursor. `heads`: the open threads. `each`: the type. Time grows with a type's size; memory does not.

**Outgrowing the formula.** When a type's bucket file passes 1 MiB (about four million records of 1 KB), the type moves to the next version of the formula, which names wider digest spans, by rewriting its buckets; a version never changes and a directory never mixes two. `ni-path-v1` is the only version now.

## 11. Requirements (EARS)

- **ST-1 (ubiquitous).** The store shall locate each record at `data/records/<type>-records/` plus `niBucketPath(address, "ni-path-v1")`, and reproduce `conformance/ni-path-v1.json`.
- **ST-2 (ubiquitous).** The store shall keep no structure from an address, a thread or a time to a location, and no structure derived from the content of its files, in memory or on disk, other than the files of section 4.
- **ST-3 (event-driven).** When `put` is given a record whose address already has a verified line, the store shall write nothing.
- **ST-4 (event-driven).** When `put` or `append` begins and the target file's last byte is not a newline, the store shall write a newline before its line.
- **ST-5 (ubiquitous).** The store shall return from `get` only a record whose canonical address equals the requested address, and shall skip a line that does not parse or does not hash to its id.
- **ST-6 (ubiquitous).** The store shall admit a record by writing its line, and shall not read the record's causes when it does.
- **ST-7 (unwanted behaviour).** If a cause named by a record read in a walk has no verified line, then the store shall yield that address as missing and continue the walk.
- **ST-8 (state-driven).** While a walk has yielded `limit` records, the store shall stop it and say it was truncated.
- **ST-9 (event-driven).** When a head is written, the store shall hold the head's lock, check `expect`, write a temporary file and rename it over the head.
- **ST-10 (unwanted behaviour).** If the head's current frontier does not satisfy `expect`, then the store shall change nothing and throw `HeadConflict`.
- **ST-11 (ubiquitous).** The store shall append a log line as one write, to the file of the date of the line's `at`, and shall never rewrite, truncate or delete a log.
- **ST-12 (unwanted behaviour).** If a record exceeds 65,536 bytes or a log line exceeds 4,096 bytes, then the store shall refuse it.
- **ST-13 (unwanted behaviour).** If a type or object name is not plain lowercase words joined by hyphens within the length limits, then the store shall refuse it.
- **ST-14 (ubiquitous).** The JavaScript memory the store holds shall not depend on the number of records, lines, heads, threads, days or types, and shall not exceed its fixed bound (section 10) per call in flight.
- **ST-15 (ubiquitous).** The store shall start no watcher and no timer, and shall read no file at import.
- **ST-16 (event-driven).** When `pull` meets an address the local store has, the store shall stop walking that branch.
- **ST-17 (unwanted behaviour).** If a root holds `data/state/log-state` or `data/journals`, then the store shall refuse every operation on it and name the conversion.
- **ST-18 (ubiquitous).** The only code that writes under `data/records`, `data/state` and `data/logs` of a settlement shall be the store; no package shall write a side file there by hand.

Each is judged by a test in `test/` that runs the operation on a temporary root. ST-14 is judged by `process.memoryUsage()` of a process that has `put` and `walk`ed over a root holding one million records, against the same process over an empty root: the difference stays below the bound of section 10. The node's receiving test, `check-memory-budget.mjs`, runs the same measurement at the host.

## 12. How consumers change and how a settlement converts

`store-migration-map.md` lists every call site of the current API in every repository of the workspace, `file:line`, with its new form. `store-conversion.md` converts one existing settlement store once: the facts and feed lines that become records, heads and logs, and the rest, which is deleted.

## 13. Review points

These are decisions the design takes. Each can be reversed by changing one named place.

1. **Address law.** The store's address is `semanticId(record)` (canonical CBOR of the JSON), not the SEN envelope identity. This makes verification one hash and removes the 11-times term. It changes every address; conversion rewrites references (`store-conversion.md`).
2. **Causes inside the record.** `causes` is a member of the record, so it is part of the address. A record with different causes is a different record.
3. **Type in the path, not the address.** Cross-type references carry `{type, id}`.
4. **One file per bucket, not per object.** Taken from `ni-path-v1` as it stands. If a type must hold more than four million records, the formula gains a version.
5. **Heads hold frontiers and `closed`, nothing derived.** A board lists open threads by walking each; a faster board is a derived readout of the consumer, not the store's.
6. **Search indexes leave the package.** The term index and field index move to the features that search.
7. **The converter lives on an unmerged branch, deleted after the second world converts.** It is cut from the last commit that holds the earlier store and reads the earlier layout with the earlier readers; `main` holds none.

## 14. Decisions taken in building the store

The store is built as `store` (re-exports), `store-core` (the operations), `layout` (paths, names, refusals) and `exchange` (`pull`, `directoryRemote`); package exports `./store`, `./layout`, `./exchange`. Where this document was silent the build decided as follows, from the glossary term `content-addressed-store` (content equals address, deterministic layout, no load-bearing index) and the Leader's words quoted under basis.

1. **`pull` is the one asynchronous operation.** A peer answers over a network, so `pull` awaits `remote.heads(object)` and `remote.get(type, address)`; either may be synchronous. Section 3's "every function is synchronous" holds for the rest. `pull(root, remote, object, {limit, walkLimit})` returns `{heads, converged, records, truncated}`; `limit` bounds heads per call (default 256), `walkLimit` bounds the addresses one head's walk visits (default 4096).
2. **Truncated pulls make progress without lying.** Reaching addresses is one pass (addresses only), putting is a second pass causes first; a record is put only if none of its causes was left unreached, so "the store has this address" still implies its causes were fetched or absent from the remote. A head whose walk was truncated is not written; the next pull continues from what is now held.
3. **The maximal frontier** of a pull drops an address that is a cause of a record walked from the remote, or that lies behind the local frontier within `walkLimit` records; nothing else.
4. **Type names are letters only.** `^[a-z]+(-[a-z]+)*$`, words of at most 24 characters, whole at most 64: a digit is an identifier or a date and is refused (ST-13). `dataKindDirectoryName` still slugifies; the store checks the name first, and the stem-law change of section 9 belongs to the wave that deletes the old store.
5. **Head names.** `/`, `\`, `#`, `%`, control characters and a leading dot are percent-encoded; a name is 1 to 200 characters. The head file holds `name` (the unencoded name), `frontier` (sorted, one entry per address), `at`, and `closed` only when true. `extend` takes `{causes, closed}`; omitting `closed` reopens the thread.
6. **`walk` order and memory.** The walk is a depth-first pass whose reverse finishing order is effects first for every edge among the visited addresses (also when truncated). It holds the visited addresses (at most `limit`) and a stack of frames; a frame holds its record's causes only when there are at most 8 and otherwise re-reads the record, so no frame holds a record. Records are read again when yielded. Yielded items carry `type` as well as `address`. A bucket line that names the address but does not hash to it is treated as absent by `walk` and `pull` (`get` and `has` throw `StoreCorruption` as section 3 says).
7. **Discovery is bounded and stateless.** `each` observes existing names into a 512-byte presence bitmap and visits only those paths, built through `niBucketPath`, in name order; `logDates` makes one pass of the directory per date, keeping the smallest date greater than the last yielded. `heads` streams the directory without sorting.
8. **`readLog` yields parsed lines**; a line that does not parse as a JSON object is skipped. A line longer than 65,536 bytes plus 1,024 is passed over unread into memory.
9. **The head lock** is a file created exclusively inside `store-core`, older than 30 seconds taken over, waited on up to 15 seconds; `directory-lock` (a lock directory) stays until the wave that deletes the old store, which then retires it.
10. **ST-14 is judged at 30,000 records, not one million.** Writing a million hashed lines would load the machine for minutes; the test fixture writes 30,000 bucket lines and 30,000 log lines, runs the operations, and asserts that what the process retains after collection differs from the same operations over an empty root by under 2 MiB. The one-million measurement remains the node's `check-memory-budget.mjs`.
