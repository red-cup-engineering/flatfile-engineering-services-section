---
name: "Verifying residuation laws"
description: "Checks the fusion-residual adjunction `a ⊙ b ≤ c ⇔ a ≤ b ⇒ c` on a candidate residuated lattice. Use when modifying algebra/residuated_lattice.py."
---

# Verifying residuation laws

## Requirements

- Algebra-specialist office.
- A candidate `(L, ⊙, ⇒, e, ≤)` to verify.

## Steps

1. Check `e` is the unit: `a ⊙ e = a` and `e ⊙ a = a` for all `a ∈ L`.
2. Check fusion is associative: `(a ⊙ b) ⊙ c = a ⊙ (b ⊙ c)`.
3. Check fusion is commutative (for *commutative* residuated lattices).
4. Check the residuation adjunction:

   ```
   a ⊙ b ≤ c   if and only if   a ≤ (b ⇒ c)
   ```

5. Check monotonicity: `a ≤ a' ⟹ a ⊙ b ≤ a' ⊙ b` and `a ≤ a' ⟹ (a' ⇒ c) ≤ (a ⇒ c)`.
6. For finite `L`: enumerate all triples. For infinite `L`: property-test via hypothesis
   over generators sampling from a representative subset.

## Outcomes

A witness with per-triple checks for each law. The existing
`tests/property/test_residuation_adjunction.py` exercises this skill on the project's
residuated-lattice realizations.
