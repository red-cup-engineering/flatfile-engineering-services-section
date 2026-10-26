---
name: "Cutting release"
description: "Composes version bump, CHANGELOG entry, build-config update, and tag-and-publish into one release operation. Use to ship a release after all gates pass."
---

# Cutting release

## Requirements

- Release-officer office.
- All merge gates passing (the quality-officer's `merge-gate: open` for every change in
  the release).
- Corpus-binding audit clean.
- Test suite green (unit + property).
- mypy and ruff clean.

## Steps

1. Determine the version bump category per
   [`follow-stability-tier-rules-on-release`](../duties/follow-stability-tier-rules-on-release.md):
   patch / minor / major.
2. Run [`writing-changelog-narrative`](writing-changelog-narrative.md) — write the
   release entry with leap-narrative at the top.
3. Run [`bump-version`](../powers/bump-version.md) — update `pyproject.toml`.
4. If build-config changes are needed (new optional extra, new build dep), run
   [`updating-build-config`](updating-build-config.md) and
   [`updating-nix-flake`](updating-nix-flake.md).
5. Commit the version bump and CHANGELOG with a release-shape message: `Release vX.Y.Z`.
6. Tag the commit: `git tag vX.Y.Z`.
7. (Future) Publish to PyPI; currently git-tag only.
8. Optionally push to remote.

## Outcomes

A new tag at `vX.Y.Z`; CHANGELOG carries the release entry; downstream consumers can pin
to the tag.
