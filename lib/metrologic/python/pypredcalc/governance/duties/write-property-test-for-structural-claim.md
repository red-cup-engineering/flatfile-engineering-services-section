---
title: "Write property test for structural claim"
type: jural-relation
kind: duty
slug: write-property-test-for-structural-claim
active-holder: pypredcalc-test-author
passive-party: pypredcalc-community
scope-action: write-test-for-witness-returning-function
triggering-powers: [write-test-source]
required-action: write-hypothesis-property-test-under-tests-property
enforcement: substrate-violation
rule-type: N→N
theory-basis: [jural-relation, normative-operational-layering]
---

# Write property test for structural claim

Every witness-returning function (anything implementing
[`return-witness-for-structural-claims`](return-witness-for-structural-claims.md)) MUST
ship with a hypothesis-driven property test under `tests/property/`. The property test
generates inputs over a meaningful sweep and asserts the structural property the witness
claims to record.

## Property-test shape

```python
from hypothesis import given, strategies as st

@given(...)  # generators for the function's input domain
def test_naturality_property(...):
    witness = some_function_returning_NaturalityWitness(...)
    # The property: if holds is True, the structural fields are coherent.
    if witness:
        assert witness.discrepancy == frozenset()
    else:
        # If holds is False, the witness pinpoints the failure cells.
        assert len(witness.discrepancy) > 0
```

The property test should generate inputs that *could* break the realization, not just
inputs the unit tests already cover.

## Coverage of the structural surface

Currently covered by property tests under `tests/property/`:

- `test_bilattice_laws.py` — interlacing laws on the Belnap bilattice.
- `test_residuation_adjunction.py` — fusion-residual adjunction.
- `test_predicate_naturality_stability.py` — naturality stability under generator
  composition.
- `test_frame_morphism_preservation.py` — frame-morphism preservation laws.

New witness types added since the 0.3 calculator surface (`ClosureAxiomWitness`,
`ClAlgebraWitness`, `BeckChevalleyWitness`, `ClStarCounitWitness`, etc.) are pending
property-test coverage. That's a backlog item the test-author works through release-by-
release.

## Enforcement

Code review during the quality-officer's gate. New witness types without corresponding
`tests/property/` coverage flag in the review.
