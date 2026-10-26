# Witness Journal Services Section

Holds the services for the witness journal: append-ordered EAVT rows over
RMN claims, where Time is stored and the Trace is the entry's ordinal in
its journal. Journals are logs under `data/logs`; readouts are state under
`data/state`.

## Children (11)

- `witness-journal-entry-service`
- `witness-journal-record-service`
- `witness-journal-log-service`
- `witness-journal-state-service`
- `witness-journal-invocation-service`
- `witness-journal-document-service`
- `witness-journal-coherence-service`
- `witness-journal-cross-feed-reading-service`
- `witness-journal-rdf-projection-service` (+
  `witness-journal-rdf-projection-compatibility-service`)
- `category-reference-index-service`
- `semantic-record-journal-service`
- `settlement-record-store-service`

## Test status (2026-08-27 pass)

All twelve testable children pass — 71 tests, 0 failures: `witness-journal-entry-service` (13), `witness-journal-log-service` (11), `witness-journal-invocation-service` (9), `witness-journal-coherence-service` (7), `witness-journal-record-service` (7), `witness-journal-state-service` (7), `witness-journal-rdf-projection-service` (7), `category-reference-index-service` (3), `witness-journal-document-service` (3), `semantic-record-journal-service` (2), `witness-journal-cross-feed-reading-service` (1), `settlement-record-store-service` (1).

Each service resolves its dependencies from its own `node_modules`,
installed from the local registry (`npm install` per service; the registry
closure repairs of 2026-08-26 made every internal dependency installable).
`witness-journal-coherence-service` additionally needs `npm run build`
before its tests, since its suite imports `dist/`. The earlier
`json-codec-service` `.mts`-shipping failure is resolved upstream — the
published codec ships compiled output. The prior note about dependencies
"vendored in a sibling's `node_modules`" described an arrangement that no
longer exists; per-service installs are the supported path.
