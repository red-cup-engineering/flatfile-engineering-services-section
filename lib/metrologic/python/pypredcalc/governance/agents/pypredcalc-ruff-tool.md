---
title: "pypredcalc-ruff-tool"
description: "Unix-tool agent invoking ruff check against src/ and tests/. Deterministic; produces lint report."
kind: unix-tool
location: command
provides-skill: [running-ruff]
jurisdiction:
  read: [src/, tests/, pyproject.toml]
  write: [work/audits/]
---

# pypredcalc-ruff-tool

The deterministic invocation of `ruff check src/ tests/` (with the project's rule set in
`pyproject.toml`). Produces a clean / dirty report consumed by the
[`pypredcalc-quality-officer`](../offices/pypredcalc-quality-officer.md) office's review.

## Invocation

- Substrate-driven: a heartbeat tick task with `requires-capability: running-ruff`
  resolves to this agent.
- Manual: `ruff check src/ tests/`.

## Output

stdout: list of lint violations with file:line and rule code, or empty on clean run.
Exit code 0 = clean; non-zero = dirty.
