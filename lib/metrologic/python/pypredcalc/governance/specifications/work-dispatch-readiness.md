---
title: "Work dispatch readiness"
type: specification
slug: work-dispatch-readiness
status: active
version: "0.1"
hard-core: math-floor-for-substrates-commitment
supersedes: work-prioritization
theory-basis:
  - dispatch
  - dispatch-readiness
  - dispatch-readiness-regime-is-strict
  - capability-matching
  - normative-operational-layering
  - task-cell-system
  - operational-evidence
---

# Work dispatch readiness

## Why this exists

The prior specification
[`work-prioritization`](work-prioritization.md) v0.1 collapsed dispatch
readiness to two-valued (`status: ready` or not), broke ties by slug
order, and left the `requires-brief: true` and task-dependency
preconditions unintegrated with the queue ordering. Two tasks were
dispatched in the 2026-05-08 session whose briefs did not exist; the
mistake was caught only after the fact, by hand. The selection rule
must be substrate-derivable, not slap-dash.

This specification supersedes v0.1 and brings dispatch readiness into
line with the corpus's
[`dispatch-readiness`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/dispatch-readiness.md)
concept and the
[`dispatch`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/dispatch.md)
morphism it computes.

## What this binds

For every `task` and `goal` record, the substrate is required to
carry the cells from which dispatch readiness is **derivable**, not
*declared*. The XO's `selecting-next-work` skill computes the
readiness witness from those cells; the witness's structural fields
are authoritative for what the next work item is and *why*.

## The bilattice-valued readiness

Per the corpus, dispatch readiness $\delta(A, T) \in \mathbf{FOUR}$:

| Value | Meaning |
|---|---|
| $\mathbf{t}$ | **Ready** — every required cell is settled positively. The task can be dispatched now. |
| $\mathbf{f}$ | **Blocked** — some precondition is provably unsatisfied (capability missing, capacity exceeded, authority absent). |
| $\bot$ | **Under-determined** — at least one required cell is missing or its truth-value has not yet settled (no brief, no `corpus-slug`, no `depends-on`, etc.). |
| $\top$ | **Contradicted** — the substrate carries both positive and negative witnesses on some required precondition. Held until adjudication. |

The two-valued collapse `ready / not ready` of v0.1 is a substrate
violation: it loses both $\bot$ (the working state of most prep
work) and $\top$ (the diagnostic state for governance contradictions).

## Required cells on tasks

Every `task` record must carry the cells the readiness computation
reads. Each cell's *presence* (or *absence*) drives the witness's
under-determined component; the cell's *value* drives the truth or
falsity components.

### Identity and lineage

- `slug:` — kebab-case slug (required, presence-checked).
- `goal:` — slug of the parent goal (required, presence-checked, must
  resolve to an active or partially-met goal).
- `corpus-slug:` — the corpus atom realised, when applicable (required
  for any task realising a corpus entity).

### Status and horizon

- `status:` — one of `draft | ready | dispatched | in-progress |
  partial | done | stalled | abandoned`. Computed-readiness machinery
  ignores `status: ready` as authoritative; it computes its own
  verdict and may override.
- `horizon:` — `now | soon | later | someday | done` (kept from v0.1,
  but no longer the load-bearing part of the rule; horizon is a
  captain-imposed *preference* on top of readiness, not a substitute
  for it).

### Preconditions (brief / dependency / capability / authority)

- `requires-brief:` (boolean, default `false`). When `true`, two
  further cells must both hold for readiness to settle:
  - `brief:` — the path of the brief record.
  - The file at `brief:` must exist.
- `depends-on:` (list of task slugs, default empty). Every named
  dependency must have `status: done` (or equivalently `horizon: done`).
- `requires-capability:` — fiber section over capabilities. Two
  surface forms accepted:
    - **String** (or list of strings): each named capability is
      required at $\mathbf{t}$. `requires-capability: writing-property-test`
      is sugar for `requires-capability: {writing-property-test: t}`.
    - **Mapping**: `Mapping[capability-slug, BilatticeValue]` — the
      fiber section $\rho_T : C \to \mathbf{FOUR}$ from the corpus.
      `t` means required, `f` means must-not-have, `⊥` means
      preferred-but-not-required.
  The capability check (per office's `provides-skill:` fiber) uses
  the truth-meet over fused values per the corpus's `dispatch`
  morphism: $\delta(A, T) = \bigwedge_{c \in C}^{(t)} (\rho_T(c) \Rightarrow \sigma_A(c))$.
- `requires-authority:` — optional power slug naming the jural
  relation the dispatcher must hold. When absent, dispatch is via the
  XO's standing `dispatch-task-to-office` power.

### Provenance

- `created-at:` — ISO date.
- `created-by:` — office that filed the task.

## Required cells on goals

A goal carries the *prep-advancement* cells the fall-through reads:

- `horizon:` — same enum.
- `priority:` — same default.
- `owner-office:` — required.
- `tasks:` — list of task slugs the goal groups (presence-checked
  against `work/tasks/`; dangling slugs flag as governance violations).
- `created-at:` — ISO date.

## Required cells on offices

To support the eventual capacity check (named in
[`dispatch.md`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/dispatch.md)):

- `capacity:` — non-negative integer, or the literal `unbounded`. The
  current realization defaults to `unbounded`; the capacity-check
  closure rule is staged as a follow-up.
- `provides-skill:` — fiber section over capabilities. Same two
  surface forms as task `requires-capability:`. The realization
  treats list/string entries as $\mathbf{t}$-valued.

## The readiness witness

For each task $T$, the witness records per-precondition checks:

```
DispatchReadinessWitness(
  task: <slug>,
  brief_check:        SettledOk | UnderDetermined(reason) | Contradicted(_),
  dependency_check:   SettledOk | UnderDetermined(missing) | Blocked(failed_dep),
  capability_check:   SettledOk | UnderDetermined(no_office) | Blocked(no_match),
  authority_check:    SettledOk | UnderDetermined(no_power) | Blocked(no_relation),
  status_check:       SettledOk | UnderDetermined(invalid_status),
  goal_check:         SettledOk | UnderDetermined(missing_goal) | Blocked(goal_terminal),
  capacity_check:     SettledOk | UnderDetermined(no_office_capacity) | Blocked(over),
)
```

The composite readiness is the truth-meet of the per-check verdicts:

- All `SettledOk` → $\mathbf{t}$ (ready).
- Any `Blocked` and no `Contradicted` → $\mathbf{f}$ (blocked).
- Any `Contradicted` → $\top$ (contradicted).
- Otherwise (some `UnderDetermined`, no `Blocked`, no `Contradicted`) → $\bot$ (under-determined).

## The selection rule

`selecting-next-work` returns the task whose readiness is $\mathbf{t}$
*and* whose `(parent-goal-horizon-rank, parent-goal-priority,
task-horizon-rank, task-priority, created-at, slug)` lex-tuple is
smallest.

If no task is $\mathbf{t}$, the skill falls through to the **most
prep-advanced goal** — not the alphabetically-first goal. *Most
prep-advanced* is defined as:

1. Goal with the largest count of $\mathbf{t}$-readiness tasks already
   `done` against its `tasks:` list. (Ties)
2. Goal with the smallest count of $\mathbf{f}$-readiness tasks
   blocking. (Ties)
3. Goal with the smallest count of $\bot$-readiness tasks needing
   prep. (Ties)
4. Goal with the most-recent `created-at` (more recent is more
   relevant signal).
5. *Then* slug. Slug is the floor-tiebreak after the substrate has
   been read; in v0.1 it was the only tiebreak.

The fall-through case classifies the head as *goal-needing-task* and
returns the explicit prep step required (typically the next missing
brief, the next missing dependency, or the next sub-task to spawn
under the goal's `tasks:` list).

If no goals are eligible, the skill returns an empty result with the
witness's $\bot$ / $\mathbf{f}$ / $\top$ aggregate as the
`empty-because:` cell. There is no silent default.

## What the rule explicitly does *not* do

- It does not collapse $\bot$ to $\mathbf{f}$. An under-determined
  task is not the same as a blocked task; the captain may want to
  resolve the under-determined cell rather than skip the task.
- It does not pick on slug order when the substrate has structural
  content available.
- It does not treat `requires-brief: true` as decorative. A task with
  a `requires-brief` cell whose brief does not exist on disk is
  $\bot$-readiness; selecting it is a substrate violation.
- It does not let the captain override readiness via `priority:` cells
  alone. Priority breaks ties *within a horizon among
  $\mathbf{t}$-readiness tasks*; it cannot promote a $\bot$ or
  $\mathbf{f}$ task to $\mathbf{t}$.

## Realization

The substrate-native realization is `governance/skills/computing-dispatch-readiness/dispatch.py`.
It encodes the work tree as a
`pypredcalc.predication.store.PredicationStore`, encodes the readiness
preconditions as `StoreRule` objects, runs the closure system to
fixpoint, and reads each task's `dispatch-readiness` cell. The
[`computing-dispatch-readiness`](../skills/computing-dispatch-readiness.md)
and [`selecting-next-work`](../skills/selecting-next-work.md) skills
both name this script as their canonical realization.

The CLI returns:

- `task-ready` (exit 0) — single $\mathbf{t}$-readiness task at the head.
- `goal-needing-task` (exit 0) — most prep-advanced active goal plus
  a concrete next prep step.
- `empty` (exit 1) — readiness aggregate as the reason.

End-to-end tests live at `tests/test_work_dispatch.py`.

## Remaining gaps

These are real and addressed when the work warrants it; the rule is
already substrate-native, so the gaps are about reach, not about
escaping markdown:

1. **Full fiber-section dispatch via twist-product residuation.** The
   spec accepts fiber-section forms for `requires-capability:` and
   `provides-skill:`, and the cells carry bilattice values. But the
   readiness rule's capability check currently fires when each
   $\mathbf{t}$-required capability has *some* office providing it
   at $\mathbf{t}$, rather than computing the full
   $\delta(O, T) = \bigwedge_c (\rho_T(c) \Rightarrow \sigma_O(c))$
   per the corpus's
   [`twist-product-residuation`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/twist-product-residuation.md)
   theorem. Lifting requires using the substrate's `fusion` /
   residuation primitives in the rule's antecedent. Filed for the
   round when there's a task whose capabilities aren't all
   $\mathbf{t}$-required.

2. **Capacity-check rule.** Offices carry `capacity:` cells; the
   advisory check is implemented; the *blocking* closure rule (block
   dispatch when office's open count $\geq$ capacity) is not yet
   emitted. Small extension when capacity becomes load-bearing.

3. **Moduli of equivalent work.** When two tasks realize equivalent
   corpus atoms under a substrate symmetry, the lex tiebreak is
   arbitrary. The corpus's
   [`restructure-as-visible-automorphism`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/restructure-as-visible-automorphism.md)
   provides the moduli machinery; reading it requires defining what
   a *work-tree automorphism* is — substantive math, not just
   engineering. See
   [`work/questions/work-dispatch-as-closure-rule-system.md`](../../work/questions/work-dispatch-as-closure-rule-system.md)
   for the broader migration target and the moduli sub-question.

## Source-of-truth ordering

Bound by:

1. The corpus — `dispatch`, `dispatch-readiness`, `task-cell-system`.
2. Charter / enterprise.
3. Decision
   [`work-dispatch-readiness-as-bilattice-valued-section`](../decisions/work-dispatch-readiness-as-bilattice-valued-section.md).
4. This specification.
5. Conventions, skills, the work tree.

Amending requires a new ADR.
