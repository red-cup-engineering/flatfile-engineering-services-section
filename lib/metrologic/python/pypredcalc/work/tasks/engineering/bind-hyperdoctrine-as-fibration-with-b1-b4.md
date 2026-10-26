---
title: "Bind hyperdoctrine as fibration with B1 B4"
type: task
slug: bind-hyperdoctrine-as-fibration-with-b1-b4
status: done
horizon: done
requires-capability: working-with-predication-hyperdoctrines
goal: realize-predication-fibration-as-cloven-object
created-by: pypredcalc-corpus-tracker
corpus-slug: objects/predication-hyperdoctrine
---

# Bind hyperdoctrine as fibration with B1 B4

## Description

Update `PredicationHyperdoctrine` so its public aggregate is visibly built from
the explicit `PredicationFibration` plus B1-B4 structure. Preserve current
caller ergonomics while making the layering exact: fibration axioms are A1-A3;
hyperdoctrine axioms are the extra B-structure.

## Acceptance

- [ ] `PredicationHyperdoctrine` exposes its underlying
      `PredicationFibration`.
- [ ] Existing constructors remain usable for current callers.
- [ ] Hyperdoctrine methods delegate A-level behavior to the fibration where
      appropriate.
- [ ] B1-B4 witness methods continue to pass unchanged tests.
- [ ] Documentation explains the fibration/hyperdoctrine layering.

## Resolution

`PredicationHyperdoctrine(category, bilattice)` remains the caller-facing
constructor. The aggregate now exposes `.fibration` and delegates canonical
fiber construction and reindexing to `PredicationFibration`; the existing B1-B4
surface remains in place. The module docstrings and changelog record the
layering.

## References

- Goal:
  [`realize-predication-fibration-as-cloven-object`](../../goals/realize-predication-fibration-as-cloven-object.md).
- Corpus basis: `objects/predication-fibration`,
  `objects/predication-hyperdoctrine`,
  `theorems/predication-fiber-functor`.
