---
name: "Verifying bilattice axioms"
description: "Checks the four interlacing laws on a candidate bilattice (L, ≤_k, ≤_t). Use when modifying algebra/bilattice.py or algebra/twist_product.py."
---

# Verifying bilattice axioms

## Requirements

- Algebra-specialist office.
- A candidate `(L, ≤_k, ≤_t)` to verify.

## Steps

1. The four interlacing laws (Ginsberg / Fitting):
   - `(a ⊓_k b) ⊓_t c = a ⊓_t (b ⊓_k c)` — incomplete; depends on bilattice variant.
   - In the standard interlace bilattice: knowledge meet/join distribute over truth
     meet/join, and vice versa, on lattices where the interlacing holds.
2. For the Belnap-FOUR case: enumerate all 4×4×4 = 64 triples and check the laws hold
   pointwise.
3. For the boolean-twist case: the laws hold by construction of the twist product over
   a boolean lattice.
4. For an arbitrary residuated-lattice base `L`: property-test via hypothesis with
   carefully chosen `L`-element generators.
5. Produce a `BilatticeAxiomWitness` (or use the existing `pre_bilattice` axiom checker
   in `pypredcalc.algebra.pre_bilattice`).

## Outcomes

A witness recording per-triple checks. `holds=True` confirms axioms; `holds=False`
surfaces the failing triple.
