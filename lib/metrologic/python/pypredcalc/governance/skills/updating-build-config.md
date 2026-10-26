---
name: "Updating build config"
description: "Edits pyproject.toml — version, dependencies, optional extras, ruff/mypy config. Use during release prep or when adding an optional extra."
---

# Updating build config

## Requirements

- Release-officer office.
- A justified change to build configuration.

## Steps

1. Identify the change category:
   - **Version bump** — `[project]` `version =` field.
   - **New optional extra** — `[project.optional-dependencies]` field.
   - **Ruff rule set update** — `[tool.ruff]` config.
   - **Mypy config update** — `[tool.mypy]` config.
   - **Build backend / metadata** — top-level `[build-system]` etc.
2. For ruff/mypy rule-set changes, file an ADR-request triage note for the records-officer
   first; rule-set changes are governance.
3. For new runtime deps, verify against
   [`avoid-runtime-deps-in-core`](../duties/avoid-runtime-deps-in-core.md). Hard runtime
   deps require an ADR; optional extras are within the release-officer's discretion.
4. Edit `pyproject.toml`.
5. Verify the build still succeeds: `pip install -e .` or the equivalent in the project's
   build setup.
6. Verify CI configuration aligns: any new optional extra needs a matching CI matrix
   entry if the release-process runs separately on/off the extra.

## Outcomes

`pyproject.toml` updated; build verified; downstream consumers pulling the next release
get the new config.
