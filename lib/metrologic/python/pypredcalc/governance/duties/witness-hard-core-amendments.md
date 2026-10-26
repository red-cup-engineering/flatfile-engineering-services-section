---
title: "Witness hard-core amendments"
type: jural-relation
kind: duty
slug: witness-hard-core-amendments
active-holder: pypredcalc-steward
passive-party: pypredcalc-community
scope-action: produce-novation-witness
triggering-powers: [amend-hard-core]
required-action: produce-novation-record
enforcement: substrate-violation
non-delegable: true
rule-type: N→N
theory-basis: [enterprise, charter-as-closure-system, jural-relation, normative-operational-layering, military-command-chain-as-modal-composition]
---

# Witness hard-core amendments

Every amendment to charter rules tier (C1–C4) MUST produce a novation witness — a
substrate record documenting the amendment. The novation witness is non-delegable: only
the steward produces it, and the steward cannot delegate the witnessing act.

## Required novation witness fields

- Which commitment is being amended (C1, C2, C3, or C4).
- The pre-amendment text of the commitment.
- The post-amendment text.
- The reason for the amendment (degeneration signal, captain decision, etc.).
- Captain ratification (signed-off by `emsenn` per
  [`immunity-from-non-captain-c-amendment`](../powers/immunity-from-non-captain-c-amendment.md)).
- Date.

## Why non-delegable

Per `military-command-chain-as-modal-composition`, the steward's accountability for C is an
H⁰ invariant — it does not redistribute downward through the command chain. The steward
*personally* witnesses amendments; an XO or records-officer producing the novation record on
the steward's behalf would violate the H⁰ invariance.

## What this fires on

The amendment power [`amend-hard-core`](../powers/amend-hard-core.md). Every exercise of
that power triggers this duty.

## Enforcement

The novation witness is co-located with the amended charter — it goes in
`governance/decisions/novation-<slug>-<date>.md` with `type: novation`. Audit checks verify
every commitment text-change in `git log -- governance/charter.md` has a corresponding
novation record. Missing novation = substrate violation.
