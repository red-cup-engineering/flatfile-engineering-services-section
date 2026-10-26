---
title: "Property test for ClosureAxiomWitness"
type: task
slug: property-test-closure-axiom-witness
status: completed
horizon: done
requires-capability: writing-property-test
goal: add-property-tests-for-0-3-surface
created-by: pypredcalc-corpus-tracker
---

# Property test for ClosureAxiomWitness

## Description

Add `tests/property/test_closure_axiom_witness.py` exercising the four closure-axiom
witnesses (`monotone_k`, `inflationary`, `idempotent`, `c_natural`) on hypothesis-
generated closure operators.

Generators needed:

- Closure-operator family generator: produces a per-predicate map. For Scott-continuous
  cases, build from a generated `FiberClosureRuleSystem` to ensure the operator satisfies
  all axioms by construction.
- Sample valuation generator over the predicate-category's domain.
- Sample-pair generator (for monotone_k checks): pairs `(v, v')` with `v ≤_k v'`.

Property: for closure operators built from rule systems, all four witnesses hold across
the input sweep. For deliberately broken families (e.g., `cl_p = constant ⊥`), the
witnesses fail in the expected axiom.

## Acceptance

- [x] `tests/property/test_closure_axiom_witness.py` exists.
- [x] Hypothesis generators for closure operators and sample valuations.
- [x] One property per axiom; each runs `max_examples ≥ 50` (monotone_k and
      c_natural at 30 because each example wraps a least-fixed-point iteration).
- [x] All tests pass under `pytest tests/property/test_closure_axiom_witness.py -q`.

## References

- Existing unit tests: `tests/test_closure_operator_predication.py`.
- Goal: [`add-property-tests-for-0-3-surface`](../../goals/add-property-tests-for-0-3-surface.md).

## Resolution

Test rewritten to use the `ClosureAxiomWitness` API directly: a per-predicate
`ClosureOperator` wraps the rule-system-generated cross-fiber operator, then
each witness method (`check_inflationary`, `check_idempotent`,
`check_monotone_k`, `check_c_natural`) is asserted to hold across the
hypothesis sweep. A fifth test exercises a deliberately broken family
(`cl_p = constant ⊥`) and asserts `witness.holds is False` with the failing
axiom reported as `inflationary`. All five tests pass; `c_natural` coverage
along the identity morphism is structural — multi-predicate naturality
sweeps remain on the unit side until the test fixtures grow a multi-predicate
hyperdoctrine generator.
