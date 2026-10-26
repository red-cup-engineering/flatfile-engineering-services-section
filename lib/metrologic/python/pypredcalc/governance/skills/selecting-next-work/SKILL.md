---
name: "Selecting next work"
description: "Returns the deterministic next work item to advance, given the current state of work/goals/ and work/tasks/. Composes computing-dispatch-readiness over candidates and returns either a single t-readiness task, a most-prep-advanced goal-needing-task, or an explicit empty result with the readiness aggregate as the reason. Never guesses, never breaks ties on slug alone before reading the substrate."
---

# Selecting next work

The XO's procedure for answering "what's next" without guessing.
Composes [`computing-dispatch-readiness`](../computing-dispatch-readiness/SKILL.md)
over candidate tasks and returns the head of the substrate-derived
queue. Realises the selection rule from
[`../../specifications/work-dispatch-readiness.md`](../../specifications/work-dispatch-readiness.md)
and the commitment in
[`../../decisions/work-dispatch-readiness-as-bilattice-valued-section.md`](../../decisions/work-dispatch-readiness-as-bilattice-valued-section.md).

## Canonical realization

The substrate-native realization is the
[`dispatch.py`](../computing-dispatch-readiness/dispatch.py) script
under the companion `computing-dispatch-readiness` skill. It computes
the readiness witnesses via the closure-rule machinery in
`pypredcalc.predication.store_closure` and applies the lex-ordering
rule with the prep-advancement tiebreak. Invoke it via:

```
python governance/skills/computing-dispatch-readiness/dispatch.py
```

The script's exit code is `0` when it returns a `task-ready` or
`goal-needing-task` head, and `1` when the result is `empty`.

The markdown procedure below is the manual fallback when the Python
tool is unavailable; the two should produce identical results on
identical input.

## When to use

- Start of an inference session that asks "what should I work on?"
- Before invoking [`dispatching-realization-task`](../dispatching-realization-task.md):
  this skill names *which* task; the dispatch skill assigns *which
  office takes it*.
- After a task or goal is marked completed or moved to a terminal
  status, to confirm the next head.
- Whenever a captain message says "do the next thing" or "proceed."

## Requirements

- Read access to `work/goals/`, `work/tasks/`, `work/briefs/`,
  `governance/offices/`, `governance/powers/`, `governance/skills/`.
- The work-dispatch-readiness specification active.

## Steps

1. **Collect candidate tasks.** List every record under
   `work/tasks/` (recursively, excluding `_index.md` files).

2. **Compute readiness witnesses.** For each candidate, invoke
   [`computing-dispatch-readiness`](../computing-dispatch-readiness/SKILL.md).
   Cache the witness for use in the response and downstream skills.

3. **Partition by readiness.**

   - $\mathbf{t}$-tasks: every precondition `SettledOk`.
   - $\mathbf{f}$-tasks: at least one `Blocked` check.
   - $\bot$-tasks: at least one `UnderDetermined`, no `Blocked` or
     `Contradicted`.
   - $\top$-tasks: at least one `Contradicted`.

4. **Primary case — at least one $\mathbf{t}$-task exists.**

   Sort the $\mathbf{t}$-tasks by:

   ```
   (parent-goal-horizon-rank,
    parent-goal-priority,
    task-horizon-rank,
    task-priority,
    task-created-at,
    task-slug)
   ```

   Return the head with classification *task-ready*. Carry the
   witness on the response so the captain can audit.

5. **Fall-through — no $\mathbf{t}$-task exists.**

   Compute, per active goal, a *prep-advancement score*:

   - `done_count`: number of tasks with `status: done` whose `goal:`
     points at this goal.
   - `blocked_count`: number of $\mathbf{f}$-readiness tasks
     (likewise).
   - `under_count`: number of $\bot$-readiness tasks (likewise).
   - `contradicted_count`: number of $\top$-readiness tasks
     (likewise).

   Sort active goals (status not in `{met, abandoned, superseded}`,
   horizon not `done`) by:

   ```
   (horizon-rank,
    priority,
    -done_count,        # more done = more advanced, comes first
    blocked_count,      # fewer blocked = closer to dispatchable
    under_count,        # fewer under-det = less prep work needed
    -created-at,        # more recent goal = more relevant signal
    slug)
   ```

   Return the head with classification *goal-needing-task* and the
   *next prep step* derived from the head's witnesses:

   - If the head has any $\bot$-readiness task whose `brief_check`
     is the issue, the prep step is "produce the brief named by the
     `brief:` cell" — route to the corpus-reader.
   - If the head has any $\bot$-readiness task whose
     `dependency_check` is the issue, the prep step is "advance the
     blocking dependency" — recurse into selecting-next-work over
     just the dependency.
   - If the head has no $\bot$-readiness tasks at all (all blocked
     or contradicted), the prep step is "the goal cannot advance
     without a governance change" — escalate to the steward.
   - Otherwise, the prep step is "spawn the next sub-task from the
     goal's `tasks:` list" — route to the goal's `owner-office:`.

6. **Empty case — no eligible goals.**

   Return an empty result whose `empty-because:` cell records the
   composite readiness aggregate over the whole work tree:

   - All goals terminal → `"no active goals"`.
   - Active goals exist but every task in every goal is
     $\mathbf{f}$ → `"every active task is blocked"` plus the count.
   - Active goals exist but every task is $\top$ → `"every active
     task is contradicted"` plus the count.

   Surface to the captain; do not pick a record outside the rule.

7. **Witness the selection.** Per
   [`witness-every-classification`](../../duties/witness-every-classification.md),
   the act of selecting is itself a classification and produces a
   witness. Currently the witness is the response itself plus the
   per-task readiness witnesses; post-substrate-automation, an
   explicit witness record is produced.

## Outcomes

The skill returns exactly one of:

- *task-ready* with a single task path and its readiness witness.
- *goal-needing-task* with the goal path, the prep-advancement score,
  and the named next prep step.
- *empty* with the readiness aggregate as the reason.

## Boundary with the prior version

The v0.1 skill broke ties on slug alone after horizon, and called
$\mathbf{t}$-readiness whatever the task declared via `status: ready`.
This version computes readiness from cells; declared status is
informational only, and slug is the floor-tiebreak after the
substrate has been read for prep-advancement.

The skill remains a procedural markdown — the closure-rule-native
target (running the readiness rule over a `PredicationStore` to
fixpoint) is filed as
[`../../../work/questions/work-dispatch-as-closure-rule-system.md`](../../../work/questions/work-dispatch-as-closure-rule-system.md)
and is the eventual replacement for this skill.

## Failure modes

- **A goal's `tasks:` list names a slug with no record.** Governance
  violation; the readiness witness for the goal flags the dangling
  reference. Either spawn the missing task record or remove the
  slug.
- **Multiple records share a slug.** Governance violation; the
  records-officer must rename one. The skill stops with the
  duplicate-slug witness.
- **A task names a `goal:` slug that has no record.** The
  `goal_check` is `UnderDetermined`; treat as $\bot$ and surface.
- **All readiness checks pass but no office holds the
  `requires-capability:` skill.** The `capability_check` is
  `UnderDetermined`; the prep step is "create or amend the office
  that should provide the skill," routed to the steward.
