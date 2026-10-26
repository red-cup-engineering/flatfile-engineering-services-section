---
name: "Working with frame-valued sheaves"
description: "Builds frame-valued sheaves over a cellular basis. Use when realizing sheaf-side computations consuming the lattice subpackage's frames."
---

# Working with frame-valued sheaves

## Requirements

- Sheaf-specialist office.
- A cellular base.
- A frame `F` from the lattice subpackage.

## Steps

1. A frame-valued sheaf `F : Op(X)^op → Frame` assigns:
   - `F(U)` — a frame element for each open `U`.
   - Restriction maps `F(V) → F(U)` for `U ⊆ V` that are frame morphisms.
2. Build via `FrameValuedSheaf(base, sections, restriction_maps)`.
3. Verify locality and gluing:
   - **Locality**: if `s, t ∈ F(U)` agree on every `U_i` of a cover, then `s = t`.
   - **Gluing**: a compatible family `{s_i ∈ F(U_i)}` glues to `s ∈ F(U)`.
4. The existing `pypredcalc.sheaf.frame_valued` module realizes this for finite
   cellular bases.

## Outcomes

A frame-valued sheaf ready for cohomology computation. The
`tests/test_frame_valued_sheaf.py` exercises this skill.
