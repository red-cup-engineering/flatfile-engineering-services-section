---
name: "Realizing corpus atom as Python"
description: "Given a corpus slug, writes the Python entity, tests, and @realizes decoration that realizes the corpus atom. Use when dispatched a realization-gap task."
---

# Realizing corpus atom as Python

## Requirements

- Developer office.
- A realization-gap task with `corpus-slug: <type/slug>` and `status: dispatched`.

## Steps

1. Read the corpus markdown at
   `theories/.../predication-categories/<type>/<slug>.md` per
   `realize-from-corpus-before-coding`.
2. Identify dependencies (`depends-on:` field). Verify each dependency is already realized
   in pypredcalc; if not, file an
   [`escalate-corpus-gap-found`](../duties/escalate-corpus-gap-found.md) triage note and
   stall.
3. Write the Python entity in the appropriate subpackage. Apply:
   - `@realizes("<type>/<slug>")` decoration (per `decorate-every-realization`).
   - `@dataclass(frozen=True)` if value-bearing (per `use-frozen-dataclasses`).
   - `Fraction` arithmetic if numeric (per `use-fraction-arithmetic-in-core`).
   - Witness return type if structural claim (per `return-witness-for-structural-claims`).
   - Stdlib-only imports (per `avoid-runtime-deps-in-core`).
4. Write unit tests at `tests/test_<module>.py` covering:
   - Basic contract.
   - Edge cases.
   - The realization claim — a test that exercises the corpus atom's defining property.
5. If the entity is a structural claim, add a property test under `tests/property/`.
6. Add the entity to the subpackage's `__init__.py` `__all__` list.
7. Run the test suite and the corpus-binding audit. Both must be clean.
8. Update `CHANGELOG.md` describing the new realization in math-reader terms.
9. Report task completion to the XO.

## Outcomes

A new realized entity in `src/`, with tests, with `@realizes` decoration. The corpus-binding
audit's coverage diff shows one fewer gap. The CHANGELOG carries the realization claim.
