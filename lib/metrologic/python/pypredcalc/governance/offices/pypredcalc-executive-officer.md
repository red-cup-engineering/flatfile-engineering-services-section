---
title: "PyPredCalc Executive Officer"
type: office
slug: pypredcalc-executive-officer
scope: pypredcalc-operations
action-domain:
  - queue-intent
  - dispatch-task-to-office
  - route-inbox-inquiry
  - create-triage-note
  - close-execution-loop
  - push-to-remote
  - read-any-substrate-record
deontic-profile:
  queue-intent: power
  dispatch-task-to-office: power
  route-inbox-inquiry: power
  create-triage-note: power
  close-execution-loop: power
  push-to-remote: power
  read-any-substrate-record: privilege
  witness-every-classification: duty
  close-execution-loops: duty
  commit-references-task-slug: duty
  push-after-work-cycle-close: duty
provides-skill:
  - selecting-next-work
  - routing-inbox-inquiry
  - dispatching-realization-task
  - closing-execution-loop
  - interpreting-incoming-message
  - pushing-to-remote
theory-basis: [office-as-double-settlement, normative-operational-layering, jural-relation, dispatch-readiness, task-cell-system]
---

# PyPredCalc Executive Officer

The operational interface. The XO translates incoming intent — inbox inquiries, captain
direction, corpus-tracker realization-gap signals — into dispatched work, manages the active
task frontier, and closes the execution loops that work opens.

## Role in plain terms

The XO does four things:

1. **Selection.** When an inference session asks "what's next?", the XO returns the
   deterministic answer — the head of the work queue — via
   [`selecting-next-work`](../skills/selecting-next-work.md). The queue is lex-ordered
   per [`work-prioritization`](../specifications/work-prioritization.md); the XO never
   guesses among candidates.

2. **Intake.** Every incoming message (inbox inquiry, captain message, audit-tool report,
   corpus-tracker signal) is classified — task / question / FYI / intent / escalation / noise.
   Classification is witnessed; no silent drops (per
   [`witness-every-classification`](../duties/witness-every-classification.md)).

3. **Dispatch.** Tasks marked `status: ready` get routed to the eligible office. Routing
   considers the task's `requires-capability:` field and the office's `provides-skill:` list.
   When multiple offices are eligible, the queue ordering plus the task's optional
   `owner-office:` cell resolve the choice; the XO does not guess.

4. **Closure.** Every dispatched task gets a closure entry — completion, partial completion
   with follow-up tasks, or stall (per [`close-execution-loops`](../duties/close-execution-loops.md)).
   Tasks that go stale without closure are governance-violation signals.

## Boundary with the Steward

Hard. The XO does NOT amend C, create offices, or install personnel. If the XO encounters a
situation that would require those acts, it produces an escalation triage note for the
steward, not a direct intervention.

## Boundary with the Corpus Tracker

The corpus-tracker watches Γ and produces realization-gap tasks; the XO dispatches those
tasks. The XO does not read the corpus directly to find gaps — that's the corpus-tracker's
job. The XO trusts the corpus-tracker's task records and routes them.

## Privileges

The XO holds [`read-any-substrate-record`](../powers/read-any-substrate-record.md) as a
privilege — it can read any record (governance, work, source) without incurring duty.
Reading without acting is unprivileged; acting on what it reads invokes the appropriate
duty (e.g., classifying produces a witness).

## Incumbency

Currently held informally by the captain plus contracted inference sessions; not a standing
office. Formal incumbency deferred to substrate-driven dispatch.

Formal incumbency record: [`emsenn-incumbency`](../personnel/emsenn-incumbency.md) — captain holds this office informally pending substrate-driven dispatch.
