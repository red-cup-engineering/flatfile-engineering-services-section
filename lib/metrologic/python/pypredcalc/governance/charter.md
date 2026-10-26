---
title: "PyPredCalc Enterprise Charter"
type: charter
slug: pypredcalc-charter
status: active
version: "0.1"
theory-basis: [enterprise, charter-as-closure-system, normative-operational-layering]
---

# PyPredCalc Enterprise Charter

This charter constitutes PyPredCalc as an enterprise `(C, Γ, O)` per the PredWork `enterprise`
definition. It is the closure-rule system whose rules tier IS the enterprise's hard core C.
Amendment of the rules tier is amendment of the enterprise itself and requires novation:
the captain ratifies, with explicit notation of what changes and why.

PyPredCalc is a python math library — and a PyFARS instance. The operational target is
`pyfars run pypredcalc/`: autonomous agentic activity on pypredcalc development, dispatched
by the same substrate machinery that runs PyFARS. So pypredcalc carries the full agential
governance apparatus: offices, powers, duties, privileges, immunities, skills, agents — the
Hohfeldian eightfold of jural relations applied to library development.

This charter is smaller in scope than [PyFARS's charter](../../platform/pyfars/governance/charter.md)
(no heartbeat, no federation, no agential-self-generation as an objective) but uses the same
governance machinery, because pypredcalc is dispatched by that machinery.

---

## Rules Tier — Hard Core C

These four commitments are constitutive. Abandoning any one of them would terminate PyPredCalc
as this enterprise and constitute a new enterprise in its place. See
[`enterprise.md`](enterprise.md) for the full framing of each.

### C1 — Corpus Realization Binding

Every Python class, function, or method that realizes an entity in the predication-categories
corpus carries an `@realizes("type/slug")` decoration. The binding direction is **Python → theory**:
PyPredCalc is authoritative for which Python symbol realizes which corpus atom. The audit at
`governance/skills/running-corpus-binding-audit/audit.py` walks the codebase and verifies every slug resolves to a real
corpus markdown file. PyPredCalc *is* the Python realization of the predication-categories theory;
abandoning the binding is abandoning the purpose.

### C2 — Pure-Math Substrate

All arithmetic in core code uses `fractions.Fraction` for exact computation. No floating-point in
core. No runtime dependencies beyond the Python standard library. The optional `[symbolic]` extra
brings `sympy` for exact algebra beyond the rationals; sympy is *never* a hard dependency.

### C3 — Witness-Style Structural Returns

Predication-categorical claims with structure (per-generator data, per-cell discrepancies,
before/after states, intermediate fibers) return frozen-dataclass **witnesses**. The witness's
structural fields are authoritative; `holds: bool` and `__bool__` are convenience accessors.
Floor-level predicates (order primitives, set membership, Python protocols, flat numerical
predicates) stay `bool` — at that layer the bool is the structure.

### C4 — Math Floor for Substrates

PyPredCalc is the math floor that PyFARS and other predicated-computing realizations import.
Public API stability matters: downstream substrates depend on it. Breaking changes follow
documented deprecation; new public surface gets corpus-binding decorations before it ships.

---

## Guidelines Tier — Current Operating Strategy

Strong operating preferences reflecting the current phase of development. Changing them is a
governance decision (a new ADR), but not novation.

### G1 — Subpackage layout per math area

One subpackage per math area: `algebra`, `predication`, `combinatorics`, `topology`, `lattice`,
`sheaf`, `dynamics`. Internal helpers (Fraction-native linear algebra) live in `_linalg`
(underscore prefix marks it private). Each subpackage's `__init__.py` declares its public API
via explicit re-exports; nothing is auto-discovered.

### G2 — Frozen dataclasses and pure functions

Every value-bearing class is a `@dataclass(frozen=True)`. Mutation is forbidden; canonical-form
fields go into the dataclass, derived data is a `@property`. Module-level functions are pure
(no global / nonlocal mutation). Helpers that look like methods on a class go on the class.

Exceptions: exception classes (subclasses of `RuntimeError` / `ImportError`) and
`BilatticeValue` (`Enum` subclass).

### G3 — Type-checking and lint

`mypy --strict` against `src/pypredcalc`. Ruff lint with the rules enumerated in `pyproject.toml`.
Both clean before a release ships.

### G4 — Test discipline

`pytest` suite under `tests/`, with hypothesis-driven property tests under `tests/property/`.
Branch coverage floor is captured in CI; new public surface ships with both unit tests and
(where the structure warrants) property tests.

### G5 — Stub modules name their corpus reference

A module that corresponds to a corpus entity but is not yet implemented raises
`NotImplementedError` in its public functions, with a docstring naming the corpus reference. The
docstring is the contract: if the module ever ships, it ships realizing the named entity.

---

## Preferences Tier — Convenience and Style

Captain working preferences. Any contributor may update them without governance review.

- New aggregate types in `predication/` get an `_index.md`-equivalent entry in the subpackage
  docstring (the docstring's "Realized" list).
- CHANGELOG entries describe what changed in terms the math reader can follow, not just the
  implementation reader. The leap-narrative at the top of a release entry (e.g., "this release
  adds the calculator surface") matters.
- `pyfars validate` is run on touched files; diagnostics are filtered to files actually changed.

---

## Instructions Tier — Operating Procedures

- Commit messages reference the corpus-binding slug or the inbox inquiry slug when the change is
  driven by one. This makes the corpus-tracking-loop's effects auditable.
- Inbox inquiries (`work/inbox/`) get a status update and an answer section in the file when
  resolved; not moved out of the inbox unless the captain says so.
- Decisions that constrain future work go in `governance/decisions/` as ADRs (What / Why /
  Rules-out / Does-not-constrain).
- Specifications that bind module shape go in `governance/specifications/`.

---

## Generative Mechanism Γ

The **corpus-tracking loop** — see [`enterprise.md`](enterprise.md) for the full description.
Two coupled cycles refill the aim-set: upstream (corpus advances → realization gaps) and
downstream (pyfars / predicated-computing inquiries → calculator gaps). Γ is Scott-continuous;
each cycle's aims depend on the immediately prior state.

---

## Operative Structure O

The deck has one corridor; off it, rooms where work happens. Three offices govern; seven
do process labor; seven specialize per subpackage. See [`offices/`](offices/) for full
records.

**Governing offices** (presiding over C, Γ, O; in parallel under the captain):

- [`pypredcalc-steward`](offices/pypredcalc-steward.md) — guards C; presides over novation;
  installs personnel.
- [`pypredcalc-executive-officer`](offices/pypredcalc-executive-officer.md) — routes inbox;
  dispatches work; closes execution loops.
- [`pypredcalc-corpus-tracker`](offices/pypredcalc-corpus-tracker.md) — watches the corpus;
  identifies realization gaps; runs the corpus-binding audit.

**Functional offices** (process labor):

- [`pypredcalc-corpus-reader`](offices/pypredcalc-corpus-reader.md) — deeply reads atoms,
  produces realization briefs.
- [`pypredcalc-developer`](offices/pypredcalc-developer.md) — implements realizations.
- [`pypredcalc-test-author`](offices/pypredcalc-test-author.md) — writes unit and property
  tests.
- [`pypredcalc-quality-officer`](offices/pypredcalc-quality-officer.md) — mypy/ruff,
  review, merge gating.
- [`pypredcalc-records-officer`](offices/pypredcalc-records-officer.md) — governance/work
  records.
- [`pypredcalc-release-officer`](offices/pypredcalc-release-officer.md) — version,
  CHANGELOG, deprecation, build/CI/nix.
- [`pypredcalc-docs-officer`](offices/pypredcalc-docs-officer.md) — prose documentation.

**Subpackage specialist offices** (the labs):

- [algebra](offices/pypredcalc-algebra-specialist.md),
  [predication](offices/pypredcalc-predication-specialist.md),
  [combinatorics](offices/pypredcalc-combinatorics-specialist.md),
  [topology](offices/pypredcalc-topology-specialist.md),
  [lattice](offices/pypredcalc-lattice-specialist.md),
  [sheaf](offices/pypredcalc-sheaf-specialist.md),
  [dynamics](offices/pypredcalc-dynamics-specialist.md) — each owns one subpackage's
  realizations and tests.

Authority chain: `561 polity → captain (emsenn) → pypredcalc-steward → pypredcalc-executive-officer → functional & specialist offices`.
The corpus-tracker operates in parallel with the steward and XO under the captain, not
through the XO.

The full deontic profile of each office (powers, duties, privileges, immunities, provided
skills) is in the office record. The corresponding jural-relation records live in
[`powers/`](powers/) and [`duties/`](duties/); skill records in [`skills/`](skills/);
agent incumbents in [`agents/`](agents/).

Incumbency is currently informal — held by the captain plus contracted inference sessions.
Formal substrate-driven incumbency is deferred to the `pyfars run pypredcalc/` operational
target.

---

## Enterprise Identity

- **Founded**: as `version: 0.1` charter (this record).
- **Hard core amendment**: requires novation per `enterprise` theory.
- **Termination**: dissolution of any C — captain decision recorded as a novation extinguishing
  this charter.
- **Degeneration**: detected by the audit tool's parity checks and downstream-inquiry signals.
