---
title: "Work prioritization"
type: specification
slug: work-prioritization
status: superseded
superseded-by: work-dispatch-readiness
superseded-at: "2026-05-08"
version: "0.1"
hard-core: math-floor-for-substrates-commitment
theory-basis:
  - dispatch
  - dispatch-readiness
  - dispatch-readiness-regime-is-strict
  - capability-matching
  - normative-operational-layering
  - task-cell-system
---

# Work prioritization

> **Superseded.** This v0.1 specification was authored on 2026-05-08
> and replaced the same day by
> [`work-dispatch-readiness`](work-dispatch-readiness.md). The
> superseder addresses six failure modes named in the new ADR
> [`work-dispatch-readiness-as-bilattice-valued-section`](../decisions/work-dispatch-readiness-as-bilattice-valued-section.md):
> slug-tiebreak as load-bearing, two-valued readiness collapse,
> unintegrated `requires-brief:`, unmodeled task dependencies,
> markdown procedure not a closure rule, and `horizon:` as a
> captain-typed string rather than a derived value. Records still
> referencing v0.1 should migrate; this file is retained for the
> superseded-record audit trail.

## Why this exists

Without a fixed schema for *what's next*, the question "which work item should an
inference session pick up?" returns a guess instead of an answer. The PredWork
[`dispatch`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/dispatch.md)
morphism is deterministic by construction — a bilattice meet over a finite
capability index — and
[`dispatch-readiness-regime-is-strict`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/dispatch-readiness-regime-is-strict.md)
guarantees the readiness computation terminates in $|C| + |\mathcal{X}|$ steps.
The math substrate already guarantees a single answer; this specification
establishes the substrate-side cells and ordering rule that make the derivation
*actually* run on pypredcalc work records.

The XO's existing skill
[`dispatching-realization-task`](../skills/dispatching-realization-task.md)
operates on tasks already at `status: ready` and uses an unspecified "captain
may override with priority cells" mechanism. This specification fixes the cell
schema and the ordering rule, removing the indeterminacy.

## What this binds

Every `goal` and `task` work record carries a fixed set of prioritization cells.
Selection of the next work item to advance is a deterministic function of those
cells.

## The cells

### `horizon:` — temporal urgency

Required on every `goal` and `task`. Allowed values:

| Value | Meaning |
|---|---|
| `now` | Active and the queue's head — pick this first if eligible. |
| `soon` | The next horizon up; pick after all `now`-horizon items are dispatched or completed. |
| `later` | Eligible but yielding to `now` and `soon`. |
| `someday` | In scope of the enterprise but not currently prioritized. Backlog default. |
| `done` | Terminal — set when `status: completed` or `status: met`. |

Lex order on horizon: `now < soon < later < someday < done`.

`horizon: done` is the resting state of completed work; it removes the record
from the active queue without requiring deletion.

### `priority:` — within-horizon ordering (optional)

Optional integer (`priority: 0` is highest within its horizon). When absent the
record is treated as `priority: 100`. Use `priority:` only when two records at
the same horizon need a captain-imposed order; the default value is sufficient
for most records.

### `owner-office:` — accountable office

Required on every `goal`. Optional on tasks (when present, names the office the
task will be dispatched to without a routing decision; when absent, the XO
routes via `requires-capability:` per
[`dispatching-realization-task`](../skills/dispatching-realization-task.md)).

### `goal:` — task-to-goal binding

Required on every `task`. Names the slug of the goal the task advances. A task
without a parent goal is either out-of-scope work (file as a triage note) or
indicates a missing goal record.

### `requires-capability:` — task-side capability section

Required on every `task`. Names the skill slug the dispatching XO matches
against eligible offices' `provides-skill:`. This is the substrate's
realization of the task's required-capability section $\rho_T$ in
[`dispatch.md`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/dispatch.md).

### `created-at:` — timestamp

Required on every `goal` and `task`. ISO date (`YYYY-MM-DD`). Used for
tie-breaking after horizon and priority.

## The ordering rule

Given a set of records, the **active queue** is the lex-sorted result of
filtering and sorting:

1. **Filter** to records with `status` *not* in `{completed, met, abandoned, superseded}`
   and `horizon` *not* `done`.
2. **Sort** records lexicographically by the tuple:

   ```
   (horizon-rank, priority, created-at, slug)
   ```

   where `horizon-rank` is the integer index of the horizon value in
   `[now, soon, later, someday]` and `priority` defaults to `100` when absent.

3. The first element of the sorted list is the *next* element. The list itself
   is the active queue in priority order.

This ordering is total (slug breaks any remaining tie) and deterministic.

## The deterministic next-work derivation

The XO's [`selecting-next-work`](../skills/selecting-next-work.md) skill
applies the ordering rule to the union of `work/goals/` and `work/tasks/`,
filtered to dispatchable records, and returns:

- The single next work item, or
- An explicit empty result with a reason cell (`empty-because: "no active
  goals"`, `empty-because: "all active goals have no ready tasks"`,
  `empty-because: "all ready tasks are blocked on a duty"`).

The skill never returns a guess, never returns multiple choices, and never
hides the empty case behind a default.

## What's bound

- Every `goal` record under `work/goals/` carries the cells listed above.
- Every `task` record under `work/tasks/` carries the cells listed above.
- The XO's skill `selecting-next-work` follows the ordering rule.
- The duty
  [`goals-and-tasks-carry-prioritization-cells`](../duties/goals-and-tasks-carry-prioritization-cells.md)
  enforces presence of the required cells.

## What's not bound

- The shape of `work/inbox/` records (inquiries, triage notes). Inquiries are
  routed through the XO's `route-inbox-inquiry` power; they are not part of the
  active queue until they have produced a goal or task.
- The shape of `work/questions/` and `work/audits/`. Questions and audits do
  not appear in the active queue.
- How a goal's tasks are *promoted* from the goal's `tasks:` list to actual
  task records under `work/tasks/`. That is the owner-office's responsibility,
  governed by domain-specific skills (e.g., `producing-realization-brief`).
- How `priority:` values are chosen. Any office may set them; the captain's
  preference wins.

## How to use the rule

To answer "what should I work on?":

1. Apply the filter from §The ordering rule.
2. Sort the result.
3. Take the head.

If the head is a `task`, dispatch it via
[`dispatching-realization-task`](../skills/dispatching-realization-task.md).
If the head is a `goal` (no ready task yet), invoke the goal's owner-office to
produce the next task.

## Audit

The duty
[`goals-and-tasks-carry-prioritization-cells`](../duties/goals-and-tasks-carry-prioritization-cells.md)
gates merges that introduce records missing the required cells. A future audit
extension may scan the work tree and report records that fail to sort
deterministically (missing cells, ambiguous ties).

## Source-of-truth ordering

This specification is bound by:

1. The corpus — predication-categories and predicated-work, which define
   `dispatch`, `dispatch-readiness`, and the strict-regime guarantee.
2. The charter and enterprise — the (C, Γ, O) the work pursues.
3. Decisions — including
   [`work-prioritization-via-horizon-cells`](../decisions/work-prioritization-via-horizon-cells.md),
   the ADR committing to this schema.
4. This specification.
5. Conventions, the XO's skills, and the work tree.

Amending this specification requires a new ADR in [`../decisions/`](../decisions/).
