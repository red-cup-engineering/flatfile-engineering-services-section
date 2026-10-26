---
title: "Realize transfinite cell complex base type"
type: task
slug: realize-transfinite-cell-complex-base-type
status: done
horizon: done
requires-capability: working-with-transfinite-cell-complex
goal: realize-transfinite-cell-complex-module
created-by: pypredcalc-corpus-tracker
corpus-slug: objects/transfinite-cell-complex
requires-brief: true
brief: work/briefs/transfinite-cell-complex-base.md
done-at: "2026-05-08"
---

# Realize transfinite cell complex base type

## Description

Replace the `pypredcalc.topology.transfinite_cell_complex` stub with the base type
`TransfiniteCellComplex`. The corpus uses transfinite cell complexes as the carrier for
transfinite settling — a chain `X_0 ⊆ X_1 ⊆ ... ⊆ X_λ` indexed by an ordinal `λ`, with
cells attached at successor stages and colimits taken at limit stages.

`TransfiniteCellComplex(stages, attachment_functions, settling_bound)`:

- `stages`: `dict[int_or_ordinal, frozenset[cell]]` per stage. (For now, stages indexed
  by Python ints up to a finite bound; transfinite ordinals beyond ω require explicit
  ordinal-typed support, deferred.)
- `attachment_functions`: `dict[stage, Callable[[FrozenCellSet], FrozenCellSet]]` mapping
  the prior stage to the cells attached.
- `settling_bound`: the carrier ordinal `λ`.

For limit stages, `X_τ = ⋃_{σ<τ} X_σ`. For now, supports up to ω (the first infinite
ordinal); transfinite-bounded and aperiodic regimes require a follow-up task with
explicit ordinal arithmetic.

## Acceptance

- [x] `pypredcalc.topology.transfinite_cell_complex.TransfiniteCellComplex` realized.
      Shipped in 0.3.0 with `@realizes("objects/transfinite-cell-complex")`.
- [x] Realization brief at `work/briefs/transfinite-cell-complex-base.md` written.
- [x] Methods: `cells_at(stage)` ✓, `is_attached_at(cell, stage)` ✓ (added in this
      round to match the acceptance literally), `transfinite_induction_witness(property)` ✓.
      Plus `cells()`, `skeleton(stage)`, `stage_of(cell)`, `faces_of(cell)`.
- [x] Tests covering: empty complex; single-stage; multi-stage with face incidence;
      ω-bounded complex with five stages; skeleton at each stage; faces_of; the
      directed-colimit property (complex equals union of skeleta); transfinite-induction
      witness with property-holds and property-fails-at-some-stage cases; validation
      paths (negative bound, stage-exceeding-bound, duplicate cell, face-at-later-stage);
      `is_attached_at` (true/false/KeyError).
- [x] Public API export. `TransfiniteCellComplex`, `TransfiniteInductionWitness`
      re-exported from `pypredcalc.topology`.

## References

- Corpus: `examples/transfinite-induction-settling` is the target example for this
  carrier; the example realization is a follow-up goal.
- Goal: [`realize-transfinite-cell-complex-module`](../../goals/realize-transfinite-cell-complex-module.md).

## Resolution

The base-type realization shipped in pypredcalc 0.3.0 (calculator-surface release).
The task record predates that release and was never closed. This round:

- Backfilled `work/briefs/transfinite-cell-complex-base.md` per `requires-brief: true`
  and the `produce-brief-before-recommending-realization` duty.
- Added `is_attached_at(cell, stage) -> bool` — the predicate named explicitly in
  the acceptance but missing from the 0.3.0 ship. It is a thin wrapper around
  `stage_of(cell) == stage` with the same `KeyError` semantics.
- Added `TestIsAttachedAt` (3 cases: true at attaching stage, false at other stages,
  `KeyError` on unknown cell).
- Pre-existing ruff B007 fixed in `__post_init__` (the cell-uniqueness loop iterated
  `stages.items()` but used only `cells`); refactored to `stages.values()`.
- Filed `corpus-slug: objects/transfinite-cell-complex` (the slug was missing from
  the original record).
- Full test suite green (735 passed; one pre-existing failure under
  `test_predicate_naturality_stability.py` is tracked by
  `backlog/fix-predicate-naturality-stability-property-test.md`); ruff clean on
  touched files; mypy strict clean on the new module.

## Goal-completion observation

The goal [`realize-transfinite-cell-complex-module`](../../goals/realize-transfinite-cell-complex-module.md)
lists three sub-tasks: base type (this), `realize-limit-stage-colimit`, and
`realize-transfinite-induction-witness`. The base type as shipped already realises
the limit-stage colimit (`skeleton(stage)` + `cells()` give the directed-colimit
union for ω-bounded complexes) and the witness (`transfinite_induction_witness`
method returning `TransfiniteInductionWitness`). Whether the goal should graduate
to `met` rather than `partially-met`, or whether the other two should be filed as
their own task records to make the structural separation explicit, is a captain
decision noted in the brief's open questions.
