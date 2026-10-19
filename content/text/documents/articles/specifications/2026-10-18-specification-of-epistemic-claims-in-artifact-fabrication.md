---
title: "Specification of epistemic claims in artifact fabrication"
description: "Requirement, behavioral specification and design for the typed epistemic status of every claim an artifact fabrication specification rests on, and for the provenance of every number in it."
date-created: 2026-10-18
type: specification
status: implemented in src/artifact-fabrication.mjs (candidate version 2); tested in test/artifact-fabrication.test.mjs
owner: computer-data-engineering-services-section
keywords:
  - artifact-fabrication
  - epistemic-status
  - measured
  - derived
  - conjectured
  - correctness-by-construction
provenance:
  raised-by: emsenn (the Leader)
  words:
    - "it is an endemic issue for our development that you and other agents basically keep finding excuses to not do things that would actually increase operational capacity, capability, efficiency, or profitability, based on conjecture about the state of things that could just, be measured and decided."
    - "any hardcoded numbers should be a stink for something we can probably derive from modeling."
    - "the rule needs to go WAAAAY higher up like holy shit where is our like requirements, specifications, design, fabrication stuff???"
    - "Epistemically timid about conjecture. Spectacularly reckless about implementation."
---

# Epistemic claims in artifact fabrication

The executable admission is `admitArtifactFabricationSpecification` (with the plan and receipt admissions that bind its digest) in `src/artifact-fabrication.mjs`. This document states what it shall do; the admission, not this prose, is where the law binds. Paths are relative to this repository.

## Requirements

The law has two halves, and a third check of the existing receipt.

1. A conjecture is never a reason. Every claim that a requirement, restriction, parameter or acceptance obligation rests on has a typed status, `measured`, `derived` or `conjectured`. A conjecture may motivate a measurement. It is never the sole ground for refusing, narrowing, deferring or blocking work; a blocking open question that is merely a measurable conjecture becomes a non-blocking measurement obligation, and work proceeds on the best derived estimate.
2. Every number has provenance. A numeric parameter in a requirement, prohibition, constraint or acceptance obligation references a claim. A bare literal is refused, except for a unit or constant that is exact by definition.
3. Implementation claims need execution evidence. A claimed dependency, API or behavior is a measured claim backed by an observed artifact. A realization receipt carries an evidence digest for every projection and every acceptance obligation.

## Behavioral specification

Each statement gives a positive, an alternate and a refusal example. "Admits" means the specification admission returns an `ArtifactFabricationSpecification`; "refuses" means it returns an `ArtifactFabricationSpecificationRefusal` with the stated code and path.

**S1. The admission shall type every claim.** A claim is `ArtifactFabricationClaim@1` with a kind (`parameter`, `world`, `dependency`, `api`, `behavior`), exactly one status, an optional quantity and the basis of its status.
- Positive: a `parameter` claim, status `measured`, quantity `{ value: 4, unit: "s" }` and a measured basis is admitted.
- Alternate: a `world` claim with quantity `null` and a derived basis is admitted.
- Refusal: status `probable` refuses `INVALID_EPISTEMIC_STATUS`.

**S2. A measured claim shall carry its dataset locator, content digest and the derivation that produced the value.**
- Positive: locator `data/queue-depth.jsonl`, digest `sha256:` plus 64 hex digits, derivation `median of the 28 daily depths` is admitted.
- Alternate: the digest is an `ni:` content address; admitted.
- Refusal: a missing locator, a digest that is not a content digest, or an empty derivation refuses `MEASURED_CLAIM_WITHOUT_EVIDENCE`.

**S3. A derived claim shall carry at least one premise and the derivation from them; premises shall resolve and shall not be circular.** A premise is a claim, requirement or constraint identity of this specification, or a `citation` of a cited law or source.
- Positive: a premise on a measured claim plus a citation of a law is admitted.
- Alternate: a premise on another derived claim is admitted; the claim's `groundedOn` lists the conjectures it transitively rests on.
- Refusal: no premises refuses `DERIVED_CLAIM_WITHOUT_PREMISES`; a premise naming no claim, requirement or constraint refuses `UNKNOWN_PREMISE_REFERENCE`; two claims deriving from each other refuse `CIRCULAR_DERIVATION`.

**S4. A conjectured claim shall carry its hypothesis, a measurement plan and the derivation of its best estimate, and the specification shall schedule the measurement.** The plan names the observable, the receiver or instrument that measures it and the decision rule the measurement settles. A conjecture is scheduled when an assay acceptance obligation or an open question names it.
- Positive: a conjecture with a plan and an assay obligation naming it is admitted.
- Alternate: the conjecture is scheduled by a non-blocking open question naming it; admitted.
- Refusal: no plan, or a plan missing its observable, instrument or decision rule, refuses `CONJECTURE_WITHOUT_MEASUREMENT_PLAN`; no estimate derivation refuses `CONJECTURE_WITHOUT_ESTIMATE`; a conjecture no assay or open question names refuses `CONJECTURE_WITHOUT_MEASUREMENT_OBLIGATION`.

**S5. Every numeric parameter of a requirement, prohibition, operational constraint or acceptance obligation shall reference a claim or name a definitionally exact unit or constant, and no clause statement shall carry a bare numeric literal.** A clause declares parameters and places them in its statement as `{{name}}`. A parameter equals the quantity of the claim it names. The definitionally exact set is `DEFINITIONALLY_EXACT_PARAMETERS`.
- Positive: `The gate shall halt after {{stale-seconds}}` with a parameter referencing a measured claim of the same value and unit is admitted.
- Alternate: a parameter naming `seconds-per-minute` with value 60 is admitted.
- Refusal: a parameter with neither a claim nor an exact constant, or a statement reading `halt after 5 seconds`, refuses `PARAMETER_WITHOUT_CLAIM`; a parameter unequal to its claim refuses `PARAMETER_CLAIM_MISMATCH`; an unknown claim refuses `UNKNOWN_CLAIM_REFERENCE`; an unknown `{{name}}` refuses `UNKNOWN_PARAMETER_PLACEHOLDER`; a wrong exact constant refuses `EXACT_PARAMETER_MISMATCH`.

**S6. A prohibition or operational constraint shall name the claims it rests on, and at least one shall not rest on conjecture.**
- Positive: a prohibition resting on a measured claim is admitted.
- Alternate: a prohibition resting on a measured claim and a conjecture is admitted; the conjecture is not the sole ground.
- Refusal: no claim refuses `RESTRICTION_WITHOUT_CLAIM`; only conjectured claims, or derived claims resting on conjecture, refuse `RESTRICTION_GROUNDED_ON_CONJECTURE`.

**S7. A blocking open question that is a measurable conjecture shall be refused.**
- Positive: a non-blocking open question naming a conjecture is admitted as the measurement obligation.
- Alternate: a question naming no claim, or a measured one, that is non-blocking is admitted.
- Refusal: a blocking question naming a conjectured claim, or a derived claim resting on one, refuses `BLOCKED_ON_MEASURABLE_CONJECTURE`; any other blocking question still refuses `BLOCKING_OPEN_QUESTION`.

**S8. A claim of kind `dependency`, `api` or `behavior` shall be measured.**
- Positive: a `dependency` claim measured by a registry response digest is admitted.
- Alternate: a `world` claim may be derived or conjectured.
- Refusal: a derived or conjectured `api` claim refuses `IMPLEMENTATION_CLAIM_NOT_MEASURED`.

**S9. The admission shall version its candidate, and version 1 shall be retired for new candidates.** Version 2 carries claims and binds S1 to S8. A version 1 candidate (the unclaimed form the translators emitted) is refused `LEGACY_CANDIDATE_RETIRED`. A stored version 1 specification is read, not produced: the caller passes the digest it was admitted under as `{ admittedDigest }`, and the candidate re-admits to the same record with the same digest or refuses `ADMITTED_DIGEST_MISMATCH`, so the option cannot admit a new candidate. `findArtifactFabricationEpistemicDebt` lists what a version 1 candidate would be refused for at version 2.
- Positive: a version 2 candidate is admitted; a stored version 1 specification re-admits under its recorded digest, unchanged.
- Alternate: an admitted version 2 specification, with its `specificationDigest` removed, re-admits to the same digest; a `groundedOn` it states must be the one the admission computes, or the claim refuses `GROUNDING_MISMATCH`.
- Refusal: a version 1 candidate without `admittedDigest` refuses `LEGACY_CANDIDATE_RETIRED`; one that does not re-admit to the digest refuses `ADMITTED_DIGEST_MISMATCH`; any other version refuses `UNSUPPORTED_CANDIDATE_VERSION`; a version 2 candidate with a version 1 clause refuses `INVALID_CLAUSE`.

**S10. Plan and receipt admissions shall bind a version 1 or version 2 specification, and a receipt shall carry evidence for every projection and acceptance obligation.**
- Positive: a receipt with a content-addressed evidence record for each projection and obligation is admitted.
- Alternate: the evidence digest is a SHA-256 of the evidence bytes.
- Refusal: a missing evidence record refuses `MISSING_RECEIPT_EVIDENCE`; a digest that is neither refuses `INVALID_EVIDENCE`; a different specification digest refuses `SPECIFICATION_BINDING_MISMATCH`.

## Design

The candidate keeps the existing exact-key, typed-refusal style. Version 2 adds `claims` to the candidate and `parameters` and `claimIds` to requirements, prohibitions, constraints and acceptance obligations (each at version 2), and `claimId` to open questions. Claims are admitted first so that every later clause resolves its references against the admitted set. `groundedOn`, computed by a depth-first pass over derived premises, is the set of conjectures a claim transitively rests on; the restriction and blocking rules read it. The admitted record carries `groundedOn` so a downstream reader needs no recomputation. `summarizeArtifactFabricationClaims` returns the counts by status.

A law or standard constraint cites an external authority and revision and is not scanned for numerals; an operational constraint is. The plan and receipt are unchanged in shape; they bind the specification digest, so both versions pass through them. The Code engine's `qualifySourceBoundArtifactFabrication` additionally checks the source spans of claims.
