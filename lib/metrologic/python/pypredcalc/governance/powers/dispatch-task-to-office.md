---
title: "Dispatch task to office"
type: jural-relation
kind: power
slug: dispatch-task-to-office
active-holder: pypredcalc-executive-officer
passive-party: pypredcalc-community
scope-action: assign-task-to-eligible-office
correlate-of: liability
duties: [witness-every-classification, close-execution-loops]
enables-skills: [dispatching-realization-task]
theory-basis: [normative-operational-layering, jural-relation, dispatch-readiness, task-cell-system]
---

# Dispatch task to office

The XO may assign a ready task to an eligible office. Eligibility is determined by matching
the task's `requires-capability:` field against the candidate office's `provides-skill:` list.

## Attached duties

- [`witness-every-classification`](../duties/witness-every-classification.md) — the dispatch
  decision records source, eligible candidates, chosen office, and reason.
- [`close-execution-loops`](../duties/close-execution-loops.md) — every dispatched task gets
  an explicit closure entry.

## Eligibility rules

A task with `requires-capability: realizing-corpus-atom-as-python` is eligible for the
[`pypredcalc-developer`](../offices/pypredcalc-developer.md) office (the office's
`provides-skill:` includes that skill). A task with
`requires-capability: writing-decision-records` is eligible for the
[`pypredcalc-records-officer`](../offices/pypredcalc-records-officer.md) office.

## Effect

The task's `assigned-to:` cell is settled to the chosen office's slug. The office's incumbent
agent picks up the task at the next dispatch read.
