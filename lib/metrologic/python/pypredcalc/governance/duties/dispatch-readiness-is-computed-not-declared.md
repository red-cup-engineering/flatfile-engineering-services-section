---
title: "Dispatch readiness is computed, not declared"
type: jural-relation
kind: duty
slug: dispatch-readiness-is-computed-not-declared
active-holder: pypredcalc-executive-officer
passive-party: pypredcalc-community
scope-action: enforce-readiness-witness-derivation
triggering-powers:
  - dispatch-task-to-office
  - queue-intent
required-action: invoke-computing-dispatch-readiness-before-dispatch
enforcement: substrate-violation
rule-type: N→O
binds-specification: work-dispatch-readiness
theory-basis:
  - dispatch
  - dispatch-readiness
  - operational-evidence
  - normative-operational-layering
---

# Dispatch readiness is computed, not declared

The XO MUST derive a task's dispatch readiness from the substrate via
[`computing-dispatch-readiness`](../skills/computing-dispatch-readiness.md)
before exercising
[`dispatch-task-to-office`](../powers/dispatch-task-to-office.md). A
task's declared `status: ready` is *informational*, not authoritative;
the witness is what the dispatch act commits to.

The duty exists because the substrate's structural content is what
makes dispatch deterministic. The corpus's
[`dispatch`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/dispatch.md)
morphism is a bilattice computation over capability and authority
sections; the witness is the realization of that computation. A
declared `status: ready` cell is one author's claim about the task's
state; the witness is the substrate's verdict.

## Triggering powers

- [`dispatch-task-to-office`](../powers/dispatch-task-to-office.md) —
  whenever the XO assigns a task. The witness must accompany the
  dispatch act.
- [`queue-intent`](../powers/queue-intent.md) — whenever a queued
  intent could dispatch in a future tick. The intent record carries
  the readiness verdict it expects to see at dispatch time; if
  conditions change between queue and tick, the witness is
  re-derived.

## Required action

Before each dispatch:

1. Invoke `computing-dispatch-readiness` for the candidate task.
2. Read the witness's `composite_readiness` cell.
3. Dispatch only when `composite_readiness == t`.
4. For any other verdict ($\mathbf{f}$ / $\bot$ / $\top$), do NOT
   dispatch; route the witness to the captain or steward via the
   appropriate skill (typically the goal-needing-task fall-through
   in `selecting-next-work`).
5. Record the witness as part of the dispatch's classification
   witness (per
   [`witness-every-classification`](witness-every-classification.md)).

## Discharging

The duty is discharged when the dispatch act is preceded by a
witness derivation and the composite readiness is $\mathbf{t}$. A
dispatch that proceeds without a witness, or proceeds against a
non-$\mathbf{t}$ witness, is a substrate violation.

## Enforcement

Pre-substrate:

- Code review on commits that mark a task `status: dispatched`. The
  reviewer verifies the dispatch witness was recorded (in the commit
  message, the inference session log, or a sibling triage note).
- The captain or another officer scanning the dispatch history
  spot-checks for $\mathbf{f}$ / $\bot$ / $\top$ tasks marked
  dispatched.

Post-substrate-automation:

- A closure rule fires when `dispatch-task-to-office` is exercised
  without a corresponding witness event. The rule's antecedent
  checks that for every dispatch event there is a sibling witness
  event with `composite_readiness: t`. Missing or non-$\mathbf{t}$
  witnesses generate diagnostic events.

## Why this is a duty, not a convention

The XO holds the dispatch power as a standing privilege. Without
this duty, the privilege is unbounded — the XO can dispatch on
declared status alone. With this duty, the privilege is conditional
on substrate-derivable readiness, which is the corpus's actual
content for dispatch.

This is the same shape as
[`witness-every-classification`](witness-every-classification.md):
the XO's discretion is widening, but every act it takes is
substrate-witnessed.
