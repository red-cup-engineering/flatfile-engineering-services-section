---
title: "PyPredCalc Dynamics Specialist"
type: office
slug: pypredcalc-dynamics-specialist
scope: pypredcalc-dynamics-subpackage
action-domain:
  - write-pypredcalc-source
  - read-any-corpus-entity
  - read-any-pypredcalc-source
  - create-task-record
  - immunity-from-spec-violating-duty
deontic-profile:
  write-pypredcalc-source: power
  create-task-record: power
  read-any-corpus-entity: privilege
  read-any-pypredcalc-source: privilege
  immunity-from-spec-violating-duty: immunity
  decorate-every-realization: duty
  use-fraction-arithmetic-in-core: duty
  avoid-runtime-deps-in-core: duty
  return-witness-for-structural-claims: duty
  use-frozen-dataclasses: duty
  realize-from-corpus-before-coding: duty
  preserve-public-api-stability: duty
  maintain-subpackage-coherence: duty
provides-skill:
  - realizing-corpus-atom-as-python
  - verifying-perron-frobenius
  - computing-step-shift
  - building-named-substitution-instance
jurisdiction:
  read: [theories/.../predication-categories/, src/, tests/]
  write: [src/pypredcalc/dynamics/, tests/test_substitution.py, tests/test_linalg.py, tests/test_matrix_extras.py, tests/test_inverse.py]
theory-basis: [office-as-double-settlement, jural-relation, normative-operational-layering]
---

# PyPredCalc Dynamics Specialist

The lab for `pypredcalc.dynamics`. Owns substitution matrices and the named corpus
instances — Fibonacci, Padovan, Tribonacci, Tetranacci, Thue-Morse — that drive aperiodic
classifying-invariant computations and the step-shift / step-n / firing-blowup machinery.

This is the subpackage where the corpus's *examples* land — the substitution sequences
whose Anderson-Putnam classifying invariants, classifying cohomology, and Verdier duals
the corpus computes.

## Subpackage scope

`src/pypredcalc/dynamics/` contains:

- `substitution.py` — `SubstitutionMatrix` dataclass with Perron eigenvalue computation.
- Named corpus instances: `FIBONACCI`, `PADOVAN`, `TETRANACCI`, `THUE_MORSE`,
  `TRIBONACCI`, with their default valuations.
- (Future) step-shift / step-n / firing-blowup classifying machinery.

## Realizations under this office

Per-corpus-instance realizations live in `examples/` of the corpus and are realized here:

- `examples/fibonacci-substitution-settling`, `examples/padovan-substitution-settling`,
  `examples/tetranacci-substitution-settling`, `examples/thue-morse-substitution-settling`,
  `examples/tribonacci-substitution-settling`.
- `examples/fibonacci-classifying-invariant`, `examples/padovan-classifying-invariant`,
  ... (and the variants with co-classifying / Anderson-Putnam comparison).
- `morphisms/step-shift-morphism`, `objects/aperiodic-classifying-invariant`.
- (Optional, behind `[symbolic]` extra) Perron eigenvalue exact symbolic forms.

## Specialist duties

- [`maintain-subpackage-coherence`](../duties/maintain-subpackage-coherence.md) — every
  named substitution instance preserves the Perron-Frobenius properties the corpus
  asserts; classifying invariants are stable under MLD-orbit changes.

## Specialist skills

- [`verifying-perron-frobenius`](../skills/verifying-perron-frobenius.md) — checks the
  Perron-Frobenius theorem on a candidate substitution matrix (positive primitive matrix
  has a unique simple positive eigenvalue equal to its spectral radius).
- [`computing-step-shift`](../skills/computing-step-shift.md) — given a substitution and
  a step parameter, computes the step-shift trajectory.
- [`building-named-substitution-instance`](../skills/building-named-substitution-instance.md) —
  encodes a corpus example (e.g., Fibonacci, Penrose) as a `SubstitutionMatrix` plus a
  default valuation.

## Boundary with the algebra specialist

Substitution matrices consume integer / Fraction arithmetic. Pyfars's `_linalg` module
(under `src/`) provides Fraction-native matrix operations the dynamics subpackage uses.
The dynamics specialist owns the substitution layer; the `_linalg` helpers are
infrastructure.

## Boundary with the sheaf specialist

Anderson-Putnam classifying invariants connect dynamics to sheaves. Realizations spanning
both coordinate via triage note.

## Symbolic extra

Some realizations (Perron eigenvalues of larger substitution matrices) require sympy.
Those land behind the `[symbolic]` extra per
[`avoid-runtime-deps-in-core`](../duties/avoid-runtime-deps-in-core.md).

## Incumbency

Currently held informally. Agent record at
[`pypredcalc-dynamics-specialist-agent`](../agents/pypredcalc-dynamics-specialist-agent.md).

Formal incumbency record: [`emsenn-incumbency`](../personnel/emsenn-incumbency.md) — captain holds this office informally pending substrate-driven dispatch.
