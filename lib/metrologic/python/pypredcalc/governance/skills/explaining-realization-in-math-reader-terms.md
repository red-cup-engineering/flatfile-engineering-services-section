---
name: "Explaining realization in math-reader terms"
description: "Translates a Python realization into prose accessible to a math reader who knows category theory but not Python. Use as the core authoring skill for prose documents."
---

# Explaining realization in math-reader terms

## Requirements

- Docs-officer office.
- The realization to explain.
- The corpus atom it realizes.

## Steps

1. Open with the *math-side framing*: what the corpus atom is, in the corpus's own
   vocabulary. Don't mention Python yet.
2. Show *the realization claim*: the Python entity realizes the corpus atom; the
   `@realizes` decoration binds them; the realization-claim test substantiates the binding.
3. Show the *Python shape* using the math reader's vocabulary:
   - Frozen dataclass = a value carrying the structural fields the corpus calls for.
   - Witness type = the categorical object the corpus calls the answer.
   - `pullback` method = `f^*`, the reindexing along the morphism.
4. *Worked example* with reasonable inputs. The example should be short enough to
   hand-verify and concrete enough to remove ambiguity.
5. End with *cross-references*: the corpus markdown for the full math, the docstring for
   the API detail, related realizations the reader might compare with.

## What to avoid

- Pure code-reader idiom ("this method returns a `FiberValuation`"). Translate into
  math: "this method computes the fiber-valuation `f^*(v)`."
- Avoiding the math entirely ("this lets you do X efficiently"). The math reader wants
  the math; efficiency is a side-comment, not the framing.

## Outcomes

Prose a math reader can follow without reading the source. The reader gets *what the
realization is mathematically*, not just *how to call it*.
