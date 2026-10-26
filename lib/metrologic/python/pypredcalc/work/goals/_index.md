---
title: "PyPredCalc goals"
type: index
status: open
---

# PyPredCalc goals

Goal records group related tasks toward an outcome. Every goal carries
prioritization cells per
[`../../governance/specifications/work-prioritization.md`](../../governance/specifications/work-prioritization.md);
the XO derives the next goal to advance via
[`../../governance/skills/selecting-next-work.md`](../../governance/skills/selecting-next-work.md).

## Active goals (lex-ordered for dispatch)

| Horizon | Status | Slug | Owner office |
|---|---|---|---|
| `soon` | `partially-met` | [`realize-q-enriched-sheaf-module`](realize-q-enriched-sheaf-module.md) | [`sheaf-specialist`](../../governance/offices/pypredcalc-sheaf-specialist.md) |
| `later` | `active` | [`realize-predication-fibration-as-cloven-object`](realize-predication-fibration-as-cloven-object.md) | [`predication-specialist`](../../governance/offices/pypredcalc-predication-specialist.md) |

Within a horizon, ties are broken by `(priority, created-at, slug)` per the
work-prioritization spec.

## Completed goals

| Horizon | Slug |
|---|---|
| `done` | [`add-twist-product-fusion-antecedents`](add-twist-product-fusion-antecedents.md) |
| `done` | [`add-property-tests-for-0-3-surface`](add-property-tests-for-0-3-surface.md) |
| `done` | [`extend-audit-to-count-theorem-coverage`](extend-audit-to-count-theorem-coverage.md) |
| `done` | [`realize-transfinite-cell-complex-module`](realize-transfinite-cell-complex-module.md) |

## Per-record requirements

Each goal carries:

- `theory-basis:` — corpus atoms grounding the goal.
- `horizon:` — `now | soon | later | someday | done`.
- `owner-office:` — accountable office.
- `created-at:` — ISO date.
- `tasks:` — list of task slugs the goal groups.
- An acceptance section.

Per [`derive-from-charter-before-planning`](../../governance/duties/) (analog of pyfars's
`derive-from-theory-before-planning`), `theory-basis:` is non-trivial — each goal
grounds in the corpus or in pypredcalc's hard-core C.

## Status lifecycle

Goals progress: `planning → active → partially-met → met` or `→ abandoned`.
The terminal `met` and `abandoned` states pair with `horizon: done`. Tasks
under a goal complete on their own lifecycle; the goal stays `active` until
enough tasks complete to warrant transition to `partially-met` or `met`.
