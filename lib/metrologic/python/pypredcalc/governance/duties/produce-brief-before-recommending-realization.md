---
title: "Produce brief before recommending realization"
type: jural-relation
kind: duty
slug: produce-brief-before-recommending-realization
active-holder: pypredcalc-corpus-reader
passive-party: pypredcalc-community
scope-action: recommend-realization
triggering-powers: [produce-realization-brief]
required-action: complete-realization-brief-before-developer-acts
enforcement: substrate-violation
rule-type: N→N
theory-basis: [jural-relation, normative-operational-layering, recurrent-practice]
---

# Produce brief before recommending realization

The corpus-reader MUST produce a complete realization brief before the developer is
dispatched to write the realization for atoms warranting deep reading. Without the brief,
the developer is realizing-by-pattern-match — code that *looks* like the corpus atom but
doesn't preserve its structure.

## When the brief is required

Not every realization needs a brief. The corpus-reader's judgment determines this; rough
heuristic:

- **Brief required**: theorems with nontrivial proofs; multi-fiber constructions; atoms
  whose `depends-on:` chain spans multiple subpackages; atoms with corner cases the
  corpus discusses explicitly.
- **Brief optional**: atoms whose definition is one paragraph; atoms whose realization is
  a direct mirror of an already-realized atom; atoms whose Python shape is dictated by
  type signatures alone.

The corpus-tracker's realization-gap task records may carry a `requires-brief: true | false`
field hinting the corpus-reader's judgment.

## Required action

When a brief is required:

1. Read the corpus atom in full, plus its `depends-on:` chain.
2. Write the brief at `work/briefs/<corpus-slug>.md` per the office's format.
3. Mark the brief `status: committed`.
4. Update the realization-gap task to `requires-brief: <brief-slug>`; the task remains
   `status: ready` so the XO can dispatch the developer.

The developer reads the brief before exercising
[`write-pypredcalc-source`](../powers/write-pypredcalc-source.md). A realization that
shipped without the brief (when one was required) is a substrate violation.

## Enforcement

The corpus-binding audit can check, for each realization decoration `@realizes(<slug>)`,
whether a brief at `work/briefs/<slug>.md` exists when the corpus-reader marked it
required. Missing brief = violation.
