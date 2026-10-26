---
title: "Work dispatch readiness as bilattice-valued section"
type: decision
slug: work-dispatch-readiness-as-bilattice-valued-section
status: committed
date: "2026-05-08"
hard-core: math-floor-for-substrates-commitment
binds-specification: work-dispatch-readiness
supersedes: work-prioritization-via-horizon-cells
theory-basis:
  - dispatch
  - dispatch-readiness
  - dispatch-readiness-regime-is-strict
  - capability-matching
  - operational-evidence
  - normative-operational-layering
---

# Work dispatch readiness as bilattice-valued section

## What

The next work item to advance in pypredcalc is selected by computing
a bilattice-valued **dispatch readiness witness** for each candidate
task and goal, per the schema in
[`../specifications/work-dispatch-readiness.md`](../specifications/work-dispatch-readiness.md).

Readiness is four-valued ($\mathbf{t}$ / $\mathbf{f}$ / $\bot$ / $\top$),
not two-valued. The XO's `selecting-next-work` skill reads the
witness and returns the head; the witness's structural fields are
authoritative.

This decision supersedes
[`work-prioritization-via-horizon-cells`](work-prioritization-via-horizon-cells.md)
(committed earlier the same date).

## Why

The first ADR was authored quickly to give the XO a deterministic
answer to "what's next?". It worked in the narrow sense — it produced
a single answer — but the answer was structurally arbitrary in
several places, and on its first two outings it produced an answer
that was *substrate-violating*: both tasks dispatched carried
`requires-brief: true` and had no brief. Reviewing the rule honestly
surfaced six failure modes:

1. **Slug-tiebreak as the load-bearing piece.** When two `soon`
   goals both lacked ready tasks, the prior rule said "lex by slug
   picks the q-enriched one." That is a coin flip dressed as
   determinism; the substrate has more content than slug-order to
   consult.

2. **`horizon` is a captain-typed string, not a derived value.**
   Nothing in the substrate explains why a goal is `soon` vs `later`.
   The corpus's `dispatch-readiness` has structural content; the
   prior rule consulted none of it.

3. **Two-valued readiness collapse.** `status: ready` vs not is a
   2-valued shadow of the corpus's 4-valued `dispatch-readiness`. The
   $\bot$ (under-determined) state — most prep work — is invisible;
   the $\top$ (contradicted) state — the diagnostic state for
   governance contradictions — is invisible.

4. **`requires-brief: true` was unintegrated.** Tasks that named
   the precondition were treated as ready anyway. The substrate
   carried the cell, the rule ignored it, the dispatcher selected
   them, the captain noticed only afterwards.

5. **Task dependencies were unmodeled.** A goal's `tasks: [a, b, c]`
   list is *ordered by dependency* in practice (tensor needs base
   type, etc.) but no `depends-on:` cell witnessed the order. The
   dispatcher had no way to see it.

6. **The selection rule was a markdown procedure, not a closure
   rule.** PyPredCalc 0.3 unreleased ships
   `predication.store_closure.dispatch_eligibility_rule(...)`. The
   substrate has the apparatus to express this rule as a closure
   rule; the prior version chose markdown for speed and called it
   substrate-native.

The new rule addresses (1), (3), (4), and (5) directly. It names (2)
and (6) as open gaps to track in subsequent rounds rather than
pretending to fix them in this turn — see the spec's
*Open gaps explicitly named* section.

## Rules out

- **Two-valued readiness.** Records may not declare `status: ready`
  as the authoritative readiness; the witness is computed from cells
  and may override the declared status.
- **Slug as the sole tiebreak.** Selection at the goal level (when
  no task is $\mathbf{t}$-ready) breaks by *prep-advancement* —
  count of done tasks, count of blockers, count of under-determined
  prep — before falling through to slug.
- **Silent dispatch of tasks with unsatisfied preconditions.** A
  task with `requires-brief: true` and a missing brief, or a task
  with an unsatisfied `depends-on:`, is $\bot$-readiness; the skill
  reports the missing precondition explicitly rather than dispatching.
- **Hand-declared horizon as a substitute for readiness.** `horizon:
  now` cannot promote a $\bot$ or $\mathbf{f}$ task to $\mathbf{t}$.
  Horizon ranks among $\mathbf{t}$-ready tasks only.
- **Captain-priority overrides on non-ready tasks.** `priority:` is
  a within-horizon-within-readiness tiebreak; it cannot reorder
  across readiness values.

## Does not constrain

- The eventual closure-rule-native realization. The current rule is
  a procedural skill; the substrate-native target is a `StoreRule`
  over a `PredicationStore` encoding the work tree. That migration
  is filed as
  [`work/questions/work-dispatch-as-closure-rule-system.md`](../../work/questions/work-dispatch-as-closure-rule-system.md)
  and is not bound by this decision.
- The capability section's eventual fiber-valued shape. The corpus
  has $\rho_T : C \to \mathbf{FOUR}$; the realization currently
  carries flat lists. The lift target is named in the spec.
- How `priority:` values are chosen.
- Whether new horizons are introduced in future versions of the
  spec; horizon is a within-readiness preference and the captain may
  amend its enum without invalidating this decision.

## Migration

- v0.1 spec `work-prioritization` and v0.1 ADR
  `work-prioritization-via-horizon-cells` are marked `superseded`
  with `superseded-by:` pointing at the new records.
- Existing goals and tasks already carry most of the cells the new
  spec requires (`horizon:`, `goal:`, `requires-capability:`,
  `created-at:`); the new cells (`depends-on:`, `requires-authority:`,
  office `capacity:`) backfill as records are touched.
- The two tasks dispatched on 2026-05-08 with missing briefs are now
  closed with briefs in place; the readiness-witness machinery
  prevents the same failure mode going forward.
