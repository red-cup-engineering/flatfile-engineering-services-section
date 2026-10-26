---
name: "Writing realization-claim test"
description: "Writes a test that exercises the corpus atom's defining property — the test that substantiates an `@realizes` decoration. Use as the realization's primary acceptance test."
---

# Writing realization-claim test

## Requirements

- Test-author office.
- A `@realizes`-decorated entity in `src/`.
- The corpus atom's markdown.

## Steps

1. Re-read the corpus atom's "Definition" or "Statement" section to identify the
   *defining property* — the thing that makes this the atom and not some neighbor.
2. Distinguish from contract tests:
   - **Contract test**: "calling `.foo()` returns a `Foo`." Necessary; not what this
     skill produces.
   - **Realization-claim test**: "for any `Foo` and `Bar`, the realization preserves the
     identity `foo(bar(x)) == bar(foo(x))` that the corpus's `objects/foo` posits."
3. Write the test, naming it after the corpus property:

```python
def test_realizes_objects_foo__preserves_associativity(self) -> None:
    """The realization of `objects/foo` preserves associativity per the corpus."""
    ...
```

4. Where the property is structural and ranges over inputs, lift to a property test via
   [`writing-property-test`](writing-property-test.md).
5. Run the test; confirm green.

## Outcomes

A test that, if it passes, substantiates the `@realizes` decoration. If a future
modification breaks the realization claim, this test fails immediately rather than the
breakage being silently absorbed.
