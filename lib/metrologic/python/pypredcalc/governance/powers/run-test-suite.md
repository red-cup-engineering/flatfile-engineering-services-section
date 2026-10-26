---
title: "Run test suite"
type: jural-relation
kind: power
slug: run-test-suite
active-holder: [pypredcalc-test-author, pypredcalc-developer, pypredcalc-quality-officer, pypredcalc-release-officer]
passive-party: pypredcalc-community
scope-action: invoke-pytest
correlate-of: liability
enables-skills: [running-test-suite]
theory-basis: [jural-relation, normative-operational-layering]
---

# Run test suite

Multiple offices may invoke `pytest` against the test suite for different purposes:

- **Test author**: runs after writing tests to confirm green; iterates on test design.
- **Developer**: runs after writing a realization to confirm tests pass before commit.
- **Quality officer**: runs as a merge-gating check.
- **Release officer**: runs as a release-gating check.

The power itself is shared; the skills exercising it differ per office.

## Effect

Pytest invocation produces pass/fail output. Red tests block downstream powers
(merge-gating, release-gating) per the duties on each holder office.
