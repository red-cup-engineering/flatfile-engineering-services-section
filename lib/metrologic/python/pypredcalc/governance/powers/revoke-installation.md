---
title: "Revoke installation"
type: jural-relation
kind: power
slug: revoke-installation
active-holder: pypredcalc-steward
passive-party: pypredcalc-community
scope-action: terminate-incumbency
correlate-of: liability
theory-basis: [office-as-double-settlement, jural-relation, normative-operational-layering]
---

# Revoke installation

The steward may end a candidate's incumbency in an office. Revocation settles the negation of
both incumbency predicates — `recognized-as-incumbent-of` and `inducted-into` — terminating
the *dignitas* state.

## Why revoke

- Personnel performance issues that the steward judges warrant termination of the office's
  binding to that personnel.
- Personnel transition out of the project (a contracted inference session ending; a captain
  reassignment).
- Office dissolution (per [`dissolve-office`](dissolve-office.md)) — revoke any installed
  personnel before dissolving.

## Effect

The personnel-office binding cell is settled to `f` (or `top` if the prior installation
remains a load-bearing fact for audit purposes — knowledge-monotone semantics preserves both
the prior `t` and the current revocation `f`).
