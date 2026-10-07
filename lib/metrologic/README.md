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
