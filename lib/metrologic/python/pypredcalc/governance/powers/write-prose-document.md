---
title: "Write prose document"
type: jural-relation
kind: power
slug: write-prose-document
active-holder: pypredcalc-docs-officer
passive-party: pypredcalc-community
scope-action: create-or-modify-prose-document
scope: docs/, prose/
correlate-of: liability
duties: [write-prose-for-public-surface]
enables-skills: [writing-prose-document, explaining-realization-in-math-reader-terms]
theory-basis: [jural-relation, normative-operational-layering]
---

# Write prose document

The docs officer may create or modify prose documentation under `docs/` (mkdocs source) or
`prose/` (long-form narratives, tutorials, explanatory essays).

## Scope

- `docs/index.md`, `docs/<subpackage>.md` — mkdocs source, one file per subpackage with a
  prose explanation of its public surface.
- `prose/narratives/<slug>.md` — long-form narratives (≈500–3000 words) that walk a path
  through several realizations, building a story.
- `prose/remarks/<slug>.md` — short essays (≈100–600 words) attached to a single
  realization, addressing one structural observation that doesn't belong in the realization's
  docstring.

## Attached duty

- [`write-prose-for-public-surface`](../duties/write-prose-for-public-surface.md) — every
  substantive new public surface gets prose explanation in math-reader terms within the
  release cycle following its ship.
