---
title: "Witness every classification the XO makes"
type: jural-relation
kind: duty
slug: witness-every-classification
active-holder: pypredcalc-executive-officer
passive-party: pypredcalc-community
scope-action: produce-classification-witness
triggering-powers:
  - queue-intent
  - route-inbox-inquiry
  - dispatch-task-to-office
  - create-triage-note
required-action: file-classification-witness
enforcement: substrate-violation
rule-type: N→O
theory-basis: [normative-operational-layering, jural-relation, task-cell-system]
---

# Witness every classification the XO makes

Every time the XO classifies an incoming item, queues an intent, routes an inbox inquiry,
dispatches a task, or files a triage note, it MUST produce a classification witness — a
substrate record or frontmatter annotation documenting what the incoming item was, how it
was classified, and where it was routed.

Silent drops are substrate violations. There is no incoming message the XO may receive and
simply ignore. Even FYI messages and noise must be classified ("classified as FYI — no work
item created") with a witness.

## Required witness fields

At minimum:

- Source of the incoming item (inbox file path, captain message, tracker signal).
- Classification (task / question / FYI / intent / escalation / noise).
- Route (which office, which queue, or "no routing" with reason).
- Timestamp.

In current pypredcalc (pre-substrate-automation), the witness is the frontmatter of the
created triage note or task record itself. Post-substrate-automation, a separate witness
record per classification is produced automatically by the event log.

## Enforcement

Pre-substrate: code review during dispatch closure. Captain or reviewer can audit the XO's
classification history by checking that every incoming message in the session log has a
corresponding substrate record.

Post-substrate-automation: the closure rule system checks that every session event of type
`message-received` has a downstream `record-created` event with
`classified-by: pypredcalc-executive-officer` cell. Missing downstream event produces a
governance-rule diagnostic.
