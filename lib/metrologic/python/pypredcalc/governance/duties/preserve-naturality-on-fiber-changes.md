---
title: "Preserve naturality on fiber changes"
type: jural-relation
kind: duty
slug: preserve-naturality-on-fiber-changes
active-holder: pypredcalc-predication-specialist
passive-party: pypredcalc-community
scope-action: modify-fiber-valuation-operation
triggering-powers: [write-pypredcalc-source]
required-action: produce-naturality-witness-before-commit
enforcement: substrate-violation
rule-type: N→N
theory-basis: [jural-relation, normative-operational-layering]
---

# Preserve naturality on fiber changes

When the predication specialist modifies any operation on `FiberValuation` —
pullback, knowledge-join, twist-product, fusion, residual — the change MUST preserve
𝒞-naturality. The required action is to produce a `NaturalityWitness` over a
representative cross-fiber valuation sample showing the modification's
naturality-square commutes.

## Why specifically this duty

The predication subpackage's whole apparatus rests on 𝒞-naturality. Pullbacks compose,
adjoints satisfy adjunction unit/counit triangles, Beck-Chevalley commutes — all derive
from the underlying 𝒞-naturality of fiber operations. A non-natural operation breaks
the entire calculator surface, not just one method.

## Required action

When modifying any `FiberValuation` operation:

1. Run [`verifying-naturality`](../skills/verifying-naturality.md) on a sample that
   covers the four predicate-category generator classes (specialization, converse,
   subject-projection, object-projection) plus the modified operation.
2. The skill produces a `NaturalityWitness`. Confirm `witness.holds` is True.
3. If `witness.holds` is False, the modification is breaking — either revert, find a
   different approach, or escalate as a corpus gap if the modification is required by a
   corpus update that itself broke naturality.

## Enforcement

Code review during the quality-officer's gate. The specialist's commit message references
the naturality-witness check; a commit modifying fiber operations without that reference
is flagged.
