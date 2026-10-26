---
title: "Declare deprecation"
type: jural-relation
kind: power
slug: declare-deprecation
active-holder: pypredcalc-release-officer
passive-party: pypredcalc-community
scope-action: mark-public-name-deprecated
correlate-of: liability
duties: [manage-deprecation-window]
enables-skills: [managing-deprecation-window]
theory-basis: [jural-relation, normative-operational-layering]
---

# Declare deprecation

The release officer may mark a Stable public name as deprecated, attaching a
`DeprecationWarning` and naming a replacement. Deprecation is the substrate-correct way to
remove a Stable name across a major version transition without breaking downstream
consumers silently.

## Preconditions

The deprecated name must have a documented replacement that is itself Stable in the same
or earlier minor release. Deprecating without a replacement violates the math-floor-for-
substrates commitment.

## Attached duty

- [`manage-deprecation-window`](../duties/manage-deprecation-window.md) — every
  deprecated name has at least one minor-release window between marking and removal.
  Removal happens in the major release that follows the marking minor release.

## Effect

The Stable public name carries a `DeprecationWarning` raised on import or first use. The
CHANGELOG entry for the marking release announces the deprecation and names the
replacement.
