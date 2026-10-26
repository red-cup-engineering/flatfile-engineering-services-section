---
title: "Produce realization brief"
type: jural-relation
kind: power
slug: produce-realization-brief
active-holder: pypredcalc-corpus-reader
passive-party: pypredcalc-community
scope-action: create-realization-brief-record
scope: work/briefs/
correlate-of: liability
duties: [produce-brief-before-recommending-realization]
enables-skills: [reading-corpus-deeply, producing-realization-brief]
theory-basis: [jural-relation, normative-operational-layering]
---

# Produce realization brief

The corpus-reader may write a realization brief at `work/briefs/<slug>.md`. The brief
records a deep mathematical reading of one corpus atom: definition unfolded, dependencies
identified, load-bearing pieces named, corner cases noted, and a recommended Python shape.

The developer reads the brief before exercising
[`write-pypredcalc-source`](write-pypredcalc-source.md) on the named atom.

## Brief format

`work/briefs/<corpus-slug>.md` with frontmatter:

- `type: realization-brief`
- `corpus-slug: <type/slug>`
- `author: pypredcalc-corpus-reader`
- `created-at: <date>`
- `status: draft | committed`

Body sections (per the office record):
**Atom / Definition unfolded / Dependencies / Load-bearing pieces / Corner cases / Recommended Python shape**.
