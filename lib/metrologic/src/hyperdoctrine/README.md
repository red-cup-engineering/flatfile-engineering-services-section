# Finite FOUR-valued hyperdoctrine — executable schema programs

**Owner:** Red Cup Engineering / Computer Data / Metrologic. This is an
implementation of a *recovered projection* of Obsmetrologia, not the
mathematical or metaphysical foundation of predication.

## What this actually computes

The existing `four.mjs` provides independent support/denial evidence and
its **knowledge** and **truth** orders. This hyperdoctrine reads a complete
`Map<string, knowledge-family-reading>` over explicitly admitted finite
predication positions and evaluates reindexing and quantifier adjoints.

For an index morphism `u: J → I`, `reindex(u,φ)` reads `φ(u(j))`.
`existsAlong(u,ψ,order)` joins every reading in each inverse-image fiber;
`forallAlong(u,ψ,order)` meets them. Empty joins/meets use the selected
order's bottom/top. The correct adjunction sequence is
**`existsAlong ⊣ reindex ⊣ forallAlong`**.
`orderOps` is the single source of the two orders.

The [canonical Science FOUR glossary](https://github.com/lenticule-science/science-services-section/blob/main/services/philosophy-services-section/services/logic-services-section/content/text/glossary/terms/four.md)
controls interpretation: `absurd` means neither side witnessed;
`potential` for only; `active` against only; `stable` both.
A contested reading is **not** a license to infer unrelated propositions.
A missing map key is **not** the no-evidence reading.

This package already owns `existsAlong`, `forallAlong`,
`reindex`, `pullbackSquare` and `comprehend`. Do not introduce a second
quantifier implementation, duplicate bilattice, RMN parser or schema
validator to recover the same behavior.

## How to run an executable declaration

A morphism's structural content is its entire finite mapping table.
`finiteIndexMorphismFromTable(source,target,table)` derives the callable
map only **after** admitting a total table with exact keys and codomain
images. No sender provides executable JavaScript.

`evaluateFiniteQuantifierProgram(program)` composes an arbitrary finite
list of these existing `existsAlong` and `forallAlong` operations,
with explicit order and exact carrier compatibility at every stage.
It accepts JSON data shaped by
[the owned program schema](../../specifications/finite-quantifier-program.schema.json),
not free-form scripts. The schema alone checks syntactic shape; runtime
admission additionally enforces total maps and step-to-step carrier equality.

For example, the existing
[serializable fixture](../../test/hyperdoctrine/fixtures/finite-quantifier-contradiction.json)
defines four atom readings, an existential projection from atoms to two
subject positions, then a universal projection to one claim:

```js
import { evaluateFiniteQuantifierProgram } from
  "@red-cup-engineering/metrologic/hyperdoctrine/adjoints";

const program = {
  kind: "hyperdoctrine.finiteQuantifierProgram",
  order: "truth",
  initial: { "a:1": "potential", "a:2": "active",
             "b:1": "stable", "b:2": "active" },
  stages: [
    { quantifier: "exists",
      source: ["a:1", "a:2", "b:1", "b:2"],
      target: ["a", "b"],
      table: { "a:1": "a", "a:2": "a", "b:1": "b", "b:2": "b" } },
    { quantifier: "forall", source: ["a", "b"],
      target: ["claim"], table: { "a": "claim", "b": "claim" } }
  ]
};
const { result } = evaluateFiniteQuantifierProgram(program);
// result.claim === "stable" : independently supported AND opposed
```

The truth-order meaning of this finite `∀x ∃y` is
`positive = AND_x OR_y positive(x,y)` and
`negative = OR_x AND_y negative(x,y)`.
Thus it carries contradiction *through* computation, without an
explosion rule. The implementation preserves the empty-fiber unit laws
and supports arbitrarily many **finite** alternating stages, within
actual runtime resources.

## Other schema-carried computation in the same substrate

[The positive rule declaration schema](../../specifications/closure-rule-system.schema.json)
is admitted by
[`closureRuleSystem`](../articulation/predicating/positing/settling/analysis/closure-rule-system.mjs).
Its finite closure receipt uses a carrier-derived evidence-height bound,
not exhaustive enumeration of `FOUR^n`. The quantifier program and
positive closure system are two **different admitted fragments** of the
same mathematical substrate, not two rival syntax trees or runtime
bilattices. Resource-consuming transitions and ordinal-limit premises
must not be silently treated as one of these fragments.

## Test, qualification and receiving

From a checkout whose Data package imports resolve, run:

```sh
node --test lib/metrologic/test/hyperdoctrine/schema-program.test.mjs
node --test lib/metrologic/test/closure-rule-system.test.mjs
```

The quantifier test checks all 256 readings of a four-atom `∀∃`
diagram against independently computed positive/negative bit formulas,
and exercises JSON round-trip, empty indices, 20-stage composition,
codomain mismatches, undeclared effects, and malformed values. The
closure test exercises a 30-cell contradictory cascade with no
four-cell receipt ceiling.

Other finite adjunction, Frobenius reciprocity, Beck–Chevalley and
comprehension tests are in `test/hyperdoctrine/`. They are **tests**,
not Lean-kernel proofs of every claim asserted in the older `voidmath`
texts. Precise mathematical status belongs to the current
[Science Π₂ research note](https://github.com/lenticule-science/science-services-section/blob/main/services/philosophy-services-section/services/logic-services-section/content/text/glossary/concepts/rule-language-pi2-schemas-realizability.md)
and Obsmetrologia. That note gives an **external comparison**
counterexample where an unbounded `∀∃` predicate becomes true only
at a directed limit. This finite program does **not** implement that
limit or any transfinite ordinal arithmetic.

A source commit, a regression test, a fixed-point witness and a JSON
schema are not customer installation or permission to act. Operations
must supply scoped witness admission, receiving, and authorization
for a concrete consuming application before effects can follow.

## Source history

The predecessor documentation referred to outdated package names,
charge objects not accepted by the current readings, and accidentally
reversed adjunction symbols. These are retired descriptions, not new
compatibility interfaces. The source history remains available in Git.

## Inert finite mapping admission (2026-10-27)

Original `finiteIndexMorphismFromTable` now captures a single immutable
source, target and entire table before checking totality. Previously
`Object.entries(table)` validation and later `table[key]` construction
could admit different valid images from one getter-backed source. No
semantic hashing or replacement FOUR algebra is introduced.

The original `evaluateFiniteQuantifierProgram` now captures every stage
and calls the same admitted mapping owner before running any `∃/∀`
adjoint. Empty fibers, historical v1 JSON, the 256 FOUR assignments and
finite alternation retain their previous semantics. Accessors, hidden
fields, sparse/decorated arrays and inherited records refuse without
executing ordinary getters. Literal `__proto__` remains a data key.
Proxy descriptor traps require host isolation. Native schema tests are
enrolled for receiving, which still needs installed supplier qualification.

## Collision-free finite source pullback squares

Original `pullbackSquare` formerly joined the names `j` and `i`
with a NUL separator. Since schema-valid index strings may themselves
contain NUL, different pairs could collapse to the same `K` key and
one projection could select the wrong fiber. The square now uses an
injective length-prefixed *local pair index*, and builds its two projection
morphisms through the SAME admitted `finiteIndexMorphismFromTable`.
This is not an SCA content address or an external witness. Native
Beck–Chevalley negative controls now include arbitrary source-string
delimiters and verify both FOUR orders.

## Exhaustive finite FOUR adjunction witness (27 October 2026)

The existing `test/hyperdoctrine/exhaustive-two-point-laws.test.mjs`
uses only the original Computer Data FOUR, Metrologic `orderOps`,
`finiteIndexMorphismFromTable`, `reindex`, `existsAlong`,
`forallAlong`, `meetFiber`, `leqFiber` and `pullbackSquare`.
It exhausts all complete readings and all total finite functions over
source/target carriers of 0, 1 or 2 indices under BOTH knowledge and
truth orders, including empty preimages and NUL-bearing source names.

The 2,506 adjunction/Frobenius valuation configurations and 1,150
Beck–Chevalley valuation configurations pass with no counterexamples.
This is a deterministic, exact *finite* conformance witness, not a Lean
proof of an unbounded categorical theorem, a provenance signature, an
installed package consumer or validation of external observation rights.
The stochastic existing tests remain distinct, and this new source
test is enrolled in the standalone package receiving manifest.
