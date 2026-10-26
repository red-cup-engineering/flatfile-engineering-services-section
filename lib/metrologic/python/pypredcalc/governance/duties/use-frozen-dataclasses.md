---
title: "Use frozen dataclasses for value-bearing classes"
type: jural-relation
kind: duty
slug: use-frozen-dataclasses
active-holder: pypredcalc-developer
passive-party: pypredcalc-community
scope-action: define-value-bearing-class
triggering-powers: [write-pypredcalc-source]
required-action: apply-dataclass-frozen-true
enforcement: substrate-violation
rule-type: N→N
theory-basis: [jural-relation, normative-operational-layering]
---

# Use frozen dataclasses for value-bearing classes

Every value-bearing class in core MUST be a `@dataclass(frozen=True)`. Mutation is forbidden;
canonical-form fields go into the dataclass, derived data is a `@property`. Module-level
functions are pure (no global / nonlocal mutation); helpers that look like methods on a class
go on the class.

## Required action

When defining a class that holds data:

```python
@dataclass(frozen=True)
class FiberValuation:
    bilattice: TwistBilattice
    entities: EntitySet
    cells: Mapping[...] = field(default_factory=dict)

    @property
    def support(self) -> frozenset:
        return frozenset(self.cells)
```

Frozen ensures: the instance is hashable, equality is structural, no field can be reassigned
after `__init__`. These properties make the class a *value*, not a *state container*.

## Exceptions

- Exception classes (subclasses of `RuntimeError` / `ImportError`) — not frozen, follow the
  Python exception conventions.
- `BilatticeValue` and similar enums (`Enum` subclass) — already immutable by enum semantics.
- Internal mutable helpers in `_linalg/` and similar private modules where mutation is
  load-bearing for performance (must be marked private with leading underscore on the module
  or class).

## Why this is workflow-tier rather than constitutive

Frozen dataclasses are an operational convention; violating them produces buggy code but not
a violation of the constitutive commitments C1–C4. They're a means to the end of "code that
respects the corpus's value-oriented semantics." If a future case warrants a non-frozen
class for a non-trivial reason, an ADR can amend this duty.
