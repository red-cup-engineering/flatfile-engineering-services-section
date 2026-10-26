---
title: "File realization-gap task"
type: jural-relation
kind: power
slug: file-realization-gap-task
active-holder: pypredcalc-corpus-tracker
passive-party: pypredcalc-community
scope-action: create-realization-gap-task
scope: work/tasks/
correlate-of: liability
duties: [maintain-corpus-tracking-loop-integrity]
enables-skills: [identifying-realization-gap]
theory-basis: [normative-operational-layering, jural-relation, dispatch-readiness]
---

# File realization-gap task

The corpus-tracker may create a task record under `work/tasks/` describing a corpus atom
that has no `@realizes`-bound Python entity. The task carries:

- `requires-capability: realizing-corpus-atom-as-python` — so the XO can dispatch to the
  developer.
- `corpus-slug: <type/slug>` — the unrealized atom.
- `corpus-status: <proved|defined|...>` — only realize atoms whose status is mature; draft
  atoms are skipped.

## Attached duty

- [`maintain-corpus-tracking-loop-integrity`](../duties/maintain-corpus-tracking-loop-integrity.md) —
  the corpus-tracker runs periodic audits; gap-tasks file naturally on the audit cadence.

## What this is *not* a power for

- Writing the realization itself. That's [`write-pypredcalc-source`](write-pypredcalc-source.md),
  held only by the developer.
- Modifying the corpus. The corpus is upstream; corpus-tracker holds read privilege only.
