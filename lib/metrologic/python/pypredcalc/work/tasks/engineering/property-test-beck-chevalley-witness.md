---
title: "Property test for Beck-Chevalley witness"
type: task
slug: property-test-beck-chevalley-witness
status: completed
horizon: done
requires-capability: writing-property-test
goal: add-property-tests-for-0-3-surface
created-by: pypredcalc-corpus-tracker
corpus-slug: theorems/beck-chevalley-commutation-on-predication-bilattices
---

# Property test for Beck-Chevalley witness

## Description

Add `tests/property/test_beck_chevalley_witness.py` exercising BC commutation across
hypothesis-generated generator pairs and fibers. The existing unit test
`tests/test_b3_beck_chevalley.py` exhausts six generator factories × four adjoints; the
property test takes that to the next level — randomly generated specialization
sub-supports, randomly generated entity sets, randomly generated fibers.

## Acceptance

- [x] `tests/property/test_beck_chevalley_witness.py` exists.
- [x] Hypothesis generators for: entity sets (fixed at 2), sub-supports
      (off-diagonal and diagonal), generator instances (six factories
      including identity, two specializations, converse, both projections),
      fibers (cross-product of cells × four bilattice values).
- [x] Property: BC witness holds (`witness.holds is True`) across the sweep
      for every adjoint kind (`beck_chevalley_witness` runs all four
      adjoints internally).
- [x] Tests pass with `max_examples = 30`.

## References

- Corpus theorem: `theorems/beck-chevalley-commutation-on-predication-bilattices`.
- Existing unit tests: `tests/test_b3_beck_chevalley.py` (passes 36 ordered pairs ×
  N fibers per adjoint kind).
