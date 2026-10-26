---
name: "Writing task records"
description: "Creates a task record at work/tasks/ encoding one concrete single-sitting unit of work. Use when decomposing realization work or creating realization-gap tasks."
---

# Writing task records

## Requirements

- One of records-officer / developer / corpus-tracker office.
- A clear single-sitting unit of work to encode.

## Steps

1. Check no existing task already covers this work (`pyfars search` for the realization
   slug or capability).
2. Write the file at `work/tasks/<slug>.md` with frontmatter:
   - `type: task`
   - `status: ready` (or `draft` if not yet ready to dispatch)
   - `requires-capability:` — names the skill the assigned office must hold.
   - `created-by:` — the office creating the task.
   - For realization-gap tasks: `corpus-slug:`, `corpus-status:`.
3. Body sections, in order:
   - **Description** — what the task is, why now.
   - **Acceptance** — checklist of criteria the closure entry will verify.
   - **References** — links to corpus markdown, parent goal, related tasks.
4. If the task has a parent goal, add the task slug to the parent goal's `tasks:` list.

## Outcomes

A new task record under `work/tasks/` ready for the XO to dispatch. The acceptance checklist
becomes the closure-entry verification surface.
