---
title: "Return witness for structural claims"
type: jural-relation
kind: duty
slug: return-witness-for-structural-claims
active-holder: pypredcalc-developer
passive-party: pypredcalc-community
scope-action: write-function-answering-structural-claim
triggering-powers: [write-pypredcalc-source]
required-action: return-frozen-dataclass-witness
enforcement: substrate-violation
hard-core: witness-style-structural-returns-commitment
rule-type: N→N
theory-basis: [jural-relation, normative-operational-layering, charter-as-closure-system]
---

# Return witness for structural claims

When a function answers a predication-categorical claim with structure (per-generator data,
per-cell discrepancies, before/after states, intermediate fibers), it MUST return a
frozen-dataclass **witness**, not a bare `bool`.

## Witness conventions

- The class is `@dataclass(frozen=True)` and named `<Claim>Witness`
  (e.g., `NaturalityWitness`, `ClAlgebraWitness`, `BeckChevalleyWitness`).
- Structural fields record evidence (per-cell maps, per-generator checks,
  per-(adjoint, fiber) records).
- A `holds: bool` `@property` reads off the structure.
- `__bool__` returns `self.holds` so `if witness:` and `assert witness` work.
- For compound claims, sub-checks are a tuple; failures expose via `failures` or
  `discrepancy` so callers can localise.

## When this duty applies

It applies to predication-categorical claims with structure. It does NOT apply to:

- Order primitives (`knowledge_leq`, `truth_leq`, `≤` on lattices/frames/posets) — `bool`.
- Set membership (`__contains__`) — `bool`.
- Python protocols (`__eq__`) — `bool`.
- Flat numerical predicates (`Matrix.is_square`, `is_quantifier_free`) — `bool`.

At those layers the bool *is* the structure; there is no richer object to witness with.

## Test before writing

Before writing a function that returns yes/no for a non-floor claim, ask: does the answer
have structure (per-generator data, per-cell discrepancies, before/after states, intermediate
fibers)? If yes, return a witness. If no, return `bool`.

## What this rules out

- Returning `bool` for a non-floor claim and providing a separate "discrepancy" function the
  caller has to call afterwards. The witness is one return; calls are not split.
- Returning a tuple `(holds: bool, evidence: ...)` — tuple-returns lose typing and witness-
  type invariants; use a `@dataclass`.
- Returning a *mutable* witness — frozen dataclasses ensure equality and hashing semantics.
- Mixing the witness pattern with a `as_witness=True` flag at the same callsite.

## Enforcement

Code review during dispatch closure; CI lint can flag `bool`-returning functions whose
docstrings describe "naturality", "quiescence", "Beck-Chevalley", or other corpus-claim
keywords without the corresponding witness type.
