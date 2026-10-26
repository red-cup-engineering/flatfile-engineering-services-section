---
name: "Computing dispatch readiness"
description: "Computes the four-valued dispatch-readiness witness for a single task by reading the substrate. The witness's per-precondition checks (brief, dependency, capability, authority, status, goal, capacity) drive the composite verdict. The canonical realization is the dispatch.py script alongside this SKILL.md, which encodes the work tree as a PredicationStore and the readiness preconditions as StoreRules. Use the Python tool by default; this markdown procedure is the manual fallback."
---

# Computing dispatch readiness

The XO's procedure for converting a task record plus the surrounding
substrate state into a structured `DispatchReadinessWitness`. The
witness is the substrate-derived answer to "is this task ready, and
if not, what specifically is missing or contradicting?"

## Canonical realization

The substrate-native realization is the Python script
[`dispatch.py`](dispatch.py) alongside this `SKILL.md`. It encodes the
work tree as a `pypredcalc.predication.store.PredicationStore` and the
readiness preconditions as `StoreRule` objects, runs the closure system
to fixpoint, and reads the per-task readiness cells. Invoke it via:

```
python governance/skills/computing-dispatch-readiness/dispatch.py --task <slug>      # one task's witness
python governance/skills/computing-dispatch-readiness/dispatch.py --all --verbose    # full table
python governance/skills/computing-dispatch-readiness/dispatch.py                    # head only
```

This realises the corpus theorem `dispatch-as-closure-rule-system`
applied to the pypredcalc-development case. Per the corpus's
`dispatch-readiness-regime-is-strict` theorem, the closure terminates
in $|cells| \cdot |\mathbf{FOUR}|$ rounds.

The markdown procedure below is the manual fallback for cases where
the Python tool cannot be invoked (no nix shell, exploring the tree
by hand, etc.) — it expresses the same algorithm in human-readable
form.

Realises the procedural counterpart of the corpus's
[`dispatch-readiness`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/dispatch-readiness.md)
concept and the
[`dispatch`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/dispatch.md)
morphism, restricted to the cells the schema in
[`work-dispatch-readiness`](../../specifications/work-dispatch-readiness.md)
defines.

## When to use

- Before the XO invokes [`selecting-next-work`](../selecting-next-work/SKILL.md):
  the selection skill calls this skill once per candidate.
- When the captain asks "why isn't this task ready?" — the witness
  exposes the answer in structural form.
- When a task is being moved from `draft` to `ready` by its creator —
  the witness verifies the move is legitimate.

## Requirements

- Read access to `work/tasks/`, `work/goals/`, `work/briefs/`,
  `governance/offices/`, `governance/duties/`, `governance/skills/`.
- The work-dispatch-readiness specification active.

## The witness shape

```
DispatchReadinessWitness:
  task: <slug>

  status_check:        SettledOk
                       | UnderDetermined(reason: "missing status")
                       | UnderDetermined(reason: "status not in lifecycle enum")

  goal_check:          SettledOk
                       | UnderDetermined(reason: "missing goal cell")
                       | Blocked(reason: "parent goal terminal", goal_status: <s>)

  brief_check:         SettledOk
                       | UnderDetermined(reason: "requires-brief but no brief cell")
                       | UnderDetermined(reason: "brief file does not exist", path: <p>)

  dependency_check:    SettledOk
                       | UnderDetermined(reason: "depends-on slug has no record", slug: <s>)
                       | Blocked(reason: "dependency not done", slug: <s>, status: <s>)

  capability_check:    SettledOk
                       | UnderDetermined(reason: "no office provides skill", capability: <s>)
                       | Blocked(reason: "capability slug unknown", capability: <s>)

  authority_check:     SettledOk
                       | UnderDetermined(reason: "requires-authority but no power record", power: <s>)
                       | Blocked(reason: "no jural-relation grants this power")

  capacity_check:      SettledOk
                       | UnderDetermined(reason: "office has no capacity cell")
                       | Blocked(reason: "office at capacity",
                                 office: <s>, open: <n>, capacity: <n>)

  composite_readiness: t | f | ⊥ | ⊤
```

Composite is computed:

- All `SettledOk` → $\mathbf{t}$.
- Any `Blocked` and no `Contradicted` → $\mathbf{f}$.
- Any `Contradicted` → $\top$.
- Otherwise (some `UnderDetermined`) → $\bot$.

## Steps

1. **Load the task record.** Read frontmatter cells:
   `slug`, `status`, `horizon`, `goal`, `requires-capability`,
   `requires-brief`, `brief`, `depends-on`, `requires-authority`,
   `created-at`, `created-by`.

2. **`status_check`.** `status` must be present and in the task
   lifecycle enum (`draft | ready | dispatched | in-progress |
   partial | done | stalled | abandoned`). Missing → `UnderDetermined`.

3. **`goal_check`.** `goal` must be present and resolve to a record
   under `work/goals/`. The goal's `status` must not be `met`,
   `abandoned`, or `superseded`. Goal record missing → `UnderDetermined`;
   goal terminal → `Blocked`.

4. **`brief_check`.** If `requires-brief: true`, then both:
   - `brief` cell present, and
   - The path it names exists under `work/briefs/`.

   Either missing → `UnderDetermined` with the specific reason. If
   `requires-brief` is absent or `false`, this check is `SettledOk`.

5. **`dependency_check`.** For each slug in `depends-on:`, locate
   the record under `work/tasks/`. If the dependency record does not
   exist → `UnderDetermined`. If it exists but its `status` is not
   `done` (or `horizon` is not `done`) → `Blocked`.

6. **`capability_check`.** For each capability slug in
   `requires-capability:`:
   - Find at least one office with that slug in its
     `provides-skill:` list.
   - If no office provides → `UnderDetermined` (a new office may need
     to be created or an existing office's skill list extended).
   - If the slug does not appear in `governance/skills/` at all →
     `Blocked` (the capability is unknown to the substrate).

7. **`authority_check`.** If `requires-authority:` is present,
   resolve it to a power record under `governance/powers/`:
   - Power record missing → `UnderDetermined`.
   - Power exists but no office holds it (no `active-holder:` cell
     points at any office) → `Blocked`.

   If `requires-authority:` is absent, the check is `SettledOk`
   (the XO's standing `dispatch-task-to-office` power applies).

8. **`capacity_check`.** Identify the dispatching office (the one
   matching `requires-capability:` per step 6). Read its `capacity:`
   cell:
   - `unbounded` or absent → `SettledOk` (advisory regime).
   - Integer $n$ — count tasks where `assigned-to:` matches the
     office and `status` is in `{dispatched, in-progress, partial}`.
     Open count $\geq n$ → `Blocked`.

9. **Composite the verdict.** Per the rule above.

10. **Return the witness.** Caller (typically `selecting-next-work`)
    consumes the witness directly; do not summarise it to a single
    word.

## Output

A `DispatchReadinessWitness` for the task, with per-precondition
checks and a composite four-valued readiness.

## Failure modes

- **The substrate is internally inconsistent.** A goal's `tasks:`
  list names a slug that does not exist, or two records share a
  slug, or a duty record points at an office that has been dissolved.
  These are governance violations; surface them via the witness's
  `Blocked` or `Contradicted` cells rather than smoothing them over.
- **A precondition cell type is wrong.** `requires-brief: "yes"`
  (string) instead of `requires-brief: true` (boolean), for
  example. Treat as `UnderDetermined`; the records-officer must fix.
