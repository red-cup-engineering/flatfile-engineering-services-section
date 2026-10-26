---
name: "Writing property test"
description: "Writes a hypothesis-driven property test that generates inputs over a sweep and asserts a structural property. Use for witness-returning functions and other structural claims."
---

# Writing property test

## Requirements

- Test-author office.
- `hypothesis` available (the `[hypothesis]` extra installed).
- A structural claim to test.

## Steps

1. Open `tests/property/test_<aspect>.py` (or create it).
2. Import `hypothesis.strategies` and design generators for the inputs the structural
   claim ranges over. For pypredcalc, common generators include:
   - `bilattice_value_strategy` — generates `(a, b)` pairs in a twist bilattice.
   - `entity_set_strategy` — generates small `EntitySet`s.
   - `fiber_valuation_strategy` — generates `FiberValuation`s on a chosen domain.
3. Write the property:

```python
@given(...)
def test_<property_name>(...):
    witness = function_under_test(...)
    if witness:
        # claim holds; structural fields are coherent
        assert <coherence-condition>
    else:
        # claim doesn't hold; structural fields pinpoint the failure
        assert <failure-localization>
```

4. Configure hypothesis settings (`max_examples`, `deadline`) appropriately. Math
   property tests can be slow; budget accordingly.
5. Run `pytest tests/property/test_<aspect>.py -q` to confirm.

## Outcomes

A new property test under `tests/property/`. Hypothesis generates inputs over the sweep
on each run; failures are minimized to a small counterexample.
