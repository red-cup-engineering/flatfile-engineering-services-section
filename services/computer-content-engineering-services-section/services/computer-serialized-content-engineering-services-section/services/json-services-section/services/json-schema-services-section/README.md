# JSON Schema service

This capability cell owns deterministic JSON Schema documents, bounded local
resolution, validation, policy inspection, schema-assertion traces, and the
path-addressed reading, writing, searching and census of schema artifacts. It
is deliberately not a JSON projector: validation is a non-monotone judgment, so
it cannot be a `read` operation.

Each capability has one implementation. Where a capability is offered in more
than one shape, the shapes are faces of that implementation, not copies of it.

## Boundaries

The only admitted dialect is JSON Schema Draft 2020-12. The exported
`SUPPORTED_VOCABULARY` is exact: known Draft 2020-12 assertion keywords outside
that set are refused, rather than silently ignored. Resolution is deliberately
bounded to an explicit in-memory corpus; it never reads a registry, URL, or
working directory, and a URL-scheme `$ref` is external even when a corpus member
carries that `$id`. Callers supply the carriers (documents, corpora, pool
directories, census roots); the service holds no ambient authority of its own.

The pure semantic core is `src/index.mts`, built to `dist/` (`npm run build`).
Several scripts import `dist/`, so build before running them from a checkout;
`npm test` builds first.

## Closed schema contracts

`schemaFromGraph({ root, schemas })` is the explicit, immutable contract face.
Unlike `schemaFrom`, it neither consults nor mutates the declaration registry.
Each supplied `{ id, schema }` must carry the same unique `$id`; compilation
refuses unresolved references and conflicting resource identities.

Absolute public resource IDs retain their URI scope in the evaluator. Relative
references resolve against the nearest `$id`, including nested resources,
parent paths, anchors and JSON Pointer fragments. URI identity grants no network
authority: only supplied resources and their embedded schemas are available.
Bare house IDs retain exact-address compatibility and their private evaluator
projection; if an exact bare address and a URI-relative address select different
supplied resources, admission refuses the ambiguity. Public schemas are never
rewritten. This contract face is distinct from the package root's narrower
corpus API described above.

The adapter shares `resolveSchemaUri` with the existing evaluator. The evaluator's
existing resource/anchor registration gate refuses conflicting document and
fragment claims, including embedded IDs and aliases of private bare-ID addresses.
Indexing and eager reference checks traverse only the evaluator's existing
supported schema-keyword locations; annotation and instance data do not register
resources. This does not add custom-vocabulary support.
There is no second instance judge, URI parser or retriever. See JSON Schema Core 2020-12
sections [8.2](https://json-schema.org/draft/2020-12/json-schema-core#section-8.2)
and [9.2](https://json-schema.org/draft/2020-12/json-schema-core#section-9.2).
The URI and unchanged FeltOS strategy regressions are
`test/contracts-uri-resolution.test.mjs` and
`test/contracts-feltos-strategy.test.mjs`.

## Capabilities

**Admission and judgment**

- `createSchema`, `schemaCorpus`, `resolvePointer`, `validateInstance`,
  `inspectSchema` (package root): the fixed-dialect receipt, the bounded
  corpus, the instance judgment and the authoring-policy inspection.
- `admit-schema`, `assert-schema`, `schema-children`, `resolve-schema-pointer`,
  `resolve-schema-reference`, `validate-schema-instance`: the same judgments as
  request/response operations over explicit JSON carriers.
  `validate-schema-instance` is the bounded process judge; it refuses a known
  keyword it does not implement and checks calendar dates, not date shapes.
- `src/validation.mjs` (`./validation`), `src/contracts.mjs` (`./contracts`),
  `src/profile-admission.mjs`: the house-wide evaluator, the contract registry
  and the profile-assertion helpers.
- `src/schema-evaluation.mjs` (`check-json-schema`, `evaluate-json-schema`): the
  native Hyperjump engine for Draft 4 through 2020-12 over a caller-supplied
  corpus, with failed compilation kept distinct from invalid data and no
  ambient retrieval.

**Schema-assertion pointer cells**

`unfoldSchema`, `foldSchema`, `cohereSchemaAssertions`, `projectSchemaAssertions`,
`mergeSchemaAssertions`, parse/serialize, and the triple, EAVT and identity
projections preserve the historical pointer-cell representation without
conflating it with `$id`, file, digest, or RMN coordinates. The one
implementation is `src/schema-assertion-trace.mjs`; the package root re-exports
it positionally and the `unfold-schema`, `fold-schema-assertions`,
`cohere-schema-assertions`, `project-schema-assertions`,
`merge-schema-assertions`, `parse-schema-assertions`,
`serialize-schema-assertions`, `identify-schema-assertion`,
`schema-assertion-triple`, `schema-assertion-eavt` and `admit-schema-assertion`
operations adapt requests onto it. `src/schema-assertions.mjs`
(`./schema-assertions`) is the separate relating-writing carrier, which
identifies rows by semantic id rather than digest.

**Pools: reading, inspecting, writing, searching**

A pool is a directory of `*.schema.json` files, by default the nearest
`lib/schemas` above the caller.

- `read-schema-pool` reads a pool (`scanSchemaPool` reports every refusal,
  `readSchemaPool` refuses at the first).
- `read-a-schema` is the canonical process face: `read-a-schema NAME` judges a
  stdin instance against a schema named by filename stem or `$id`, `--show`
  prints it, `--list` names the pool; with no arguments it answers a
  `{ pool, name }` request. `readSchema({ pool, name })` is the same lookup as
  an import.
- `inspect-schema-corpus` and `inspect-schema-pool` judge schemas together:
  admission, unique ids, the authoring invariants of `inspectSchema` (declared
  root `type`, satisfiable `required`, resolvable `$ref`, no unused `$defs`),
  agreement of `$id` with filename, and an empty pool as a broken sweep.
- `write-a-schema` (`writeSchema`, `checkSchemaPool`) seats a schema into a
  pool, or refuses and leaves the pool as it was: filename seating, atomic
  retraction, refusal of any schema that would break a sibling, and a negative
  control that withdraws a seated schema that admits the empty object. `--check`
  is the pool inspection.
- `search-path-for-schema` finds the admitted schemas under one canonical path,
  maps each into canonical assertions, and reports what it refused.

**Census**

`census-schema-artifacts` and `json-schema-census` share the one classifier in
`src/census.mts` (also exported as `./census`).
`json-schema-census --root ABSOLUTE_PATH --out ABSOLUTE_PATH` inventories
implementations, consumers, packages, declarations, schema documents, tests,
and documentation by generation; with no arguments it answers
`{ root, maxBytes?, maxFiles? }` on stdin. Its output is recovery evidence. An
archived implementation receives an explicit disposition before physical
retirement; Git history remains the legacy evidence surface.

`json-schema-census --records --root ABSOLUTE_PATH [--rev REV] [--out ABSOLUTE_PATH]`
is the data/records monitor reading of DR-33 in the specification of record
kinds and their carriers. It reads the tracked file list (`git ls-files -s`,
or `git ls-tree -r REV`) and the blobs through `git cat-file --batch`; it
walks no tree and writes no registry. Per record kind (the first segment
after `data/records/`, loose files as `(root).<extension>`) it reports files,
bytes, declared and inferred class, derivable bytes (files that state their
generation, or sit under a README that does), duplicate bytes by blob id, code
files, schemas without `x-codegen`, and reader count. A kind is declared only
by a `.schema.json` carrying `x-codegen` and `x-record-kind`, with
`x-record-class`, `x-record-owner`, `x-record-readers` and
`x-record-generator`; the reader count is the readers those declarations name.
Each kind is read in FOUR on `declared`, `has-reader`, `no-derivable-bytes`,
`no-duplicate-bytes`, `no-code` and `schema-consumed`: ⊥ (nothing told) and f
(told against) are obstructions, ⊤ (told both) is a certificate, t closes.

**Process faces**

`json-schema-cli validate-instance` judges NDJSON requests on stdin.
`scripts/run-schema-operation.mjs` is the one runner behind the per-operation
`bin` names: it reads stdin JSON, dispatches by name, and writes stdout JSON.
`src/route-a-service.js` routes `reading-a-schema`, `writing-a-schema` and
`search-path-for-schema` to their process faces.

Content addressing of schemas is `createSchema`'s receipt (canonical bytes,
SHA-256, and an `ni:` URI); this package does not settle those identities.
