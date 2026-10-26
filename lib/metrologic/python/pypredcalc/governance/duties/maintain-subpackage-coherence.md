---
title: "Maintain subpackage coherence"
type: jural-relation
kind: duty
slug: maintain-subpackage-coherence
active-holder: any-pypredcalc-subpackage-specialist
passive-party: pypredcalc-community
scope-action: ensure-changes-preserve-subpackage-axioms
triggering-powers: [write-pypredcalc-source]
required-action: verify-subpackage-axioms-on-modification
enforcement: substrate-violation
rule-type: N→N
theory-basis: [jural-relation, normative-operational-layering]
---

# Maintain subpackage coherence

When a subpackage specialist modifies their subpackage, the change MUST preserve the
mathematical axioms that subpackage carries. The duty fires across all seven subpackage
specialists ([algebra](../offices/pypredcalc-algebra-specialist.md),
[predication](../offices/pypredcalc-predication-specialist.md),
[combinatorics](../offices/pypredcalc-combinatorics-specialist.md),
[topology](../offices/pypredcalc-topology-specialist.md),
[lattice](../offices/pypredcalc-lattice-specialist.md),
[sheaf](../offices/pypredcalc-sheaf-specialist.md),
[dynamics](../offices/pypredcalc-dynamics-specialist.md)) with a different per-subpackage
required-action.

## Per-subpackage required action

| Specialist | Axioms to verify on modification |
|---|---|
| Algebra | Bilattice interlacing laws; residuation adjunction; twist-product distributivity. |
| Predication | 𝒞-naturality of fiber operations; quantifier adjunctions; closure-operator axioms; hyperdoctrine B1–B4. |
| Combinatorics | Poset reflexivity / antisymmetry / transitivity; simplicial closure-under-faces. |
| Topology | Open-set topology axioms; Priestley total-order-disconnection. |
| Lattice | Frame axioms (arbitrary joins; finite meets distribute); Heyting implication adjoint. |
| Sheaf | Locality and gluing; cohomology functoriality. |
| Dynamics | Perron-Frobenius primitivity preserved on substitution matrices; classifying-invariant stability under MLD. |

## Required action

When modifying a subpackage:

1. Identify which axioms are at risk — the modification touches structure that those
   axioms apply to.
2. Run the corresponding specialist skill (e.g.,
   [`verifying-bilattice-axioms`](../skills/verifying-bilattice-axioms.md) for algebra)
   on the modified code.
3. Add or update tests under `tests/property/` if the axiom isn't currently covered by
   property tests.
4. Document any axiom check that's intentionally skipped (rare; usually a code-review
   triage item).

## Cross-subpackage friction

When a modification in subpackage X would break an axiom in subpackage Y (because Y
depends on X's invariants), the specialist surfaces it as cross-subpackage friction —
file a triage note for the records-officer to investigate whether the dependency is
documented and whether an ADR governing the boundary is warranted.

## Enforcement

The corresponding specialist skill produces a witness; the witness's `holds` field is the
axiom check. Failure to run the skill, or running it and failing to remediate before
commit, is a substrate violation surfaced during the quality-officer's review.
