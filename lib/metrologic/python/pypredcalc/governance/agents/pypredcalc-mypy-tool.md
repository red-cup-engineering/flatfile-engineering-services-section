---
title: "pypredcalc-mypy-tool"
description: "Unix-tool agent invoking mypy --strict against src/pypredcalc. Deterministic; produces type-check report."
kind: unix-tool
location: command
provides-skill: [running-mypy-strict]
jurisdiction:
  read: [src/, pyproject.toml]
  write: [work/audits/]
---

# pypredcalc-mypy-tool

The deterministic invocation of `mypy --strict src/pypredcalc` (with project's mypy config
from `pyproject.toml`). Produces a clean / dirty report consumed by the
[`pypredcalc-quality-officer`](../offices/pypredcalc-quality-officer.md) office's review.

## Invocation

- Substrate-driven: a heartbeat tick task with `requires-capability: running-mypy-strict`
  resolves to this agent.
- Manual: `mypy --strict src/pypredcalc` from the project root.

## Output

stdout: list of type errors with file:line references, or empty on clean run. Exit code
0 = clean; non-zero = dirty.
