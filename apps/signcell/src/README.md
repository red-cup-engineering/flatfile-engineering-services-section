# SignCell

A predication-cell library: the ordered (subject, predicate, object) triple
a FOUR-valued charge is assigned to, carrying the marks it was admitted
from, addressed by content. That is its most boring reading, and it is the
brand name it uses.

Pure: no filesystem, network, clock or process. A cell is a data form.

## What lives here

- `mark` — the opaque, admitted present datum (`Mark`, `mark`, `coincides`,
  `isMark`), the one canonical Mark carrier (the prior portable, registry-free
  duplicate is gone; this is the type-system-admitted definition).
- `utterance` — the token/claim admission carrier a mark is opened into.
- `utterance-log` — an ordered record of utterances.
- `predication` — the predicate and cell carriers, and the predication site
  (materialized and generator/free presentations) built from them.
- `cell-set` — cell-set representatives and relative complement.
- `claim-identity` — the canonical statement identity of an uttered claim.
- `semantic-carriers` — the JSON Schema carriers generated from
  `specifications/*.schema.json`: `Cell`, `Claim`, `Graph`.
- `semantic-cell`, `semantic-claim`, `semantic-graph` — admission of those
  carriers (content identity, type admission).
- `semiotic-concept-universe` — a content-addressed cut of concept declarations,
  identity classes, annotations, reference diagnostics, publication selection,
  and deltas. It preserves competing source concepts rather than treating an
  alias as permission to overwrite one with another.

## Depends on

`@lenticule-science/metrologic` for its metrology (the charge algebra a
cell's charge is drawn from) and `@red-cup-engineering/computer-system-engine`
for content identity and type admission. Nothing here imports SignChain,
SignGraph or SignCraft; they import this.
