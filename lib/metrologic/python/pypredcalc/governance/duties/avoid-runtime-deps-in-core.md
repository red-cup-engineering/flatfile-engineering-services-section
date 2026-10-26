---
title: "Avoid runtime dependencies in core"
type: jural-relation
kind: duty
slug: avoid-runtime-deps-in-core
active-holder: pypredcalc-developer
passive-party: pypredcalc-community
scope-action: add-import-to-core-source
triggering-powers: [write-pypredcalc-source]
required-action: import-only-from-stdlib-or-local
enforcement: substrate-violation
hard-core: pure-math-substrate-commitment
rule-type: N→N
theory-basis: [jural-relation, normative-operational-layering, charter-as-closure-system]
---

# Avoid runtime dependencies in core

Core code under `src/pypredcalc/` imports only from the Python standard library and from
within `pypredcalc` itself. No third-party runtime dependencies.

The optional `[symbolic]` extra brings `sympy` for exact algebra beyond the rationals
(Perron eigenvalues, etc.). Sympy is *never* a hard dependency. Modules that need sympy
import it lazily (inside the function that uses it) and surface a clear `ImportError` with
a "`pip install pypredcalc[symbolic]`" hint when sympy is absent.

## Why this is constitutive

C2 (pure-math substrate) requires that pypredcalc be importable in a minimal Python
environment. PyFARS and other downstream substrates must be able to bring pypredcalc in
without dragging a large dependency tree. The math floor is *pure* — depending only on
what Python ships with.

## Required action

When writing core code:

1. If the function would need a third-party library, ask: is the library load-bearing for
   the computation, or is it convenience?
2. If load-bearing for advanced cases (e.g., symbolic algebra), gate it via the
   `[symbolic]` extra and import lazily.
3. If load-bearing for the core (e.g., the function cannot be written without it), this is
   a substrate-changing decision — file an ADR-request triage note for the
   records-officer; do not silently add the dependency.

## Lazy-import pattern

```python
def perron_eigenvalue(matrix):
    try:
        import sympy
    except ImportError as exc:
        raise ImportError(
            "perron_eigenvalue requires the [symbolic] extra: "
            "pip install pypredcalc[symbolic]"
        ) from exc
    ...
```

## Enforcement

`pyproject.toml` lists no runtime dependencies in the `[project.dependencies]` field. The
`[project.optional-dependencies]` field carries `symbolic = ["sympy"]` and any future
optional extras. CI tests run with the minimal install (no extras) to catch hard-dep
regressions.
