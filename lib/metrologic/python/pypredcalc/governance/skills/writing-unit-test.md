---
name: "Writing unit test"
description: "Writes a single pytest function exercising one contract or edge case of a public name. Use as the basic test-authoring unit; multiple unit tests compose to cover a realization."
---

# Writing unit test

## Requirements

- Test-author or developer office.
- The realization being tested exists in `src/`.

## Steps

1. Open `tests/test_<module>.py` (create the file if it doesn't exist; mirror the
   `src/pypredcalc/<module>` path).
2. Write a `class Test<EntityName>` if multiple tests cover one entity, or a single
   `def test_<aspect>` for a one-off case.
3. Each test function:
   - Constructs a representative input.
   - Exercises the operation under test.
   - Asserts the expected outcome.
   - Names the aspect being tested (the test name is the assertion).
4. Run `pytest tests/test_<module>.py -x` to confirm the test runs and passes.

## Outcomes

A new test (or test class) under `tests/`. Pytest discovers it; CI runs it; coverage
reports include it.
