---
title: "Modify governance record"
type: jural-relation
kind: power
slug: modify-governance-record
active-holder: pypredcalc-records-officer
passive-party: pypredcalc-community
scope-action: edit-existing-file
scope: governance/
correlate-of: liability
duties: [consult-corpus-before-encoding]
theory-basis: [jural-relation, normative-operational-layering]
---

# Modify governance record

Admits the records-officer to edit an existing file under `governance/` — frontmatter
updates, body amendments, status transitions (e.g., promoting a draft decision to
committed).

## Restrictions

- Modifying a record that touches hard-core C requires steward ratification via
  [`amend-hard-core`](amend-hard-core.md). The records-officer drafts; the steward (and
  ultimately the captain) ratifies.
- Modifying a `status: committed` decision requires creating a *superseding* decision rather
  than rewriting the original. Edit-in-place is reserved for status transitions and minor
  clarifications.

## Attached duty

- [`consult-corpus-before-encoding`](../duties/consult-corpus-before-encoding.md) — re-read
  existing records and the corpus for structuration improvements before modifying.
