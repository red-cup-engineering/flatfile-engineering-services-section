# @red-cup-engineering/metrologic

The one logic kernel every 561-group and family-engine package imports: bilattice
predication as the floor, an opt-in categorical hyperdoctrine over it, a charge
readout utility, Chu spaces over FOUR, and the settled math modules that computer
packages import as their semantic substrate.

This package is ESM-only, Node >=20, and organized by explicit subpath exports.
It does not provide a broad default import.
Consumers should import the math surface they actually descend through.

Metrologic is the data layer's mathematics: it lives in the computer data section's lib and
imports only data (FOUR, exact numbers, closure regimes), content, JSON and EAVT, so every
layer above data may import it. The Laplacian, PyMetrologic, and enriched-category research
applications live under computer-math-system; proof-assistant integration lives in
computer-proofing-system.

## The three families

- **`@red-cup-engineering/metrologic/bilattice`** — the floor. The four-regime descent
  (`articulate → predicate → posit → settle`) over a lossless four-valued
  evidence carrier, both cone pairs (`brim`/`adjudicate`/`presume`), and the
  void reads (`saturate`, `precipitate`, `estrange`, `vanish`, ...). The charge
  itself and its value-algebra (`joinKnowledge`, `meetTruth`, `negate`,
  `conflate`, `isTop`, ...) are `@red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge`. Everything else in this package is built on top of the floor, or is
  independent of it — nothing upstream of it depends on anything else here.
  Narrower modules: `@red-cup-engineering/metrologic/bilattice/descent`,
  `@red-cup-engineering/metrologic/bilattice/cone`,
  `@red-cup-engineering/metrologic/bilattice/void`.
- **`@red-cup-engineering/metrologic/hyperdoctrine`** — opt-in. The categorical hyperdoctrine
  over the bilattice floor: quantifier adjoints (`existsAlong`/`forallAlong`),
  Frobenius reciprocity, Beck-Chevalley, and Lawvere comprehension, over a
  general finite fibration. A from-scratch recreation of legacy `voidmath`'s
  `predication-fibration`/`predication-hyperdoctrine` theorems, restated with
  hand-rolled validation in place of `voidmath`'s `ajv`-based schema checking
  — zero runtime dependencies here too. Nothing in `bilattice` depends on this;
  pull it in only if you need the categorical layer. Narrower modules:
  `@red-cup-engineering/metrologic/hyperdoctrine/order`, `@red-cup-engineering/metrologic/hyperdoctrine/adjoints`,
  `@red-cup-engineering/metrologic/hyperdoctrine/comprehension`.
- **`@red-cup-engineering/metrologic/readout`** — a charge-to-style utility, derived from the
  bilattice order rather than an ad-hoc switch statement: `place` classifies
  any charge into one of the four regimes, `knowledgeWeight` and `salience`
  give a total order over them (absurd < active < potential < stable),
  and `styleFor`/`assertStyleTable` look a charge up in a caller-supplied,
  validated style table. Written to absorb the FOUR-to-style tables that were
  hand-duplicated in the `abrash` and `tsander` renderers.

## Other surfaces

- `@red-cup-engineering/metrologic/sheaf/topology/d-frame` - pure subset/frame operations and **bounded exhaustive** four-valued d-frame/sheaf receipts. Binary join/bottom and distribution induction replace the former `2^(2^n)` enumeration of subset families. Exhaustive receipts admit at most **five distinct marks**, with refusal beyond that scope; this is not a checked theorem about arbitrary sites or permission to charge for unbounded proof search. Source test `test/sheaf/d-frame.test.mjs` also checks the three-mark exhaustive-family equivalence and zero-/one-mark frames. An effectful x402 server must separately admit input size, deliver results, meter cost and retain any charged-failure evidence.
- `@red-cup-engineering/metrologic/obstruction` - temporal firing cohomology of settlings.
- `@red-cup-engineering/metrologic/number` - the number tower and exact integer matrices.
- `@red-cup-engineering/metrologic/number/wire-ratio` - BigInt ratios for host pricing.
- `@red-cup-engineering/metrologic/number/natural-extension` - inspectable membership-to-Chu construction.
- `@red-cup-engineering/metrologic/articulation/predicating/positing/evidence-record` - supporting/opposing evidence counts and their FOUR projection.
- `@red-cup-engineering/metrologic/spectral` - spectral location and inversion.
- `@red-cup-engineering/metrologic/articulation/predicating/positing/settling/dynamics/substitution` - substitution dynamics, gauge, and colimit duality.
- `@red-cup-engineering/metrologic/articulation/predicating/positing/settling/firing` - d-frame firing cohomology and orbit reads.
- `@red-cup-engineering/metrologic/equality` - equality derived (not postulated) from `hyperdoctrine`'s `existsAlong` along the Lawvere diagonal, in both the classical (truth) and paraconsistent (knowledge) orders.

Each surface has its own README in the corresponding directory.

## Kinematic Space and canonical diamond-bead threading

`@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/causal`
exports `kinematicDiamondSpaceOf({eventCount,edges})`: a bounded (at most
32 source events), topologically indexed causal DAG projection to the finite
space K(C) of strictly reachable endpoint pairs. `sequencing` is endpoint
sequencing, **not** interval nesting or shared timestamps. Distinct signed
source evidence events remain distinct in the consuming SignCraft replay.

The returned `beadThread` is the already-proved
`Obsmetrologia.CausalSets.BlackHoles.diamondThread` readout: one canonical
`{pointIndex,inPort:false,outPort:true}` pass for each diamond point.
Every pass obeys the local `PortGraph.legal_iff_distinct` law.
`beadThreadAdjacency` is the *same immutable relation object* as
`sequencing`, conforming to
`DiamondBeads.sequencingBeadAdjacency_thread`. This is **not** a separate
bead-weaving graph or another closure engine. Source tests check the
local-port and adjacency laws for all 1,100 forward DAGs through five events.

The complete `beadThread` list consists of **local, individually legal
passes**; those points need not form a single sequencing-compatible path.
`kinematicBeadStrandsOf(space)` first rederives the full causal-diamond
geometry and rejects mismatched/missing arrows or altered passes. It then
computes a deterministic **minimum disjoint path cover** using bipartite
maximum matching on the actual endpoint-sequencing relation. It returns
`strands` (lists of the original local passes),
`matchedSequencing`, `strandCount`, and `requiresMultipleStrands`.
Every diamond is covered exactly once and every adjacent pair within a
strand is genuinely sequenced. The number of required mathematical strands
is the **maximum antichain width**, not a count of physical strings.
The 1,100 small-DAG regression cases independently enumerate antichains
and compare the exact width; the three-event chain already needs **two**
strands because its long interval overlaps the short ones.

The returned `maximumAntichain` is an **explicit lower-bound witness**, not
just an asserted numeric width. Metrologic extracts it from alternating
reachability in the maximum matching, while the existing `strands` are an
upper-bound witness. `kinematicBeadCoverAdmits(space, cover)` independently
checks that every bead pass occurs once, that all transitions are actual
sequencing, and that the alleged antichain contains distinct pairwise
incomparable points with exactly the same cardinality as the strand cover.
The checker **does not run matching**. Equality of the two bounds certifies
minimum cardinality for the supplied finite K(C), without claiming external
witness authenticity or any physical material realization. The 32-event
linear order yields 496 intervals and a concrete 256-member antichain
crossing the central cut.

This mathematical carrier does **not** supply a connected physical string,
per-bead repeated occupation, independently separated contact/cell/visible
graphs, bead geometry, a material realization, a proof of external SignChain
rule licenses, or Lean-kernel admission. The remaining fields for
`SequencingDiamondBeadPayload.toBeads` must be supplied and qualified
separately; they must not be inferred from `beadThread` length or the
`causalRanks` schedule.

## Finite numerical probability laws (distinct from FOUR knowledge)

`@red-cup-engineering/metrologic/number/finite-law` owns three
source-agnostic finite numerical operations: linear expectation over one
normalized joint probability vector, a minimum/maximum linear expectation
over an assumed total-variation ball on that SAME simplex, and an upper-tail
mean with fractional boundary mass. The implementation uses compensated
binary64 sums and source/destination mass ledgers to avoid losing later
transfers after a sub-ULP probability movement.

This is the **shared numeric mathematical operator**, not another event,
market, forecast, account, trade or SignCell carrier. Probabilities are
conditional assumptions, never FOUR supporting/opposing witnesses or a
substitute for a source-clock/provenance record. The caller continues to
own its observed worlds, net payoff units, information filtration,
confidence claims, feasible action menu and authorization. For example,
a financial caller may send per-world total *portfolio* payoff values;
Metrologic knows nothing of Kalshi contracts, Alpaca shares, GMX collateral
or the issuer that supplied a forecast.

The finite transport proof obligation and expected-shortfall variational
law belong upstream to Obsmetrologia. JavaScript does not emit a Lean theorem
receipt or guarantee that an empirically unknown distribution lies in the
assumed ball. Scientific verification requires an actual checked theorem and
an independently qualified empirical uncertainty model.

## Use From Computer

Computer packages should name their descent explicitly:

```js
import { settle } from "@red-cup-engineering/metrologic/bilattice";
import { existsAlong } from "@red-cup-engineering/metrologic/hyperdoctrine";
import { place, styleFor } from "@red-cup-engineering/metrologic/readout";
import { chuSpaceOfMatrix } from "@red-cup-engineering/metrologic/articulation/predicating/positing/logic/linear-logic-chu";
```

Do not rederive bilattice, hyperdoctrine, readout, or Chu operations locally.
Extend the defining mathematical module when a consumer needs another operation; consumers import that module directly.

## Development

```sh
pnpm test
```

Runtime exports load directly from JavaScript ESM source; no TypeScript build is required.
