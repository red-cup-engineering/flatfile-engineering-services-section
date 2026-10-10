---
title: "Note on data bloat and drift in data/records"
description: "What the 130 data/records directories of the house hold, which of it is derivable, duplicated, unread or hand-written, and the data theory that decides each case."
date-created: 2026-10-09
type: note
status: measured on the tracked tree at commit of 2026-10-09 ~16:00Z; findings are inputs to the specification of record kinds and their carriers; nothing was removed
owner: computer-data-engineering-services-section
keywords:
  - data-records
  - record-kind
  - derivable
  - content-address
  - signcell
  - flatfile
  - metered-derivable-journal
provenance:
  authors:
    - bare-cedar-fog-claude (Hai Jian), office senior-engineer, incumbency bare-cedar-fog-claude-as-senior-engineer
    - claude-sonnet-5-5 (the carrying model)
  received-under: engineering-services-section/lib/agency/skills/realize-research-grounded-engineering-work/SKILL.md
  duty: engineering-services-section/lib/agency/duties/realizing-allocated-engineering-work.json
  dispatched-by: the Leader's standing direction of 2026-10-09, through Bare Cedar Fog's Claude character
  leader-statement: "Look for data bloat and drift, like where we store shit in stupid redundant ways, handwrite json without readers, and so on. We had REALLY strict ideas for how to handle data here, to reduce complexity and cost ... too many handwritten data/records/*/ everywhere, it's very difficult and makes you and other agents keep handwriting json in a vicious cycle." (2026-10-08)
---

# Data bloat and drift in data/records

Paths are relative to `lib/emsenn/services/561-group/services/` (`SVC/`) unless they start with `/`. A section path is shortened to its last name where that is unambiguous; every shortened path is listed by `git -C /home/emsenn/info ls-files -- '*<name>/data/records/*'`.

## The theory the house holds

1. **A fact is stored once, and only if it cannot be derived.** Every invocation is a derivation, an act or an observation. A derivation stores nothing; its output is named by the content address of (operation, input, head) and every cache of it can be discarded. An act is one row. An observation is the bytes that arrived from outside, once, by content address. Observations are the Group's only ephemeral facts. (`engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/content/text/documents/specifications/2026-10-06-metered-derivable-journal.md:40-51`.)
2. **Every term is stored once, by its semiotic content address.** A row is canonical bytes written once, with no parsed copy and no JSON nested in a string; derived readings, indexes and projections are passes over the trace and are never stored fields. (same spec, lines 53-68.)
3. **State lives outside source.** Source holds code, schemas, specifications and authored text. Journals, ledgers, settlements, editions, contracts and records written by jobs are state, and state roots live under the instance's state directory. (same spec, lines 105-117.)
4. **A flatfile is a file whose useful records can be read without a database service.** It commits to inspectable files, not to one serialization. (`engineering-services-section/content/text/glossary/terms/flatfile.md:13-18`.)
5. **A content-addressed store holds entries addressed by the hash of their canonical bytes, immutable once written, with every index derivable from the entries.** (`engineering-services-section/content/text/glossary/terms/content-addressed-store.md:2,32`.)
6. **The semiotic content address is the only content name.** It is `semanticId(value)`: the `ni:` name of the canonical CBOR of the NFC-normalised value. An `ni:` name over `JSON.stringify` output is a valid name of those bytes and is not a name of the value; such names are to be folded into the layers above, and converting stored ones is a migration of the journals that hold them. (`engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/services/computer-content-engineering-services-section/content/text/documents/articles/specifications/2026-09-23-specification-of-the-semiotic-content-address.md:43-56,123-136`.)
7. **A typed record is a SignCell typed mark.** It is the pair (type, content) addressed by `semanticId`, admitted against its type on creation and again on reading; the type is a SignCell schema type. (`engineering-services-section/services/computer-engineering-services-section/content/text/documents/articles/notes/2026/10/08/2026-10-08-logical-inference-model-survey-signcell-data.md:151-155` and `lib/signstuff/signcell/src/typed-mark.mjs`.)
8. **A schema specification that carries `x-codegen` is the one source of a runtime schema carrier;** the generator is `aoe-semantic-carriers-plan`, `-apply` and `-check`, and generated repetitions are not hand-edited. (`engineering-services-section/lib/agency/skills/realize-research-grounded-engineering-work/SKILL.md:118,134`.)
9. **The Leader's statement is the requirement for this note:** data is handled strictly so that complexity and cost fall; a data/records directory of hand-written JSON that nothing reads makes agents write more of it. A kind of record whose only specification is an example file is rewritten by hand each time, because the example is the only way to learn its shape.

## What data/records holds

The tracked tree holds **1,726 files, 76,781,166 bytes, in 130 data/records directories**. They form 141 kind directories under 59 distinct names, and 594 loose files at the records root. By extension: 1,408 json, 88 jsonl, 63 md, 63 source files (46 mjs, 16 py, 1 sh), 16 tsv, 13 yaml, 13 toml, 12 csv, 11 systemd service units and 2 timers, and a 25 MB beancount ledger.

Counts by name, largest first (`git ls-files -- '*/data/records/*'`, grouped on the first path segment after `data/records/`):

| Kind directory | Files | Bytes |
|---|---:|---:|
| schema | 459 | 727,678 |
| editions | 178 | 1,488,445 |
| proposals | 72 | 121,633 |
| knowledge | 11 | 10,448,589 |
| 2026-10-03-redeploy-plan | 30 | 3,184,076 |
| machine-deployment-service-records | 26 | 610,060 |
| 2026-10-03-btc-volatility-premium | 22 | 2,019,472 |
| 2026-10-03-launch-trading | 31 | 720,603 |
| 2026-10-03-attention-paid-onchain | 9 | 961,389 |
| cover-lab | 20 | 72,642 |
| repository-migrations | 12 | 1,773,500 |
| call-lists | 6 | 2,694,328 |
| one beancount ledger at the Hive section's records root | 1 | 25,311,523 |

Where the size sits: one file is 33% of all bytes. Five derivable families together are **46,029,296 bytes, 59.95%** of the tracked records (the ledger 25,311,523; `knowledge/` 10,448,589; the thirteen Obsmetrologia census TSVs 6,933,624; the hard-coded-receiver scan 1,975,373; the medical glossary index 1,360,187).

## Findings

### F1. Derivable families committed as records (46.0 MB, 59.95%)

Each of these states, in its own header or README, that it is generated, and each has a generator in the house.

- **The Hive account ledger.** `engineering-services-section/…/hive-engineering-services-section/data/records/2026-09-05-michael561-hive-account-ledger.beancount`, 25,311,523 bytes, 596,155 lines. Its first line reads "Generated by @red-cup-engineering/derive-hive-account-ledger-service. Do not hand-edit." The generator is `…/hive-ledger-services-section/services/derive-hive-account-ledger-service/scripts/derive-hive-account-ledger.mjs`. The ledger is a function of the account history the Hive chain holds. Law 1 classes it a derivation.
- **`561-group-services-section/data/records/knowledge/`.** Its README says "Nothing here is edited by hand; regenerate it from the corpus" (`SVC/561-group-services-section/data/records/knowledge/README.md:4`) and names the generators: `glossary-census-service/scripts/census-glossary.mjs` and `scripts/project-glossary-skos.mjs`. The directory holds three dated corpus censuses, two glossary censuses with 3.1 MB TSV sidecars each, `corpus/reports.json` (879,861), `corpus/wanted.json` (2,403,515) and the public SKOS vocabulary. Each census is a function of the corpus at a named commit. The directory is derivation.
- **Obsmetrologia census rows.** Thirteen TSVs at `…/obsmetrological-services-section/data/records/<date>-<census>-census-rows.tsv`, 6.93 MB. The same five censuses (identification-site, theorem-axiom, certificate-shape, spine-lineage, identification-key) were re-run on 2026-09-03, 09-04, 09-21 and 09-21b and each run was committed whole. Each run is a function of the theory sources at that commit.
- **The hard-coded payment-receiver scan.** `…/key-management-services-section/data/records/2026-09-05-hardcoded-payment-receivers.json`, 1,975,373 bytes, `rowCount` 3,974, rows carrying absolute `/home/emsenn/info/...` paths. Its generator is `check-set-of-hardcoded-payment-receivers.mjs`. A scan is a reading over the tree; Law 6 files a reading as a monitor result and stores no scan.
- **The medical glossary index.** `…/medical-glossary-delivery-service/data/records/glossary-index.json`, 1,360,187 bytes, derived by `scripts/derive-medical-glossary-index.mjs` from the medical glossary term carriers. The knowledge README treats the same index as scratch input (`--index <scratch>/glossary-index.json`).

The ledger, the censuses and the scan are derivable only if the generator reproduces the committed output. Whether each does is not yet measured; the specification requires that measurement before any retirement.

### F2. The same fact stored under two names or two representations

- **Fifteen groups of byte-identical blobs cover 23 redundant files, 44,004 bytes** (`git ls-files -s`, grouping on blob id across all records).
  - **Cover-lab.** Nine records exist twice in `SVC/public-services-section/services/public-media-services-section/services/public-fiction-media-services-section/data/records/cover-lab/ice-out/`: once under a hand name (`concept-set.json`, `decision-receipt.json`, `cover-generation-receipt.json`, `provider-inventory.json`, `frozen-rubric.json`, `ai-disclosure.json`, `cover-convention-field.json`, `future-ab-experiment.json`, `market-obstruction.json`) and once at `evidence/<Type>/<hash>.json`. The writer is `writeAddressedRecord` at `kindle-publishing-system-services-section/src/cover-lab/records.mjs:21-30`; it writes only `<type>/<hash>.json`. The named copies are not its output.
  - **emsenn-net.** Six byte-identical YAML files named `emsenn-net-drafts-from-*.yaml` (242 bytes each) and six named `emsenn-net-from-*.yaml` (228 bytes each) under `engineering-science-services-section/data/records/`.
  - **Three further groups,** each under 242 bytes, are not itemised here.
  - **Ontology shapes.** `shapes.ttl` is identical in the philosophy and relationality sections.
- **Same-named schemas in several sections.** Thirty-seven `*.schema.json` base names occur in more than one section, among them `category`, `functor`, `presheaf`, `natural-transformation`, `isomorphism`, `identity-morphism`, `composition` (three each) and `fill` (four). After removing `$id`, five schema pairs are identical in content: `carriers/note` (carrier-kind and knowledge-organization), `glossary/terms/term` (term-engineering and term-science), and `chu-space`, `graph` and `morphism` (each at the math section's root and again under `glossary/terms/`).
- **One example set, two formats.** `agency-services-section/data/records/old-engineering-records-training-data-triage-orchestrator-openai.jsonl` (465,007 bytes, 218 examples) and `…-orchestrator-xlam.jsonl` (386,792 bytes, 218 examples) are one training set in two wire formats, and `…-operations-officer-openai.jsonl` is a third. A format projection of one set is a derivation.
- **An acceptance record restates its edition.** In the first-edition chain of `business-management-course-by-course` the acceptance record shares 8 of its 20 leaf values with the edition record (artifact digests, pending obligation ids). The chain edition → proof → acceptance is 178 files, 196,050 + 420,676 + 102,457 bytes, that cite one input digest and restate each other.
- **Two declarations of one machine.** `bare-cedar-fog-services-section/data/records/machine-deployment-service-records/metroplat/` holds `machine.json` and `machine.scm` for the same machine, plus `sources.json` (41,630 bytes) whose commit pins repeat what the lock and the merged pull requests already say.

### F3. Several incompatible content-address functions, and one that is not a content name

- `kindle-publishing-system-services-section/src/cover-lab/records.mjs:5-13` defines its own `canonical()` and `contentId()`: sorted-key JSON text, SHA-256, an `ni:` URI. By the content-address specification (lines 123-129) that is an `ni:` name minted over serialized JSON text: it is a valid name for those bytes and not the name of the value, so the same value gets a different address from the one `semanticId` gives it. Its writer then stores `JSON.stringify(record, null, 2)` pretty-printed (line 25), so the stored bytes are not the addressed bytes.
- `jsonl-services-section/scripts/commit-jsonl-records.mjs` commits sequences under RFC 8785 canonical JSON with a rolling digest and a Merkle root (profile `jsonl-jcs-sha256-sequence-v1`).
- `eavt-services-section/…/semiotic-eavt-services-section/src/query-semantic-records.mjs` reads rows through `identifyJsonSemanticContent` and `dataArtifactAddress`.
- The survey of SignCell records three meanings of "cell" and three near-copies of the cell schema; that duplication sits one layer below the record kinds and is the same drift. (`…/2026-10-08-logical-inference-model-survey-signcell-data.md:211-222`.)

Four address functions, hand-rolled in at least one place, are the mechanism by which agents write records the readers cannot verify.

### F4. Observations and acts held as authored files

- **Hook telemetry and session history as records of a science section.** `science-services-section/…/agency-services-section/data/records/` holds 50 jsonl files, 7,251,478 bytes, named `old-engineering-records-*`. They include ten `observations-triage-archive-observations-*` files of Claude Code hook events (`timestamp, event, tool, session, tool_use_id, input, project_id`), four `session-state-triage-history-*` files of token and cost events, and training-data exports. These are observations (Law 1) of April 2026 sessions. Their `input` field carries tool inputs; a private-information scan under the rule `agency-records-must-not-carry-private-information` has not been run on them.
- **Economic research directories.** Eleven directories dated 2026-10-03 and 2026-10-04 under `emsenn-economic-services-section/data/records/` hold 151 files, 7,300,899 bytes, with `scripts/`, `results/`, fetched `data/`, and `log-*.txt`. The fetched API bytes are observations. The `results/*.json`, `tables.md` and `log-*.txt` are functions of the scripts and the observations.
- **Repository evacuation snapshots.** `561-group-services-section/data/records/repository-migrations/` holds 12 files, 1,773,500 bytes, snapshots of the deprecated repository's branches, comments, issues and pull requests. They are observations and are needed until the evacuation of `emsenn/561-group` is complete (rule `emsenn-561-group-repository-must-not-be-used`).
- **Third-party contact lists.** `land-contracts-services-section/data/records/call-lists/` (6 CSV files, 2,694,328 bytes) and `heir-search-services-section/data/records/lead-lists/` (5 CSV files) hold lists of persons outside the Group. Custody of those belongs to their owning office; this note does not read them.

### F5. Code and runtime configuration filed as records

- **63 source files** live under data/records: the scripts of the economic research directories (`scripts/*.mjs`, `*.py`, `*.sh`), `ai-visibility-assurance-2026-10-03/src/offer-state-machine.mjs` and its test, and `schema/*.schema.mjs` modules in the bibliography and term sections. Code belongs in `src`, `lib` or `scripts`.
- **Unit files and instance configuration.** Eleven systemd `.service` and two `.timer` files under `…/ethereum-engineering-services-section/data/records/systemd/`, `erc-4337-bundler-service`, `erc-7677-paymaster-service`, `paid-data-endpoint-service` and the Marsh host; sixteen job declarations, a 524,810-byte `dependencies.lock.yaml`, `machine.json`, `machine.scm`, `host.json`, `instance.json`, `profile.json` and `release.json` under the Bare Cedar Fog deployment records. Law 5 puts instance configuration and written state outside source. `machine.json` names `/home/emsenn/.config/561-group/bare-cedar-fog.561.group.env`, `/home/emsenn/.local/share/561-group/` and `/home/emsenn/.local/state/561-group/` as roots; the 2026-10-08 correction of the Leader and the rule `group-material-on-bare-cedar-fog-lives-under-info` apply to those roots, and the deployment owner reconciles them.
- **Build scaffolding.** `lakefile.toml`, `lakefile-2.toml` to `-4.toml`, `predication-lakefile.toml`, `predication-pyproject.toml`, `research.toml`, `research-2.toml`, `hugo.toml`, `theme.toml`: an archive migration filed "26 YAML and TOML configuration records" here (commit `53186b457d8`). A record kind of "other configuration" has no reader by construction.

### F6. Schemas: 454 JSON Schemas, none a generator input, 116 identified on a host the house does not serve

- 459 files sit in `schema/` directories: 454 `*.schema.json` and 5 others (2 json, 3 mjs modules). By section: science 323, engineering 71 operation-contract files (`<operation>.input.schema.json` and `.output.schema.json`) plus 37 concept schemas, 561-group 18, public 4, operations 1.
- **Zero of 454 carry `x-codegen`.** The generator's selection rule is `.schema.json` with `x-codegen` (SKILL.md:118). None is therefore input to `aoe-semantic-carriers-*`, and no runtime carrier is generated from any of them.
- **116 `$id` values name `https://research-notes.561.group/hacking/library/...`, and 68 `$ref` values point at that host.** Another 55 sit at `561.group`, 18 at `registry.561.group` and 20 at `active.development.561.group`; about 175 carry bare relative ids (`glossary/terms/term`, `pool-service/...`, `category-theory/...`, `biology/...`); 15 carry no `$id`. The first host names archive paths, not a section path of the house, so a reader that resolves `$ref` by `$id` has no file to load.
- **84 of the schemas live under `schema/glossary/terms/`,** one per glossary term, in a layout that mirrors the term carriers in `content/text/glossary/terms/*.md`. The term carrier is the source of a term; a per-term schema is a second statement of it.
- **The 71 operation-contract schemas have a reader:** the service whose directory holds them admits its inputs and outputs against them (for example `derive-hive-account-ledger.input.schema.json` beside `scripts/derive-hive-account-ledger.mjs`). They are the one kind in data/records with a located consumer.

### F7. EAVT journals carry a migration stamp as their time

The 78 jsonl files of the logic, agency and relationality sections hold 8,595 rows. 137 are EAVT-shaped (`e,a,v,t`) concept rows with 11 distinct `t` values; the other 8,458 are hook and session telemetry with a `timestamp` field and no EAVT shape. The logic section's 26 jsonl files (22,323 bytes) state, per concept, `describing`, `defined-at`, `having-data-shape`, `consuming`, `specializing`: that is the SEAVT shape of the held theory and is correct as a carrier. Its `t` is the instant of migration (`2026-05-20T00:00:00Z`), not the instant a fact was observed. These rows restate the glossary term carriers (`describing` repeats the term's description) and so are derivable from them.

### F8. Readers: what was established and what was not

- Located by name in the house, with a consumer: the 71 operation-contract schema pairs; the cover-lab evidence directory (`records.mjs`); the knowledge, ledger, scan and index families (generators, not readers: they write the files and nothing in the house was found that reads the committed copy).
- Not located: any loader for the 323 science concept schemas, the agency archive's 50 jsonl files, the 13 Obsmetrologia census TSVs, `call-lists`, `lead-lists`, `proposals/` (marked "not enacted" in its README) and the `personal-services-setup/2026-09-30/` receipts.
- GitHub code search over `red-cup-engineering` could not settle absence. Every query that completed returned no results, among them `x-codegen`, `EbookEditionProof`, `census-glossary`, `project-glossary-skos`, `derive-hive-account-ledger-service` and `check-set-of-hardcoded-payment-receivers`, names that exist in the house. The remaining queries failed on the limit of 10 code-search requests a minute that all agents share. The org index is therefore not a reader oracle, and reader status is established by the kind declaration that the specification requires and the monitor that checks it.

## Findings in the Leader's terms

- **Stored in stupid redundant ways:** the derivable families of F1 (46.0 MB), the byte-identical pairs of F2, the three-record edition chains, two address functions that name one value two ways, and one training set in three files.
- **Hand-written JSON without readers:** the 323 science concept schemas, the loose archive records, the setup receipts, the proposals tree and the cover-lab named copies. Each lacks a declared kind and a generated type, so each is copied from the previous example.
- **Kinds a generator should emit:** the ledger, the censuses, the scan, the index, the SKOS vocabulary, unit files from `machine.scm`, training-set projections, per-term schemas from term carriers, acceptance records from editions, and the EAVT `describing` rows from term carriers. Each has, or is one small step from, a generator that exists.

## Where this goes

The requirements, the design of the carriers and the migration are in `SVC/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/content/text/documents/articles/specifications/2026-10-09-specification-of-record-kinds-and-their-carriers.md`.

## Not yet derived

- Whether the generators reproduce the committed ledger, censuses, scan and index byte for byte; the specification makes that the retirement condition.
- Which agency-archive observations carry private values in `input`.
- The consumers of the science concept schemas, if any, outside the house.
