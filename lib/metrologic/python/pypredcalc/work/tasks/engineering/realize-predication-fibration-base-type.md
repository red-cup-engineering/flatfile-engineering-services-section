---
title: "Realize predication fibration base type"
type: task
slug: realize-predication-fibration-base-type
status: done
horizon: done
requires-capability: working-with-predication-fibrations
goal: realize-predication-fibration-as-cloven-object
created-by: pypredcalc-corpus-tracker
corpus-slug: objects/predication-fibration
---

# Realize predication fibration base type

## Description

Add `pypredcalc.predication.fibration.PredicationFibration` as the explicit
cloven fibration beneath the hyperdoctrine surface. The fibration owns the
predicate category, the twist bilattice, canonical fibers `A_q = L^tw_{E x E}`,
and reindexing along predicate-category morphisms.

This is not a compatibility layer. It is the native category-theoretic object
that the SDK should expose before higher structures attach to it.

## Acceptance

- [ ] `PredicationFibration` exists and carries
      `@realizes("objects/predication-fibration")`.
- [ ] Canonical fiber construction delegates to `FiberValuation` over the
      predicate's declared domain.
- [ ] Reindexing delegates to the predicate-category morphism action already
      used by `PredicationHyperdoctrine`.
- [ ] The class exports from `pypredcalc.predication` and the top-level package.
- [ ] Unit tests cover canonical fibers, reindexing, and exported API shape.

## Resolution

Implemented `pypredcalc.predication.fibration.PredicationFibration` with
canonical fibers, reindexing, and explicit `IndexMap` cleavage. Exported it
from `pypredcalc.predication` and the top-level package. Added
`tests/test_predication_fibration.py` for realization metadata, declared-domain
fibers, specialization reindexing, and hyperdoctrine exposure.

## References

- Goal:
  [`realize-predication-fibration-as-cloven-object`](../../goals/realize-predication-fibration-as-cloven-object.md).
- Existing surface: `pypredcalc.predication.hyperdoctrine.PredicationHyperdoctrine`.
