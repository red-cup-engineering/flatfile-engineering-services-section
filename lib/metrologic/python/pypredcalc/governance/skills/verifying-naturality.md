---
name: "Verifying naturality"
description: "Produces a NaturalityWitness over a sample of cross-fiber valuations exercising the four predicate-category generator classes. Use when modifying fiber operations."
---

# Verifying naturality

## Requirements

- Predication-specialist office.
- A predicate category with at least one generator from each class.
- A sample of cross-fiber valuations to test.

## Steps

1. Build a `PredicateCategory` with generators covering specialization, converse,
   subject-projection, and object-projection.
2. Produce one or more cross-fiber valuations `v : Π → ⋃ A_p`.
3. For each generator `f : q → p`, verify the naturality square:

   ```
   f^*(v(p)) = v(q)
   ```

4. Use the existing `PredicateCategory.naturality(v)` method, which returns a
   `NaturalityWitness` with per-generator `GeneratorNaturalityCheck` records.
5. Inspect `witness.holds`. If False, inspect `witness.failures` to see which generators'
   naturality squares failed and at which cells.

## Outcomes

A `NaturalityWitness` substantiating that the fiber operations preserve 𝒞-naturality
across the generator classes. The existing
`tests/property/test_predicate_naturality_stability.py` exercises this skill via
hypothesis.
