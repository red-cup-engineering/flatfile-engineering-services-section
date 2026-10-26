---
kind: tool-flake-contribution
title: "pypredcalc contributions to a parent polity's Nix flake"
description: "What pypredcalc contributes when consumed as a flake input by a parent polity. Schema defined in the polity's `governance/assets/computing/nix-flake.md` (section 13)."

contributes-shell-packages:
  source: "this tool's flake `devShells.${system}.default.nativeBuildInputs`"
  notes: "Provides python313 + pytest + hypothesis + sympy + mkdocs. Auto-merged when a polity task-shell lists `pypredcalc` in `tool-shell-merge` (e.g., the `.#math` task-shell)."

contributes-apps: []
contributes-extra-inputs: []
contributes-nixos-modules: []

related:
  polity-asset: "../../governance/assets/computing/nix-flake.md (in any consuming polity)"
  this-tools-flake: "flake.nix"
  this-tools-index: "_index.md"
---

# pypredcalc — flake contributions

Contribution declaration for pypredcalc into a parent polity's Nix flake. pypredcalc has zero runtime dependencies (exact arithmetic via stdlib `fractions`); the devShell brings the test/docs toolchain. No app or module contributions today — pypredcalc is consumed as a Python library, not a standalone runtime.

See the polity's `governance/assets/computing/nix-flake.md` for the schema and the harness migration status.
