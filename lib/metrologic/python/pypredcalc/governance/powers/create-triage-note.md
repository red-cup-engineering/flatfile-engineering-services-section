---
title: "Create triage note"
type: jural-relation
kind: power
slug: create-triage-note
active-holder: pypredcalc-executive-officer
passive-party: pypredcalc-community
scope-action: file-triage-note
scope: work/inbox/
correlate-of: liability
duties: [witness-every-classification]
theory-basis: [normative-operational-layering, jural-relation]
---

# Create triage note

The XO may file a triage note for incoming items that need routing but don't yet fit a
classification. Triage notes are the lowest-friction artifact for "I see this and need to
remember it later." They live in [`work/inbox/`](../../work/inbox/) and may be promoted to
proper inquiries / questions / tasks by subsequent processing.

## Attached duties

- [`witness-every-classification`](../duties/witness-every-classification.md) — even a
  "noise" classification produces a witness; nothing gets dropped silently.

## Format

A triage note is a markdown file with frontmatter `type: triage-note, status: open`,
`source:` (where the item came from), and a one-paragraph body describing what was observed.
Tagged with `requires-action:` if the XO sees an obvious next step.
