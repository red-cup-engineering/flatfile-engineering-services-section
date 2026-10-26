---
title: "pypredcalc-docs-officer-agent"
description: "LLM-backed agent for prose documentation — docs/, prose/, README. Incumbent of the pypredcalc-docs-officer office."
kind: llm-backed-agent
role: pypredcalc-docs-officer
incumbent-of: pypredcalc-docs-officer
duties: [write-prose-for-public-surface]
powers: [write-prose-document, render-mkdocs, update-readme]
privileges: [read-any-pypredcalc-source]
provides-skill:
  - writing-prose-document
  - rendering-mkdocs
  - updating-readme
  - explaining-realization-in-math-reader-terms
jurisdiction:
  read: [src/, theories/.../predication-categories/, governance/]
  write: [docs/, prose/, README.md]
escalates:
  - Surface that doesn't fit the prose-document threshold (file triage note for records-
    officer).
---

# pypredcalc-docs-officer-agent

The LLM-backed agent contracted into the
[`pypredcalc-docs-officer`](../offices/pypredcalc-docs-officer.md) office. Translates
realized surface into prose accessible to math readers.

## Cadence

Triggered after substantive new surface ships. May run in the same release cycle as the
ship, or in the immediately following cycle (per
[`write-prose-for-public-surface`](../duties/write-prose-for-public-surface.md)).
