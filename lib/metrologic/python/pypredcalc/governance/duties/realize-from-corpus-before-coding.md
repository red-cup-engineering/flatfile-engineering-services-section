---
title: "Realize from corpus before coding"
type: jural-relation
kind: duty
slug: realize-from-corpus-before-coding
active-holder: pypredcalc-developer
passive-party: pypredcalc-community
scope-action: write-realizing-python-entity
triggering-powers: [write-pypredcalc-source]
required-action: read-corpus-atom-before-coding
enforcement: substrate-violation
rule-type: N→N
theory-basis: [normative-operational-layering, jural-relation, recurrent-practice]
---

# Realize from corpus before coding

Before writing a Python entity that realizes a corpus atom, the developer MUST read the
corpus atom's markdown file and cite the slug in the entity's docstring. Code written
without consulting the corpus is written under a violated duty, regardless of whether the
code is otherwise correct.

## Required action

1. Identify the corpus slug the entity is realizing (`type/slug`).
2. Read the corpus markdown:
   `theories/.../predication-categories/<type>/<slug>.md`.
3. Reference the slug in the entity's docstring (one line is fine: "Realises corpus
   `objects/predication-fiber-algebra`.").
4. Apply the `@realizes` decoration per
   [`decorate-every-realization`](decorate-every-realization.md).

## Why stricter than just reading

A Python entity that realizes a corpus atom is making a *realization claim*: this code
*is* the corpus atom in Python. The claim's truthfulness depends on the developer having
understood the corpus atom — its definition, its dependencies, its theorem proofs. Skipping
the consultation produces realizations that *look* like the atom but don't preserve its
mathematical structure.

The docstring citation is the human-readable trace of the consultation. The `@realizes`
decoration is the substrate-readable claim. Both are needed.

## What this rules out

- Writing a realization based on reading a *test case* of the corpus atom rather than the
  atom itself. Tests describe behaviour; the corpus describes the math.
- Writing a realization based on prior pypredcalc code that was itself a realization of the
  same atom. Code-from-code drifts; corpus is the upstream truth.
- Writing a realization claiming to realize an atom that doesn't exist. The
  `@realizes` decoration is then dangling — caught by the audit.

## Stronger duty also applies

[`decorate-every-realization`](decorate-every-realization.md) is the stricter form of this:
it requires the *binding* (decoration), not just the consultation. Both duties fire on
[`write-pypredcalc-source`](../powers/write-pypredcalc-source.md) when the written entity
realizes a corpus atom.
