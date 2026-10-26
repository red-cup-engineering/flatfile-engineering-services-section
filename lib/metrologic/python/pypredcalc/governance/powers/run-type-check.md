---
title: "Run type check"
type: jural-relation
kind: power
slug: run-type-check
active-holder: pypredcalc-quality-officer
passive-party: pypredcalc-community
scope-action: invoke-mypy-strict
correlate-of: liability
duties: [enforce-mypy-strict]
enables-skills: [running-mypy-strict]
theory-basis: [jural-relation, normative-operational-layering]
---

# Run type check

The quality officer may invoke `mypy --strict` against `src/pypredcalc`. Type errors are
substrate violations of the developer's responsibility to write type-clean code.

## Effect

mypy emits a clean / dirty report. Dirty (any error) gates merge closed under
[`review-before-merge`](../duties/review-before-merge.md) until the developer remediates.

The mypy invocation is a unix-tool agent
([`pypredcalc-mypy-tool`](../agents/pypredcalc-mypy-tool.md)); the quality-officer
exercises this power *via* that agent.
