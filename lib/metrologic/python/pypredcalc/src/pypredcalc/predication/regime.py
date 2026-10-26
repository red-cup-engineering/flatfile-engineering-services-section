"""Typed four-regime certificates for predication settling.

The corpus four-regime dichotomy classifies a settling by the closure
ordinal ``κ`` of its closure endofunctor. PyPredCalc cannot compute
arbitrary transfinite closure ordinals, but it can carry the theorem's
load-bearing data explicitly: finiteness of ``(L, E, C)``, whether the
closure is Scott-continuous, and the cofinality assumption for the state
space. This module turns that data into a typed certificate instead of a
loose runtime string.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Literal

from .._realizes import realizes

StateSpaceCofinality = Literal["finite", "countable", "uncountable", "unknown"]
RuleLanguageFragment = Literal["quantifier-free", "with-forall-blocks"]


class PredicationRegimeName(StrEnum):
    """The four corpus regimes, plus one explicit unresolved non-Scott case."""

    STRICT = "strict"
    SCOTT_CONTINUOUS = "scott-continuous"
    TRANSFINITE_BOUNDED = "transfinite-bounded"
    APERIODIC = "aperiodic"
    TRANSFINITE_BOUNDED_OR_APERIODIC = "transfinite-bounded-or-aperiodic"


class ClosureOrdinalStratum(StrEnum):
    """Ordinal stratum of ``κ`` in the four-regime theorem."""

    FINITE = "<omega"
    OMEGA = "omega"
    COUNTABLE_TRANSFINITE = "omega<kappa<omega_1"
    UNCOUNTABLE_OR_ABOVE = "omega_1<=kappa"
    UNRESOLVED_NON_SCOTT = "omega<kappa, cofinality unresolved"


@dataclass(frozen=True)
class PredicationBaseFiniteness:
    """Finiteness of the value lattice, entity set, and predicate category."""

    finite_lattice: bool
    finite_entities: bool
    finite_predicate_category: bool

    @property
    def all_finite(self) -> bool:
        return (
            self.finite_lattice
            and self.finite_entities
            and self.finite_predicate_category
        )


@realizes("theorems/four-regime-dichotomy")
@dataclass(frozen=True)
class PredicationRegimeCertificate:
    """The theorem-side regime classification for a settling context."""

    base: PredicationBaseFiniteness
    scott_continuous: bool
    state_space_cofinality: StateSpaceCofinality

    def __post_init__(self) -> None:
        if self.state_space_cofinality not in {
            "finite",
            "countable",
            "uncountable",
            "unknown",
        }:
            raise ValueError(
                "state_space_cofinality must be one of: "
                "'finite', 'countable', 'uncountable', 'unknown'"
            )

    @property
    def regime(self) -> PredicationRegimeName:
        if self.base.all_finite:
            return PredicationRegimeName.STRICT
        if self.scott_continuous:
            return PredicationRegimeName.SCOTT_CONTINUOUS
        if self.state_space_cofinality == "uncountable":
            return PredicationRegimeName.APERIODIC
        if self.state_space_cofinality == "unknown":
            return PredicationRegimeName.TRANSFINITE_BOUNDED_OR_APERIODIC
        return PredicationRegimeName.TRANSFINITE_BOUNDED

    @property
    def closure_ordinal_stratum(self) -> ClosureOrdinalStratum:
        regime = self.regime
        if regime is PredicationRegimeName.STRICT:
            return ClosureOrdinalStratum.FINITE
        if regime is PredicationRegimeName.SCOTT_CONTINUOUS:
            return ClosureOrdinalStratum.OMEGA
        if regime is PredicationRegimeName.TRANSFINITE_BOUNDED:
            return ClosureOrdinalStratum.COUNTABLE_TRANSFINITE
        if regime is PredicationRegimeName.APERIODIC:
            return ClosureOrdinalStratum.UNCOUNTABLE_OR_ABOVE
        return ClosureOrdinalStratum.UNRESOLVED_NON_SCOTT

    @property
    def rule_language_fragment(self) -> RuleLanguageFragment:
        return (
            "quantifier-free"
            if self.scott_continuous
            else "with-forall-blocks"
        )

    @property
    def finite_runtime_is_complete(self) -> bool:
        """True exactly in the strict regime."""
        return self.regime is PredicationRegimeName.STRICT

    @property
    def requires_limit_completion(self) -> bool:
        """Whether the theorem places stabilization at or beyond ``ω``."""
        return self.regime is not PredicationRegimeName.STRICT

    @property
    def requires_transfinite_runtime(self) -> bool:
        return self.regime in {
            PredicationRegimeName.TRANSFINITE_BOUNDED,
            PredicationRegimeName.APERIODIC,
            PredicationRegimeName.TRANSFINITE_BOUNDED_OR_APERIODIC,
        }

    @property
    def endpoint_snapshot_sufficient(self) -> bool:
        """Strict and Scott-continuous regimes have no H1 obstruction."""
        return self.regime in {
            PredicationRegimeName.STRICT,
            PredicationRegimeName.SCOTT_CONTINUOUS,
        }

    @property
    def h1_may_obstruct(self) -> bool:
        return not self.endpoint_snapshot_sufficient


def derive_regime_certificate(
    *,
    finite_lattice: bool,
    finite_entities: bool,
    finite_predicate_category: bool,
    scott_continuous: bool,
    state_space_cofinality: StateSpaceCofinality = "finite",
) -> PredicationRegimeCertificate:
    """Build the four-regime certificate from theorem hypotheses."""
    return PredicationRegimeCertificate(
        base=PredicationBaseFiniteness(
            finite_lattice=finite_lattice,
            finite_entities=finite_entities,
            finite_predicate_category=finite_predicate_category,
        ),
        scott_continuous=scott_continuous,
        state_space_cofinality=state_space_cofinality,
    )


__all__ = [
    "ClosureOrdinalStratum",
    "PredicationBaseFiniteness",
    "PredicationRegimeCertificate",
    "PredicationRegimeName",
    "RuleLanguageFragment",
    "StateSpaceCofinality",
    "derive_regime_certificate",
]
