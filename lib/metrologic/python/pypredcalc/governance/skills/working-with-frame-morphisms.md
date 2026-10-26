---
name: "Working with frame morphisms"
description: "Builds morphisms preserving ⊓ and ⨆, checks preservation laws. Use when realizing functors that act on frames."
---

# Working with frame morphisms

## Requirements

- Lattice-specialist office.
- Source and target frames.

## Steps

1. A frame morphism `f : F → G` preserves:
   - Finite meets: `f(a ⊓ b) = f(a) ⊓ f(b)`.
   - Arbitrary joins: `f(⨆ S) = ⨆ {f(s) : s ∈ S}`.
   - The top element: `f(⊤_F) = ⊤_G`.
2. Build via `FrameMorphism(source, target, on_elements)` — a finite map
   `on_elements : F → G`.
3. Verify preservation by enumerating subsets (for finite frames) or property-testing
   (for infinite). Each preservation law produces a check; collect into a witness.
4. Compose two morphisms: `(g ∘ f)(a) = g(f(a))`.

## Outcomes

A verified frame morphism. The existing
`tests/property/test_frame_morphism_preservation.py` exercises preservation under
hypothesis for the project's `FrameMorphism` realization.
