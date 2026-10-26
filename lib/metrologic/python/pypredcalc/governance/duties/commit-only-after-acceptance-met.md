---
title: "Commit only after acceptance met"
type: jural-relation
kind: duty
slug: commit-only-after-acceptance-met
active-holder: [pypredcalc-developer, pypredcalc-records-officer, pypredcalc-release-officer]
passive-party: pypredcalc-community
scope-action: write-git-commit
triggering-powers:
  - commit-changes
required-action: verify-acceptance-criteria-or-record-partial
enforcement: substrate-violation
rule-type: N→O
theory-basis: [jural-relation, dispatch-readiness, task-cell-system]
---

# Commit only after acceptance met

A commit MUST land only when the closing task's acceptance criteria
are all met, OR when the commit explicitly records a non-`done`
closure (`partial`, `stalled`) and the partial closure's follow-up
machinery is in place.

## Why this duty exists

Premature commits — merging code whose tests fail, governance records
half-written, or briefs absent — corrupt the source-of-truth chain.
Downstream readers (other inference sessions, the parent `561` repo,
audit tools) cannot distinguish "this task is done" from "this commit
landed mid-work." The duty makes the closing-task's acceptance
section the *gate* for the commit, not the commit itself the
implicit closure.

## Required action

Before running `git commit`:

1. Read the closing task's acceptance section.
2. Verify each acceptance bullet is checked AND the underlying claim
   it represents is true. (A `[x]` in the markdown is the *witness*;
   the actual passing test, audit, or written record is the
   *evidence*.)
3. If all acceptance criteria are met, proceed with `Closes <slug>`
   in the commit body and `status: done` on the task record.
4. If some criteria are met and others are not:
   - Set the task's `status:` to `partial`, with `follow-up-tasks:`
     naming the follow-up records.
   - Create the follow-up task records in `work/tasks/` before
     committing.
   - Use `Closes <slug>` (with `partial` closure) and `Advances
     <follow-up-slug>` if the same commit advances the follow-up.
5. If the work is blocked rather than partial, set `status: stalled`
   with a `blocker:` cell pointing at a triage note; the commit's
   body cites both the original task and the triage note.

## What this duty rules out

- Committing failing tests under "fix in next commit." Fix in this
  commit, or do not commit.
- Marking a task `done` while leaving an unchecked acceptance bullet.
  Either check it (with evidence) or close as `partial`.
- Letting the commit message claim closure when the closing-task's
  status is still `ready` or `dispatched`.

## Composes with

- [`commit-references-task-slug`](commit-references-task-slug.md) —
  this duty governs *whether* to commit; the slug-reference duty
  governs *how* to write the message.
- [`close-execution-loops`](close-execution-loops.md) — the XO's
  loop-closing duty cites this duty's evidence (acceptance verified)
  as the witness for the closure category (`done` vs `partial`).
