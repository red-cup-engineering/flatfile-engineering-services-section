---
title: "PyPredCalc Corpus Reader"
type: office
slug: pypredcalc-corpus-reader
scope: pypredcalc-corpus-comprehension
action-domain:
  - read-any-corpus-entity
  - read-any-pypredcalc-source
  - produce-realization-brief
deontic-profile:
  read-any-corpus-entity: privilege
  read-any-pypredcalc-source: privilege
  produce-realization-brief: power
  produce-brief-before-recommending-realization: duty
provides-skill:
  - reading-corpus-deeply
  - producing-realization-brief
  - identifying-load-bearing-dependencies
theory-basis: [office-as-double-settlement, normative-operational-layering, jural-relation, recurrent-practice]
---

# PyPredCalc Corpus Reader

The mathematical study office. Distinct from the [`corpus-tracker`](pypredcalc-corpus-tracker.md)
(which finds gaps) and the [`developer`](pypredcalc-developer.md) (which writes code), the
corpus-reader does the *deep mathematical reading* — sits with a corpus atom long enough to
understand its dependencies, its proof structure, the load-bearing pieces, the corner cases —
and produces a **realization brief** that the developer follows.

## Why this office exists

Realizing a corpus atom in Python without first understanding the math produces
realizations-by-pattern-match: code that *looks* like the atom but doesn't preserve its
structure. The corpus-reader is the substrate's protection against this: a realization
proceeds only after the brief is written and the dependencies are accounted for.

In small realizations the developer can act as their own corpus-reader (read deeply, then
write). For complex multi-fiber constructions, theorems with long dependency chains, or
atoms that interact non-trivially with already-realized material, the corpus-reader role is
distinct labor and worth assigning to a dedicated session.

## Realization brief

The output of this office. A markdown record at `work/briefs/<slug>.md` with:

- **Atom** — the corpus slug being read.
- **Definition unfolded** — what the atom *is*, in the corpus's own terms but with the
  mathematical structure made explicit.
- **Dependencies** — the `depends-on:` chain, with notes on which dependencies are already
  realized and which are not.
- **Load-bearing pieces** — the parts of the definition / proof that the realization MUST
  preserve to honor the realization claim.
- **Corner cases** — domain edges, degenerate inputs, places where the math could go wrong.
- **Recommended Python shape** — what the realization should look like (frozen dataclass?
  function returning a witness? method on an existing class?).

The developer reads the brief before exercising
[`write-pypredcalc-source`](../powers/write-pypredcalc-source.md). A realization without a
brief (for atoms that warrant one) is a substrate violation per
[`produce-brief-before-recommending-realization`](../duties/produce-brief-before-recommending-realization.md).

## Boundary with the developer

The corpus-reader does NOT write source code. The developer reads the brief and writes the
realization. If the developer disagrees with the brief, that's a triage issue — file a
question, don't silently override.

## Boundary with the corpus-tracker

The corpus-tracker identifies *which* atoms have gaps; the corpus-reader studies *the atom*
identified. The corpus-tracker's task records say "atom X needs realization"; the
corpus-reader's brief says "here's what realizing atom X requires."

## Incumbency

Currently held informally. Inference sessions tasked with deep mathematical reading;
agent record at [`pypredcalc-corpus-reader-agent`](../agents/pypredcalc-corpus-reader-agent.md).

Formal incumbency record: [`emsenn-incumbency`](../personnel/emsenn-incumbency.md) — captain holds this office informally pending substrate-driven dispatch.
