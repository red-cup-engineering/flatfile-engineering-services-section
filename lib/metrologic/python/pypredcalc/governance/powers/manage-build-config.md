---
title: "Manage build config"
type: jural-relation
kind: power
slug: manage-build-config
active-holder: pypredcalc-release-officer
passive-party: pypredcalc-community
scope-action: edit-build-configuration
scope: pyproject.toml, flake.nix, .github/workflows/
correlate-of: liability
enables-skills: [updating-build-config, updating-nix-flake]
theory-basis: [jural-relation, normative-operational-layering]
---

# Manage build config

The release officer may edit pypredcalc's build configuration:

- `pyproject.toml` — package metadata, dependencies, optional extras (`[symbolic]`),
  ruff rule set, mypy configuration.
- `flake.nix` and `flake.lock` — Nix flake input pinning, build expression.
- `.github/workflows/` — CI configuration (test runs, release pipelines).

## Coordination

Build-config changes that affect substrate behavior (adding a runtime dependency, changing
the public extras set, modifying the CI gate set) warrant an ADR-request triage note for
the records-officer to author. The release-officer files the ADR-request; the records-
officer drafts the ADR.

## Boundary

Adding a runtime dependency to `pyproject.toml`'s `[project.dependencies]` field is *also*
constrained by [`avoid-runtime-deps-in-core`](../duties/avoid-runtime-deps-in-core.md) on
the developer office. The release officer enforcing build-config does not override that
duty — both apply.
