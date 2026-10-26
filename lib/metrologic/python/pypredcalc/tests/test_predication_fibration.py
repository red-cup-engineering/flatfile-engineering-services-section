"""PredicationFibration realizes the A-layer under hyperdoctrines."""

from __future__ import annotations

from collections.abc import Hashable, Mapping
from typing import cast

import pytest

from pypredcalc import PredicationFiberFunctor as TopLevelFiberFunctor
from pypredcalc import PredicationFibration as TopLevelPredicationFibration
from pypredcalc import PredicationFibrationWitness as TopLevelFibrationWitness
from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication import (
    PredicationFiberFunctor,
    PredicationFiberFunctorWitness,
    PredicationFibration,
    PredicationFibrationWitness,
)
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.hyperdoctrine import PredicationHyperdoctrine
from pypredcalc.predication.predicate_category import (
    PredicateCategory,
    PredicateConverse,
    PredicateSet,
    PredicateSpecialization,
)

E = EntitySet.of([1, 2])
BIL = boolean_twist()
BOT = (0, 0)
T_VAL = (1, 0)


def _full() -> frozenset[tuple[int, int]]:
    return cast(frozenset[tuple[int, int]], FiberValuation.full_dom(E))


def _category() -> PredicateCategory:
    sub = frozenset({(1, 1), (1, 2)})
    return PredicateCategory(
        entities=E,
        predicates=PredicateSet.of(["p", "q"]),
        generators=(
            PredicateSpecialization(source="q", target="p", sub_support=sub),
        ),
        domains={"p": _full(), "q": sub},
    )


def test_fibration_is_realized_and_exported() -> None:
    realizations = vars(PredicationFibration)["__realizes__"]
    assert "objects/predication-fibration" in realizations
    assert TopLevelPredicationFibration is PredicationFibration


def test_canonical_fiber_uses_declared_predicate_domain() -> None:
    fibration = PredicationFibration(_category(), BIL)
    fiber = fibration.fiber("q")

    assert fiber.bilattice is BIL
    assert fiber.entities == E
    assert fiber.bottom == BOT
    assert fiber.dom == frozenset({(1, 1), (1, 2)})
    assert dict(fiber.cells) == {}


def test_reindexing_and_cleavage_agree_for_specialization() -> None:
    category = _category()
    fibration = PredicationFibration(category, BIL)
    generator = category.generators[0]
    target = FiberValuation(
        bilattice=BIL,
        entities=E,
        bottom=BOT,
        cells={(1, 1): T_VAL, (2, 2): T_VAL},
        dom=category.dom_of("p"),
    )

    pulled = fibration.f_star(generator, target)
    index = fibration.cleavage(generator)

    assert pulled == FiberValuation(
        bilattice=BIL,
        entities=E,
        bottom=BOT,
        cells=cast(
            Mapping[tuple[Hashable, Hashable], tuple[int, int]],
            index.pullback_cells(
                cast(Mapping[Hashable, tuple[int, int]], target.cells)
            ),
        ),
        dom=category.dom_of("q"),
    )


def test_axiom_witnesses_hold_for_coherent_specialization_category() -> None:
    fibration = PredicationFibration(_category(), BIL)

    assert fibration.check_a1().holds
    assert fibration.check_a2().holds
    assert fibration.check_a3().holds


def test_aggregate_axiom_witness_packages_a1_a2_a3() -> None:
    fibration = PredicationFibration(_category(), BIL)

    witness = fibration.check_axioms()

    assert isinstance(witness, PredicationFibrationWitness)
    assert TopLevelFibrationWitness is PredicationFibrationWitness
    assert witness.fibration is fibration
    assert witness.holds
    assert witness.failures == ()
    assert witness.failed_checks == ()
    assert tuple(part.axiom for part in witness.axiom_witnesses) == (
        "A1",
        "A2",
        "A3",
    )


def test_fiber_functor_is_realized_exported_and_lawful() -> None:
    category = _category()
    fibration = PredicationFibration(category, BIL)
    functor = fibration.fiber_functor()

    assert isinstance(functor, PredicationFiberFunctor)
    assert TopLevelFiberFunctor is PredicationFiberFunctor
    assert (
        "theorems/predication-fiber-functor"
        in vars(PredicationFiberFunctor)["__realizes__"]
    )
    assert functor.object_map("q") == fibration.fiber("q")

    sample = FiberValuation(
        bilattice=BIL,
        entities=E,
        bottom=BOT,
        cells={(1, 1): T_VAL},
        dom=category.dom_of("p"),
    )
    mapped = functor.morphism_map(category.generators[0], sample)
    assert mapped == fibration.f_star(category.generators[0], sample)

    witness = functor.check_functoriality()
    assert isinstance(witness, PredicationFiberFunctorWitness)
    assert witness.holds
    assert witness.failures == ()
    assert {check.law for check in witness.checks} == {
        "identity",
        "composition",
    }


def test_category_rejects_incoherent_generator_domains_before_fibration() -> None:
    with pytest.raises(ValueError, match="swap"):
        PredicateCategory(
            entities=E,
            predicates=PredicateSet.of(["p", "pc"]),
            generators=(PredicateConverse(source="pc", target="p"),),
            domains={"p": frozenset({(1, 2)}), "pc": frozenset({(1, 2)})},
        )


def test_hyperdoctrine_exposes_underlying_fibration() -> None:
    category = _category()
    hyperdoctrine = PredicationHyperdoctrine(category, BIL)

    assert hyperdoctrine.fibration.category is category
    assert hyperdoctrine.fibration.bilattice is BIL
    assert hyperdoctrine.fiber("q") == hyperdoctrine.fibration.fiber("q")
