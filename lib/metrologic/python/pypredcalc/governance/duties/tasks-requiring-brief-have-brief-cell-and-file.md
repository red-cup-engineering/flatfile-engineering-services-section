---
title: "Tasks requiring brief have brief cell and file"
type: jural-relation
kind: duty
slug: tasks-requiring-brief-have-brief-cell-and-file
active-holder: pypredcalc-records-officer
passive-party: pypredcalc-community
scope-action: enforce-brief-precondition
triggering-powers:
  - create-work-record
  - modify-work-record
required-action: ensure-brief-cell-and-file-or-clear-requires-brief
enforcement: substrate-violation
rule-type: N→O
binds-specification: work-dispatch-readiness
theory-basis:
  - dispatch-readiness
  - normative-operational-layering
  - operational-evidence
---

# Tasks requiring brief have brief cell and file

A task with `requires-brief: true` MUST also carry a `brief:` cell
naming the path of the brief, AND the file at that path MUST exist
under `work/briefs/`. The records-officer enforces this when
creating or modifying task records.

The duty exists because the
[`computing-dispatch-readiness`](../skills/computing-dispatch-readiness.md)
skill returns $\bot$-readiness for any task whose `requires-brief`
precondition is not discharged. A task that names the precondition
without satisfying it is invisibly under-determined; the prior
spec's lack of this duty led to two such tasks being dispatched
on 2026-05-08 with no brief. This duty closes that hole.

## Required cells

| Cell | When required |
|---|---|
| `requires-brief: true` | Optional; default `false`. |
| `brief:` | Required when `requires-brief: true`. Path to the brief. |
| Brief file | Required when `requires-brief: true`. Must exist on disk. |

When `requires-brief` is absent or `false`, no brief cell or file is
required; the readiness skill marks `brief_check: SettledOk`.

## Triggering powers

- [`create-work-record`](../powers/create-work-record.md) — when a
  task is filed.
- [`modify-work-record`](../powers/modify-work-record.md) — when an
  existing task is amended (in particular when `requires-brief: true`
  is added).

## Discharging

Three valid discharging actions:

1. **Brief produced.** The corpus-reader produces the brief at the
   named path; the cell `brief:` is added or updated to point at it.
2. **Brief precondition cleared.** If the task does not actually need
   a brief, set `requires-brief: false` (or remove the cell).
3. **Task moved to `draft`.** A task that cannot satisfy its brief
   precondition cannot be `ready`; the records-officer moves it to
   `draft` and files a question or escalation noting the gap.

A task that carries `requires-brief: true` with no brief AND
`status: ready` is a substrate violation regardless of who dispatched
it.

## Enforcement

Pre-substrate (current state):

- The `computing-dispatch-readiness` skill checks the precondition
  and returns $\bot$ for any violating task. The `selecting-next-work`
  skill never returns such a task as *task-ready*.
- Code review on PRs that add or modify a task with `requires-brief`
  must verify the brief exists.

Post-substrate-automation:

- A closure rule fires when `create-work-record` or
  `modify-work-record` produces a task event with
  `cell(task, requires-brief) = t`. The rule's antecedent atom checks
  `cell(task, brief)` is post-closure positive AND the brief-file
  exists relation holds. A `⊥`-valued check generates a
  governance-rule violation event.

## Backfill

When this duty is first installed, existing tasks may not yet carry
a coherent brief precondition. The records-officer scans
`work/tasks/` for `requires-brief: true` records and verifies each
either points at an existing brief or is moved out of `ready`.

## Why this duty fires before readiness, not after

`requires-brief` is a *cell-presence precondition*: the substrate
needs the brief file as a referenced entity before the task's
readiness can settle. Without the duty, the brief cell is decorative
— named in markdown, ignored by the dispatcher. With the duty, the
cell is load-bearing: missing brief = $\bot$-readiness = not
selectable.
