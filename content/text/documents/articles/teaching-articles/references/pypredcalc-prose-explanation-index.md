---
title: pypred
type: reference
status: historical-software-documentation
date-recorded: 2026-10-28
original-source: https://github.com/lenticule-science/science-services-section/blob/f72389d7f80824a2ac16ca5dd201e340bd4ca696/services/philosophy-services-section/services/logic-services-section/content/text/documents/articles/research/pypredcalc/prose/explanation/index.md
source-revision: git-blob:sha1:bade63b4148ba5706f521bc21bd6f6134bde4e57
---
Pure-math primitives for predication-native computation.

- Zero runtime dependencies (sympy is an optional `[symbolic]` extra).
- Exact arithmetic via `fractions.Fraction`.
- Layered by mathematical role (algebra → predication → combinatorics → lattice/topology → sheaf → dynamics).
- Designed as the upstream library for the corpus's `tools/predication_categories/` verification layer.

## Subpackages

- [Algebra](pypredcalc-prose-explanation-algebra.md) — Belnap bilattice (FOUR), pre-bilattice axiom-checker, Ginsberg twist-product, finite commutative integral residuated lattice with derived residuum.
- [Predication](pypredcalc-prose-explanation-predication.md) — predication cells, stores, world-indexed valuations, entity sets, predicate category with the four canonical morphism classes (specialization, converse, subject/object projection), fiber valuations and pullback contravariance, the `store ↔ fiber` bridge, and `PredicateFunctor` between predicate categories.
- [Combinatorics](pypredcalc-prose-explanation-combinatorics.md) — posets, simplicial complexes, closure-rule systems with forward and backward operators.
- [Topology](pypredcalc-prose-explanation-topology.md) — Alexandrov topology of a poset, Priestley duality machinery; stub for the transfinite cell complex.
- [Lattice](pypredcalc-prose-explanation-lattice.md) — frames, frame morphisms (with computable right adjoints), d-frames.
- [Sheaf](pypredcalc-prose-explanation-sheaf.md) — Z-coefficient cellular cohomology, cellular sheaves, frame-valued sheaves; stub for Q-enriched sheaves.
- [Dynamics](pypredcalc-prose-explanation-dynamics.md) — substitution matrices, named corpus instances; stubs for full-form settling and cosettling.

## Quality gates

- `pytest` — full test suite (416 tests at the v0.2.6 cut, including a `tests/property/` package of 47 hypothesis-driven property tests on bilattice laws (incl. interlaced monotonicity and distributivity in both orders), residuation adjunction, frame-morphism preservation, and predicate-category naturality stability).
- `pytest --cov=src/pypredcalc --cov-fail-under=90` — branch-coverage floor of 90% (current: ~92%).
- `ruff` and `mypy --strict` clean.
- `mkdocs build --strict` clean.
- `governance/skills/running-corpus-binding-audit/audit.py` — devkit gate that every `@realizes("…/slug")` decoration in pypredcalc resolves to a real corpus markdown atom under the predication-categories root.
  Reports per-type coverage (objects / morphisms / concepts) and, with `--report-orphans`, the unrealised-corpus worklist.
