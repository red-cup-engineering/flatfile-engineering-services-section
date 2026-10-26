---
title: "Run lint"
type: jural-relation
kind: power
slug: run-lint
active-holder: pypredcalc-quality-officer
passive-party: pypredcalc-community
scope-action: invoke-ruff
correlate-of: liability
duties: [enforce-ruff-clean]
enables-skills: [running-ruff]
theory-basis: [jural-relation, normative-operational-layering]
---

# Run lint

The quality officer may invoke `ruff check` against `src/` and `tests/` with the rule set
from `pyproject.toml`. Lint violations gate merge closed.

## Effect

Ruff emits a clean / dirty report. The ruff invocation is a unix-tool agent
([`pypredcalc-ruff-tool`](../agents/pypredcalc-ruff-tool.md)); the quality-officer
exercises this power *via* that agent.
