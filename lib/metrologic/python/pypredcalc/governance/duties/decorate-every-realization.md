---
title: "Decorate every realization with @realizes"
type: jural-relation
kind: duty
slug: decorate-every-realization
active-holder: pypredcalc-developer
passive-party: pypredcalc-community
scope-action: write-realizing-python-entity
triggering-powers: [write-pypredcalc-source]
required-action: attach-realizes-decoration
enforcement: substrate-violation
hard-core: corpus-realization-binding-commitment
rule-type: N→N
theory-basis: [jural-relation, normative-operational-layering, charter-as-closure-system]
---

# Decorate every realization with @realizes

Every Python class, function, or method that realizes an entity in the predication-categories
corpus MUST carry an `@realizes("type/slug")` decoration. The decoration is the realization
*claim*; without it, the audit cannot detect the binding and the constitutive commitment C1
(corpus realization binding) is silently violated.

## What counts as a realization

- A new dataclass that realizes a corpus object (e.g.,
  `@realizes("objects/predication-fiber-algebra")`).
- A new function or method that realizes a corpus morphism (e.g.,
  `@realizes("morphisms/twist-product-fusion")`).
- A new function whose return value is the corpus theorem's witness (e.g.,
  `@realizes("theorems/closure-algebra-coalgebra-correspondence")`).

A function whose only purpose is utility (a helper, a private converter) does not realize a
corpus atom and does not need a decoration.

## Required action

When writing a Python entity that realizes a corpus atom:

1. Identify the corpus slug (`type/slug` — e.g., `objects/predication-hyperdoctrine`).
2. Verify the corpus markdown file exists: `theories/.../predication-categories/<type>/<slug>.md`.
3. Apply the decorator: `@realizes("<type>/<slug>")` on the entity.
4. Run the audit (`governance/skills/running-corpus-binding-audit/audit.py`) to confirm the decoration resolves.

For dataclasses, apply `@realizes` *outside* `@dataclass`:

```python
@realizes("objects/twist-product")
@dataclass(frozen=True)
class TwistBilattice: ...
```

## Enforcement

The audit at `governance/skills/running-corpus-binding-audit/audit.py` walks `pypredcalc.src` and resolves every
`@realizes` slug against the corpus tree. Unresolved slugs are violations. The audit also
tracks corpus atoms with no incoming decoration as *gaps* (not violations on the developer
side — gaps are the corpus-tracker's signal that work is needed, not that work was done
wrong).

## Stronger than

This duty is stricter than [`realize-from-corpus-before-coding`](realize-from-corpus-before-coding.md):
the latter requires the developer *consult* the corpus before writing; this duty requires
the developer *bind* the realization in the substrate via decoration. Consultation can be
informal; binding is normative.
