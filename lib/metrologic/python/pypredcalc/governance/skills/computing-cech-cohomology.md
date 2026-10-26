---
name: "Computing Čech cohomology"
description: "Given a sheaf and a cover, computes Čech cohomology by direct chain-complex evaluation. Use when realizing cohomology-class-equality theorems."
---

# Computing Čech cohomology

## Requirements

- Sheaf-specialist office.
- A sheaf `F` on a topological space `X`.
- An open cover `{U_i}` of `X`.

## Steps

1. Build the Čech complex `Č^n(U, F)`:
   - `Č^n = ⨁_{i_0 < ... < i_n} F(U_{i_0} ∩ ... ∩ U_{i_n})`.
   - Boundary `δ : Č^n → Č^{n+1}` alternating restrictions.
2. Compute `H^n(Č(U, F)) = ker δ_n / im δ_{n-1}`.
3. Use Fraction-native linear algebra (`pypredcalc._linalg`) for the kernel and image
   computations to keep arithmetic exact.
4. The zeroth cohomology `H^0` is the global sections; verify against direct global-
   section computation.

## Outcomes

The chain-complex cohomology groups `H^n(U, F)`. For acyclic covers, this equals sheaf
cohomology `H^n(X, F)`. The existing `pypredcalc.sheaf.cohomology` module realizes Z-
cohomology for cellular sheaves.
