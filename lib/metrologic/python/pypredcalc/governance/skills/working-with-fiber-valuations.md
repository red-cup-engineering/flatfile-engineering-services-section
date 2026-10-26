---
name: "Working with fiber valuations"
description: "Builds, modifies, and composes FiberValuation instances. Use as the basic operational skill for any predication-subpackage work."
---

# Working with fiber valuations

## Requirements

- Predication-specialist office.
- An `EntitySet`, a `TwistBilattice`, and a domain `dom ⊆ E × E`.

## Steps

1. Construct a `FiberValuation`:
   ```python
   FiberValuation(bilattice=BIL, entities=E, bottom=BIL.knowledge_bottom(),
                  cells={(s, o): value, ...}, dom=dom)
   ```
   The `cells` map must have keys in `dom`; cells equal to `bottom` are dropped on
   construction.
2. Read cells via `.get(subject, object)` — returns `bottom` for unset cells in `dom`.
3. Apply pullback via `f.pullback(fiber)` for any `PredicateMorphism f`.
4. Apply quantifier adjoints via `f.existential_k(fiber, target_dom)` etc.
5. Take meets / joins via `fiber1.knowledge_meet(fiber2)`, `fiber1.knowledge_join(fiber2)`,
   `fiber1.truth_meet(fiber2)`, `fiber1.truth_join(fiber2)`.
6. Compare via `fiber1.knowledge_leq(fiber2)`, `fiber1.truth_leq(fiber2)`.

## Outcomes

A `FiberValuation` ready to participate in the calculator's hyperdoctrine surface,
predication-settling iteration, or closure-monad application.
