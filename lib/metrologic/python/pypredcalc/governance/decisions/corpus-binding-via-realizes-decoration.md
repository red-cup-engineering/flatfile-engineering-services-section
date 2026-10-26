---
title: "Corpus binding via @realizes decoration"
type: decision
slug: corpus-binding-via-realizes-decoration
status: committed
date: "2026-05-08"
hard-core: corpus-realization-binding-commitment
---

# Corpus binding via @realizes decoration

## What

Every PyPredCalc class, function, or method that realizes an entity in the
predication-categories corpus carries a `@realizes("type/slug")` decoration (defined in
`pypredcalc._realizes`). The slug names a path inside the corpus root, omitting the `.md`
extension. The audit at `governance/skills/running-corpus-binding-audit/audit.py` walks the codebase and verifies
every slug resolves to a real corpus markdown file.

Multiple `@realizes` decorations on a single Python entity accumulate — one Python symbol
may realize multiple corpus atoms (uncommon but supported).

The binding direction is **Python → theory**: PyPredCalc is authoritative for which Python
symbol realizes which corpus atom. The corpus does *not* carry `python:` frontmatter pointing
back into PyPredCalc.

## Why

Three forces:

1. **Single source of truth.** When the corpus → Python pointer lives in the corpus, every
   corpus update has to know what Python symbol realizes it; corpus authoring becomes coupled
   to PyPredCalc's renames and refactors. When the binding lives in Python, corpus authoring
   stays free; PyPredCalc absorbs the rename cost where the rename happens.

2. **Audit feasibility.** The Python side has a small finite set of decorated symbols and a
   tractable AST/import walk. The corpus side has hundreds of markdown files with arbitrary
   frontmatter. Auditing the binding from Python — read decorations, resolve each slug, verify
   the corpus file exists — is straightforward; auditing it from the corpus would require
   parsing every `python:` frontmatter and importing every named symbol.

3. **Hard-core C1.** The enterprise charter constitutes corpus realization as a constitutive
   commitment. The binding *is* the realization claim; placing it in PyPredCalc keeps the
   commitment proximate to the artifact that realizes it.

## Rules out

- Reverse-binding via corpus `python:` frontmatter as the authoritative pointer. Such frontmatter
  may exist as a denormalised cross-reference but does not bind; the `@realizes` decoration is
  authoritative.
- Implicit binding by name match (e.g., a Python class `PredicateCategory` is *assumed* to
  realize the corpus's `predicate-category` atom because the names line up). Name match is a
  hint, not a binding; the decoration is the binding.
- Realization claims in docstrings, comments, or commit messages without an accompanying
  `@realizes` decoration. The audit only reads decorations.

## Does not constrain

- Slug format beyond "type/slug, no .md extension". Future schema changes (e.g., a richer
  `type/category/slug` triple) would be a separate decision.
- The internal layout of `pypredcalc._realizes`. Currently it stores a tuple under
  `__realizes__`; the storage format is implementation detail.
- Whether docstrings or other documentation also reference the corpus slug. They may, as
  redundant cross-reference for human readers.
