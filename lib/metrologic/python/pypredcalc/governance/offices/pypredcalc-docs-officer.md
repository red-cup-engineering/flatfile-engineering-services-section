---
title: "PyPredCalc Docs Officer"
type: office
slug: pypredcalc-docs-officer
scope: pypredcalc-prose-documentation
action-domain:
  - write-prose-document
  - render-mkdocs
  - update-readme
  - read-any-pypredcalc-source
deontic-profile:
  write-prose-document: power
  render-mkdocs: power
  update-readme: power
  read-any-pypredcalc-source: privilege
  write-prose-for-public-surface: duty
provides-skill:
  - writing-prose-document
  - rendering-mkdocs
  - updating-readme
  - explaining-realization-in-math-reader-terms
theory-basis: [office-as-double-settlement, jural-relation, normative-operational-layering]
---

# PyPredCalc Docs Officer

The prose-documentation office. Owns `docs/`, `prose/`, `README.md`, and the mkdocs render.
Translates the realized surface into prose readable by math readers (not just code readers)
— the audience that wants to understand *what pypredcalc does mathematically*, not just *how
to call functions*.

## Role in plain terms

When a substantive piece of public surface ships, the docs-officer:

1. Reads the realization and the corpus atom it realizes.
2. Writes a prose section under `docs/<subpackage>.md` (or `prose/narratives/<slug>.md` for
   longer-form material) explaining:
   - What the realized surface *is* mathematically.
   - How it composes with other realized surface.
   - Worked examples with reasonable inputs.
   - Pointers to the corpus atom for the reader who wants the full math.
3. Updates `README.md` if the surface change is significant enough to mention at top level.
4. Re-renders mkdocs (`mkdocs build --strict`) and ensures the doc site is clean.

## Why distinct from the records-officer

The records-officer writes governance and work records — the *substrate* of what pypredcalc
does. The docs-officer writes prose for *readers* outside the substrate — math researchers,
downstream consumers, anyone wanting to understand pypredcalc without running the audit
tool. The records-officer writes for the substrate's consistency; the docs-officer writes
for human comprehension.

## Why distinct from the developer

Docstrings on functions/classes are the developer's domain (they're co-located with the
code). Prose documents that explain *the math behind a subpackage*, *the relationship between
several realizations*, or *the leap-narrative of a release* are the docs-officer's domain.

## Boundary with the release-officer

The release-officer writes the CHANGELOG (release-cadenced narrative). The docs-officer
writes the standing documentation (timeless prose). They cross-reference: the CHANGELOG
points at the prose docs; the prose docs predate any single release.

## Incumbency

Currently held informally. Agent record at
[`pypredcalc-docs-officer-agent`](../agents/pypredcalc-docs-officer-agent.md).

Formal incumbency record: [`emsenn-incumbency`](../personnel/emsenn-incumbency.md) — captain holds this office informally pending substrate-driven dispatch.
