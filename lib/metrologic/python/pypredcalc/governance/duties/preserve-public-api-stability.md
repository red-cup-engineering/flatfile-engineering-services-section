---
title: "Preserve public API stability"
type: jural-relation
kind: duty
slug: preserve-public-api-stability
active-holder: pypredcalc-developer
passive-party: pypredcalc-community
scope-action: modify-public-api-surface
triggering-powers: [write-pypredcalc-source]
required-action: follow-stability-tier-rules
enforcement: substrate-violation
hard-core: math-floor-for-substrates-commitment
rule-type: N→N
theory-basis: [jural-relation, normative-operational-layering, charter-as-closure-system]
---

# Preserve public API stability

When modifying any name exported from a subpackage's `__init__.py`, the developer MUST
follow the stability rules in
[`../specifications/public-api-stability-tiers.md`](../specifications/public-api-stability-tiers.md).
Stable names follow semver compatibility within the major version. Provisional names may
break in any minor release with a CHANGELOG entry.

## Why this is constitutive

C4 (math floor for substrates) requires that pypredcalc be a foundation downstream consumers
can rely on. PyFARS imports pypredcalc; predicated-computing realizations depend on its
shape. Silent breaks corrupt the substrate downstream.

## Required action

When the modification is a public name (in any `__init__.py`'s `__all__` list or otherwise
exported):

1. Determine the current stability tier (Stable / Provisional). Pre-1.0 default is
   Provisional.
2. If Provisional: write the change; add a CHANGELOG entry naming the break.
3. If Stable: the change is breaking-change-eligible only in a major release. Otherwise,
   choose between (a) deprecating the old name in this minor release with a
   `DeprecationWarning` and a replacement, or (b) reformulating the change as additive.

## Categorising "breaking"

Concrete operations that count as breaking:

- Removing or renaming the name.
- Removing a parameter, or making an optional parameter required.
- Changing parameter type to a non-superset.
- Changing return type to a non-subtype.
- Changing observable behaviour callers might depend on (iteration order, error message
  shape, etc.).
- Removing an enum value.
- Changing equality semantics of a frozen dataclass.

Adding a new field with a default, a new optional parameter, a new method, or a new export
is *not* breaking.

## Coordination with the records-officer

Promoting a name from Provisional to Stable is a deliberate decision; it requires an ADR
in [`../decisions/`](../decisions/) and a CHANGELOG "Promoted to Stable" entry. The developer
files an ADR-request triage note; the records-officer drafts the ADR.

## Enforcement

CI runs an API-diff check against the previous release's exported surface. Stable-name
breaks fail CI; Provisional-name breaks pass with a warning that flags the CHANGELOG entry.
