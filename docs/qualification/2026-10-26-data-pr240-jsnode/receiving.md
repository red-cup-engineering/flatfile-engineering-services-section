# Data PR240 received by the original JSNode consumer

The prospective Data source passed the original JSNode consumer's bounded native fabrication and projection qualification on 2026-10-26. The retained run has 12 tests, 12 passes, and no failures, cancellations, skips or external inference calls. This closes the original PR's request for genuine native consumer evidence for the specified source composition.

## Source and supplier custody

The Data composition is canonical `aa97dbafcb23d6f706edab52784621ee11b26467` with the two original PR240 blobs from `dc7a14beadb8884ef2dc424fdf5a209056c6d121`:

| Path | Git blob |
| --- | --- |
| `src/artifact-fabrication.mjs` | `7f3ea7870a04ad0008b7ba388de3e6b8a0d604b8` |
| `test/artifact-fabrication.test.mjs` | `37d3fc0948a514cdc85e21ce9411c9f5995609c3` |

The consumer is `red-cup-engineering/jsnode-package-engineering-services-section` at canonical main `2f4d07de3b92b54bdc7acc95914dfd70fa31a812`, received from immutable `@red-cup-engineering/jsnode-package-services-section@0.5.1-dev.4` with the same `gitHead`. Its 117 source files match canonical Git blobs. The published package manifest differs from the repository manifest and is retained without alteration; both identities are in `source-custody.json`.

The consumer still declares Data `0.7.0`. This qualification explicitly selects the prospective Data source whose actual manifest says `0.7.1`. It does not relabel that source as the published `0.7.0` release. The other 19 direct consumer dependencies are existing installed suppliers at their exact declared versions, with their own importer-relative transitive closures. Their real paths, manifest hashes, versions and declared dependency maps are retained. The prospective Data closure uses the eight original suppliers already qualified by the parent Data run. No package manifest, lockfile, shared package or supplier implementation was modified.

`source-custody.json` is an executable receiving input: the authored test reads it and verifies every retained consumer source file, the original published manifest, all selected direct supplier manifests, and both prospective Data blobs before accepting the consumer binding. The file also preserves the prior full Data result of 267 native passes; the consumer receiver inspected that result and did not repeat or claim ownership of that run.

## Native behavior received

The three unchanged consumer test files are:

- `test/connected-module-fabrication.test.mjs`: the original connected module and independent assay-lot control family. It retains the original order, assays connected modules together, keeps source generation blind to prior cases, retains failed composition lots, avoids automatic repurchases, refuses undeclared imports before execution, and reports zero external inference calls. This top-level assertion script is counted as one test-file result.
- `test/project-jsnode-modules.test.mjs`: three native tests cover source-module projection, schema-bound NDJSON execution through the original code-layer runner, unsafe path/import/schema refusal, minimal projections, and checked-in catalog equality and execution.
- `test/fabrication-records.test.mjs`: one native test receives real translatable Work orders and refuses arbitrary specification files as fabrication records.

The seven authored controls in `consumer-receiving.test.mjs` verify exact source and supplier custody, ordinary Work and shared acyclic schemas, and typed refusal of cycles, getters, excessive depth, excessive visited values and sparse arrays. Both original consumer planning and derivation operations receive the malformed Work. Refusal remains in `artifact-specification-admission`, preserves the original Data refusal as its cause, and occurs before inference. The getter count remains zero. No replacement schema, digest or supplier is supplied.

## Deterministic reproduction

Receive the exact original consumer source and suppliers recorded in `source-custody.json` into an isolated consumer directory. Bind only its Data dependency to the exact prospective source. Set the following three variables to the absolute paths of those received directories and this qualification directory, then run the original tests and authored controls with Node v24.22.1:

```sh
cd "$FABRICATION_CONSUMER_ROOT"
HOUSE_ROOT="$FABRICATION_CONSUMER_ROOT" node --test --test-reporter=tap \
  test/connected-module-fabrication.test.mjs \
  test/project-jsnode-modules.test.mjs \
  test/fabrication-records.test.mjs \
  "$FABRICATION_QUALIFICATION_ROOT/consumer-receiving.test.mjs"
```

`FABRICATION_CONSUMER_ROOT`, `FABRICATION_DATA_SOURCE_ROOT`, and `FABRICATION_QUALIFICATION_ROOT` must be exported. The authored controls remain outside Data's ordinary unit-test tree: consumer receiving is an explicit downstream qualification, and does not add a JSNode runtime dependency to Data.

`HOUSE_ROOT` is the existing original code-layer resolver option. Its received package map contains only the isolated JSNode source, with no duplicates; the remaining packages resolve normally from their selected installations. The first attempt omitted this explicit host binding. The resolver then discovered unrelated prior receiving trees above its installed source and selected an incomplete URI source, causing two projected-CLI checks to fail before target code. `ambient-root-refusal.tap` retains that 10-pass/2-failure attempt. Selecting the intended house root corrected the receiving environment without source or provider changes.

## Claim boundary

This is native source receiving for the exact prospective composition. The original connected-assay test executes literal local fixtures in temporary child processes and uses its existing test-only controlled executor. It does not establish that executor as a production security sandbox or prove independent real-world writers. The run makes no model calls or purchases and performs no package installation, payment, runtime deployment or hosted source write. Publication and deployed consumer selection require their original owner receipts. The retained TAP and source-custody hashes identify the evidence supporting this bounded result.
