---
title: "Manage deprecation window"
type: jural-relation
kind: duty
slug: manage-deprecation-window
active-holder: pypredcalc-release-officer
passive-party: pypredcalc-community
scope-action: enforce-minimum-deprecation-window
triggering-powers: [declare-deprecation, publish-release]
required-action: maintain-at-least-one-minor-release-window
enforcement: substrate-violation
rule-type: N→N
theory-basis: [jural-relation, normative-operational-layering]
---

# Manage deprecation window

When a Stable public name is marked deprecated via
[`declare-deprecation`](../powers/declare-deprecation.md), the release officer MUST
ensure at least one minor-release window between marking and removal. The deprecation is
declared in version X.Y.Z; removal happens no earlier than the major release that follows.

## Why a minimum window

Downstream consumers (PyFARS, predicated-computing realizations) need time to migrate.
Deprecation declared and removed in the same release is a Stable break disguised — it
violates the math-floor-for-substrates commitment.

## Required action

For every deprecated name:

1. Mark the name with `DeprecationWarning` no later than the prior minor release before
   removal.
2. The replacement is exported and Stable in the same minor release where the deprecation
   is marked.
3. The deprecated name is removed only in the major release following.
4. The CHANGELOG entry for the marking release lists the deprecation and the replacement;
   the CHANGELOG entry for the removal release lists the removal and references the
   marking release.

## Cross-reference

This duty reinforces [`preserve-public-api-stability`](preserve-public-api-stability.md)
on the developer side. The developer respects the stability tiers when writing code; the
release officer respects them when cutting releases. Both work together.
