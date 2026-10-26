---
title: "pypredcalc-audit-tool"
description: "Deterministic Python script that walks pypredcalc.src for @realizes decorations and resolves each slug against the corpus. The corpus-binding audit."
kind: unix-tool
location: governance/skills/running-corpus-binding-audit/audit.py
role: pypredcalc-corpus-tracker
incumbent-of: pypredcalc-corpus-tracker
provides-skill:
  - running-corpus-binding-audit
  - auditing-corpus-realization-coverage
jurisdiction:
  read: [src/, theories/.../predication-categories/]
  write: [work/audits/]
---

# pypredcalc-audit-tool

The deterministic script at `governance/skills/running-corpus-binding-audit/audit.py`. Walks `pypredcalc.src`
collecting every `@realizes("type/slug")` decoration; resolves each slug against the
corpus markdown tree; reports unresolved slugs as substrate violations and corpus atoms
without incoming decorations as realization gaps.

## What it executes

The script exercises the
[`run-corpus-binding-audit`](../powers/run-corpus-binding-audit.md) power on behalf of the
[`pypredcalc-corpus-tracker`](../offices/pypredcalc-corpus-tracker.md) office. As a
unix-tool agent, it has no LLM; it's deterministic Python.

## Invocation

- Manual: `python governance/skills/running-corpus-binding-audit/audit.py [--report-orphans]`.
- Substrate-driven: a heartbeat-tick task with `requires-capability: running-corpus-binding-audit`
  resolves to this agent.

## Output

A coverage report at `work/audits/coverage-<date>.md` (or stdout when invoked manually).
Format:

```
# Coverage report (date)

Total corpus atoms: N
Realized: M
Gaps: N - M
Unresolved slugs: K  (governance violations)

## New realizations since prior audit

- ...

## Persistent gaps (unrealized in this and prior audit)

- ...

## Unresolved @realizes slugs

- src/.../foo.py: @realizes("objects/missing-atom") — file does not exist
```

## What the agent cannot do

- Decide which gap to realize next (corpus-tracker office decides via
  `identifying-realization-gap`).
- Write task records (corpus-tracker office writes via the records-officer's
  `writing-task-records`).
- Write to source code (developer office's privilege).

The audit-tool just reports; humans (or the LLM-backed offices above) act on the reports.
