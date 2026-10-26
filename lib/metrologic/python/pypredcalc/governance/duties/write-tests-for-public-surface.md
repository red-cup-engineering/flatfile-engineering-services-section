---
title: "Write tests for public surface"
type: jural-relation
kind: duty
slug: write-tests-for-public-surface
active-holder: pypredcalc-developer
passive-party: pypredcalc-community
scope-action: ship-new-public-name
triggering-powers: [write-pypredcalc-source]
required-action: write-unit-and-property-tests
enforcement: substrate-violation
rule-type: N→N
theory-basis: [jural-relation, normative-operational-layering, recurrent-practice]
---

# Write tests for public surface

Every new public name (in any subpackage's `__init__.py` `__all__` list) MUST ship with
unit tests covering its contract. Structural claims (witness-returning functions, hyperdoctrine
adjoints, closure-axiom checks) additionally get hypothesis-driven property tests under
`tests/property/`.

## Required action

When adding a public name:

1. Write unit tests under `tests/test_<module>.py` that exercise:
   - The basic contract (does it produce the right output for typical inputs?).
   - Edge cases (empty inputs, boundary values, expected error conditions).
   - Realization claim, if applicable: a test that exercises the corpus atom's defining
     property.
2. For structural claims, add a property test under `tests/property/test_<aspect>.py` using
   `hypothesis`. The property test should generate inputs over a meaningful sweep and assert
   the structural property.
3. Run the suite: `pytest --ignore=tests/property` for the full suite plus property tests
   guarded by the `[hypothesis]` extra.

## What "public" means

A name is public if it appears in any `pypredcalc/.../__init__.py` `__all__` list, or is
accessible via direct import path documented in the docstring. Internal helpers with leading
underscore (`_helper`) are not public.

## Coverage floor

Branch coverage is captured in CI; new public surface must keep coverage above the
configured floor. Surface added without tests that drops the floor is a CI failure.

## Why this is workflow-tier rather than constitutive

Tests are *evidence* that the realization claim holds. The constitutive commitment is C1
(corpus-realization-binding) — the `@realizes` decoration is the claim. Tests substantiate
the claim. They're not the claim itself, so this duty is workflow-tier, not constitutive.
