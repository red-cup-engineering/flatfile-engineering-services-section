---
title: "Publish release"
type: jural-relation
kind: power
slug: publish-release
active-holder: pypredcalc-release-officer
passive-party: pypredcalc-community
scope-action: tag-and-publish-release
correlate-of: liability
duties: [follow-stability-tier-rules-on-release, write-changelog-narrative]
enables-skills: [cutting-release]
theory-basis: [jural-relation, normative-operational-layering]
---

# Publish release

The release officer may tag a commit as a release and publish it. Publishing is currently
git-only (a tag, a commit, a CHANGELOG entry); PyPI publishing is a future capability that
would be its own additional power.

## Preconditions

Per [`follow-stability-tier-rules-on-release`](../duties/follow-stability-tier-rules-on-release.md),
all release gates pass:

- Corpus-binding audit clean (no unresolved `@realizes` slugs).
- Full test suite green (unit + property).
- mypy --strict clean.
- ruff lint clean.
- CHANGELOG entry written for the release per
  [`write-changelog-narrative`](../duties/write-changelog-narrative.md).
- Version bumped per [`bump-version`](bump-version.md).

If any gate fails, the release stops; release officer files a triage note for the office
that owns the failing gate.

## Effect

A new git tag at `vX.Y.Z` on the release commit. The CHANGELOG carries the release entry.
Downstream consumers (pyfars, predicated-computing realizations) can pin to the tag.
