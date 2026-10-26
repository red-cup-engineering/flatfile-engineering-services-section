---
title: "Realization brief — transfinite cell complex base type"
type: brief
slug: transfinite-cell-complex-base
status: active
horizon: now
corpus-slugs:
  - objects/transfinite-cell-complex
realized-by:
  - src/pypredcalc/topology/transfinite_cell_complex.py
serves-task: realize-transfinite-cell-complex-base-type
serves-goal: realize-transfinite-cell-complex-module
created-at: "2026-05-08"
created-by: pypredcalc-corpus-reader
theory-basis:
  - objects/transfinite-cell-complex
  - examples/transfinite-induction-settling
  - theorems/q-enriched-curry-transfinite-cw
---

# Realization brief — transfinite cell complex base type

Backfills the corpus-side reasoning behind
[`pypredcalc.topology.transfinite_cell_complex.TransfiniteCellComplex`](../../src/pypredcalc/topology/transfinite_cell_complex.py),
which shipped in pypredcalc 0.3.0 ahead of its task record being formally
closed. This brief discharges the `requires-brief: true` cell on
[`realize-transfinite-cell-complex-base-type`](../tasks/engineering/realize-transfinite-cell-complex-base-type.md)
per the duty
[`produce-brief-before-recommending-realization`](../../governance/duties/produce-brief-before-recommending-realization.md).

## What the corpus says

Per [`objects/transfinite-cell-complex`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/transfinite-cell-complex.md),
a transfinite cell complex is a regular CW-complex-style structure
whose cell set is indexed by a countable ordinal up to $\omega_1$. The
defining structural data:

- A **cell set** indexed by ordinals $\alpha \leq \omega_1$.
- A **dimension function** $\dim : \mathrm{cells}(X) \to \omega$.
- A **face-incidence relation** $\sigma \prec \tau$ with
  $\dim \sigma < \dim \tau$.

The defining condition: $X$ is the **directed colimit of its finite
sub-complexes**:

$$X \;=\; \mathrm{colim}_{F \subseteq_{\mathrm{fin}} \mathrm{cells}(X)}\; X|_F$$

The skeleton structure is the standard transfinite-skeleton recursion:
$X^{(\beta)}$ is the union of cells indexed by ordinals $< \beta$;
successor stages add the next cell, limit stages take the colimit of
preceding skeleta.

The transfinite content is in the **cardinality and indexing** of the
cell set, not in cells of transfinite dimension — every individual
cell has finite dimension.

## What the realization actually ships

The Python realization restricts to the **finite-stage / ω-bounded**
case:

- `stages` is a `Mapping[int, frozenset[Hashable]]`, with stages
  indexed by Python integers $\geq 0$ within `[0, settling_bound]`.
- `face_incidence` is a `Mapping[Hashable, frozenset[Hashable]]`
  recording which cells are faces of which.
- `settling_bound` is a non-negative integer.
- The "limit stage" is realised as the union of all preceding stages,
  i.e., `cells()` for ω-bounded complexes.

Construction-time validation enforces:

- Stage indices are integers in `[0, settling_bound]`.
- Cells are unique across stages (each cell appears in exactly one).
- Face stage-ordering: every face of a cell at stage $\tau$ is
  attached at some stage $< \tau$.

Methods exposed:

- `cells()` — every cell.
- `cells_at(stage)` — cells attached *at* `stage`.
- `is_attached_at(cell, stage)` — convenience predicate (added in
  this round to match the task acceptance literally).
- `skeleton(stage)` — the $\beta$-skeleton (union of stages $<\beta$).
- `stage_of(cell)` — which stage attached this cell.
- `faces_of(cell)` — cells that are faces of this one.
- `transfinite_induction_witness(property_holds)` — runs the
  transfinite-induction predicate over every skeleton plus the limit
  stage, returning a `TransfiniteInductionWitness`.

This is sound because:

1. The corpus's directed-colimit characterisation is *strictly weaker*
   than what the realization gives you for ω-bounded segments — the
   directed colimit over finite subsets equals the skeleton union for
   integer-indexed stages.
2. The Ghrist–Lopez–North–Riess 2025 framework and the corpus's
   q-enriched cellular machinery operate first on finite cellular
   sub-complexes, so the ω-bounded segment is the input shape the
   downstream realizations expect.

## Load-bearing dependencies

- `frozenset[Hashable]` for cell sets (Python stdlib only — C2-compliant).
- `MappingProxyType` for read-only canonical fields after `__post_init__`.
- No external math library; no `fractions.Fraction` needed at this
  layer (cells and stages are discrete).

## What this realization is *not*

- **Not** a realization of cells indexed by **arbitrary countable
  ordinals up to $\omega_1$**. Stages are Python integers.
  Transfinite-bounded and aperiodic regimes that the corpus's
  [`transfinite-bounded-regime-realizability`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/transfinite-bounded-regime-realizability.md)
  contemplates remain a follow-up requiring an explicit ordinal
  arithmetic surface in `combinatorics` or a dedicated
  `pypredcalc.topology.ordinals` module.
- **Not** a realization of the cellular **dimension function**. The
  current type carries face incidence but not an explicit
  $\dim : \mathrm{cells}(X) \to \omega$. Dimension can be computed
  from the face-incidence chain length, but is not exposed as a method.
- **Not** the transfinite Curry equivalence
  ([`q-enriched-curry-transfinite-cw`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/q-enriched-curry-transfinite-cw.md))
  itself — that is the next-stage realization the carrier supports
  and is filed as a separate goal.

## Witness-style discipline (charter C3)

`TransfiniteInductionWitness` is a frozen-dataclass witness that
records `per_stage: Mapping[int, bool]` and `limit_stage_holds: bool`,
with `holds: bool` and `__bool__` per the C3 convention. Construction-
time validation continues to raise `ValueError` (the constructor
pattern, mirroring `QEnrichedSheaf`); the witness is for the post-hoc
structural claim "this property holds at every stage including the
limit."

## Open questions for the corpus

- **Is integer-indexed stage assignment sufficient for the named
  transfinite-settling examples?** The corpus's
  [`examples/transfinite-induction-settling`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/examples/transfinite-induction-settling.md)
  describes a closure operator that fires at countably many limit
  ordinals — this can be presented as ω-bounded by choosing a
  countable enumeration of firing-ordinals, but the directness of
  ordinal-typed stages would be more faithful to the corpus's
  presentation.
- **Where does the dimension function belong?** The corpus carries it
  as part of the carrier's data; the realization makes it derived
  from face incidence. Whether to expose `dim(cell)` as a public
  method or leave it derived is a follow-up decision.
- **Goal-level completion question.** The goal
  [`realize-transfinite-cell-complex-module`](../goals/realize-transfinite-cell-complex-module.md)
  lists three sub-tasks: base type, limit-stage colimit,
  transfinite-induction witness. The base type ships the skeleton
  computation (the limit-stage colimit *is* the union of earlier
  stages, exposed via `cells()`) and the witness method. With the
  base task done, the question for the captain is whether the goal
  should graduate to `met` or whether the other two sub-tasks should
  be filed as their own task records first to make the structural
  separation explicit.

## Public API surface

- `TransfiniteCellComplex` — the value-bearing class.
- `TransfiniteInductionWitness` — the structural witness.

Both re-exported from `pypredcalc.topology.__init__`.

## Stability tier

Provisional (per
[`public-api-stability-tiers`](../../governance/specifications/public-api-stability-tiers.md)
pre-1.0 default). The shape may change when ordinal-typed stages or
the dimension function lift the type beyond the integer-indexed
segment.
