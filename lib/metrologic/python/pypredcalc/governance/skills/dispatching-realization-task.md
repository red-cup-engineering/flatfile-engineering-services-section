---
name: "Dispatching realization task"
description: "Picks a ready task and assigns it to an eligible office. Use during heartbeat tick when work/tasks/ contains tasks with status: ready."
---

# Dispatching realization task

## Requirements

- XO office.
- One or more ready tasks in `work/tasks/`.

## Steps

1. List ready tasks: `pyfars list --type task --status ready` (or equivalent grep).
2. For each task, read `requires-capability:`. Match against eligible offices' `provides-skill:`.
3. Pick the next task to dispatch. Tie-breaking heuristic: oldest `created-at`, then
   alphabetical by slug. Captain may override with priority cells.
4. Update the task's frontmatter:
   - `status: dispatched`
   - `assigned-to: <office-slug>`
   - `dispatched-at: <date>`
5. File a classification witness per `witness-every-classification` — currently the task's
   own frontmatter satisfies this; substrate-automation later replaces with explicit witness
   records.
6. The assigned office's incumbent agent picks up the task on its next dispatch read.

## Outcomes

The task is now `dispatched` with a recorded `assigned-to:`. The XO's `close-execution-loop`
duty fires when the office reports completion.
