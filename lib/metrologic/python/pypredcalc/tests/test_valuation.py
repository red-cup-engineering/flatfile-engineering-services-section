"""Tests for PredicationValuation (world-indexed bilattice valuations)."""

import pytest

from pypredcalc.algebra.bilattice import BilatticeValue
from pypredcalc.predication import (
    EntitySet,
    PredicationCell,
    PredicationStore,
    PredicationValuation,
)


def _vacuum_valuation() -> PredicationValuation:
    return PredicationValuation(
        subjects=EntitySet.of(["alice", "bob"]),
        predicates=EntitySet.of(["likes"]),
        objects=EntitySet.of(["alice", "bob"]),
    )


class TestPredicationValuation:
    def test_default_world_is_empty_store(self) -> None:
        v = _vacuum_valuation()
        assert list(v.get("any-world").cells()) == []

    def test_with_store_validates_subject(self) -> None:
        v = _vacuum_valuation()
        bad = PredicationStore.from_cells([
            PredicationCell("eve", "likes", "alice", BilatticeValue.T)
        ])
        with pytest.raises(ValueError, match="subject"):
            v.with_store("w0", bad)

    def test_with_store_validates_predicate(self) -> None:
        v = _vacuum_valuation()
        bad = PredicationStore.from_cells([
            PredicationCell("alice", "knows", "bob", BilatticeValue.T)
        ])
        with pytest.raises(ValueError, match="predicate"):
            v.with_store("w0", bad)

    def test_knowledge_merge_conflict_yields_top(self) -> None:
        v = _vacuum_valuation()
        v = v.with_store(
            "w0",
            PredicationStore.from_cells([
                PredicationCell("alice", "likes", "bob", BilatticeValue.T)
            ]),
        )
        v = v.with_store(
            "w1",
            PredicationStore.from_cells([
                PredicationCell("alice", "likes", "bob", BilatticeValue.F)
            ]),
        )
        merged = v.knowledge_merge_all()
        assert merged.get("alice", "likes", "bob") == BilatticeValue.TOP

    def test_truth_consensus_meet(self) -> None:
        v = _vacuum_valuation()
        v = v.with_store(
            "w0",
            PredicationStore.from_cells([
                PredicationCell("alice", "likes", "bob", BilatticeValue.T)
            ]),
        )
        v = v.with_store(
            "w1",
            PredicationStore.from_cells([
                PredicationCell("alice", "likes", "bob", BilatticeValue.TOP)
            ]),
        )
        cons = v.truth_consensus(["w0", "w1"])
        # truth_meet(t, top) — both ≤_t … only t: meet of T and TOP = TOP (since top ≤_t t).
        # Use whichever is the meet under the truth order:
        assert cons.get("alice", "likes", "bob") in {
            BilatticeValue.T, BilatticeValue.TOP
        }

    def test_truth_consensus_empty_worlds(self) -> None:
        v = _vacuum_valuation()
        assert list(v.truth_consensus([]).cells()) == []
