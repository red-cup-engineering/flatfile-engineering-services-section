---
name: "Computing d-frame restriction"
description: "Given a d-frame and a clopen, produces the restriction d-frame. Use when realizing settling-d-frame computations."
---

# Computing d-frame restriction

## Requirements

- Lattice-specialist office.
- A `DFrame` instance and a clopen `U` of its underlying space.

## Steps

1. The d-frame `D = (D⁺, D⁻, ⊑)` carries:
   - `D⁺` — frame of positive information.
   - `D⁻` — frame of negative information.
   - `⊑` — consistency relation.
2. Restriction at clopen `U`:
   - `(D|U)⁺ = {a ⊓ U : a ∈ D⁺}`.
   - `(D|U)⁻ = {b ⊓ U : b ∈ D⁻}`.
   - Restricted consistency: `a|U ⊑ b|U ⇔ a ⊑ b`.
3. The existing `settling_dframe_at_clopen` function realizes this for finite cases.
4. Verify the restriction is itself a d-frame via [`verifying-frame-laws`](verifying-frame-laws.md)
   on each component plus the consistency-relation check.

## Outcomes

A new `DFrame` representing the restriction at `U`. Used by sheaf-side computations and
by predication's bitopological-settling-site machinery.
