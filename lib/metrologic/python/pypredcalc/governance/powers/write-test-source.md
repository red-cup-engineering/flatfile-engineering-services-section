---
title: "Write test source"
type: jural-relation
kind: power
slug: write-test-source
active-holder: pypredcalc-test-author
passive-party: pypredcalc-community
scope-action: create-or-modify-test-files
scope: tests/
correlate-of: liability
duties:
  - write-realization-claim-test
  - write-property-test-for-structural-claim
enables-skills: [writing-unit-test, writing-property-test, designing-test-fixture]
theory-basis: [jural-relation, normative-operational-layering]
---

# Write test source

The test-author may create or modify files under `tests/` (and `tests/property/`). Tests
co-equal with source for the realization claim — the test exercises the corpus atom's
defining property; without it, the claim is unsubstantiated.

## Scope

`tests/` and `tests/property/`. The test author does NOT hold write power over `src/`
(developer's domain) or `governance/` (records-officer's domain).

## Attached duties

- [`write-realization-claim-test`](../duties/write-realization-claim-test.md) — every
  public realization gets a test that exercises its corpus atom's defining property.
- [`write-property-test-for-structural-claim`](../duties/write-property-test-for-structural-claim.md) —
  structural claims get a hypothesis-driven property test under `tests/property/`.

## Coordination with the developer

The developer holds [`write-pypredcalc-source`](write-pypredcalc-source.md) which
*includes* `tests/` per its office's jurisdiction. In small realizations the same agent
holds both powers; for complex test design, the test-author is a separate session
exercising this scoped power.
