---
title: "Ratify governance rule"
type: jural-relation
kind: power
slug: ratify-governance-rule
active-holder: pypredcalc-steward
passive-party: pypredcalc-community
scope-action: confirm-governance-rule-without-novation
scope: governance/
correlate-of: liability
theory-basis: [enterprise, charter-as-closure-system, normative-operational-layering, jural-relation]
---

# Ratify governance rule

The steward may confirm a governance change at the guidelines tier or below — guidelines G1–G5,
preferences, or instructions — without invoking novation. Novation is reserved for amendments
to hard-core C ([`amend-hard-core`](amend-hard-core.md)).

## Scope

- Guidelines tier (G1–G5 in the [charter](../charter.md)).
- Preferences tier.
- Instructions tier.
- Decisions in [`../decisions/`](../decisions/) that don't touch C.
- Specifications in [`../specifications/`](../specifications/) (binding module shape, API
  contracts).

Hard-core C amendments require [`amend-hard-core`](amend-hard-core.md) and captain ratification.

## Effect

The ratified rule's `status:` cell flips from `draft` to `committed`. The rule is binding on
all subsequent work touching its scope.
