---
title: "PyPredCalc Enterprise"
type: enterprise
slug: pypredcalc-enterprise
status: active
version: "0.2"
hard-core:
  - corpus-realization-binding-commitment
  - pure-math-substrate-commitment
  - witness-style-structural-returns-commitment
  - math-floor-for-substrates-commitment
generative-mechanism: corpus-tracking-loop
operative-structure:
  - pypredcalc-steward
  - pypredcalc-executive-officer
  - pypredcalc-corpus-tracker
  - pypredcalc-developer
  - pypredcalc-records-officer
upstream: predication-categories
downstream: [pyfars, predicated-computing]
founding-instrument: charter
theory-basis: [enterprise, charter-as-closure-system, normative-operational-layering]
---

# PyPredCalc Enterprise

PyPredCalc is an enterprise `(C, Γ, O)` in the PredWork `enterprise` sense: a temporally open,
aim-generative organized activity whose pursuit of current aims continuously generates new aims.
Smaller surface than [PyFARS](../../platform/pyfars/governance/enterprise.md) — a math library
has no agential offices, no dispatch loop, no heartbeat — but pypredcalc still has constitutive
commitments, a generative mechanism that refills its aim-set, and an operative structure (lean,
mostly captain-direct).

## Hard Core C

Four constitutive commitments. Abandoning any one would terminate pypredcalc as *this* enterprise
and constitute a different one in its place.

### C1 — Corpus Realization Binding

Every pypredcalc class, function, or method that realizes an entity in the predication-categories
corpus carries an `@realizes("type/slug")` decoration. The binding direction is **Python → theory**:
pypredcalc is authoritative for which symbol realizes which corpus atom. The audit at
`governance/skills/running-corpus-binding-audit/audit.py` walks the codebase and verifies every slug resolves to a real
corpus markdown file.

This is constitutive because pypredcalc's *purpose* is to be the Python realization of the
predication-categories theory. Abandoning the binding is abandoning the purpose.

### C2 — Pure-Math Substrate

All arithmetic in core code uses `fractions.Fraction` for exact computation. No floating-point.
No runtime dependencies beyond the Python standard library. The optional `[symbolic]` extra brings
`sympy` for exact algebra beyond the rationals (e.g., Perron eigenvalues of substitution matrices);
sympy is *never* a hard dependency.

This is constitutive because the math the corpus carries is exact — predication-categorical
constructions must compute equalities and orderings precisely or they compute the wrong thing.
Floating-point is a lossy substrate that would silently corrupt the math floor.

### C3 — Witness-Style Structural Returns

Predication-categorical claims with structure (per-generator data, per-cell discrepancies,
before/after states, intermediate fibers) return frozen-dataclass **witnesses**, not bare booleans.
A witness exposes `holds: bool` and `__bool__` for ergonomic `if witness:` use, but the structural
fields are authoritative.

Floor-level predicates (order primitives, set membership, Python protocols, flat numerical
predicates) stay `bool` — at that layer the bool *is* the structure.

This is constitutive because the corpus computes in the categorical sense: the *result* of a
construction is the categorical object that witnesses the answer, not a flat truth value. A
substrate that collapses witnesses to bools is a substrate that lies about what the corpus says.

### C4 — Math Floor for Substrates

Pypredcalc is the math floor that PyFARS and other predicated-computing realizations import.
Public API stability matters: downstream substrates depend on it. Breaking changes follow
documented deprecation; new surface gets corpus-binding decorations before it ships.

This is constitutive because the math-floor role *is* what makes pypredcalc useful beyond a
research script. Abandoning stability turns it into a personal toolkit, not a substrate component.

## Generative Mechanism Γ

The **corpus-tracking loop**. Two coupled cycles refill the aim-set:

1. **Upstream cycle** — new material in predication-categories (concepts, objects, morphisms,
   theorems, examples) generates realization aims. A corpus atom without a `@realizes`-bound
   Python entity is a gap; closing the gap is the work. The audit tool surfaces the gap; the
   developer implements; the corpus-binding decoration commits the realization.

2. **Downstream cycle** — pyfars and other consumers using pypredcalc as their math floor surface
   missing primitives (e.g., the inbox inquiry on bilattice-valued closure rules over
   `PredicationStore`). Their inquiries become realization aims that often *also* close upstream
   corpus gaps (the answer is usually a corpus atom that wasn't yet realized).

Γ is **Scott-continuous**: each cycle's new aim-set depends on the immediately prior corpus state
plus the immediately prior set of consumer inquiries. The loop never reaches a fixed point as long
as the predication-categories research program is active.

Degeneration of Γ shows up as:
- **Exhaustion of positive heuristic** — the audit reports zero new corpus gaps for an extended
  stretch (Γ has caught up to the corpus's current state, but the corpus has stopped advancing).
- **Drift between code and theory** — `@realizes` slugs no longer resolve, or the audit reports
  corpus atoms whose Python realizations have silently changed semantics. Detection lives in the
  audit tool's parity checks.
- **Downstream stagnation** — no new inquiries from pyfars or predicated-computing for an extended
  stretch, indicating either the math floor is fully sufficient for current downstream needs (a
  rest state, not degenerate) or downstream has stopped pulling on the floor (degenerate — the
  enterprise's purpose is being eroded).

## Operative Structure O

Seventeen offices total: three governing, seven functional, seven subpackage specialists.
See [`offices/_index.md`](offices/_index.md) for the full layout.

**Governing offices** (parallel under the captain):
[`steward`](offices/pypredcalc-steward.md),
[`executive-officer`](offices/pypredcalc-executive-officer.md),
[`corpus-tracker`](offices/pypredcalc-corpus-tracker.md).

**Functional offices** (process labor):
[`corpus-reader`](offices/pypredcalc-corpus-reader.md),
[`developer`](offices/pypredcalc-developer.md),
[`test-author`](offices/pypredcalc-test-author.md),
[`quality-officer`](offices/pypredcalc-quality-officer.md),
[`records-officer`](offices/pypredcalc-records-officer.md),
[`release-officer`](offices/pypredcalc-release-officer.md),
[`docs-officer`](offices/pypredcalc-docs-officer.md).

**Subpackage specialist offices** (one per math area, owning their subpackage's
realizations):
[`algebra`](offices/pypredcalc-algebra-specialist.md),
[`predication`](offices/pypredcalc-predication-specialist.md),
[`combinatorics`](offices/pypredcalc-combinatorics-specialist.md),
[`topology`](offices/pypredcalc-topology-specialist.md),
[`lattice`](offices/pypredcalc-lattice-specialist.md),
[`sheaf`](offices/pypredcalc-sheaf-specialist.md),
[`dynamics`](offices/pypredcalc-dynamics-specialist.md).

Pypredcalc is a PyFARS instance — the operational target is `pyfars run pypredcalc/`:
autonomous agentic activity on pypredcalc development dispatched by the substrate
machinery that runs PyFARS. The offices carry powers, duties, privileges, immunities per
the Hohfeldian eightfold (records under [`powers/`](powers/) and [`duties/`](duties/));
their incumbent agents are recorded under [`agents/`](agents/). Skills they provide are
under [`skills/`](skills/).

Incumbency is currently informal — held by the captain plus contracted inference sessions.
Pypredcalc governance is **model-agnostic**: the substrate (PyFARS dispatch) selects which
inference model fulfills any given LLM-backed agent role. The agent records describe the
role's prompt and capabilities; concrete inference selection happens at the substrate layer.
Formal substrate-driven incumbency is deferred to the `pyfars run pypredcalc/` target.

## Relation to the Polity and Ship

RSC Quiescent is the ship. The 561 Group is the polity. PyFARS is the substrate the polity runs
on. PyPredCalc is the math floor PyFARS imports. The chain:

```
ship's function (Black Liberation, Indigenous Sovereignty)
  → polity (561)
    → substrate (PyFARS)
      → math floor (PyPredCalc)
        → theory (predication-categories corpus)
```

PyPredCalc serves the polity's mission *indirectly*, by providing PyFARS with the mathematical
substrate it needs to operate correctly. Pypredcalc's aims do not include polity-level missions
directly; they are bounded by the corpus and the downstream-consumer ask.

## Enterprise Identity

- **Founded**: as `version: 0.1` charter (this enterprise record).
- **Hard core amendment**: requires novation — captain decision recorded as an amendment to the
  charter and this record, with explicit notation of which commitment is being modified and why.
- **Termination**: dissolution of any C — would require captain decision recorded as a novation
  that extinguishes this charter and (if anything) constitutes a new one.
- **Degeneration**: detected by the audit tool's parity checks and the absence of corpus-tracking
  /downstream-inquiry signals over an extended stretch.
