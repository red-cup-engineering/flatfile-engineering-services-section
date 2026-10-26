---
title: "Tasks cite dependencies in depends-on cell"
type: jural-relation
kind: duty
slug: tasks-cite-dependencies-in-depends-on-cell
active-holder: pypredcalc-records-officer
passive-party: pypredcalc-community
scope-action: enforce-dependency-cell-presence
triggering-powers:
  - create-work-record
  - modify-work-record
required-action: ensure-depends-on-reflects-actual-dependencies
enforcement: substrate-violation
rule-type: N→O
binds-specification: work-dispatch-readiness
theory-basis:
  - dispatch-readiness
  - task-cell-system
  - normative-operational-layering
---

# Tasks cite dependencies in depends-on cell

A task whose realisation requires another task to be `done` first
MUST cite that dependency in its `depends-on:` cell. The
records-officer enforces this when creating or modifying task
records. The
[`computing-dispatch-readiness`](../skills/computing-dispatch-readiness.md)
skill consults this cell; without it, a task whose dependency is
unfilled may pass through readiness as $\mathbf{t}$ and be
dispatched out of order.

The duty exists because a goal's `tasks:` list is *practically
ordered* — `realize-q-enriched-sheaf-tensor` requires the base type
`realize-q-enriched-sheaf-base-type` to ship first — but ordering
inside a list is not substrate-derivable. The `depends-on:` cell
witnesses the order so the dispatcher can read it.

## Required cells

| Cell | Required | Notes |
|---|---|---|
| `depends-on:` | When applicable | List of task slugs. May be empty. |

A task with no dependencies sets `depends-on: []` or omits the cell
(both treated as empty).

## Triggering powers

- [`create-work-record`](../powers/create-work-record.md)
- [`modify-work-record`](../powers/modify-work-record.md)

## Discharging

The records-officer's review of a created or modified task must
either:

1. **Confirm `depends-on` is correct.** Every task slug listed
   resolves to a record under `work/tasks/`, and the named tasks
   genuinely must be `done` before this task can advance.
2. **Add the missing dependency.** If the creator omitted a
   load-bearing dependency, the records-officer adds the slug.
3. **Return the record.** If the dependency is unclear or names a
   task that does not yet exist as a record, the task moves to
   `draft` until the dependency is filed or clarified.

## Dispatch-readiness coupling

Per the spec, `computing-dispatch-readiness` returns $\mathbf{f}$
(blocked) for a task whose `depends-on` names a task with non-`done`
status, and $\bot$ (under-determined) for a task whose `depends-on`
names a slug with no record. Neither is selectable by
`selecting-next-work`.

## Enforcement

Pre-substrate:

- Code review on PRs that add or modify task records: the reviewer
  spot-checks that `depends-on` reflects the goal's actual ordering.
- `selecting-next-work` reports the dependency-blocked tasks back to
  the captain when the head is *goal-needing-task*; over time the
  pattern reveals tasks whose `depends-on` is wrong.

Post-substrate-automation:

- A closure rule checks every task-event for a coherent
  `depends-on` cell. Dangling slugs (named dependency without a
  record) fire as governance violations.

## Backfill

When this duty is first installed, the records-officer runs a
one-time scan of `work/tasks/` and adds `depends-on:` cells where
the goal's `tasks:` list ordering implies one. The current tree is
small enough this is mechanical.

## Why depends-on, not just goal.tasks ordering

A goal's `tasks:` list captures *grouping* — these tasks belong to
this goal — but not *ordering*. Two tasks under the same goal may
be independent (parallel-spawnable) or sequential. `depends-on:` on
the task itself is the substrate-derivable witness; goal.tasks
ordering is captain-typed and not load-bearing for dispatch.
