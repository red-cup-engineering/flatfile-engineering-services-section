---
name: "Verifying frame laws"
description: "Checks frame axioms — arbitrary joins, finite meets distributing, Heyting implication adjoint — on a candidate (L, ⊓, ⨆). Use when modifying lattice/."
---

# Verifying frame laws

## Requirements

- Lattice-specialist office.
- A candidate `(L, ⊓, ⨆)` to verify.

## Steps

1. **Arbitrary joins exist**: for any subset `S ⊆ L`, `⨆ S` exists in `L`. For finite
   `L`: enumerate every subset and verify a join is computed.
2. **Finite meets distribute over arbitrary joins**: `a ⊓ ⨆ S = ⨆ {a ⊓ s : s ∈ S}` for
   every `a ∈ L` and `S ⊆ L`. For finite `L`: enumerate.
3. **Heyting implication exists**: for every pair `a, b ∈ L`, `a → b = ⨆ {x : x ⊓ a ≤
   b}`.
4. Check the implication adjunction: `c ⊓ a ≤ b ⇔ c ≤ (a → b)`.

## Outcomes

A witness confirming the candidate is a frame. Failures localize to which axiom and
which elements break it. The existing
`tests/property/test_frame_morphism_preservation.py` exercises this for frame morphisms.
