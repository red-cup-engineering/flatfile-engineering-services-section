---
name: "Verifying cohomology functoriality"
description: "Given a sheaf and a base-change, exhibits that cohomology respects the base-change. Use when realizing or modifying sheaf cohomology computations."
---

# Verifying cohomology functoriality

## Requirements

- Sheaf-specialist office.
- A sheaf `F` on a base `B` and a base-change `g : B' → B`.

## Steps

1. Pull the sheaf back along `g`: `g^* F` is a sheaf on `B'`.
2. Compute cohomology on both sides: `H^n(B, F)` and `H^n(B', g^* F)`.
3. The induced map on cohomology: `H^n(g) : H^n(B, F) → H^n(B', g^* F)`. For
   appropriate base-changes (covering, refinement, restriction), `H^n(g)` is an
   isomorphism, injection, or specific functorial relation per the corpus's
   cohomology-functoriality theorem.
4. Verify the relation cellwise on the chain-complex level.

## Outcomes

A witness that cohomology respects the base-change. Failure surfaces as a non-functorial
chain map — specific cell breaks the cocycle condition or the boundary map fails to commute.
