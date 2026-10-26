---
title: "Write CHANGELOG narrative"
type: jural-relation
kind: duty
slug: write-changelog-narrative
active-holder: pypredcalc-release-officer
passive-party: pypredcalc-community
scope-action: write-release-narrative
triggering-powers: [write-changelog-entry, publish-release]
required-action: include-leap-narrative-in-math-reader-terms
enforcement: substrate-violation
rule-type: N→N
theory-basis: [jural-relation, normative-operational-layering]
---

# Write CHANGELOG narrative

Every CHANGELOG release entry MUST include a leap-narrative at the top — a 1–3 paragraph
explanation of *what the release adds in math-reader terms*, not just code-reader terms.
The math reader is the corpus consumer, downstream substrate maintainer, or anyone trying
to understand what pypredcalc does mathematically.

## What the leap-narrative says

For a release that adds a calculator surface: "this release turns pypredcalc from a
theorem-checker into a calculator: hyperdoctrine adjoints, closure operators, predication
settling, the Cl 2-monad and its dualized comonad, and parameter-base machinery all become
first-class objects you can compute with."

For a release that adds twist-product fusion antecedents: "this release adds a new shape
of closure-rule antecedent — `v(p)(s,o) ⊙ v(q)(s,o) ≥_t V` — corresponding to the
corpus's `dispatch-as-closure-rule-system` theorem. With this, dispatch eligibility (the
PyFARS use case driving the inquiry) can be expressed as a single rule rather than a
multi-rule decomposition."

The narrative is followed by the conventional "subpackage X / what changed" detail.

## What's NOT a leap-narrative

- "Added 5 functions, fixed 3 bugs, bumped sympy to 1.13." That's a flat changelog. It's
  necessary detail but it's not the narrative.
- A list of corpus slugs realized. The corpus-binding audit captures that mechanically.
- Promotional language ("we're excited to announce…") without mathematical content.

## Enforcement

Code review during release. CHANGELOG entries without a leap-narrative paragraph at the
top are duty-non-fulfillment; the release officer (or another office reading the
CHANGELOG before publishing) flags the absence.
