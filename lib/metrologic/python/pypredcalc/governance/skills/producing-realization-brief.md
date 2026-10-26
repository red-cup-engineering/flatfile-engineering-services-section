---
name: "Producing realization brief"
description: "Writes a realization brief at work/briefs/<slug>.md describing the corpus atom's structure and the recommended Python shape. Use after reading the corpus deeply, before the developer is dispatched."
---

# Producing realization brief

## Requirements

- Corpus-reader office.
- Completed [`reading-corpus-deeply`](reading-corpus-deeply.md) for the target atom.

## Steps

1. Open `work/briefs/<corpus-slug>.md`.
2. Frontmatter:
   - `type: realization-brief`
   - `corpus-slug: <type/slug>`
   - `author: pypredcalc-corpus-reader`
   - `created-at: <date>`
   - `status: draft` initially, `committed` when finalized.
3. Body, in order:
   - **Atom** — one-paragraph statement of what the atom is.
   - **Definition unfolded** — the corpus's own statement, expanded with the structural
     content explicit (variables, types, axioms).
   - **Dependencies** — the `depends-on:` chain. For each dependency, note "realized in
     `pypredcalc.X.Y`" or "not realized; gap also pending."
   - **Load-bearing pieces** — the parts of the definition that the realization MUST
     preserve. These are the targets of the realization-claim test.
   - **Corner cases** — domain edges, degenerate inputs, places the math could go wrong.
   - **Recommended Python shape** — frozen dataclass / function returning witness /
     method on existing class. Sketch the type signature.
4. Cross-link the brief from the realization-gap task: update the task's `requires-brief:`
   field to the brief's slug.

## Outcomes

A committed brief at `work/briefs/<slug>.md`. The developer reads it before exercising
[`write-pypredcalc-source`](../powers/write-pypredcalc-source.md) on the named atom.
