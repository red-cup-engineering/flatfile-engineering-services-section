# SignCell

A pure predication-cell library. A cell carries an ordered
subject/predicate/object triple, the witnesses told for and against it, and
its FOUR-valued reading. A Mark is the opaque present datum; a typed mark
states which data type admitted its content. The historical `sign.cell`
wire tag identifies typed marks and remains part of their stored addresses.

No filesystem, network, clock, process, payment or settlement effects live
here. Effectful storage, publication and exchange belong to their systems
owners.

## Carriers and operations

- `mark`: the canonical type-system-admitted opaque Mark carrier and coincidence.
- `utterance`: the token/claim admission carrier a mark is opened into.
- `predication`: predicates, cells, and materialized or generator/free sites.
- `cell-set`: representatives and relative complement.
- `typed-mark`: type admission, canonical content addressing and typed references.
- `semantic-carriers`: the shipped JSON Schema carriers; the retired generating
  specifications are no longer their source.
- `semantic-claim`: assertions with retained for/against witnesses.
- `semantic-graph`: closed typed graph admission, witnessed edge queries and
  whole-family gluing with explicit declaration obstructions.
- `source-statement`: source-linked statement carriers.
- `predicate-vocabulary`, `semiotic-concept-universe`, `articulating`: concept,
  predicate and articulation operations with their own admission contracts.

## Navigate L-Space without interpreting mark payloads

L-Space denotes the informational relations of the Semioverse's tokens and
claims. It is not a chosen collection of knowledge documents or a directory
index. Files, transactions, messages, resources and computations participate
through their actual typed predications and witnesses. This library does not
claim that every existing producer has completed that mapping or admission.

The shared `queryRelationalField` operation selects any subject, predicate,
object or witness by SCA coincidence. `edgesFrom(graph, subject, pattern)`
keeps its historical id-only outgoing selection. For received carriers,
`querySignGraph(graph, subject, pattern)` first verifies the graph and member
addresses, declared endpoint types and witness membership, then returns the
original EAVT-addressed edges. `validateSignGraphQuery` applies that same
refusal boundary before an external consumer begins payment or computation.

`querySignGraphPage(graph, subject, pattern, { limit, cursor })` bounds the
response to 1–1000 edges (100 by default). It returns `{ graph, query, edges,
next }`: source graph identity, content-addressed selector, original edges
with typed references, and a continuation or `null`. It never includes mark
payloads. Replaying a continuation against a changed graph, changed selector,
or absent preceding edge refuses. `validateSignGraphPage` uses the identical
admission. Both are pure operations suitable for consumer-owned x402 binding.

A page is a read projection, not a closed graph, a truth decision or a proof
of membership independent of its admitted source. Witnesses can span pages;
only `next: null` marks completion of that query. Filtering for a predicate
does not establish that other assertions are absent. Graph gluing compares
the complete supplied family: an obstructed result is a partial projection,
not an associative or lossless accumulation state. Retain the source cuts
and obstruction receipts.

## Dependencies and scientific boundaries

The manifest names the shared Computer Data type system/FOUR provider and
Computer Content Address provider. SCA canonicalization and RFC 6920 NI
identity remain with Content Address; relational EAVT statement identity
remains with Computer Data. Neither label-based search nor a new local hash
implementation replaces them. Runtime carrier admission does not establish
the truth, license, ownership or authority of an external claim. A finite
graph projection does not by itself prove a sheaf or Heyting-algebra model.
