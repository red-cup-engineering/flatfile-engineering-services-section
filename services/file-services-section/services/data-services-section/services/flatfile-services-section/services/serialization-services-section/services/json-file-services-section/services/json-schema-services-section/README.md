# JSON Schema service

This capability cell owns deterministic JSON Schema documents, bounded local
resolution, validation, policy inspection, and schema-assertion traces. It is
deliberately not a JSON projector: validation is a non-monotone judgment, so
it cannot be a `read` operation.

The only admitted dialect is JSON Schema Draft 2020-12. The exported
`SUPPORTED_VOCABULARY` is exact: known Draft 2020-12 assertion keywords outside
that set are refused, rather than silently ignored. Resolution is deliberately
bounded to an explicit in-memory corpus; it never reads a registry, URL, or
working directory.

`read-a-schema` is the canonical process face. It discovers only a caller-
selected or nearest upward `lib/schemas` pool, then uses the same pure semantic
implementation exported by this package. Node-local `writing-a-schema`
processes retain filesystem seating, filename policy, atomic retraction, and
negative-control authority; they call this service for schema inspection and
reading rather than carrying copied validators.

The recovered assertion API (`unfoldSchema`, `foldSchema`, parse/serialize,
coherence, projection, and explicit triple/EAVT identities) preserves the
historical pointer-cell representation without conflating it with `$id`, file,
digest, or RMN coordinates.

`json-schema-census --root ABSOLUTE_PATH --out ABSOLUTE_PATH` inventories
implementations, consumers, packages, declarations, schema documents, tests,
and documentation by generation. Its output is recovery evidence. An archived
implementation receives an explicit disposition before physical retirement;
Git history remains the legacy evidence surface.

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
