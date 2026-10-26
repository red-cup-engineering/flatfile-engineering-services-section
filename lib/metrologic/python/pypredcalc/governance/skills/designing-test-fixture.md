---
name: "Designing test fixture"
description: "Creates a reusable test input that several tests share — entity sets, predicate categories, hyperdoctrines, sample valuations. Use to keep individual tests focused on the property they assert."
---

# Designing test fixture

## Requirements

- Test-author office.
- A repeating pattern in test inputs that warrants extraction.

## Steps

1. Identify the repetition. Common patterns in pypredcalc:
   - A small entity set `E = {1, 2, 3}` used across many tests.
   - A boolean-twist bilattice with the FOUR constants.
   - A predicate category with a generator inventory.
   - A canonical rule system (transitive closure, symmetric closure).
2. Choose where the fixture lives:
   - **Top of test file**: module-level constants used only in one file.
   - **`conftest.py`**: pytest fixtures shared across tests in a directory.
   - **Helper module under `tests/_fixtures/`**: composable builders used across many
     test files.
3. Name the fixture for what it provides, not what it's made of (`small_hyperdoctrine`,
   not `H_with_3_predicates`).
4. Document any non-obvious property the fixture has (e.g., "this hyperdoctrine has the
   converse generator on `p`, which is what makes BC tests interesting").

## Outcomes

A fixture that focused tests can use. Tests get shorter; the property the test is
asserting becomes the central content rather than the setup.
