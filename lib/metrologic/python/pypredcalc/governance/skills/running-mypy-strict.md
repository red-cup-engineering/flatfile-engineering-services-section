---
name: "Running mypy --strict"
description: "Invokes mypy --strict against src/pypredcalc and reports clean / dirty. Use as a merge-gating check during code review and a release-gating check before publishing."
---

# Running mypy --strict

## Requirements

- Quality-officer office.
- mypy installed; project's mypy configuration in `pyproject.toml` active.

## Steps

1. Run `mypy --strict src/pypredcalc` (or `mypy src/pypredcalc` if the project's mypy
   config sets `strict = true` already).
2. Capture the exit code and report:
   - 0 / no output → clean.
   - non-zero / errors → dirty; capture the error list with file:line.
3. If dirty, file a [`request-revision`](../powers/request-revision.md) listing each
   error.
4. If clean, the type-check gate is open with respect to this run.

## Outcomes

A clean / dirty verdict. Clean unblocks downstream merge-gating powers; dirty closes the
gate until the developer remediates.
