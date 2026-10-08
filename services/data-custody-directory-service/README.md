# Data custody directory service

Resolves and verifies the three lawful subdirectories under a section's
`data/` — `logs` (journals, event streams), `records` (dated receipts,
settlements, attestations, deployments, projections, schemas), and
`state` (runtime trees, caches, reservations, locks, task stores,
content-addressed stores) — the only shapes durable state or receipts may
take; every other `data/<topic>/` name is unlawful.

A service that writes durable state parameterizes this package with its
own root and cell names instead of hand-rolling `join(root, "data",
"state", ...)` literals.

## Action surface

| Script | Export | Binary | Meaning |
| --- | --- | --- | --- |
| `scripts/resolve-data-custody-directory.mjs` | `resolveDataCustodyDirectory` | `resolve-data-custody-directory` | root + kind (+ segments) to an absolute directory, optionally created |
| `scripts/check-data-custody-directory.mjs` | `checkDataCustodyDirectory` | `check-data-custody-directory` | root to a conformance report of its `data/` directory |
| `scripts/migrate-data-custody-directory.mjs` | `migrateDataCustodyDirectory` | `migrate-data-custody-directory` | root/data-dir to a migration plan, or applies it and re-verifies |

`src/data-custody-directory.mjs` exports the pure `dataCustodyDirectory`
and `dataCustodyDirectories` functions the scripts wrap; it performs no
I/O. `src/migrate-data-custody-directory.mjs` exports the pure
`classifyDataCustodyEntry` classifier plus the I/O-performing
`planDataCustodyMigration`, `applyDataCustodyMigrationRow`, and
`applyDataCustodyMigrationPlan` the migration script wraps.

### resolve-data-custody-directory

```sh
resolve-data-custody-directory --root /path/to/section --kind state locks
resolve-data-custody-directory --root /path/to/section --kind records --create
```

Prints the resolved absolute path. `--create` makes the directory
(`mkdir -p`) before printing.

### check-data-custody-directory

```sh
check-data-custody-directory --root /path/to/section
```

Prints `{root, dataDirectory, conformant, offenders}` as JSON — the
deriving tool a verifier runs instead of hand-surveying a `data/`
directory. Exits 1 when `conformant` is `false`. A missing `data/`
directory is conformant with an empty `offenders` list.

### migrate-data-custody-directory

```sh
migrate-data-custody-directory --data-dir /path/to/section/data
migrate-data-custody-directory --package /path/to/section --plan
migrate-data-custody-directory --package /path/to/section --apply
```

Classifies every offending top-level `data/` entry into exactly one of
`logs`, `records`, `state`, or `purge` (an empty directory), determined
from the entry's own name, extension, and — for a `.json` file — its
top-level fields: never guessed. `--plan` (the default) only prints the
plan; nothing changes on disk. `--apply` moves each classified entry to
`data/<lane>/<entry-name>` (via `git mv` when the entry is git-tracked,
a plain rename otherwise; an empty directory is `rmdir`'d), then
re-runs `checkDataCustodyDirectory` as a gate and exits 0 only when zero
offenders remain. An entry the rule cannot classify is a refusal —
`--apply` leaves it untouched and exits 1, naming it in `refusals`.
Prints one JSON document: `{kind, dataDir, rows, refusals, applied,
offendersAfter, ok}`.

## Seat

Seated as a child of `@red-cup-engineering/flatfile` (the flatfile
section owns the byte-touch; this child owns where a service's flatfile
data may live).
