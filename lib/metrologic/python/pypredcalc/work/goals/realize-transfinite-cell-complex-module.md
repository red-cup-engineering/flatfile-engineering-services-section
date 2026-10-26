---
title: "Realize transfinite cell complex module"
type: goal
slug: realize-transfinite-cell-complex-module
status: met
horizon: done
met-at: "2026-05-08"
theory-basis:
  - examples/transfinite-induction-settling
  - examples/quantifier-induced-transfinite-settling
  - examples/coupled-predicate-transfinite-settling
  - examples/countably-many-firings-transfinite-settling
owner-office: pypredcalc-topology-specialist
tasks:
  - realize-transfinite-cell-complex-base-type
---

# Realize transfinite cell complex module

The `pypredcalc.topology.transfinite_cell_complex` module is currently a stub. The
corpus carries several transfinite-settling examples that the calculator can't yet
express because the underlying transfinite-cell-complex carrier doesn't exist.

## Theory grounding

A transfinite cell complex is an ordinal-indexed family of cell complexes
`X_0 ⊆ X_1 ⊆ ... ⊆ X_λ`, each `X_τ` obtained by attaching cells to `X_{τ-1}`. At limit
ordinals, `X_τ` is the colimit of preceding stages.

The corpus's named examples that need this carrier:

- `transfinite-induction-settling` — settling whose closure operator fires at countably
  many limit ordinals.
- `quantifier-induced-transfinite-settling` — transfinite settling driven by ∀-block
  rules.
- `coupled-predicate-transfinite-settling` — multi-predicate transfinite firing.
- `countably-many-firings-transfinite-settling` — closure operator with a countable
  firing-ordinal trace.

Without the carrier, the existing `PredicationSettling` runtime is finite/ω only — it
can't express any of the named transfinite examples. This goal fixes that.

## Acceptance

All discharged via [`realize-transfinite-cell-complex-base-type`](../tasks/engineering/realize-transfinite-cell-complex-base-type.md):

- [x] **Base type** — `TransfiniteCellComplex(stages, attachment_functions)` carrying
      stage-indexed cell-attachment.
- [x] **Limit-stage colimit** — `skeleton(stage)` + `cells()` give the directed-colimit
      union for ω-bounded complexes. The corpus's
      [`transfinite-cell-complex`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/transfinite-cell-complex.md)
      definition makes the directed colimit *the* defining condition; the base
      type's API exposes it directly. No separate `colimit(stage)` method is
      warranted.
- [x] **Transfinite induction witness** — `TransfiniteInductionWitness` and the
      `transfinite_induction_witness` method on the base type. Per charter C3
      (witness-style returns) the witness is the structural object the corpus
      atom names; no separate task warranted.

The original three-task decomposition over-decomposed the work — the base type's
surface already covers what the limit-colimit and induction-witness sub-tasks would
have realized.

The full `transfinite-induction-settling` example realization is deferred to a follow-up
goal that's still future work, but it is not gated on this goal.

## Owner

[`pypredcalc-topology-specialist`](../../governance/offices/pypredcalc-topology-specialist.md),
with cross-subpackage coordination with the predication-specialist (for the settling
runtime extension).
