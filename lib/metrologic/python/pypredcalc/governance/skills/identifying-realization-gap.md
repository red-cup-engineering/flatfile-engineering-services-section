---
name: "Identifying realization gap"
description: "Picks one corpus atom from the gap list and produces a task record describing the realization to write. Use after an audit reports new gaps."
---

# Identifying realization gap

## Requirements

- Corpus-tracker office.
- A coverage report from `auditing-corpus-realization-coverage`.

## Steps

1. From the coverage report's "new gaps" or "persistent gaps" list, pick one atom. Prefer:
   - Atoms with `status: proved` or `status: defined` (not `draft`).
   - Atoms whose `depends-on:` chain is fully realized (the realization can be written
     without backfilling more gaps).
   - Atoms downstream consumers (pyfars inbox inquiries) name explicitly.
2. Read the corpus markdown for the atom; understand what realizing it requires.
3. Write a task record at `work/tasks/realize-<slug>.md` with frontmatter:
   - `type: task`
   - `status: ready`
   - `requires-capability: realizing-corpus-atom-as-python`
   - `corpus-slug: <type/slug>`
   - `corpus-status: <proved | defined>`
   - `created-by: pypredcalc-corpus-tracker`
4. Body sections:
   - **Description** — what the atom is, what realizing it requires.
   - **Acceptance** — checklist: the entity exists in `src/`, carries `@realizes`, has
     unit tests, ships in the appropriate `__init__.py`'s `__all__`.
   - **References** — link to the corpus markdown.

## Outcomes

A new task record under `work/tasks/`. The XO will dispatch it to the developer at the
next heartbeat.
