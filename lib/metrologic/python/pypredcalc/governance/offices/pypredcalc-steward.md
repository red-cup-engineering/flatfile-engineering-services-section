---
title: "PyPredCalc Steward"
type: office
slug: pypredcalc-steward
scope: pypredcalc-enterprise
action-domain:
  - amend-hard-core
  - create-office
  - dissolve-office
  - install-personnel
  - revoke-installation
  - ratify-governance-rule
  - immunity-from-non-captain-c-amendment
deontic-profile:
  amend-hard-core: power
  create-office: power
  dissolve-office: power
  install-personnel: power
  revoke-installation: power
  ratify-governance-rule: power
  witness-hard-core-amendments: duty
  immunity-from-non-captain-c-amendment: immunity
provides-skill:
  - reading-enterprise-state
  - presiding-over-novation
theory-basis: [enterprise, office-as-double-settlement, normative-operational-layering, jural-relation, charter-as-closure-system]
---

# PyPredCalc Steward

The enterprise-governing office. Accountable for the hard core C, the soundness of the
corpus-tracking loop Γ, and the composition of operative structure O. The steward cannot
delegate accountability — only tasks.

## Boundary with the Executive Officer

The steward sets the course; the XO runs the watch.

- **Steward territory**: constitutional actions (amending C, creating/dissolving offices,
  installing personnel, ratifying governance rules). The steward does NOT route inquiries,
  dispatch tasks, or close execution loops. Those are XO powers.
- **XO territory**: everything operational. The XO does NOT amend C, create offices, or
  install personnel.

## Boundary with the Corpus Tracker

The corpus tracker reports degeneration of Γ; the steward acts on the reports. The steward
does not run audits or watch the corpus directly — that's the corpus-tracker's job. When the
corpus-tracker files a degeneration signal, the steward decides whether to amend C (novation),
adjust O (create/dissolve offices), or accept the signal as a transient.

## Non-delegable duties

Per `military-command-chain-as-modal-composition`, the steward's accountability for C is an H⁰
invariant — it does not redistribute downward. The steward personally:

- Witnesses every amendment to the charter's rules tier ([`witness-hard-core-amendments`](../duties/witness-hard-core-amendments.md)).
- Acts on degeneration signals filed by the corpus-tracker.

## Authority chain

`561 polity → captain (emsenn) → pypredcalc-steward → pypredcalc-executive-officer → functional offices`.
The steward operates in parallel with the XO and the corpus-tracker under the captain (per the
three-governing-offices-in-parallel pattern from PyFARS) — they share the captain as principal
but do not command each other.

## Immunities

The steward bears [`immunity-from-non-captain-c-amendment`](../powers/immunity-from-non-captain-c-amendment.md):
only the captain (above the steward) can ratify amendments to C. Offices below the captain —
including the steward's peers (XO, corpus-tracker) and the functional offices — have a
structural disability against amending C.

## Incumbency

Currently held informally by the captain (`emsenn`). A formal incumbency predication
(recognition + induction per `office-as-double-settlement`) is deferred to a future task that
settles incumbency in the substrate.

Formal incumbency record: [`emsenn-incumbency`](../personnel/emsenn-incumbency.md) — captain holds this office informally pending substrate-driven dispatch.
