---
title: "Write realization-claim test"
type: jural-relation
kind: duty
slug: write-realization-claim-test
active-holder: pypredcalc-test-author
passive-party: pypredcalc-community
scope-action: write-test-for-realization
triggering-powers: [write-test-source]
required-action: write-test-that-exercises-corpus-atom-defining-property
enforcement: substrate-violation
rule-type: N→N
theory-basis: [jural-relation, normative-operational-layering]
---

# Write realization-claim test

Every public realization MUST ship with a test that exercises the corpus atom's defining
property — not just the realization's surface API, but the mathematical content that the
`@realizes` decoration claims is preserved.

## What the realization-claim test does

For an entity `@realizes("morphisms/twist-product-fusion")`, the test:

1. Constructs a representative twist-product instance.
2. Computes fusion `a ⊙ b` using the realization.
3. Checks the corpus's defining property: fusion is a monoid operation with the unit and
   absorber the corpus says.

For an entity `@realizes("theorems/lawvere-comprehension-classical")`, the test:

1. Constructs a hyperdoctrine instance.
2. Picks a pair `(g, ψ)`.
3. Checks the corpus's adjunction: `Ext(g) ≤_t ψ ⇔ dom(q) ⊆ ψ⁻¹(t)`.

For a witness-returning function: a test that exhibits both holds=true and holds=false
inputs and verifies the witness's structural fields are correct.

## What does NOT count as a realization-claim test

- Surface API tests: "calling `.foo()` returns a `Foo`." That's a contract test, not a
  realization-claim test. Both are needed; surface-API tests don't satisfy this duty.
- Constructor-validation tests. Useful but don't exercise the realization claim.
- Tests that exercise the realization on inputs the corpus doesn't reason about.

## Enforcement

Code review during the quality-officer's gate: every `@realizes`-decorated entity has a
test in the corresponding `tests/test_<module>.py` whose docstring or name names the
corpus atom and whose body exercises the claim.
