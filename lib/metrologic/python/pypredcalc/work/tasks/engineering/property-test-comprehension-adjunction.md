---
title: "Property test for Lawvere comprehension adjunctions"
type: task
slug: property-test-comprehension-adjunction
status: completed
horizon: done
requires-capability: writing-property-test
goal: add-property-tests-for-0-3-surface
created-by: pypredcalc-corpus-tracker
corpus-slug: [theorems/lawvere-comprehension-classical, theorems/lawvere-comprehension-paraconsistent]
---

# Property test for Lawvere comprehension adjunctions

## Description

Add `tests/property/test_comprehension_adjunction.py` exercising both comprehension
adjunctions (classical `Ext^t ⊣ {p:-}_t` and paraconsistent `Ext^k ⊣ {p:-}_⊤`) across
hypothesis-generated sub-supports and fiber valuations.

The existing unit test `tests/test_b4_lawvere_comprehension.py` already exhausts a
2-entity case (16 sub-supports × 256 ψ-fibers = 4096 pairs per schema); the property
test scales this to larger entity sets via hypothesis.

## Acceptance

- [x] `tests/property/test_comprehension_adjunction.py` exists.
- [x] Hypothesis generators for entity sets (size 2-4), sub-supports, and ψ fibers.
- [x] Properties:
      - Classical: `Ext^t(g) ≤_t ψ ⇔ dom(q) ⊆ comprehension_t(p, ψ).sub_support`.
      - Paraconsistent: `Ext^k(g) ≤_k ψ ⇔ dom(q) ⊆ comprehension_k(p, ψ).sub_support`.
- [x] Tests pass with `max_examples = 50`.

## References

- Corpus theorems: `theorems/lawvere-comprehension-classical`,
  `theorems/lawvere-comprehension-paraconsistent`.
- Existing unit tests: `tests/test_b4_lawvere_comprehension.py`.
