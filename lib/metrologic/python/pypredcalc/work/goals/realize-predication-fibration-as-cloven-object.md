---
title: "Realize predication fibration as cloven object"
type: goal
slug: realize-predication-fibration-as-cloven-object
status: active
horizon: later
theory-basis:
  - objects/predication-fibration
  - theorems/predication-fiber-functor
  - theorems/emmenegger-fibration-comonad
owner-office: pypredcalc-predication-specialist
tasks:
  - realize-predication-fibration-base-type
  - verify-fibration-axioms-a1-a2-a3
  - bind-hyperdoctrine-as-fibration-with-b1-b4
---

# Realize predication fibration as cloven object

The 0.3 release shipped `PredicationHyperdoctrine` as the aggregate B1–B4 surface, but
skipped the underlying `objects/predication-fibration` whose A1/A2/A3 axioms the
hyperdoctrine is built on. The corpus presents the hyperdoctrine as
"fibration + B1-B4." This goal closes the structural gap by realizing the fibration
explicitly.

## Theory grounding

A predication fibration over `(L, C, E)` is a cloven Grothendieck fibration `p : E → C`
satisfying:

- **(A1)** Fiber uniformity — each fiber `E_q` is canonically `A_q = L^⋈_{E×E}`.
- **(A2)** Generator action — the four canonical generators act cellwise per the
  corpus's specification.
- **(A3)** Fiber structure preservation — every reindexing `f^*` is a bilattice-
  residuated homomorphism.

The hyperdoctrine adds B1-B4 on top of the fibration. Realizing the fibration explicitly
gives:

- A direct realization of `objects/predication-fibration` (currently no Python entity
  carries this `@realizes` decoration).
- A clean separation: A-axioms are *fibration* properties; B-axioms are *hyperdoctrine*
  properties; the `PredicationHyperdoctrine` aggregate composes them.
- A scaffold for the Emmenegger fibration 2-comonad (corpus
  `emmenegger-fibration-comonad`), which says cloven fibrations correspond to
  pseudo-coalgebras of a 2-comonad on `Cat/C`.

## Acceptance

- [ ] `predication.fibration.PredicationFibration` realizing
      `objects/predication-fibration` with explicit cleavage data.
- [ ] A1/A2/A3 axiom-check methods returning structural witnesses (analog to
      `ClosureAxiomWitness`).
- [ ] `PredicationHyperdoctrine` updated to wrap a `PredicationFibration` plus the B1-B4
      checks.
- [ ] All existing tests still pass (the hyperdoctrine surface is unchanged from the
      caller's perspective).
- [ ] Documentation explaining the fibration / hyperdoctrine layering.

## Owner

[`pypredcalc-predication-specialist`](../../governance/offices/pypredcalc-predication-specialist.md).
