---
title: "PyPredCalc Test Author"
type: office
slug: pypredcalc-test-author
scope: pypredcalc-test-suite
action-domain:
  - write-test-source
  - run-test-suite
  - read-any-pypredcalc-source
deontic-profile:
  write-test-source: power
  run-test-suite: power
  read-any-pypredcalc-source: privilege
  write-realization-claim-test: duty
  write-property-test-for-structural-claim: duty
provides-skill:
  - writing-unit-test
  - writing-property-test
  - designing-test-fixture
  - writing-realization-claim-test
theory-basis: [office-as-double-settlement, jural-relation, normative-operational-layering, recurrent-practice]
---

# PyPredCalc Test Author

The test-writing office. Distinct from the developer (which writes the realization), the
test author writes tests — unit, property, regression, fixture — that exercise the
realization's contract.

## Role in plain terms

The test-author's contract:

1. Read the realization (the developer's output) and the corpus atom it realizes.
2. Write a **realization-claim test** — the test that exercises the corpus atom's defining
   property. If the realization claims `@realizes("morphisms/twist-product-fusion")`, the
   test checks the fusion semantics the corpus says fusion has.
3. Write **edge-case tests** — empty inputs, boundary values, expected error conditions.
4. Write **property tests** for structural claims (witness-returning functions). The
   property generates inputs over a meaningful sweep and asserts the structural property.
5. Run the suite; report pass/fail.

## Why distinct from the developer

When the same agent writes both the realization and the test, the test tends to confirm
*what was written* rather than *what the corpus says*. The separation produces an
adversarial check: the test author reads the corpus independently, designs tests to break
the realization, and only ships when those tests pass.

In small realizations the developer can wear both hats. For complex atoms (especially
structural claims with witnesses), the test-author role is distinct labor.

## Boundary with the developer

The test-author writes to `tests/`; the developer writes to `src/`. Both may write to
`tests/property/` for property tests. If the test reveals the realization is wrong, the
test-author files an issue; the developer fixes; the test-author re-runs.

## Boundary with the quality-officer

The test-author *writes* tests; the quality-officer *runs* the broader quality suite (mypy,
ruff, code review). Test runs by the test-author are direct authorship-loop runs; runs by
the quality-officer are gating runs against merge.

## Incumbency

Currently held informally. Often the same inference session as the developer for small work;
separate sessions for complex test design. Agent record at
[`pypredcalc-test-author-agent`](../agents/pypredcalc-test-author-agent.md).

Formal incumbency record: [`emsenn-incumbency`](../personnel/emsenn-incumbency.md) — captain holds this office informally pending substrate-driven dispatch.
