---
name: "Identifying load-bearing dependencies"
description: "Surfaces which corpus atoms a realization MUST preserve to honor its claim. Use during corpus-deep-reading; produces input to the brief's load-bearing-pieces section."
---

# Identifying load-bearing dependencies

## Requirements

- Corpus-reader office.
- A corpus atom and its dependency chain.

## Steps

1. For each dependency named in the atom's `depends-on:`, classify:
   - **Definitional** — the dependency provides a type or carrier the atom uses; the
     realization just needs the dependency available.
   - **Axiomatic** — the dependency provides axioms the atom assumes; the realization
     must preserve those axioms in its own behavior.
   - **Theorem-bearing** — the dependency provides a theorem the atom uses in its
     definition or proof; the realization must respect the theorem's content (e.g., a
     unique-up-to-iso clause is load-bearing).
2. The load-bearing pieces are the axiomatic and theorem-bearing dependencies plus any
   internal load-bearing structure of the atom itself.
3. List them with one-line descriptions in the brief's "Load-bearing pieces" section.

## Outcomes

A list of dependencies the realization MUST preserve, suitable for the realization-claim
test design. Each item is a target the test exercises.
