"""Typed four-regime certificates for predication settling."""

from __future__ import annotations

from pypredcalc import (
    ClosureOrdinalStratum,
    PredicationRegimeName,
)
from pypredcalc import (
    PredicationRegimeCertificate as TopLevelCertificate,
)
from pypredcalc import (
    derive_regime_certificate as top_level_derive,
)
from pypredcalc.predication import (
    PredicationRegimeCertificate,
    derive_regime_certificate,
)
from pypredcalc.predication.closure_rule import CellAtom, FiberClosureRule, Var
from pypredcalc.predication.closure_rule_system import FiberClosureRuleSystem

T_VAL = (1, 0)


def test_regime_certificate_is_realized_and_exported() -> None:
    certificate = derive_regime_certificate(
        finite_lattice=True,
        finite_entities=True,
        finite_predicate_category=True,
        scott_continuous=True,
    )

    assert isinstance(certificate, PredicationRegimeCertificate)
    assert TopLevelCertificate is PredicationRegimeCertificate
    assert top_level_derive is derive_regime_certificate
    assert (
        "theorems/four-regime-dichotomy"
        in vars(PredicationRegimeCertificate)["__realizes__"]
    )


def test_four_regime_boundaries_are_typed() -> None:
    strict = derive_regime_certificate(
        finite_lattice=True,
        finite_entities=True,
        finite_predicate_category=True,
        scott_continuous=False,
    )
    scott = derive_regime_certificate(
        finite_lattice=False,
        finite_entities=True,
        finite_predicate_category=True,
        scott_continuous=True,
    )
    bounded = derive_regime_certificate(
        finite_lattice=False,
        finite_entities=True,
        finite_predicate_category=True,
        scott_continuous=False,
        state_space_cofinality="countable",
    )
    aperiodic = derive_regime_certificate(
        finite_lattice=False,
        finite_entities=True,
        finite_predicate_category=True,
        scott_continuous=False,
        state_space_cofinality="uncountable",
    )

    assert strict.regime is PredicationRegimeName.STRICT
    assert strict.closure_ordinal_stratum is ClosureOrdinalStratum.FINITE
    assert strict.finite_runtime_is_complete
    assert scott.regime is PredicationRegimeName.SCOTT_CONTINUOUS
    assert scott.closure_ordinal_stratum is ClosureOrdinalStratum.OMEGA
    assert scott.requires_limit_completion
    assert not scott.requires_transfinite_runtime
    assert bounded.regime is PredicationRegimeName.TRANSFINITE_BOUNDED
    assert bounded.closure_ordinal_stratum is (
        ClosureOrdinalStratum.COUNTABLE_TRANSFINITE
    )
    assert bounded.requires_transfinite_runtime
    assert bounded.h1_may_obstruct
    assert aperiodic.regime is PredicationRegimeName.APERIODIC
    assert aperiodic.closure_ordinal_stratum is (
        ClosureOrdinalStratum.UNCOUNTABLE_OR_ABOVE
    )


def test_rule_system_profile_carries_certificate() -> None:
    rule = FiberClosureRule(
        free_vars=("y",),
        forall_vars=("x",),
        antecedent=CellAtom("R", Var("x"), Var("y"), T_VAL),
        consequent=CellAtom("S", Var("y"), Var("y"), T_VAL),
    )
    system = FiberClosureRuleSystem(rules=(rule,))

    profile = system.regime_profile(
        finite_entities=False,
        state_space_cofinality="unknown",
    )

    assert profile.regime == "transfinite-bounded-or-aperiodic"
    assert profile.certificate.regime is (
        PredicationRegimeName.TRANSFINITE_BOUNDED_OR_APERIODIC
    )
    assert profile.certificate.requires_transfinite_runtime

