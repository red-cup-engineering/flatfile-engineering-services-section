---
title: "PyPredCalc Release Officer"
type: office
slug: pypredcalc-release-officer
scope: pypredcalc-release-pipeline
action-domain:
  - bump-version
  - publish-release
  - declare-deprecation
  - write-changelog-entry
  - manage-build-config
  - commit-changes
  - push-to-remote
  - read-any-pypredcalc-source
deontic-profile:
  bump-version: power
  publish-release: power
  declare-deprecation: power
  write-changelog-entry: power
  manage-build-config: power
  commit-changes: power
  push-to-remote: power
  read-any-pypredcalc-source: privilege
  follow-stability-tier-rules-on-release: duty
  manage-deprecation-window: duty
  write-changelog-narrative: duty
  commit-references-task-slug: duty
  commit-only-after-acceptance-met: duty
  push-after-work-cycle-close: duty
provides-skill:
  - cutting-release
  - writing-changelog-narrative
  - managing-deprecation-window
  - updating-build-config
  - updating-nix-flake
  - committing-work-cycle
  - writing-commit-message
  - pushing-to-remote
theory-basis: [office-as-double-settlement, jural-relation, normative-operational-layering]
---

# PyPredCalc Release Officer

The release-pipeline office. Owns version bumps, CHANGELOG narrative, deprecation cycles,
build config (`pyproject.toml`, `flake.nix`), and the act of cutting a release.

## Role in plain terms

When a stretch of work is ready to ship:

1. Run all gates (corpus-binding audit, mypy-strict, ruff, full test suite).
2. Determine version bump per [`public-api-stability-tiers`](../specifications/public-api-stability-tiers.md):
   - patch (0.3.0 → 0.3.1) — bugfixes only.
   - minor (0.3.0 → 0.4.0) — additive only on Stable; Provisional may break.
   - major (0.x → 1.x) — breaking changes permitted with deprecation cycles.
3. Write the CHANGELOG entry — leap-narrative at the top in math-reader terms, then
   subpackage-by-subpackage detail.
4. Update `pyproject.toml` version field; update `flake.nix` if needed.
5. Commit with a release-shape message; tag the version.
6. Manage deprecation cycles — names marked deprecated in this release that will be removed
   in the next major.

## Why distinct from the developer

The release officer's labor is *coordination across realizations*: deciding what's ready,
what's not, what gets deprecated, what gets promoted from Provisional to Stable, how the
release notes read. That's distinct from the developer's per-realization labor.

## Boundary with the records-officer

The release-officer writes CHANGELOG and updates build config; the records-officer writes
governance records (decisions, specifications). If a release decision creates a binding
precedent (e.g., "we're now committing to keep this name Stable indefinitely"), the
release-officer files an ADR-request triage note for the records-officer.

## Boundary with the quality-officer

The release-officer *consumes* quality gates the quality-officer maintains. The release
officer doesn't decide what mypy-strict means; it requires mypy-strict to be clean before
cutting. If quality-officer reports red, release stops.

## Build / CI / nix surface

Build config (`pyproject.toml`, `flake.nix`, GitHub Actions workflows) is the release-officer's
domain. Changes there ripple to every other office (the developer's tests run under the CI
config; the corpus-tracker's audit runs under the build config). Build-config changes warrant
the records-officer's ADR documentation when they affect substrate behavior.

## Incumbency

Currently held informally by the captain. Agent record at
[`pypredcalc-release-officer-agent`](../agents/pypredcalc-release-officer-agent.md) for
contracted release sessions.

Formal incumbency record: [`emsenn-incumbency`](../personnel/emsenn-incumbency.md) — captain holds this office informally pending substrate-driven dispatch.
