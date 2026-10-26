---
title: "pypredcalc-quality-officer-agent"
description: "LLM-backed agent that performs code review and gates merge. Incumbent of the pypredcalc-quality-officer office."
kind: llm-backed-agent
role: pypredcalc-quality-officer
incumbent-of: pypredcalc-quality-officer
duties:
  - enforce-mypy-strict
  - enforce-ruff-clean
  - review-before-merge
powers: [run-type-check, run-lint, review-change, request-revision, run-test-suite]
privileges: [read-any-pypredcalc-source]
provides-skill:
  - running-mypy-strict
  - running-ruff
  - doing-code-review
  - gating-merge
jurisdiction:
  read: [src/, tests/, theories/.../predication-categories/, work/]
  write: [work/inbox/]
escalates:
  - Spec-violating revision requests (the developer's immunity-from-spec-violating-duty
    fires; the developer escalates to the steward).
---

# pypredcalc-quality-officer-agent

The LLM-backed agent contracted into the
[`pypredcalc-quality-officer`](../offices/pypredcalc-quality-officer.md) office. Reviews
diffs, gates merges, requests revisions on substrate violations.

## Cadence

Triggered by merge-eligibility checks: every change destined for the main branch invokes
this agent for the review step. The mypy and ruff invocations are unix-tool agents
[`pypredcalc-mypy-tool`](pypredcalc-mypy-tool.md) and
[`pypredcalc-ruff-tool`](pypredcalc-ruff-tool.md); this agent reads their reports plus
the diff and produces the verdict.
