"""Tests for the store↔fiber bridge.

The bridge is fixed at the boolean-twist parameterisation (FOUR ≅ 2^⋈)
since :class:`PredicationStore` carries :class:`BilatticeValue` cells.
"""
from __future__ import annotations

import pytest

from pypredcalc.algebra import BilatticeValue
from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication import (
    EntitySet,
    FiberValuation,
    PredicateCategory,
    PredicateConverse,
    PredicateSet,
    PredicationCell,
    PredicationStore,
    fibers_to_store,
    store_to_fibers,
)

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()


def _converse_category() -> PredicateCategory:
    return PredicateCategory(
        entities=EntitySet([1, 2, 3]),
        predicates=PredicateSet(["r", "r_check"]),
        generators=[PredicateConverse(source="r", target="r_check")],
    )


def fv(entities, cells=None) -> FiberValuation:
    return FiberValuation.full(
        bilattice=BIL, entities=entities, bottom=BOT, cells=cells or {}
    )


# ---------------- store_to_fibers ----------------


def test_store_to_fibers_returns_one_fiber_per_predicate() -> None:
    cat = _converse_category()
    store = PredicationStore.from_cells(
        [
            PredicationCell(1, "r", 2, BilatticeValue.T),
            PredicationCell(2, "r_check", 1, BilatticeValue.F),
        ]
    )
    fibers = store_to_fibers(store, cat)
    assert set(fibers.keys()) == {"r", "r_check"}
    assert fibers["r"].get(1, 2) == T_VAL
    assert fibers["r_check"].get(2, 1) == F_VAL


def test_store_to_fibers_drops_unknown_predicates() -> None:
    cat = _converse_category()
    store = PredicationStore.from_cells(
        [
            PredicationCell(1, "r", 2, BilatticeValue.T),
            PredicationCell(1, "stranger", 2, BilatticeValue.T),
        ]
    )
    fibers = store_to_fibers(store, cat)
    assert fibers["r"].get(1, 2) == T_VAL
    assert "stranger" not in fibers


def test_store_to_fibers_drops_cells_outside_entity_set() -> None:
    cat = _converse_category()
    store = PredicationStore.from_cells(
        [
            PredicationCell(1, "r", 2, BilatticeValue.T),
            PredicationCell(99, "r", 2, BilatticeValue.T),
            PredicationCell(1, "r", 99, BilatticeValue.T),
        ]
    )
    fibers = store_to_fibers(store, cat)
    assert fibers["r"].support() == frozenset({(1, 2)})


def test_store_to_fibers_includes_predicate_with_no_observed_cells() -> None:
    cat = _converse_category()
    store = PredicationStore.from_cells([PredicationCell(1, "r", 2, BilatticeValue.T)])
    fibers = store_to_fibers(store, cat)
    assert "r_check" in fibers
    assert fibers["r_check"].support() == frozenset()


# ---------------- fibers_to_store ----------------


def test_fibers_to_store_round_trip_preserves_in_scope_cells() -> None:
    cat = _converse_category()
    store = PredicationStore.from_cells(
        [
            PredicationCell(1, "r", 2, BilatticeValue.T),
            PredicationCell(2, "r_check", 1, BilatticeValue.F),
            PredicationCell(3, "r", 3, BilatticeValue.TOP),
        ]
    )
    rebuilt = fibers_to_store(store_to_fibers(store, cat), cat)
    assert list(rebuilt.cells()) == list(store.cells())


def test_fibers_to_store_drops_outside_predicates_on_round_trip() -> None:
    cat = _converse_category()
    store_with_stranger = PredicationStore.from_cells(
        [
            PredicationCell(1, "r", 2, BilatticeValue.T),
            PredicationCell(1, "stranger", 2, BilatticeValue.T),
        ]
    )
    rebuilt = fibers_to_store(store_to_fibers(store_with_stranger, cat), cat)
    assert {cell.predicate for cell in rebuilt.cells()} == {"r"}


def test_fibers_to_store_rejects_unknown_predicate_key() -> None:
    cat = _converse_category()
    fiber = fv(cat.entities, {(1, 2): T_VAL})
    with pytest.raises(KeyError, match="not in category.predicates"):
        fibers_to_store({"alien": fiber}, cat)


def test_fibers_to_store_rejects_cell_outside_entity_set() -> None:
    cat = _converse_category()
    # Build a fiber that carries a (99, 1) cell — a bigger entity set so the
    # FiberValuation accepts it, but the store-rebuild rejects since 99 ∉ cat.E.
    big_E = EntitySet([1, 2, 3, 99])
    fiber = fv(big_E, {(99, 1): T_VAL})
    with pytest.raises(ValueError, match="outside E × E"):
        fibers_to_store({"r": fiber}, cat)


def test_fibers_to_store_empty_fibers_yields_empty_store() -> None:
    cat = _converse_category()
    rebuilt = fibers_to_store(
        {"r": fv(cat.entities), "r_check": fv(cat.entities)}, cat
    )
    assert list(rebuilt.cells()) == []


# ---------------- canonical round-trip laws ----------------


def test_round_trip_store_to_fibers_to_store_normalizes_in_scope_data() -> None:
    cat = _converse_category()
    store = PredicationStore.from_cells(
        [
            PredicationCell(1, "r", 2, BilatticeValue.T),
            PredicationCell(3, "r", 1, BilatticeValue.F),
            PredicationCell(2, "r_check", 1, BilatticeValue.TOP),
        ]
    )
    rt = fibers_to_store(store_to_fibers(store, cat), cat)
    assert list(rt.cells()) == list(store.cells())


def test_round_trip_fibers_to_store_to_fibers_is_identity() -> None:
    cat = _converse_category()
    fibers = {
        "r": fv(cat.entities, {(1, 2): T_VAL, (3, 1): F_VAL}),
        "r_check": fv(cat.entities, {(2, 1): TOP}),
    }
    # Pass the same BIL instance back through the bridge so the rebuilt
    # fibers' bilattice identity matches the input's.
    rt = store_to_fibers(fibers_to_store(fibers, cat), cat, bilattice=BIL)
    assert rt == fibers
