---
title: "Follow stability-tier rules on release"
type: jural-relation
kind: duty
slug: follow-stability-tier-rules-on-release
active-holder: pypredcalc-release-officer
passive-party: pypredcalc-community
scope-action: pick-version-bump-category
triggering-powers: [bump-version, publish-release]
required-action: match-bump-category-to-actual-changes
enforcement: substrate-violation
hard-core: math-floor-for-substrates-commitment
rule-type: N→N
theory-basis: [jural-relation, normative-operational-layering, charter-as-closure-system]
---

# Follow stability-tier rules on release

The release officer MUST pick the version bump category (patch / minor / major) per the
rules in [`public-api-stability-tiers`](../specifications/public-api-stability-tiers.md),
matching the bump to what actually changed in the release. Mismatch — e.g., a Stable name
broke but the bump is patch or minor instead of major — corrupts the math-floor-for-
substrates commitment downstream.

## Required action

When preparing a release:

1. Compute the API diff against the prior release (additions, removals, signature
   changes, semantics changes).
2. Categorize each diff item per
   [`public-api-stability-tiers`](../specifications/public-api-stability-tiers.md):
   - Stable name broken (signature changed, removed without deprecation, semantics
     changed) → MAJOR bump.
   - Stable name added or extended additively → MINOR bump.
   - Provisional name broken or added → MINOR bump (any-break is allowed but flagged).
   - Bugfix only, no API surface changes → PATCH bump.
3. Pick the bump matching the highest category that fired.
4. Mention in the CHANGELOG entry which categories fired and why.

## What this rules out

- Burying a Stable break in a minor release without a major bump.
- Burying a deprecation removal in a minor release (deprecation removal is a Stable
  break, requires major).
- Bumping minor when the changes are all internal refactor with no API surface change
  (that's a patch).

## Enforcement

The release process runs an API-diff check (currently manual; substrate-automatable
later). The release-officer cross-references the diff with the picked bump and surfaces
any mismatch as a substrate violation.
