---
title: "Property test for Cl-algebra / Cl*-coalgebra correspondence"
type: task
slug: property-test-cl-algebra-correspondence
status: completed
horizon: done
requires-capability: writing-property-test
goal: add-property-tests-for-0-3-surface
created-by: pypredcalc-corpus-tracker
corpus-slug: theorems/closure-algebra-coalgebra-correspondence
---

# Property test for Cl-algebra / Cl*-coalgebra correspondence

## Description

Add `tests/property/test_cl_algebra_correspondence.py` exercising the corpus theorem
realization at scale. Property: across a sweep of cross-fiber valuations, `is_cl_algebra`
and `is_cl_coalgebra` agree on `holds`; `algebra_to_coalgebra` and `coalgebra_to_algebra`
round-trip preserving valuation, closure-image, and failure cells.

## Acceptance

- [x] `tests/property/test_cl_algebra_correspondence.py` exists.
- [x] Hypothesis generators for cross-fiber valuations.
- [x] Properties:
      - `is_cl_algebra(monad, v).holds == is_cl_coalgebra(comonad, v).holds`.
      - `algebra_to_coalgebra(alg).valuation == alg.valuation`.
      - `coalgebra_to_algebra(algebra_to_coalgebra(alg)).valuation == alg.valuation`.
- [x] `max_examples ≥ 50`; tests pass.

## References

- Corpus theorem: `theorems/closure-algebra-coalgebra-correspondence`.
- Existing unit tests: `tests/test_closure_comonad.py`.
