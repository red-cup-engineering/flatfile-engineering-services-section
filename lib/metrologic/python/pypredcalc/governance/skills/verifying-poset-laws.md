---
name: "Verifying poset laws"
description: "Checks reflexivity, antisymmetry, and transitivity on a candidate order relation. Use when modifying combinatorics/poset.py."
---

# Verifying poset laws

## Requirements

- Combinatorics-specialist office.
- A candidate `(P, ≤)` to verify (a finite carrier with an order relation).

## Steps

1. **Reflexivity**: `a ≤ a` for every `a ∈ P`. Enumerate.
2. **Antisymmetry**: `a ≤ b ∧ b ≤ a ⟹ a = b`. For every ordered pair, check.
3. **Transitivity**: `a ≤ b ∧ b ≤ c ⟹ a ≤ c`. For every ordered triple, check.
4. Produce a structural witness recording per-violation pairs/triples.

## Outcomes

A witness confirming the candidate is a poset. `holds=True` ⟹ a valid poset; `holds=False`
surfaces the violating elements.
