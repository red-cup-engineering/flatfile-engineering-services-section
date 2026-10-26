---
name: "Running ruff"
description: "Invokes ruff check against src/ and tests/ with the project's rule set. Use as a merge-gating check."
---

# Running ruff

## Requirements

- Quality-officer office.
- ruff installed; project's ruff configuration in `pyproject.toml` active.

## Steps

1. Run `ruff check src/ tests/`.
2. Capture exit code and report:
   - 0 → clean.
   - non-zero → dirty; capture violations with file:line and rule code.
3. If dirty, file a [`request-revision`](../powers/request-revision.md) with the
   violations.
4. If clean, the lint gate is open with respect to this run.

## Outcomes

A clean / dirty verdict. Clean unblocks downstream merge-gating; dirty closes the gate.
