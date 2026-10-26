---
title: "Realize q-enriched sheaf base type"
type: task
slug: realize-q-enriched-sheaf-base-type
status: done
horizon: done
requires-capability: working-with-q-enriched-sheaves
goal: realize-q-enriched-sheaf-module
created-by: pypredcalc-corpus-tracker
corpus-slug: objects/quantale-enriched-sheaf
requires-brief: true
brief: work/briefs/q-enriched-sheaf-base.md
done-at: "2026-05-08"
---

# Realize q-enriched sheaf base type

## Description

Replace the `pypredcalc.sheaf.q_enriched` stub with the base type `QEnrichedSheaf`. A
q-enriched sheaf is a sheaf whose value type is a quantale (complete unital integral
residuated lattice).

`QEnrichedSheaf(quantale, base, sections, restriction_maps)`:

- `quantale`: a quantale `Q` (representable as a complete residuated lattice from the
  algebra subpackage with the appropriate completeness).
- `base`: a cellular base (poset of cells; can use `combinatorics.Poset`).
- `sections`: `dict[cell, Q-element]` per cell.
- `restriction_maps`: `dict[(parent, child), Q→Q]` for each `parent ⊃ child`,
  preserving `Q`-action.

Verify the sheaf condition (locality + gluing) on construction; produce a
`SheafConditionWitness` if it fails.

## Acceptance

- [x] `pypredcalc.sheaf.q_enriched.QEnrichedSheaf` realized (no longer raises
      `NotImplementedError`). Shipped in 0.3.0; backfilled with a brief and
      witness-style consistency reporting in this round.
- [x] `@realizes` decorations applied as appropriate. The class carries
      `@realizes("objects/quantale-enriched-sheaf")`.
- [x] Realization brief at `work/briefs/q-enriched-sheaf-base.md` written.
- [x] Unit tests covering: empty sheaf; single-cell sheaf; multi-cell sheaf with
      explicit restriction maps; the realization-claim test (sheaf condition holds);
      sheaf-condition-failure path with witness inspection.
- [x] Public API export. `QEnrichedSheaf`, `SheafConditionWitness`,
      `SheafConditionCheck`, `SheafConditionError`, `check_sheaf_condition` are
      re-exported from `pypredcalc.sheaf`.

## Resolution

The base-type realization shipped in pypredcalc 0.3.0 (the calculator-surface
release) but the task record was not closed and the brief was never produced.
This round:

- Backfilled `work/briefs/q-enriched-sheaf-base.md` per `requires-brief: true`
  and the `produce-brief-before-recommending-realization` duty.
- Added `SheafConditionWitness`, `SheafConditionCheck`, `SheafConditionError`,
  and `check_sheaf_condition` to bring sheaf-consistency reporting in line with
  charter C3 (witness-style returns for structural claims). Construction-time
  validation now produces a structured witness available on the exception's
  `.witness` attribute on failure; callers can also test data without
  constructing via `check_sheaf_condition`.
- Added two test classes: `TestEmptyBase` (empty-poset sheaf is vacuously valid)
  and `TestCheckSheafCondition` (witness contracts: holds for consistent data,
  fails-with-localised-failures for inconsistent data, records per-pair
  evidence).
- Fixed task-record drift: `corpus-slug` updated from
  `objects/q-enriched-sheaf-hom` (the hom object, not the base) to
  `objects/quantale-enriched-sheaf` (the actual base atom).
- Full test suite green (732 passed, 1 pre-existing failure under
  `test_predicate_naturality_stability.py` is tracked by
  `backlog/fix-predicate-naturality-stability-property-test.md`); ruff clean
  on touched files; mypy strict clean on the new module (the package's other
  144 mypy errors are pre-existing and tracked separately).

## References

- Corpus: `objects/q-enriched-sheaf-hom`, `objects/q-enriched-sheaf-tensor` (the
  follow-up tasks under this goal will implement these atop the base type).
- Goal: [`realize-q-enriched-sheaf-module`](../../goals/realize-q-enriched-sheaf-module.md).

## Note on completeness

A "quantale" is a complete unital integral residuated lattice. The current
`pypredcalc.algebra.residuated_lattice` does not assume completeness; this task may need
to add a `CompleteResiduatedLattice` (or `Quantale`) sibling type, or use `PowersetFrame`
from the lattice subpackage as the canonical example. Coordinate with the lattice
specialist.
