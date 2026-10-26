"""Finite K4 gauge connection witnesses over predicate categories."""

from __future__ import annotations

from pypredcalc import (
    EntitySet,
    FlatGaugeConnectionWitness,
    GaugeCoboundaryWitness,
    GaugeTwistedReindexingWitness,
    PredicateCategory,
    PredicateSet,
    PredicateSpecialization,
    flat_gauge_connection_witness,
    gauge_coboundary_witness,
    gauge_twisted_reindexing,
    gauge_twisted_reindexing_witness,
    klein_four_action_value,
    klein_four_inverse,
    klein_four_order_profile,
    klein_four_product,
)
from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.fibration import PredicationFibration


def test_klein_four_product_is_xor_group_law() -> None:
    assert klein_four_product("negation", "conflation") == "combined"
    assert klein_four_product("combined", "conflation") == "negation"
    assert klein_four_inverse("combined") == "combined"


def test_trivial_flat_gauge_connection_on_identities() -> None:
    category = PredicateCategory(
        entities=EntitySet.of(["a"]),
        predicates=PredicateSet.of(["R"]),
    )

    witness = flat_gauge_connection_witness(category, max_depth=0)

    assert isinstance(witness, FlatGaugeConnectionWitness)
    assert "objects/gauge-connection" in vars(
        FlatGaugeConnectionWitness
    )["__realizes__"]
    assert "theorems/flat-connections-classified-by-h1" in vars(
        FlatGaugeConnectionWitness
    )["__realizes__"]
    assert witness.holds
    assert witness.holonomy((category.identity("R"),)) == "id"


def test_flat_gauge_connection_checks_predcat_composition_law() -> None:
    entities = EntitySet.of(["a", "b"])
    q_dom = frozenset({("a", "a"), ("a", "b")})
    r_dom = frozenset({("a", "a")})
    f = PredicateSpecialization(source="r", target="q", sub_support=r_dom)
    g = PredicateSpecialization(source="q", target="p", sub_support=q_dom)
    category = PredicateCategory(
        entities=entities,
        predicates=PredicateSet.of(["p", "q", "r"]),
        generators=(f, g),
        domains={"q": q_dom, "r": r_dom},
    )
    composite = category.compose(g, f)

    witness = flat_gauge_connection_witness(
        category,
        {f: "negation", g: "conflation", composite: "combined"},
        max_depth=2,
    )

    assert witness.holds
    assert witness.value(composite) == "combined"
    assert any(
        check.f == f
        and check.g == g
        and check.composite == composite
        and check.product_value == "combined"
        and check.holds
        for check in witness.composition_checks
    )


def test_flat_gauge_connection_detects_non_cocycle_assignment() -> None:
    entities = EntitySet.of(["a", "b"])
    q_dom = frozenset({("a", "a"), ("a", "b")})
    r_dom = frozenset({("a", "a")})
    f = PredicateSpecialization(source="r", target="q", sub_support=r_dom)
    g = PredicateSpecialization(source="q", target="p", sub_support=q_dom)
    category = PredicateCategory(
        entities=entities,
        predicates=PredicateSet.of(["p", "q", "r"]),
        generators=(f, g),
        domains={"q": q_dom, "r": r_dom},
    )
    composite = category.compose(g, f)

    witness = flat_gauge_connection_witness(
        category,
        {f: "negation", g: "conflation", composite: "id"},
        max_depth=2,
    )

    assert not witness.holds
    assert not witness.cocycle_holds
    assert any(
        check.composite == composite
        and check.composite_value == "id"
        and check.product_value == "combined"
        for check in witness.composition_checks
    )


def test_flat_gauge_connection_detects_non_normalized_identity() -> None:
    category = PredicateCategory(
        entities=EntitySet.of(["a"]),
        predicates=PredicateSet.of(["R"]),
    )
    identity = category.identity("R")

    witness = flat_gauge_connection_witness(
        category,
        {identity: "negation"},
        max_depth=0,
    )

    assert not witness.holds
    assert not witness.identities_hold


def test_gauge_coboundary_witness_checks_zero_cochain_action() -> None:
    entities = EntitySet.of(["a", "b"])
    q_dom = frozenset({("a", "a"), ("a", "b")})
    f = PredicateSpecialization(source="q", target="p", sub_support=q_dom)
    category = PredicateCategory(
        entities=entities,
        predicates=PredicateSet.of(["p", "q"]),
        generators=(f,),
        domains={"q": q_dom},
    )
    source = flat_gauge_connection_witness(
        category,
        {f: "negation"},
        max_depth=1,
    )
    target = flat_gauge_connection_witness(
        category,
        {f: "combined"},
        max_depth=1,
    )

    witness = gauge_coboundary_witness(
        source,
        target,
        {"p": "conflation", "q": "id"},
    )

    assert isinstance(witness, GaugeCoboundaryWitness)
    assert "theorems/flat-connections-classified-by-h1" in vars(
        GaugeCoboundaryWitness
    )["__realizes__"]
    assert witness.holds


def test_k4_action_value_and_order_profile_record_bottom_fixing() -> None:
    bilattice = boolean_twist()

    assert klein_four_action_value("negation", bilattice, (1, 0)) == (0, 1)
    assert klein_four_action_value("conflation", bilattice, (0, 0)) == (1, 1)

    negation = klein_four_order_profile("negation")
    assert negation.reverses_truth_order
    assert negation.preserves_knowledge_order
    assert negation.fixes_knowledge_bottom
    assert negation.graded_operation("truth_join") == "truth_meet"

    conflation = klein_four_order_profile("conflation")
    assert conflation.preserves_truth_order
    assert conflation.reverses_knowledge_order
    assert not conflation.fixes_knowledge_bottom
    assert conflation.graded_operation("knowledge_meet") == "knowledge_join"


def test_gauge_twisted_reindexing_applies_connection_after_pullback() -> None:
    bilattice = boolean_twist()
    entities = EntitySet.of(["a", "b"])
    q_dom = frozenset({("a", "a")})
    f = PredicateSpecialization(source="q", target="p", sub_support=q_dom)
    category = PredicateCategory(
        entities=entities,
        predicates=PredicateSet.of(["p", "q"]),
        generators=(f,),
        domains={"q": q_dom},
    )
    fibration = PredicationFibration(category, bilattice)
    connection = flat_gauge_connection_witness(
        category,
        {f: "negation"},
        max_depth=1,
    )
    fiber = FiberValuation(
        bilattice=bilattice,
        entities=entities,
        bottom=bilattice.knowledge_bottom(),
        cells={("a", "a"): bilattice.truth_top()},
        dom=category.dom_of("p"),
    )

    twisted = gauge_twisted_reindexing(fibration, connection, f, fiber)

    assert twisted.dom == q_dom
    assert twisted.get("a", "a") == bilattice.truth_bottom()


def test_gauge_twisted_reindexing_witness_checks_graded_lattice_fragment() -> None:
    bilattice = boolean_twist()
    entities = EntitySet.of(["a", "b"])
    q_dom = frozenset({("a", "a")})
    f = PredicateSpecialization(source="q", target="p", sub_support=q_dom)
    category = PredicateCategory(
        entities=entities,
        predicates=PredicateSet.of(["p", "q"]),
        generators=(f,),
        domains={"q": q_dom},
    )
    fibration = PredicationFibration(category, bilattice)
    connection = flat_gauge_connection_witness(
        category,
        {f: "negation"},
        max_depth=1,
    )
    left = FiberValuation(
        bilattice=bilattice,
        entities=entities,
        bottom=bilattice.knowledge_bottom(),
        cells={("a", "a"): bilattice.truth_top()},
        dom=category.dom_of("p"),
    )
    right = FiberValuation(
        bilattice=bilattice,
        entities=entities,
        bottom=bilattice.knowledge_bottom(),
        cells={("a", "a"): bilattice.knowledge_top()},
        dom=category.dom_of("p"),
    )

    witness = gauge_twisted_reindexing_witness(
        fibration,
        connection,
        f,
        left,
        right,
    )

    assert isinstance(witness, GaugeTwistedReindexingWitness)
    assert "morphisms/gauge-twisted-reindexing" in vars(
        GaugeTwistedReindexingWitness
    )["__realizes__"]
    assert "theorems/gauge-twisted-reindexing-graded-homomorphism" in vars(
        GaugeTwistedReindexingWitness
    )["__realizes__"]
    assert witness.holds
    assert witness.fixes_knowledge_bottom
    assert not witness.strict_residuated_fragment_preserved
    assert {check.operation for check in witness.checks} == {
        "truth_join",
        "truth_meet",
        "knowledge_join",
        "knowledge_meet",
        "negation",
        "conflation",
    }
