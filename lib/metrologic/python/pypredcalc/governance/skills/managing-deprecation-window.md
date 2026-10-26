---
name: "Managing deprecation window"
description: "Tracks deprecated names across release cycles to enforce the at-least-one-minor window before removal. Use during release prep."
---

# Managing deprecation window

## Requirements

- Release-officer office.
- The set of deprecated names from prior releases (recorded in CHANGELOG entries).

## Steps

1. List currently-deprecated names: `grep -rn "DeprecationWarning" src/pypredcalc/` plus
   the CHANGELOG history.
2. For each deprecated name, identify:
   - Marking release (when the `DeprecationWarning` was added).
   - Replacement name.
   - Earliest removal release (next major after marking).
3. For the release being prepared:
   - If it's a major release: removals are eligible for deprecated names whose marking
     release was at least one minor ago.
   - If it's a minor or patch: no removals; verify all deprecated names still emit the
     warning.
4. Record removals in the CHANGELOG entry, referencing the marking release.

## Outcomes

A clean deprecation ledger going into the release. Premature removals (deprecated and
removed in the same release, or with no minor gap) are caught and either delayed or
escalated as a substrate violation.
