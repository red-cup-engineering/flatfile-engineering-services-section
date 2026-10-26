---
title: "Close execution loop"
type: jural-relation
kind: power
slug: close-execution-loop
active-holder: pypredcalc-executive-officer
passive-party: pypredcalc-community
scope-action: record-task-outcome
correlate-of: liability
duties: [close-execution-loops]
enables-skills: [closing-execution-loop]
theory-basis: [normative-operational-layering, jural-relation, dispatch-readiness, task-cell-system]
---

# Close execution loop

The XO may record the outcome of a dispatched task: completion, partial completion with
follow-up, or stall. Closure is what makes the dispatch loop a *loop* — without closure,
tasks pile up indefinitely and dispatch reads stale state.

## Closure categories

- **complete** — the task's acceptance criteria are met; output committed.
- **partial** — some acceptance criteria met, others fall through to follow-up tasks (which
  the XO creates and queues).
- **stall** — work is blocked. The XO files a stall classification with the blocker; if the
  blocker is upstream (corpus, captain decision), it escalates.

## Attached duty

- [`close-execution-loops`](../duties/close-execution-loops.md) — every dispatched task has
  exactly one closure entry. No silent drops; no orphaned dispatches.

## Effect

The task's `status:` cell is settled to one of `done`, `partial`, `stalled`, or `abandoned`.
The closure entry records the timestamp, outcome, and (for partial / stall) follow-up
references.
