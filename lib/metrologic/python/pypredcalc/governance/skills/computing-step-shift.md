---
name: "Computing step shift"
description: "Given a substitution and a step parameter, computes the step-shift trajectory. Use when realizing step-shift / step-n machinery."
---

# Computing step shift

## Requirements

- Dynamics-specialist office.
- A `SubstitutionMatrix` `M` and a step parameter `n`.

## Steps

1. The step-shift `σ_n : C → C` on the substitution's tile space `C` advances each
   sequence by `n` substitution applications.
2. For finite-step cases (`n` integer): apply `M^n` to the initial valuation, projecting
   appropriately.
3. For step-omega (transfinite): the step-shift's behavior at limit is determined by
   the substitution's regime (Scott-continuous → predictable; non-Scott-continuous →
   per the realisability program).
4. Verify the step-shift commutes with the appropriate generators of the substitution
   tile-space.

## Outcomes

A computed step-shifted trajectory. The corpus's
`examples/step-shift-on-classifying-invariants` is the target realization for step-shift
acting on classifying invariants.
