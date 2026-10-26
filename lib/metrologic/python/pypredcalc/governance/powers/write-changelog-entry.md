---
title: "Write CHANGELOG entry"
type: jural-relation
kind: power
slug: write-changelog-entry
active-holder: pypredcalc-release-officer
passive-party: pypredcalc-community
scope-action: append-changelog-section
scope: CHANGELOG.md
correlate-of: liability
duties: [write-changelog-narrative]
theory-basis: [jural-relation, normative-operational-layering]
---

# Write CHANGELOG entry

The release officer may append a release entry to `CHANGELOG.md`. Each entry has:

- A version header (e.g., `## 0.4.0 — Calculator surface extension`).
- A leap-narrative at the top — what the release adds in math-reader terms (not just
  code-reader terms).
- Subpackage-by-subpackage detail — what realizations shipped, what was deprecated, what
  was promoted from Provisional to Stable.

## Attached duty

- [`write-changelog-narrative`](../duties/write-changelog-narrative.md) — the leap-narrative
  is required and must be written in terms the math reader (corpus consumer, downstream
  substrate maintainer) can follow. CHANGELOG entries that are pure mechanical changelogs
  ("bumped foo to 1.2", "removed bar") without the narrative are duty-non-fulfillment.
