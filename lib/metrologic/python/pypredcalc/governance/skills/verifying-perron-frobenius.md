---
name: "Verifying Perron-Frobenius"
description: "Checks Perron-Frobenius primitivity on a candidate substitution matrix — positive primitive matrix has a unique simple positive eigenvalue equal to its spectral radius. Use when adding named substitution instances."
---

# Verifying Perron-Frobenius

## Requirements

- Dynamics-specialist office.
- A candidate `SubstitutionMatrix` `M`.

## Steps

1. **Non-negativity**: every entry of `M` is non-negative.
2. **Primitivity**: there exists `n` such that every entry of `M^n` is strictly positive.
   Compute `M^n` for `n = 1, 2, ..., dim(M)^2 + 1` and check.
3. **Spectral radius**: the largest |eigenvalue| of `M`. Compute via the `_linalg`
   characteristic-polynomial route.
4. **Perron eigenvalue**: there exists a unique positive eigenvalue `λ` equal to the
   spectral radius. The eigenvector is positive (Perron-Frobenius eigenvector).
5. For exact `λ`: under the `[symbolic]` extra, sympy returns the exact algebraic value.
   Otherwise: report the rational approximation with bounded error.

## Outcomes

A witness confirming Perron-Frobenius for the candidate. Failures mean the matrix isn't
suitable as a substitution matrix per the corpus's expectations.
