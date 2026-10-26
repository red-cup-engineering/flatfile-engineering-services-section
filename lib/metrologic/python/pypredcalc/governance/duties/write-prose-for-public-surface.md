---
title: "Write prose for public surface"
type: jural-relation
kind: duty
slug: write-prose-for-public-surface
active-holder: pypredcalc-docs-officer
passive-party: pypredcalc-community
scope-action: maintain-prose-coverage
triggering-powers: [write-prose-document]
required-action: ship-prose-explanation-within-following-release
enforcement: substrate-violation
rule-type: N→N
theory-basis: [jural-relation, normative-operational-layering]
---

# Write prose for public surface

Every substantive new public surface (a new aggregate type, a new subpackage, a new
realization that constitutes a new calculator capability) MUST get prose explanation in
math-reader terms within the release cycle following its ship.

## What "substantive" means

Not every public name needs a separate prose document. The threshold:

- A new aggregate (e.g., `PredicationHyperdoctrine`, `ClosureMonad`) — yes.
- A new subpackage — yes (a `docs/<subpackage>.md` page).
- A new theorem realization that warrants the leap-narrative attention (e.g., the
  algebra-coalgebra correspondence) — yes (often a `prose/narratives/<slug>.md`).
- A new helper function, a new utility — no (the docstring is sufficient).

Judgment call. The docs-officer files an ADR-request triage note for the records-officer
when the threshold is unclear.

## Required action

For each substantive new surface in a release:

1. Identify the appropriate prose location: `docs/<subpackage>.md` for subpackage-level,
   `prose/narratives/<slug>.md` for cross-cutting narrative, `prose/remarks/<slug>.md`
   for short single-realization observations.
2. Write the prose. Math-reader audience: explain what the surface *is* mathematically,
   how it composes with other realized surface, worked examples, pointers to the corpus
   atom for the reader who wants the full math.
3. Re-render mkdocs (`mkdocs build --strict`).
4. Update README if the surface is significant enough.

## Window

Prose can ship in the same release as the surface, but at minimum within the *following*
release. Surface that's been public for two releases without prose is a substrate
violation.

## Enforcement

Manual cadence audit. The docs-officer's release prep includes "list new surface from
prior releases without prose" — if the list is non-empty after one release window, file
a self-revision-intent triage note.
