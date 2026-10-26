---
name: "Closing execution loop"
description: "Records completion or stall on a dispatched task. Use when an office reports back on a dispatched task."
---

# Closing execution loop

## Requirements

- XO office.
- A task with `status: dispatched` or `status: in-progress`.
- A completion / partial / stall report from the assigned office.

## Steps

1. Read the office's report (could be a code commit referencing the task slug, an inbox
   message, or a completion-witness record).
2. Verify the report against the task's acceptance criteria (the task's body's "Acceptance"
   section).
3. Choose the closure category:
   - **complete** if all acceptance criteria met.
   - **partial** if some met; create follow-up tasks for the rest.
   - **stalled** if blocked; file a stall triage note for the steward if blocker is
     upstream.
   - **abandoned** only on captain or steward direction.
4. Update the task's frontmatter:
   - `status:` to one of `done`, `partial`, `stalled`, `abandoned`.
   - `closed-at: <date>`.
   - `closure-classification:` with rationale.
   - For `partial`: `follow-up-tasks: [<slug-list>]`.
   - For `stalled`: `blocker: <triage-note-slug>`.
5. **Confirm the commit witness.** A loop closes properly only when
   a commit has landed referencing the closing task. Run
   [`committing-work-cycle`](committing-work-cycle/SKILL.md) (or
   compose it via the developer / records-officer who held the
   work cycle) before declaring the loop closed. The closure
   witness cites the commit's hash. If no commit yet exists, the
   loop is *not* closed — the task's status update is provisional
   until the commit lands.
6. If the parent inbox inquiry exists, add an "Answer" section per
   `routing-inbox-inquiry` step 5.
7. **Push the commit.** Run [`pushing-to-remote`](pushing-to-remote.md)
   after the commit lands. The push is part of the standard
   closure — the work cycle is not closed end-to-end until the
   commit is published, per
   [`push-after-work-cycle-close`](../duties/push-after-work-cycle-close.md).

## Outcomes

The task is in a terminal state; the closing-task's witness is bound
to a git commit per [`commit-message-format`](../specifications/commit-message-format.md)
and published to origin; downstream consumers (parent inbox inquiry,
parent goal, the audit tracking dispatch hygiene, `pyfars
audit-commits`, the parent `561` submodule) see consistent state.
