---
title: "PyPredCalc"
description: "Pure-math primitives for predication-native computation: Belnap bilattice, predication cells, posets, frames, sheaves, substitution dynamics. Zero runtime dependencies; exact arithmetic via fractions.Fraction; sympy only as an optional symbolic extra."
component-of: predication-categories
nix-package:
  input-name: pypredcalc
  flake-url: "git+ssh://git@github.com/emsenn/pypred"
  follows-inputs: [nixpkgs, flake-utils]
  package-name: pypred
---

# PyPredCalc

The pythonic realization of the math primitives used by predication-category theory and the substrates that depend on it. Where [PyFARS](../../platform/pyfars/) realizes flatfile-agentic-resource-system theory as a running runtime, PyPredCalc realizes the *math under* that — the bilattice algebra, the predication cells, the closure-rule systems, the frame and sheaf machinery — as importable Python.

## Position in the lineage

- [Predication categories](../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/) — the categorical mathematics of bilattice- and quantale-valued predication structures. The math floor.
- **PyPredCalc** — this package — Python realization of those primitives, structured by subpackage to mirror the corpus's own decomposition.

The binding goes Python → theory: each PyPredCalc class, function, or method that realizes a corpus entity carries an `@realizes("…/slug")` decoration naming the corpus atom it realizes. `governance/skills/running-corpus-binding-audit/audit.py` walks PyPredCalc, collects every decoration, and verifies each slug resolves to a real corpus markdown file. Coverage is reported per atom-type (objects / morphisms / concepts).

## Layout

| Path | What it carries |
|---|---|
| [`src/pypredcalc/`](src/pypredcalc/) | The Python package; subpackages mirror the math: `algebra`, `predication`, `combinatorics`, `topology`, `lattice`, `sheaf`, `dynamics`, plus internal `_linalg`. |
| [`tests/`](tests/) | pytest test suite, including hypothesis-driven property tests under `tests/property/`. |
| [`prose/`](prose/) | Human-readable docs — explanation, tutorials, how-to. The subpackage-aligned reference content lives in [`prose/explanation/`](prose/explanation/). |
| [`work/`](work/) | Active development tracking — backlog, tasks, questions. |
| [`governance/`](governance/) | Project-development governance — enterprise, charter, conventions, decisions, specifications. |

Executable governance scripts live alongside their `SKILL.md` under [`governance/skills/`](governance/skills/) — currently the corpus-binding audit ([`running-corpus-binding-audit/audit.py`](governance/skills/running-corpus-binding-audit/audit.py)) and the work-dispatch readiness rule ([`computing-dispatch-readiness/dispatch.py`](governance/skills/computing-dispatch-readiness/dispatch.py)). The chain is *office → officers → duties → skills → scripts → work*.

Top-level files: `README.md` (install + quickstart), `pyproject.toml` (package metadata), `flake.nix` (Nix consumers), `mkdocs.yml` (rendered docs build), `CHANGELOG.md`, `LICENSE`.
