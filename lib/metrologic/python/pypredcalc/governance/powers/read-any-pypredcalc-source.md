---
title: "Read any pypredcalc source"
type: jural-relation
kind: privilege
slug: read-any-pypredcalc-source
active-holder: pypredcalc-corpus-tracker
passive-party: pypredcalc-community
scope-action: read-source-file
scope: src/
correlate-of: no-right
theory-basis: [jural-relation, normative-operational-layering]
---

# Read any pypredcalc source

The corpus-tracker holds an unrestricted read privilege over `src/`. Needed to walk
`@realizes` decorations and compute the realization-coverage diff against the corpus.

The developer also holds this privilege — a developer needs to read existing realizations
before writing new ones to avoid duplication.

## Scope

All paths under `pypredcalc/src/`.

## Correlate

No-right: the community has no right against reads on `src/`. Writes are restricted (only
the developer holds [`write-pypredcalc-source`](write-pypredcalc-source.md)), but reads
are universally permissible.
