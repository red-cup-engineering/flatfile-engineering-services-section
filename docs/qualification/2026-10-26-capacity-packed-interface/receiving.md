# Data capacity: public package receiving and caller ownership

## Requirement and original owner

The public Data `resource-capacity-allocation` export must load and execute
from its actual npm archive outside the repository, using declared published
suppliers. Its capacity preflight and allocator are pure compute: callers
retain ownership of their input records, and later input edits cannot rewrite
the already-admitted typed portfolio. Allocation does not reserve capacity,
authorize an actor, execute work or establish a monetary claim.

The source baseline is Data main
`3cc08968c283f803fcb1b29d0282cbdb92f535ec`, including the independently
received fabrication-admission change. The original capacity adapter imported
`../lib/metrologic/src/number/finite-capacity.mjs`, while the Data package
carried only `bin` and `src`. A complete repository could execute that import;
the packed public interface could not. This finding concerns the new source
surface: the separately received existing immutable Data 0.7.1 archive did
not export this capacity interface.

## Corrections

Data now imports the original published
`@red-cup-engineering/metrologic/number/finite-capacity` interface and declares
the exact supplier `0.14.3-dev.1325`. Its solver is Git blob
`953a01e63f35861af53a6e7a89a64eb42be090ee`, identical to the solver previously
selected by the repository-relative import. No solver implementation or new
mathematical claim was copied into Data.

The same admission previously called `Object.freeze` on caller work-lot
records and retained their mutable resource arrays. Native observation showed
that changing a caller resource quantity subsequently changed the returned
lot, while its admitted numeric request retained the old quantity. Admission
now captures the admitted capacity identity and quantity, lot identity,
benefit and resource fields into owned typed records and freezes those owned
records and arrays. Each capacity field is read once during admission; caller
metadata outside the original `dimensionNi`/`quantity` capacity type is not
retained. This also closes the shallow-copy alias that previously retained
arbitrary nested capacity metadata. It preserves
the original NI, quantity, benefit and finite-input rules, solver call, tie
behavior and allocation-result format.

The existing capacity tests now use Data's public named export. They are
included in the archive, named in `receivingTests`, and available through
`npm run test:receiving`. The original five capacity cases are unchanged in
substance. One behavioral control establishes that both admission and
allocation leave input records and containers mutable, then edits caller
identities, benefits, capacities and resource bundles and verifies the
admitted portfolio is unchanged. The same case supplies nested caller-only
capacity metadata, verifies it is excluded from the typed admission, and
mutates it without changing the admitted snapshot. No new capacity schema or
mathematical operation is introduced.

## Original publication machinery

The receiving uses the existing Code package
`@red-cup-engineering/npm-workspace-publication-service@0.14.18`, source
`2caddbcae151b494ac49f38050b8bf5cdfe6c1c2`. Its original
`packRegistryCarrier` makes and verifies the actual npm archive. Its existing
`scripts/assay-carrier-module-graph.mjs` checks that archive's module graph;
the same assay is already used by Code's isolated-carrier publication flow.
No parallel module parser, schema or publication implementation was added.

The original archive is a concrete negative control: Code reports exactly
one `unavailable-carrier-module`, for the capacity adapter's absent relative
Metrologic import. The final archive has 38 JavaScript modules, 37 reachable
modules and no module-graph violations. It carries the original receiver and
no `lib/metrologic` solver copy.

[The repeatable receiving runner](receive.mjs) calls that original Code
machinery, receives the archive into an external consumer directory, checks
the selected providers against Data's exact declarations, executes the
archive's declared capacity receiver, and calls both public named functions
from outside the package. It neither installs nor publishes packages.

```sh
node docs/qualification/2026-10-26-capacity-packed-interface/receive.mjs \
  --source /absolute/data-source \
  --publication /absolute/received-code-0.14.18 \
  --suppliers /absolute/exact-provider-node_modules \
  --output /absolute/new-external-receiving-directory
```

The output parent must already exist. The runner canonicalizes that parent,
requires the output to be strictly outside the real source tree and not its
ancestor, and creates the output once with nonrecursive `mkdir` before reading
package contents or invoking Code. Existing output directories and symlinks
are refused; a previous consumer cannot contribute stale extracted files.
The caller retains ownership of all output, including an empty directory if
a later source or provider read refuses.

Eight bounded runner controls passed against an empty temporary source:
ordinary and `..receiving` children, a symlinked parent into source, an
ancestor, existing empty and populated outputs, and an output symlink all
refuse before source-content reading or packing. A fresh external output is
created once and then stops at the absent source manifest, with no pack or
consumer effect. The 8/8 result took 517.769666 ms and has SHA-256
`0e6df29c7a198b4bbab9bfd2a75fe9d908e7e5b83a8f5814bd2ef0404559cb5a`.
These controls change only the source-qualification runner; the already
received Data archive and six capacity cases below are unchanged.

The explicit provider directory selects genuine already-installed providers;
their importer-relative dependency graphs remain intact. This qualifies
those exact providers with the prospective Data archive. It does not claim
a new clean installation from the registry or installed fleet selection.

## Exact dependency and artifact evidence

Native npm regenerated `package-lock.json` with `--package-lock-only`,
`--ignore-scripts`, `--no-audit` and `--no-fund`. No package installation or
lifecycle execution occurred. All eight prior supplier lock entries are
unchanged. The new entries are the exact Metrologic supplier and its existing
Data 0.2.0 and content-address 0.2.0 dependencies; their upstream contract was
preserved. The root lock identity now matches Data's existing declared 0.7.1.
Lock SHA-256:
`1971a1b0410fc752ed3ade4561a9e4658f3170b75f39241d18a5228dd1f6db6d`.

Metrologic's lock integrity matches the already-received supplier closure:
`sha512-1WcA+2yY0GCd9Wsx66C0OyvEOArJwXgkw2zvp5Wwklu2rxcB/aGR45ZAYFwJz2g65kmU7aBM2kcW1JjTscPBEw==`.
The original Code supplier integrity is
`sha512-dRfdb5nVmU2pnC58yfV7xMkVnTWwlvVUL+A6PsobeMhE3GVi32a+D3bp4HuCLi2FL00J7F7rzNlyNtkg02bnIQ==`.

The final prospective Data archive has 40 files, 70,860 compressed bytes and
247,819 unpacked bytes, with integrity
`sha512-XFBEMDDC8BUJnSArPfqgA9se7F1tRN6Da8Zh6y/aUjKB1oFeTvo8C2qeuUhq/hjGftSxUiiy0QYwXcyh1wtjBg==`.
Its retained source manifest still declares 0.7.1; this local prospective
artifact is not the previously published immutable 0.7.1 release. Publication
must use the original owner's release selection and preserve registry
immutability.

The [complete native capacity result](native.log) passes **6 of 6** cases
with zero failures, skips or cancellations in 93.116684 ms. Its SHA-256 is
`0a5235a366d54f2f3ab2c8afdf7084670e5ae993ebcd7edc476ee4b54ae03286`.
The external named-import receiving also succeeded for
`allocateResourceCapacity` and `admitResourceCapacityPortfolio`.

The earlier complete 267-case Data fabrication gate remains separate and
unchanged. The additional qualification here is confined to the actual
capacity/package dependency and caller-ownership obligations. No hosted
mutation, production activation, resource reservation, payment, model call or
customer receiving follows from these source and package results.
