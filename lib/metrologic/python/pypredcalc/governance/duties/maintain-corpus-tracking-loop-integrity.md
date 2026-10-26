---
title: "Maintain corpus-tracking loop integrity"
type: jural-relation
kind: duty
slug: maintain-corpus-tracking-loop-integrity
active-holder: pypredcalc-corpus-tracker
passive-party: pypredcalc-community
scope-action: monitor-gamma-soundness
triggering-powers:
  - run-corpus-binding-audit
  - file-realization-gap-task
required-action: run-periodic-audits-and-file-degeneration-signals
enforcement: substrate-violation
rule-type: N→O
theory-basis: [enterprise, normative-operational-layering, jural-relation, dispatch-readiness]
---

# Maintain corpus-tracking loop integrity

The corpus-tracker MUST run the corpus-binding audit on a regular cadence and file
degeneration signals when audit results indicate Γ trouble. The corpus-tracking loop is the
enterprise's generative mechanism Γ; if it stops working, the enterprise's purpose is being
eroded.

## Required action

Periodic cadence (at minimum, before each pypredcalc release; ideally weekly during active
development):

1. Run [`run-corpus-binding-audit`](../powers/run-corpus-binding-audit.md).
2. Compare results against the prior audit:
   - **No new realizations + no new corpus atoms over a long stretch** → exhaustion-of-positive-
     heuristic signal. File a triage note for the steward.
   - **Persistent unresolved gaps** (corpus atoms with no realization, unchanged across
     multiple audits) → developer-side stagnation signal. File a triage note for the XO to
     investigate and re-dispatch.
   - **Audit-time errors** (unresolved `@realizes` slugs, audit script crashes) → drift signal.
     File a triage note for the records-officer to investigate (the corpus may have moved or
     the slug schema may need updating).
3. New corpus atoms since prior audit → file realization-gap tasks for them via
   [`file-realization-gap-task`](../powers/file-realization-gap-task.md).

## Why this is the corpus-tracker's duty

The steward acts on degeneration signals (per
[`maintain-enterprise-from-degeneration`](../duties/witness-hard-core-amendments.md)) but
does not detect them — that's the corpus-tracker's job. The corpus-tracker is the
enterprise's eyes on Γ.

## Enforcement

Pre-substrate-automation: the captain reviews audit cadence during pypredcalc releases.
Audit reports older than the configured staleness threshold (e.g., 30 days during active
development) flag a duty-non-fulfillment.

Post-substrate-automation: a heartbeat-driven cron emits a "corpus-tracker has not run an
audit in N days" diagnostic.
