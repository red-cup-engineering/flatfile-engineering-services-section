"""Cosettling dynamics in their full form.

Realizes corpus objects: `cosettling`, `closure-ordinal`,
`step-n-fixed-point`, `step-n-classifying-invariant`,
`step-n-moduli-substack`, `aperiodic-classifying-invariant`,
`aperiodic-co-classifying-invariant`.

The strict-regime closure-rule case lives in
`pypredcalc.combinatorics.closure_rule.ClosureRuleSystem.cosettling`; this module
is for the transfinite/non-strict generalizations.
"""

from __future__ import annotations


def __getattr__(name: str) -> object:
    raise NotImplementedError(
        f"pypredcalc.dynamics.cosettling.{name} not yet implemented; "
        "see corpus notes objects/cosettling.md and friends"
    )
