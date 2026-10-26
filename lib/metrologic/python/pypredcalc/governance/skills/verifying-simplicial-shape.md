---
name: "Verifying simplicial shape"
description: "Checks closure-under-faces and face-set monotonicity on a candidate simplicial complex. Use when modifying combinatorics/simplicial_complex.py."
---

# Verifying simplicial shape

## Requirements

- Combinatorics-specialist office.
- A candidate simplicial complex `K` (a finite set of finite simplices).

## Steps

1. **Closure under faces**: for every simplex `σ ∈ K` and every face `τ ⊂ σ`, `τ ∈ K`.
   Enumerate every simplex; for each, generate its proper subsets and check membership.
2. **Vertex set**: every simplex's vertices are in the carrier vertex set.
3. **Dimensions**: dimensions are non-negative; the empty simplex `∅` may or may not be
   admitted depending on conventions. The corpus uses augmented simplicial complexes;
   pypredcalc's realization should match.

## Outcomes

A witness confirming closure-under-faces. The existing
`tests/test_simplicial_complex.py` exercises this for the `SimplicialComplex` realization.
