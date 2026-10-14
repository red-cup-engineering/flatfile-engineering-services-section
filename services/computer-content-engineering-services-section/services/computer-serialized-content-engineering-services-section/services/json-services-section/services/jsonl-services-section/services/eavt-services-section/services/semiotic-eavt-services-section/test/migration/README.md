# One-time store migration qualification

These are opt-in integration assays for the temporary, never-merge conversion
branch. They use genuine historical writers and readers, the current record
store, and the current ActivityPub queue/transport-admission implementation.
They are outside `test/*.test.mjs` because a normal package checkout does not
contain both independently selected generations of these providers. Running
the assays without the required provider roots fails explicitly; no assay is
silently skipped.

Run from the semiotic-EAVT owner root with exact, dependency-resolved provider
directories and a disposable fixture parent on an appropriate volume:

```sh
MIGRATION_OLD_STORE=/absolute/historical/semiotic-eavt-services-section \
MIGRATION_NEW_STORE=/absolute/current/semiotic-eavt-services-section \
MIGRATION_OLD_ACTIVITYPUB=/absolute/historical/activitypub-services-section \
MIGRATION_NEW_ACTIVITYPUB=/absolute/current/activitypub-services-section \
MIGRATION_FIXTURE_PARENT=/absolute/disposable-migration-fixtures \
node --test test/migration/*.test.mjs
```

The fixture parent must exist and must not be under `/tmp` or `/var/tmp`, in
accordance with the converter's same-volume custody restriction. Each assay
creates its own fresh subdirectory there and retains source, candidate, and
report artifacts for inspection. Do not point any provider or fixture path at
a live settlement, queue, or host.

The sixteen cases check:

- Five world records, their causal heads, unchanged originals, and restoration
  of the historical reader before any new writer starts.
- Two primary-health records and the same original-custody/restoration checks.
- A genuinely empty historical world as a qualified zero-record conversion.
- Three ActivityPub custody records, exact cited body bytes, and pending queue
  bytes accepted by the current wire reader, without delivery activation.
- An unadmitted pending queue item retained only in original custody, which
  makes the conversion unqualified.
- Archived ready and claimed custody, both of which make conversion unqualified.
- Refusal when ActivityPub queue custody was not explicitly selected, while a
  genuinely empty queue with ordinary `ready/` and `claimed/` directories qualifies.
- Candidate/report symlink aliases into original custody, refused before writing.
- Genuine by-kind guard output from the preserved historical filing script for
  both world and ActivityPub conversion, with the marker and originals unchanged.
- Arbitrary/malformed guard files and redirected journal roots, which are refused.

ActivityPub conversion requires `--queue` and an unused candidate queue destination;
its report never treats an uninspected queue as empty. Historical journal roots
must be ordinary in-custody directories. The only accepted non-directory root is
`data/journals` containing the exact two-line guard emitted by the historical
filing script, with a valid ISO date and ordinary sibling `data/logs`. Externally
linked historical stores require a separately established custody-root binding;
these assays do not qualify that layout.

The kind-layout custody regressions remain at their original PR133 paths and
run with the unchanged ordinary package-test wildcard. Their explicit command
is:

```sh
node --test test/file-journal-store-by-kind.test.mjs \
  test/file-journal-store-packed-custody.test.mjs \
  test/file-journal-store-dated-directories.test.mjs
```

These fixtures qualify source behavior only. They do not establish full host
graph compatibility, actual retained-store conversion, real broker settlement,
network delivery, deployment, activation, or permission to advance source pins.
Keep the historical migration tools on the temporary conversion branch; do not
restore retired readers to `main`.
