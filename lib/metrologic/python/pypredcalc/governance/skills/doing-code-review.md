---
name: "Doing code review"
description: "Reads a diff and produces a review verdict — approve or request-revision. Use during merge-gating after type-check and lint pass."
---

# Doing code review

## Requirements

- Quality-officer office.
- A diff to review (commit, branch, in-flight work product).
- mypy and ruff already clean (these are precursor gates).

## Steps

1. Read the diff in full. For each new or modified entity:
   - Verify `@realizes` decoration if it realizes a corpus atom.
   - Verify the docstring cites the corpus reference per
     [`realize-from-corpus-before-coding`](../duties/realize-from-corpus-before-coding.md).
   - Verify witness pattern for structural claims (frozen dataclass with `holds: bool`
     and `__bool__`).
   - Verify frozen dataclasses for value-bearing classes.
   - Verify Fraction / int arithmetic; flag any `float`.
   - Verify stdlib-only imports; flag any third-party runtime dep.
2. For the test surface, verify:
   - Realization-claim test exists for each new public name.
   - Property test under `tests/property/` for new structural claims.
3. For the CHANGELOG, verify the leap-narrative is present if the change is release-
   eligible.
4. Compose the verdict:
   - **Approve** — no issues; merge gate open.
   - **Request revision** — file via
     [`request-revision`](../powers/request-revision.md) with each issue named.

## Outcomes

A formal review verdict. Approve unblocks the merge gate; request-revision blocks until
the developer remediates and the verdict is updated.
