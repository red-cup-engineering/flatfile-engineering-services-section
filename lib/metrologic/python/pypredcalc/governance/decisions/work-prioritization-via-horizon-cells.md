---
title: "Work prioritization via horizon cells"
type: decision
slug: work-prioritization-via-horizon-cells
status: superseded
superseded-by: work-dispatch-readiness-as-bilattice-valued-section
superseded-at: "2026-05-08"
date: "2026-05-08"
hard-core: math-floor-for-substrates-commitment
binds-specification: work-prioritization
theory-basis:
  - dispatch
  - dispatch-readiness
  - dispatch-readiness-regime-is-strict
---

# Work prioritization via horizon cells

> **Superseded** the same day this was committed, by
> [`work-dispatch-readiness-as-bilattice-valued-section`](work-dispatch-readiness-as-bilattice-valued-section.md).
> The superseder names six failure modes of this ADR, including
> slug-tiebreak as the load-bearing piece, two-valued readiness
> collapse, and unintegrated `requires-brief:` precondition. This
> record is retained for the superseded-decision audit trail.

## What

The next work item to advance in pypredcalc is selected deterministically from
the work tree by a fixed lex-ordering on prioritization cells. Every `goal` and
`task` record carries those cells; the XO's `selecting-next-work` skill applies
the rule.

The schema and rule are specified in
[`../specifications/work-prioritization.md`](../specifications/work-prioritization.md).
The cells are:

- `horizon:` — `now | soon | later | someday | done` — required on goals and tasks.
- `priority:` — integer, optional, defaults to 100, lower wins within a horizon.
- `owner-office:` — required on goals; optional on tasks.
- `goal:` — required on tasks; the parent goal slug.
- `requires-capability:` — required on tasks; the skill slug for dispatch.
- `created-at:` — required on both; ISO date.

The ordering tuple is `(horizon-rank, priority, created-at, slug)`.

## Why

Three pressures converged:

1. **The math substrate already promises determinism.** PredWork's
   [`dispatch`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/dispatch.md)
   morphism is a bilattice computation over a finite capability index;
   [`dispatch-readiness-regime-is-strict`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/dispatch-readiness-regime-is-strict.md)
   bounds the readiness closure ordinal at $|C| + |\mathcal{X}|$. The
   substrate computes a single match valuation for any (agent, task) pair.
   What was missing was the cell schema and the queueing rule that make the
   *substrate-side dispatcher* run on actual pypredcalc records.

2. **The existing dispatch skill referenced cells that did not exist.**
   [`dispatching-realization-task`](../skills/dispatching-realization-task.md)
   step 3 reads "Captain may override with priority cells" but `priority:`
   was not specified anywhere — neither in
   [`conventions.md`](../conventions.md) nor in any specification. The phrase
   was aspirational. This decision makes it real.

3. **The existing `horizon:` field was de facto.** Three active goals carried
   `horizon: soon | later`; three completed goals carried `horizon: done`.
   The values worked but were not specified. Inference sessions had no way
   to know whether `horizon: later` was a captain-imposed rank or
   ad-hoc-narrative-text.

A single deterministic answer — backed by spec, ADR, skill, and duty —
replaces a guess.

## Rules out

- **Free-form `horizon:` values.** Records may not carry `horizon: imminent`
  or `horizon: tomorrow` or any value outside the enumerated set.
- **Implicit defaults for `horizon:` on goals and tasks.** Records without
  `horizon:` are non-conformant. The duty
  [`goals-and-tasks-carry-prioritization-cells`](../duties/goals-and-tasks-carry-prioritization-cells.md)
  surfaces them.
- **Multiple "next" answers.** The lex order is total; the head is unique.
  An inference session that returns "you could do A or B" is not invoking the
  skill.
- **Hidden empty cases.** The skill returns either a single work item or an
  explicit empty result with a reason cell. It does not return a default
  fallback or a "see backlog" hand-wave.
- **Routing decisions in the prioritization rule.** Capability matching and
  authority matching belong to the dispatch morphism, not the queue ordering.
  The queue tells you *which* item to consider next; dispatch tells you
  whether it can be assigned.

## Does not constrain

- **The values of `priority:`.** Any non-negative integer is valid; the
  captain or owner-office sets them as needed.
- **Whether a record uses `priority:` at all.** Many records will not need
  it; the default value of 100 is fine for routine work.
- **The choice of `horizon:` value.** Owner-offices and the captain pick
  values per the records' actual urgency. The rule binds the *form*, not the
  scheduling decision.
- **Inbox routing.** Inquiries in `work/inbox/` are not part of the active
  queue; the XO's `route-inbox-inquiry` power handles them and produces
  goals or tasks downstream.
- **How a goal advances internally.** Promoting tasks from a goal's `tasks:`
  list to records under `work/tasks/` is the owner-office's job, governed by
  domain-specific skills.
- **Audit reporting.** A future audit may scan the work tree for ordering
  determinism, but is not bound by this decision.
