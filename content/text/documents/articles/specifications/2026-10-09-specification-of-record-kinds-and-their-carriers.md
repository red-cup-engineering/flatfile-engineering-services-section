---
title: "Specification of record kinds and their carriers"
description: "Requirements in EARS, specification, design and receiving conditions for moving every file under data/records to a declared record kind, a generated SignCell type, and a content-addressed or derived carrier."
date-created: 2026-10-09
type: specification
status: proposed; not implemented; needs independent receiving (the Senior Engineer does not receive its own outcome); nothing under data/records is removed by this document
owner: computer-data-engineering-services-section
supersedes-practice: hand-written JSON files under data/records/*/ shaped by copying the previous example
keywords:
  - data-records
  - record-kind
  - signcell
  - typed-mark
  - semiotic-content-address
  - metered-derivable-journal
  - x-codegen
provenance:
  authors:
    - bare-cedar-fog-claude (Hai Jian), office senior-engineer, incumbency bare-cedar-fog-claude-as-senior-engineer
    - claude-sonnet-5-5 (the carrying model)
  received-under: engineering-services-section/lib/agency/skills/realize-research-grounded-engineering-work/SKILL.md
  duty: engineering-services-section/lib/agency/duties/realizing-allocated-engineering-work.json
  dispatched-by: the Leader's standing direction of 2026-10-09, through Bare Cedar Fog's Claude character
  findings: ../notes/2026/10/09/2026-10-09-note-on-data-bloat-and-drift-in-data-records.md
  governing: engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/content/text/documents/specifications/2026-10-06-metered-derivable-journal.md
---

# Record kinds and their carriers

Paths are relative to `lib/emsenn/services/561-group/services/`. "The note" is the findings note named in `provenance.findings`. "The journal spec" is the governing 2026-10-06 specification, whose Laws 1-6 this document applies to `data/records`; it adds no law.

## Statement of the theory this specification realizes

- A record is a typed mark. Its kind is a SignCell schema type, its identity is `semanticId` of its content, and admitting it is deciding that content against the type.
- Every record kind has one class: **derivation**, **act**, **observation** or **authored**. Derivations are not stored. Acts are rows. Observations are content-addressed bytes held once. Authored records are source and are written by a person or by a generator from a person's statement.
- Every record kind has one declaration, one emitter and at least one reader. A kind with no reader is an obstruction.
- Agents do not write record JSON. An agent states the content; the emitter built from the kind's type constructs, admits, addresses and writes it.

These sentences follow the Leader's 2026-10-08 statement that the house held strict ideas for data to reduce complexity and cost, and that hand-written `data/records/*/` directories keep agents writing JSON in a cycle. The cycle persists while a kind's only specification is an example file.

## Requirements (EARS)

Each requirement has one *shall*. "Emitter", "monitor" and "migration" are defined in the design.

### Declaration

- **DR-1.** Each record kind shall have exactly one declaration, which is the SignCell schema type generated from a `.schema.json` specification carrying `x-codegen`.
- **DR-2.** Each record kind declaration shall name its class as one of derivation, act, observation or authored.
- **DR-3.** Each record kind declaration shall name its owning section.
- **DR-4.** Each record kind declaration shall name each reader by the generated admitter that the reader imports.
- **DR-5.** If a record kind has no reader, then the monitor shall file an obstruction certificate priced in bytes to the office that owns the kind's section.
- **DR-6.** Where a kind's class is derivation, its declaration shall name the generator operation and the kinds or addresses it reads.

### Writing

- **DR-7.** The emitter shall be the only route by which a record of a declared kind enters a data/records directory.
- **DR-8.** When the emitter receives content for a kind, it shall construct the record with the kind's generated typed-mark constructor.
- **DR-9.** When the emitter writes a record, it shall address the record by `semanticId` of its content.
- **DR-10.** If a record with the same address already exists, then the emitter shall write nothing.
- **DR-11.** The emitter shall write a record's canonical bytes once, with no pretty-printed, parsed or stringified copy.
- **DR-12.** While no generated type exists for a kind, the emitter shall refuse to write records of that kind.

### Derivation

- **DR-13.** A data/records directory shall hold no file whose bytes are a function of committed files and a named generator.
- **DR-14.** When a derivation is retired from source, the migration shall record the generator reference, the input addresses and the output digest in a retirement manifest.
- **DR-15.** Before a derivation is retired, the migration shall run its generator and compare the output digest with the committed file's digest.
- **DR-16.** If the generator does not reproduce the committed digest, then the migration shall reclassify the file as an observation.
- **DR-17.** When a consumer needs a retired derivation, the generator shall produce it into the instance state directory.

### Observation and act

- **DR-18.** The store shall hold each observation once, under the content address of its canonical bytes.
- **DR-19.** When two observations have identical canonical bytes, the store shall give them one address.
- **DR-20.** Each act shall be one SEAVT row in a journal segment, carrying the content addresses of its subject and its effect artifacts.
- **DR-21.** When a later act in a chain concerns the same subject as an earlier one, the later row shall cite the earlier by address and restate none of its fields.
- **DR-22.** Each SEAVT row's `t` shall be the instant the fact was observed or the act completed.

### Code, configuration and state

- **DR-23.** A data/records directory shall hold no code.
- **DR-24.** A data/records directory shall hold no build configuration.
- **DR-25.** The deployment generator shall produce unit files and job declarations from the machine declaration into the instance state root.
- **DR-26.** A job shall write its records only under the instance state root.

### Schemas

- **DR-27.** The house shall hold one schema per concept, with any other section needing it referencing it by `$ref`.
- **DR-28.** Each schema `$id` shall resolve to a file in the house.
- **DR-29.** Each schema shall be consumed by a generator, an admitter or a named reader.
- **DR-30.** The term generator shall derive a glossary term's schema from the term carrier.

### Addressing

- **DR-31.** Every record address shall be computed by `semanticId`.
- **DR-32.** When a stored identity was computed by another function, the migration shall list the old and new addresses in a re-addressing manifest.

### Measurement

- **DR-33.** The monitor shall report, per record kind, the files, the bytes, the class, the derivable bytes, the duplicate bytes and the reader count.
- **DR-34.** When a reading settles to t for a kind, the monitor shall close that kind's obstruction.

### Custody and loss

- **DR-35.** Where a record kind holds contact details of persons outside the Group, the owning office shall decide its custody before the migration moves it.
- **DR-36.** Where a record kind holds hook or tool inputs, the migration shall run the private-information check of the rule `agency-records-must-not-carry-private-information` before moving it.
- **DR-37.** The migration shall retire no authored, act or observation record without a manifest entry and a receiver's verdict.

## Specification

### S1. The declaration is the schema type, not a registry

The skill for engineering work forbids a second generator, registry or specification index around an existing carrier (`engineering-services-section/lib/agency/skills/realize-research-grounded-engineering-work/SKILL.md:134-136`). The declaration of a kind is therefore the `.schema.json` with `x-codegen` that `aoe-semantic-carriers-plan`, `-apply` and `-check` already consume, and the type those methods generate through `defineSchemaType`. The class, owner, readers and generator of DR-2, DR-3, DR-4 and DR-6 are `x-` properties of that specification. The set of kinds is the set of generated types. No separate index is written.

### S2. The record is a typed mark

A record of kind K with content c is `createTypedMark(K, c)`: `canonicalCarrier({kind: 'sign.cell', id, type: K.id, content: c})` with `id = semanticId({kind:'sign.cell', type, content})` (`signstuff/signcell/src/typed-mark.mjs`, described at `…/2026-10-08-logical-inference-model-survey-signcell-data.md:151-155`). `admitTypedMark` re-admits against the receiver's type and checks the identity. The wire kind `sign.cell` is frozen into stored addresses and is kept; the three meanings of "cell" in SignCell are a separate repair owned by the SignCell package and are not widened here.

### S3. The four classes and their carriers

| Class | What is stored | Carrier | Reader reads |
|---|---|---|---|
| derivation | nothing; the generator, its input addresses and the output digest | retirement manifest in source; output in the instance state directory | the generator's output, regenerated |
| act | one SEAVT row `{e,a,v,t}` per act | journal segment, closed days packed | the segment through the EAVT reader |
| observation | the observed bytes, once | content-addressed store (`put`, `get`, `has`) with the off-host replica of Law 5 | the bytes by address, verified on `get` |
| authored | the authored text or data and its schema | source, in the owning section's `content/`, `src/` or `lib/` | the authored file under its schema |

A flatfile layout is kept for inspection: a closed segment is a file of jsonl rows, an observation is a file named for its address, and every index over either is a derived file that can be discarded.

### S4. One address function

`semanticId` is the address of every record (DR-31). The cover-lab `contentId` (`kindle-publishing-system-services-section/src/cover-lab/records.mjs:5-13`) is replaced by `semanticId` through the emitter. Its stored identities, the `evidence/<Type>/<hash>.json` names, are re-addressed by the migration with a re-addressing manifest (DR-32), as the content-address specification states for stored identities of another scheme (lines 123-136). The RFC 8785 text of `commit-jsonl-records.mjs` remains the canonical text surface for sequence commitments and is not an addressing input.

### S5. The emitter

The emitter is a function of (kind, content): it constructs the typed mark, admits it, computes the address, and writes the canonical bytes to the carrier of the kind's class if the address is new. It is generated beside each kind's admitter by the same codegen run, and is exported from the owning package. Agents and scripts call it; they do not hand-write the file. For an agent session the exported emitter is exposed as an allocated native method, so the agent states content and receives the address.

### S6. The monitor

The monitor is a pass over the trace implementing Law 6 for records. Its readings are FOUR-valued predicates per kind: *declared*, *has-reader*, *no-derivable-bytes*, *no-duplicate-bytes*, *no-code*, *schema-consumed*. A reading of ⊥ files an obstruction; ⊤ (for example two declarations of one kind) files a certificate; t closes it. It is implemented in the data engineering section on the existing census instruments (`json-schema-services-section/scripts/census-schema-artifacts.mjs`, `json-schema-census.mjs`) and the existing census service, extended, not rewritten. It reads the file list with `git ls-files` and the generated types; it does not scan the tree.

## Design

### D1. Disposition of each family

The disposition is a judgment of the existing record against the theory and the requirements above. "Retire" is a statement of the target state; it executes only under DR-14, DR-15, DR-16, DR-37 and receiving by a distinct office.

| Family (path under SVC/) | Class | Judgment | Target | Requirements |
|---|---|---|---|---|
| `…/hive-engineering-services-section/data/records/2026-09-05-michael561-hive-account-ledger.beancount` (25.3 MB) | derivation | misaligned: committed output of `derive-hive-account-ledger.mjs` | retirement manifest; regenerate into state on demand; if the chain reads are not reproducible, reclassify as observation and hold in the store | DR-13, 14, 15, 16, 17 |
| `561-group-services-section/data/records/knowledge/` (10.4 MB) | derivation | misaligned: README states regenerate | manifests per dated run; the SKOS public vocabulary kept only if a site consumes the committed copy, else regenerated | DR-13, 14, 15, 17 |
| `…/obsmetrological-services-section/data/records/*-census-rows.tsv` (13 files, 6.9 MB) | derivation | misaligned: re-runs committed whole | keep a manifest per census kind naming the commit it ran at; regenerate on demand | DR-13, 14, 15 |
| `…/key-management-services-section/data/records/2026-09-05-hardcoded-payment-receivers.json` (2.0 MB) | derivation | misaligned: a reading, with absolute paths | monitor result; the ruling it cites remains authored | DR-13, 14, 33 |
| `…/medical-glossary-delivery-service/data/records/glossary-index.json` (1.4 MB) | derivation | misaligned: scratch index | regenerate | DR-13, 17 |
| `cover-lab/ice-out/*.json` named copies (9 files) | duplicate | misaligned: the writer does not emit them | remove the 9 after the re-addressing manifest names them | DR-10, 19, 32, 37 |
| `cover-lab/ice-out/evidence/<Type>/<hash>.json` (11 files) | observation/act | aligned in shape; misaligned in address function | re-address with `semanticId`, same carrier | DR-9, 11, 31, 32 |
| `editions/` (178 files, 1.49 MB) | act chain | misaligned: three records per edition restate each other; Law 5 names editions as state | one row per act (fabrication, proof, acceptance), each citing the previous by address; bytes of artifacts in the store; state root, not source | DR-20, 21, 26 |
| `machine-deployment-service-records/` (26 files, 0.61 MB) | authored + derivation | misaligned: two declarations of one machine; lock and pins committed; home-directory roots | `machine.scm` is the declaration; `machine.json`, unit files and job declarations are generated into state; the lock stays beside the lockfile owner's package | DR-13, 25, 26 |
| `…/ethereum-…/data/records/systemd/` and sibling unit directories (11 services, 2 timers) | derivation | misaligned: instance configuration in source | generated from the owning machine declaration | DR-25 |
| economic `2026-10-0[34]-*` directories (151 files, 7.3 MB) | observation + derivation + code | mixed: fetched bytes are observations; scripts are code; results and logs are derivations | scripts to the owning section's `scripts/`; fetched bytes to the store by address; results and logs regenerated; each directory's README stays authored | DR-13, 18, 23 |
| `agency-services-section/data/records/old-engineering-records-*.jsonl` (50 files, 7.25 MB) | observation, plus training-set derivations | hook and session telemetry are observations; the xlam and operations-officer training files are format projections | observations into the store after the DR-36 check; training formats regenerated from one set | DR-13, 18, 19, 36 |
| `repository-migrations/` (12 files, 1.77 MB) | observation | aligned while the evacuation of `emsenn/561-group` is open | hold; pack into the store when the evacuation completes | DR-18, 37 |
| `call-lists/`, `lead-lists/` (11 CSV, ~3.5 MB) | observation (third-party contact data) | custody undecided | owning office decides first | DR-35 |
| `proposals/` (72 files) | authored, declared "not enacted" | already judged by its README: not law | move to the owning section's proposals content with its README; no schema kind | DR-37 |
| `personal-services-setup/2026-09-30/` (15 files) | act chain | misaligned: 14 receipts of one setup run, named by hand | one act row per step citing the previous | DR-20, 21 |
| `schema/` concept schemas, science (323 files) | authored | no consumer located; 116 `$id`s on an archive host; 37 repeated base names; 5 content-identical pairs | consolidate by concept into one schema per concept with `$ref`; each kept schema gets `x-codegen` or a named reader, else it is moved to the owning section's `content/` as a specification | DR-27, 28, 29 |
| `schema/*.input.schema.json`, `*.output.schema.json` (71) | authored | aligned: consumed by the service beside them | add `x-codegen`; generated admitters replace hand copies | DR-1, 29 |
| `schema/glossary/terms/*.schema.json` (84) | derivation | misaligned: second statement of a term carrier | generated by the term generator | DR-30 |
| source files under records (63: `scripts/`, `src/`, `test/`, `schema/*.mjs`) | code | misaligned | move to the owning section's `src/`, `scripts/` or `test/` | DR-23 |
| build scaffolding toml/yaml at records roots | authored build config for retired builds | no reader by construction | judge each against the section that holds the build; move or retire | DR-24, 37 |
| EAVT jsonl concept rows (logic, relationality: 137 rows) | act rows, derivable `describing` | aligned in shape (`e,a,v,t`); `t` is the migration instant; restates term carriers | regenerate from term carriers with `t` = the term's commit time | DR-20, 22, 30 |

### D2. Why this order

The theory orders work by saved bytes and by risk. Derivations are reversible by regeneration, hold 60% of the bytes, and need no change to any reader that does not read them. Duplicates and code are mechanical and small. Re-addressing and act-chain collapse change identities and readers and come after the emitter exists. Schema consolidation changes the shared vocabulary of the science sections and comes last, with the monitor measuring it.

### D3. Migration steps

1. **Monitor first (read-only).** Implement S6 on the census instruments. Output: the per-kind table of DR-33 for all 130 directories, committed as a derived reading, not as a record. Receiving: the table reproduces the note's counts (1,726 files, 76,781,166 bytes; 459 schema files; 15 duplicate groups).
2. **Retirement manifests for derivations.** For each derivation family of D1: run the generator, compare digests (DR-15), and write the manifest (DR-14). Families whose digest differs are reclassified (DR-16) and wait for step 6. Output: a manifest and a verdict per family. No file is removed by this step.
3. **Emitter and types for the live kinds.** Write `x-codegen` specifications for the kinds that jobs write today (cover-lab evidence, editions, setup receipts, census manifests, deployment records), run `aoe-semantic-carriers-plan`, `-apply`, `-check`, and expose each emitter as an allocated method. Every writer in the house that hand-builds one of these records is replaced by a call to the emitter. Cover-lab's `writeAddressedRecord` is the first consumer; its `canonical()` is removed in favour of `semanticId`.
4. **Re-address.** Re-address cover-lab evidence and any stored identities of a foreign scheme (DR-32). Output: the re-addressing manifest.
5. **Collapse duplicates and misfiled code.** Remove the byte-identical copies and move the 63 source files and the build scaffolding to their sections, each after its verdict (DR-37).
6. **Act chains and observations to the carrier.** Pack editions, setup receipts and agency telemetry into journal segments and the store after DR-35 and DR-36.
7. **Retire the derivations.** After step 2 and a distinct receiver, remove the committed derivations; consumers regenerate (DR-17).
8. **Schemas.** Consolidate the science concept schemas by concept (DR-27); resolve every `$id` to a file (DR-28); generate term schemas (DR-30); add `x-codegen` where a type is consumed.
9. **Close the loop.** Each remaining recurring obstruction class gets a codemod in the existing AOE codemod carrier (Law 6, Plan), so that agents do not edit source by hand.

### D4. What the design does not do

- It does not decide the custody of third-party contact lists (DR-35 reserves that to their owning office).
- It does not rename the SignCell wire kind `sign.cell` or unify its three meanings of "cell".
- It does not create a record registry, a second generator or a second address function.
- It does not change the metered journal's laws; it applies Laws 1, 2, 5 and 6 to files that predate them.

### D5. Costs and units

Units stay distinct: bytes tracked under data/records (76,781,166 today), derivable bytes (46,029,296), duplicate bytes (44,004), files without a declared kind (all 1,726 today), kinds without a reader (to be measured by the monitor), source files in records (63), schemas without a consumer (454 less the 71 operation contracts, to be measured). Engineering effort, receiving effort and recurring maintenance are measured separately by the work board; none is converted to bytes. The recurring cost removed is the checkout of the derivable bytes on every push to main (the node checks the whole superrepo out into `~/.local/state`) and every agent's cost of reading examples to learn a kind's shape.

## Receiving conditions

Each is read by the monitor, not by hand, and is received by an office other than the Senior Engineer's production chain.

1. **Committed derivable bytes under data/records are 0**, down from 46,029,296 (DR-13), and each retired derivation has a manifest and a regeneration that reproduces its digest (DR-14, DR-15).
2. **Duplicate bytes under data/records are 0**, down from 44,004; no two files share a blob (DR-19).
3. **Every record kind has a generated type, a class and a reader** (DR-1, DR-2, DR-4); the count of kinds without a reader is 0 (DR-5).
4. **No code and no build configuration remains under data/records** (DR-23, DR-24); the 63 source files are in their sections.
5. **No instance configuration remains in source** (DR-25, DR-26): zero systemd unit files and zero job declarations under data/records.
6. **Zero stored identities computed by a function other than `semanticId`,** or each listed in a re-addressing manifest (DR-31, DR-32).
7. **Every schema `$id` resolves to a file in the house and every schema is consumed** (DR-28, DR-29); the research-notes.561.group count falls from 116 to 0.
8. **Each edition, setup run and telemetry file is carried as act rows or store entries** whose `t` is the observation or completion instant (DR-20, DR-22).
9. **An agent session writes a record of a live kind by calling the emitter,** observed at a real consumer: the cover-lab pipeline produces a record whose address `semanticId` verifies, with no hand-written JSON in the session transcript.
10. **At least one obstruction class of the monitor is closed by a codemod** with no agent editing source by hand (journal spec, receiving conditions).

## Not yet derived

- Whether each generator reproduces its committed output; D3 step 2 measures it.
- The consumers, if any, of the science concept schemas outside the house.
- Whether the public SKOS vocabulary is consumed from its committed copy by a published site.
- The custody decisions of DR-35 and the private-information check of DR-36.
