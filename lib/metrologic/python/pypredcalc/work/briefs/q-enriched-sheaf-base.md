---
title: "Realization brief — q-enriched sheaf base type"
type: brief
slug: q-enriched-sheaf-base
status: active
horizon: now
corpus-slugs:
  - objects/quantale-enriched-sheaf
realized-by:
  - src/pypredcalc/sheaf/q_enriched.py
serves-task: realize-q-enriched-sheaf-base-type
serves-goal: realize-q-enriched-sheaf-module
created-at: "2026-05-08"
created-by: pypredcalc-corpus-reader
theory-basis:
  - objects/quantale-enriched-sheaf
  - objects/q-enriched-sheaf-tensor
  - objects/q-enriched-sheaf-hom
  - theorems/q-enriched-sheaf-closed-monoidal-structure
  - theorems/q-enriched-curry-grothendieck-site
---

# Realization brief — q-enriched sheaf base type

This brief documents the corpus reading behind
[`pypredcalc.sheaf.q_enriched.QEnrichedSheaf`](../../src/pypredcalc/sheaf/q_enriched.py).
The realization shipped with the 0.3.0 calculator surface release; this brief
backfills the corpus-side reasoning the duty
[`produce-brief-before-recommending-realization`](../../governance/duties/produce-brief-before-recommending-realization.md)
requires.

## What the corpus says

Per [`objects/quantale-enriched-sheaf`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/quantale-enriched-sheaf.md),
a Q-enriched sheaf on a Grothendieck site $(\mathbf{T}, J)$ is a
Q-enriched presheaf

$$F : \mathbf{T}^{\mathrm{op}} \to \mathbf{Q\text{-}Cat}_{\mathrm{cwl}}$$

— a functor from $\mathbf{T}^{\mathrm{op}}$ to complete weighted lattices —
satisfying the **sheaf condition**: for every covering family
$\{f_i : U_i \to U\}_{i\in I} \in J$, the canonical Q-functor

$$F(U) \,\to\, \mathrm{Eq}\Bigl(\prod_i F(U_i) \rightrightarrows \prod_{i,j} F(U_i \times_U U_j)\Bigr)$$

is an *equivalence* of complete weighted lattices.

The corpus references [@ghrist-et-al2025] for the graph-indexed special
case (the indexing category is the incidence poset of a graph). Our
generalization in the corpus replaces the graph poset with an arbitrary
Grothendieck site.

## What the realization actually ships

The Python realization restricts to the **graph-indexed / poset-indexed
special case**:

- `base` is a finite [`combinatorics.Poset`](../../src/pypredcalc/combinatorics/poset.py),
  not a Grothendieck site.
- Each cell carries a single `Q`-element as stalk, not a complete
  weighted lattice.
- Restrictions are **scalar multiplication**: the restriction map
  `parent → child` is parametrised by a constant `c ∈ Q` such that
  `f(v) = c ⊗ v`.
- The sheaf condition specializes to: for every comparable pair
  `parent ⊃ child`, `c ⊗ stalk[parent] == stalk[child]`.

This is sound because:

1. By commutativity of an integral commutative quantale, scalar
   multiplication preserves the Q-action automatically:
   `f(q ⊗ v) = c ⊗ (q ⊗ v) = q ⊗ (c ⊗ v) = q ⊗ f(v)`.
2. The Ghrist–Lopez–North–Riess 2025 graph case ships first because the
   downstream realizations the goal targets (tensor, internal hom,
   cohomology) are first formulated on the graph case in the corpus's
   reference paper.

## Load-bearing dependencies

The realization composes against:

- [`pypredcalc.algebra.residuated_lattice.ResiduatedLattice`](../../src/pypredcalc/algebra/residuated_lattice.py) —
  the quantale carrier. Finite commutative integral residuated lattices
  are complete on finite carriers, so the "complete unital integral
  residuated lattice" framing collapses to "ResiduatedLattice with
  finite carrier" for this realization. **Future** sub-tasks (cohomology,
  tensor) may require lifting this to a `CompleteResiduatedLattice` /
  `Quantale` sibling type when transfinite-cellular bases or infinite
  quantales come in scope.
- [`pypredcalc.combinatorics.poset.Poset`](../../src/pypredcalc/combinatorics/poset.py) —
  the cellular base.
- The sheaf condition is checked at construction: every comparable pair
  `(parent, child)` has a restriction constant `c` and
  `c ⊗ stalk[parent] == stalk[child]`.

## What this realization is *not*

- **Not** the general Grothendieck-site realization. A future follow-up
  would lift `base` from `Poset` to a Grothendieck-site object once the
  corpus-side site machinery has a corresponding Python entity.
- **Not** the q-enriched-cohomology, tensor, or internal-hom realizations.
  Those are the remaining sub-tasks of the
  [`realize-q-enriched-sheaf-module`](../goals/realize-q-enriched-sheaf-module.md)
  goal.
- **Not** a stalk-as-complete-weighted-lattice realization. Each cell
  carries a single Q-element. When the graph case is generalised to
  multi-element stalks, the type's `stalks: Mapping[Hashable, Q]` will
  need to lift to `stalks: Mapping[Hashable, CompleteWeightedLattice]`.

## Witness-style discipline (charter C3)

Construction-time validation **raises** `ValueError` rather than
returning a witness — the value-bearing class cannot be constructed
from invalid data. To honour C3 for the structural claim "this data
satisfies the sheaf condition," the realization additionally exposes:

- A frozen-dataclass `SheafConditionWitness` recording per-pair checks.
- A free function `check_sheaf_condition(quantale, base, stalks,
  restriction_constants)` that returns the witness without raising.
- The constructor calls `check_sheaf_condition` internally; if the
  witness's `holds` is False, it raises `ValueError` carrying the
  witness in the message (and as a `.witness` attribute on the
  exception, for callers that want structured access).

This pattern: callers who want to *test* data without committing to
construction use `check_sheaf_condition`; callers constructing a sheaf
get a fast-fail with a structured witness on the exception.

## Public API surface

- `QEnrichedSheaf` — the value-bearing class.
- `SheafConditionWitness` — the structural witness for the sheaf
  condition.
- `SheafConditionCheck` — per-comparable-pair check (one row of the
  witness's `checks` tuple).
- `check_sheaf_condition` — the witness-returning predicate.

All exported via `pypredcalc.sheaf.__init__`.

## Stability tier

Provisional (per the
[`public-api-stability-tiers`](../../governance/specifications/public-api-stability-tiers.md)
specification's pre-1.0 default). The shape may change when
`Q-Cat_cwl`-stalks lift the type beyond single Q-elements.

## Open questions for the corpus

- **Is "Q-element-stalk" the right specialization to ship first?** The
  corpus presents stalks as complete weighted lattices, not single
  Q-elements. The graph case in [@ghrist-et-al2025] uses the latter as
  a simplification; verifying that the simplification does not lose
  load-bearing structure for downstream realizations (tensor, hom,
  cohomology) is open.
- **Cohomology base.** The corpus's
  [`q-enriched-cohomology`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/q-enriched-cohomology.md)
  computes Q-valued Čech cohomology over a covering family. The
  poset-based realization lacks an explicit covering family; the cover
  is implicit in the poset's incidence structure. Once
  `realize-q-enriched-cohomology` lands, it will need to make the
  covering convention explicit (probably via a
  `CoveringFamily(poset, covers: dict[cell, frozenset[cell]])` type).
