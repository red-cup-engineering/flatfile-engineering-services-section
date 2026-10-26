---
title: "Governance records use jural-relation schema"
type: decision
slug: governance-records-use-jural-relation-schema
status: committed
date: "2026-05-08"
theory-basis: [jural-relation, normative-operational-layering, office-as-double-settlement]
mirrors: pyfars-governance-records-use-jural-relation-schema
---

# Governance records use jural-relation schema

## What

Power, duty, privilege, and immunity records in `governance/` use `type: jural-relation` as
the primary substrate type, with `kind: power | duty | privilege | immunity` for sub-classification.
Every such record carries `active-holder:`, `passive-party:`, and `scope-action:` per the
`jural-relation` object definition.

## Why

The `jural-relation` theory (predicated-governance) says Hohfeldian normative relations are
first-class substrate entities with a defined cell shape. Using `type: power` or `type: duty`
instead of `type: jural-relation` with a `kind:` sub-classifier:

- Loses the uniform query path: `pyfars list --type jural-relation` is the substrate-correct
  way to retrieve all normative standing records.
- Prevents the closure rules from treating all jural relations uniformly.
- Violates the `normative-operational-layering` commitment that normative predicates share
  a coherent structure.

PyPredCalc is a PyFARS instance — `pyfars run pypredcalc/` is the operational target — so its
governance records share the substrate's record schema with PyFARS's own governance records.
Mirroring the upstream decision keeps the substrate uniform.

## Rules out

- Using `type: power` as the primary classifier on power records.
- Using `type: duty` as the primary classifier on duty records.
- Using `kind: power` without `type: jural-relation`.

## Does not constrain

- How the harness projects jural-relation records to LLM agents (it may flatten them to
  capability lists for prompting).
- Whether skill records, office records, or decision records use `type: jural-relation` —
  they are different entity types and keep their own `type:` values.
- The `scope:` field on office records — that is a PyFARS-specific elaboration alongside
  the theory's `scope-action:`.
