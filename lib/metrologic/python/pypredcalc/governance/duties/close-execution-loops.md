---
title: "Close execution loops"
type: jural-relation
kind: duty
slug: close-execution-loops
active-holder: pypredcalc-executive-officer
passive-party: pypredcalc-community
scope-action: classify-task-outcome
triggering-powers:
  - dispatch-task-to-office
  - close-execution-loop
required-action: file-closure-entry-per-dispatched-task
enforcement: substrate-violation
rule-type: N→O
theory-basis: [normative-operational-layering, jural-relation, task-cell-system, dispatch-readiness]
---

# Close execution loops

Every task the XO dispatches MUST receive a closure entry — completion, partial completion,
stall, or abandonment. Tasks dispatched without a closure entry are governance-violation
signals: the dispatch loop has stopped being a loop.

## Closure outcomes

- **complete** — all acceptance criteria met; output committed.
- **partial** — some acceptance criteria met; follow-up tasks created and queued; the
  current task closed with `partial` and the follow-up task slugs recorded.
- **stalled** — work blocked. Stall classification names the blocker. If the blocker is
  upstream (corpus, captain decision, missing dependency), the XO escalates via a triage
  note for the steward.
- **abandoned** — the task is no longer relevant. Captain or steward direction; not the
  XO's unilateral call.

## Required action

For every task that flows through dispatch:

1. After the assigned office reports completion (or after a reasonable time without
   progress), determine the outcome.
2. Update the task's `status:` cell.
3. If `partial`, create the follow-up task records and dispatch them.
4. If `stalled`, file a stall triage note for the steward.
5. Record the closure timestamp.

## Enforcement

Pre-substrate-automation: dispatch closure is captain-supervised. Tasks that go stale are
flagged in periodic dispatch-state surveys.

Post-substrate-automation: the closure rule system tracks every task-dispatched event and
emits a governance-rule diagnostic for any task whose `status:` field is not in a terminal
state (`done`, `partial`, `stalled`, `abandoned`) after a configured stale-task threshold.
