# File receipt storage

## Requirement and ownership

Git integration and GitHub event ingestion require the same process/restart receipt
and claim storage. Storage cannot require Git to depend on GitHub ingestion, nor
can moving ingestion into GitHub Services introduce a Git-to-GitHub dependency cycle.
This existing Flatfile section owns the shared file implementation; consumers own
event identity, replay law, external effects and the explicit storage location.

## Source lineage and unchanged contract

`src/file-receipt-store.mjs` is moved byte-for-byte from
`red-cup-engineering/github-event-ingestion-service` (formerly
`github-semioverse-settler-service`), commit
`fe92a77fba1e3660e71ec916dea616c7bf13e4de`, `src/file-receipt-store.mjs`.
Its SHA-256 is `48fd822e9d3f34d7acc3919a383146b338fe45bbc8fec0e0808e858558bd299e`.
Original copyright/authorship and history remain with that source; this is not
a newly invented store, compatibility wrapper or alternate journal.

The API is `FileReceiptStore(path)`, `get`, `put`, `claim`, `getClaim`, and
`clearClaim`. The original explicit JSON path, `.lock/owner.json`, `.claims/`,
SHA-256 event-key filenames, JSON serialization and claim IDs are unchanged.
There is no automatic path migration, schema retagging or live-state rewrite.

Receipt publication serializes competing updates under a directory lock and
checks its original device/inode and lock token before and after rename. A live
writer never expires by age. Dead, malformed or incomplete lock ownership requires
exclusive owner recovery; import and ordinary retries do not remove it. Existing
uncertain claims survive restarts and may only be cleared with their matching ID.
Malformed stored JSON refuses rather than manufacturing an empty store.

The implementation retains its original process/restart guarantee. Unlike this
section's separate `writeFlatfile` API, it does not fsync receipt/claim files or
directories and makes no power-loss durability claim. Relocation does not silently
change concurrency semantics by replacing its primitives with a different API.

## Migration and qualification

Add the public `/file-receipt-store` export to this existing package. Git imports
it directly for its integration-eligibility CLI and original concurrency tests;
GitHub Services imports it directly for ingestion. Neither consumer retains a copy
or re-export. Candidate archives are identified by digest until the existing
publication route provides a real release; an unissued registry version is not
represented as installed.

The original Flatfile suite remains enrolled. Generic original store lock/claim
tests run here; original Git reducer concurrency, denial-preservation and restart
tests run at the real Git consumer. GitHub ingestion retains its own Actor/HTTP
duplicate-effect and historical-format identity tests. Source integration,
publication, downstream installation and live acceptance remain separate gates.
