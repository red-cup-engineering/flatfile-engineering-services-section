---
title: "Bump version"
type: jural-relation
kind: power
slug: bump-version
active-holder: pypredcalc-release-officer
passive-party: pypredcalc-community
scope-action: update-version-field
scope: pyproject.toml
correlate-of: liability
duties: [follow-stability-tier-rules-on-release]
theory-basis: [jural-relation, normative-operational-layering]
---

# Bump version

The release officer may update the `version =` field in `pyproject.toml` per the
stability-tier rules in
[`public-api-stability-tiers`](../specifications/public-api-stability-tiers.md):

- **patch** (0.3.0 → 0.3.1): bugfixes only.
- **minor** (0.3.0 → 0.4.0): additive only on Stable; Provisional may break.
- **major** (0.x → 1.x): breaking changes permitted with deprecation cycles.

## Attached duty

- [`follow-stability-tier-rules-on-release`](../duties/follow-stability-tier-rules-on-release.md) —
  the bump category must match what actually changed in the release.

## Effect

`pyproject.toml` is updated. A subsequent [`publish-release`](publish-release.md) tags the
commit and publishes (currently to git only; PyPI publishing is a future consideration).
