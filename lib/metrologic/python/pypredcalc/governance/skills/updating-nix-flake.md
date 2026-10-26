---
name: "Updating Nix flake"
description: "Edits flake.nix and flake.lock to align Nix-side build with pyproject.toml. Use when build dependencies change or when nixpkgs needs pinning."
---

# Updating Nix flake

## Requirements

- Release-officer office.
- A change to `pyproject.toml` that affects build (new dep, new extra) OR a flake input
  refresh.

## Steps

1. For dep changes: update `flake.nix`'s build expression to match the new `pyproject.toml`.
2. For flake-input refresh (e.g., updating nixpkgs pin):
   - `nix flake update` to refresh `flake.lock`.
   - Or `nix flake lock --update-input <input>` for a targeted update.
3. Verify the flake builds: `nix build .#default` or equivalent.
4. Verify dev-shell works: `nix develop -c true` to enter and exit the dev shell.
5. Commit `flake.nix` and `flake.lock` together — they must be coherent.

## Outcomes

`flake.nix` and `flake.lock` aligned with `pyproject.toml` and downstream consumers' Nix
needs.
