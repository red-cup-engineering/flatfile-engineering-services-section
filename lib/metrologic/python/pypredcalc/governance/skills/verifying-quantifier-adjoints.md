---
name: "Verifying quantifier adjoints"
description: "Checks ∃_f ⊣ f^* ⊣ ∀_f on each generator class for both ≤_k and ≤_t. Use when modifying adjoint methods on PredicateMorphism subclasses."
---

# Verifying quantifier adjoints

## Requirements

- Predication-specialist office.
- A `PredicateMorphism` subclass with `pullback`, `existential_k`, `existential_t`,
  `universal_k`, `universal_t` methods.

## Steps

1. For each generator `f : q → p` from the four classes (specialization, converse,
   subject-projection, object-projection):
2. **Existential-k adjunction** `∃_f^k ⊣ f^*` in `≤_k`: for sample fibers `α ∈ A_q` and
   `β ∈ A_p`, check
   ```
   ∃_f^k(α) ≤_k β   iff   α ≤_k f^*(β)
   ```
3. **Universal-k adjunction** `f^* ⊣ ∀_f^k` in `≤_k`: for sample fibers `α ∈ A_p` and
   `β ∈ A_q`, check
   ```
   f^*(α) ≤_k β   iff   α ≤_k ∀_f^k(β)
   ```
4. Repeat for `≤_t`: `∃_f^t ⊣ f^* ⊣ ∀_f^t`.
5. The B1k / B1t test files
   (`tests/test_b1k_generators.py`, `tests/test_b1t_generators.py`,
   `tests/test_b1k_specialization.py`) carry the per-generator adjunction checks; use
   their patterns for a new generator class.

## Outcomes

Per-adjunction witnesses confirming the corpus's B1k / B1t hyperdoctrine axioms hold
on the generator under test.
