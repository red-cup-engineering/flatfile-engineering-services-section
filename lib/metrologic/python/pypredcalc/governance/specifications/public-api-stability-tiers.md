---
title: "Public API stability tiers"
type: specification
slug: public-api-stability-tiers
status: active
version: "0.1"
hard-core: math-floor-for-substrates-commitment
---

# Public API stability tiers

## Why this exists

PyPredCalc is the math floor that PyFARS and other predicated-computing realizations import
(charter C4). Downstream substrates depend on it; breaking changes must be predictable.

But pypredcalc is also pre-1.0 research-active code. Some of its surface is well-settled and
load-bearing for downstream; some is provisional and may need to change as the corpus
advances. A single stability promise across the whole API would either freeze provisional
work prematurely or signal "anything may break" to downstream — both wrong.

This specification defines two tiers and the rules for each.

## The two tiers

Every public name in PyPredCalc — every entity exported from a subpackage's `__init__.py` —
has a stability tier:

### Stable

A Stable name follows semver compatibility within the current major version:

- **Patch releases (0.3.0 → 0.3.1)**: no behavioural changes; bugfixes only.
- **Minor releases (0.3.0 → 0.4.0)**: additive only — new methods, new optional parameters,
  new modules. Existing signatures and semantics unchanged.
- **Major releases (0.x → 1.x, or future 1.x → 2.x)**: breaking changes permitted, with at
  least one minor-release deprecation window.

A name being Stable means: pyfars can import it and rely on its contract for the duration of
the major version line.

### Provisional

A Provisional name **may break in any minor release**, with a CHANGELOG entry calling out the
break. Provisional surface is research-active material whose shape is still settling.

Provisional names appear in the public API because:

- Downstream consumers want to experiment with the new shape, even knowing it may change.
- Forcing the name into a private `_internal/` location while it stabilises creates a churn
  cost (renames + re-exports) when it does stabilise.
- The corpus-tracking loop produces new realizations regularly; not every realization is
  ready to be Stable on first ship.

A Provisional name being moved to Stable is a deliberate decision; it gets a CHANGELOG
"Promoted to Stable" entry and a corresponding governance decision (an ADR) when it
genuinely binds future work.

### How to tell

The current pypredcalc public API is *all Provisional* until the captain moves a name to
Stable. The library is at version 0.3 — pre-1.0 — and the convention until 1.0 ships is:

> Until version 1.0, every public name is Provisional unless explicitly marked Stable in
> [`stability-marks.md`](stability-marks.md) (a sibling specification, to be written when the
> first Stable promotions happen).

When stability marks become substantial, this specification will be amended to point at the
marks file as the authoritative list. Until then, downstream consumers should assume
Provisional and version-pin pypredcalc to a specific minor release.

## What "breaking" means

Concrete operations that count as breaking changes for a Stable name (and therefore are
permitted only in a major release):

- Removing the name.
- Renaming the name.
- Removing a parameter, or changing a parameter from optional to required.
- Changing a parameter's type to a non-superset.
- Changing return type to a non-subtype.
- Changing observable behaviour (e.g., changing the iteration order of a collection-returning
  method, when callers might depend on the order).
- Removing a value from an enum.
- Changing the equality semantics of a frozen dataclass (e.g., adding a field that affects
  `__eq__`).

For a Provisional name, the same operations are permitted in any minor release with a
CHANGELOG entry.

Adding a new field to a frozen dataclass is *not* breaking if the field has a default. Adding
a new optional parameter is *not* breaking. Adding a new method is *not* breaking. Adding a
new exported name is *not* breaking.

## Deprecation discipline (Stable surface only)

When a Stable name needs to be removed in a future major release:

1. Mark the name with a `DeprecationWarning` no later than the prior minor release.
2. CHANGELOG entry naming the deprecation, with the replacement.
3. The replacement is exported and Stable in the same minor release.
4. The deprecated name is removed in the major release.

Provisional names do not require deprecation cycles; document the change in CHANGELOG.

## Audit

The corpus-binding audit (`governance/skills/running-corpus-binding-audit/audit.py`) does not check stability tiers
today; if downstream usage grows enough that the distinction matters operationally, an audit
extension would be a future specification.

## Source-of-truth ordering

This specification is bound by:

1. The corpus (predication-categories) — math content the API exposes.
2. The charter's hard-core C4 (math floor for substrates).
3. This specification.
4. Conventions, decisions, code.

Amending this specification requires a decision (ADR) in [`../decisions/`](../decisions/) that
supersedes the current shape.
