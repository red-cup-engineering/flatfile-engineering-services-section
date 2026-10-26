---
name: "Running test suite"
description: "Runs pytest and reports pass/fail with the failing-test breakdown. Use after every realization, and as a precondition to closing any developer task."
---

# Running test suite

## Requirements

- Developer office.
- Working pytest installation.

## Steps

1. Run the full unit suite: `pytest --ignore=tests/property -q`.
2. If `[hypothesis]` extra is available, run the property suite: `pytest tests/property -q`.
3. Read the output:
   - All pass → report green.
   - Failures → list failing tests, file paths, error summary.
4. If failures are in tests the developer just wrote: fix the realization or the test.
5. If failures are in pre-existing tests: this means the realization broke an upstream
   contract. Either (a) the test was checking provisional behaviour that's now correctly
   different, in which case update the test and CHANGELOG; or (b) the realization is wrong
   and needs revision.
6. Re-run until clean. Do not mark task complete with red tests.

## Outcomes

A confirmed pass/fail status that gates task closure. Red tests block `close-execution-loop`
on the dispatched task.
