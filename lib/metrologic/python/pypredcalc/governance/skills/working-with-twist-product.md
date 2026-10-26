---
name: "Working with twist product"
description: "Builds twist-product structures L^⋈ over a base residuated lattice L, taking joins/meets/fusion/residual pointwise. Use when realizing constructions that take values in L^⋈."
---

# Working with twist product

## Requirements

- Algebra-specialist office.
- A base residuated lattice `L`.

## Steps

1. Construct `TwistBilattice(L)`. Carrier elements are pairs `(a, b)` with `a, b ∈ L`,
   read as `(positive evidence, negative evidence)`.
2. Knowledge order: `(a, b) ≤_k (c, d)` iff `a ≤_L c` and `b ≤_L d`.
3. Truth order: `(a, b) ≤_t (c, d)` iff `a ≤_L c` and `d ≤_L b` (positive grows,
   negative shrinks).
4. Joins/meets are pointwise per the orders.
5. Fusion `⊙` and right residual `⇒`:
   - `(a, b) ⊙ (c, d) = (a ⊙_L c, (a ⇒_L d) ∧_L (c ⇒_L b))` — Ginsberg's twist fusion.
   - `(a, b) ⇒ (c, d) = (b ⊙_L c, ...)` — see corpus for full formula.
6. Negation `~`: `~(a, b) = (b, a)`.

## Outcomes

A `TwistBilattice` instance ready to use as the value carrier of a `FiberValuation`. The
existing `algebra.twist_product.boolean_twist()` is the boolean-twist instance widely
used in tests.
