"""Tests for the PreBilattice axiom-checker."""

import pytest

from pypredcalc.algebra.pre_bilattice import PreBilattice


def _four_truth_leq(a: str, b: str) -> bool:
    rank = {"f": 0, "bot": 1, "top": 1, "t": 2}
    if a == b:
        return True
    if {a, b} == {"bot", "top"}:
        return False
    return rank[a] <= rank[b]


def _four_knowledge_leq(a: str, b: str) -> bool:
    rank = {"bot": 0, "f": 1, "t": 1, "top": 2}
    if a == b:
        return True
    if {a, b} == {"t", "f"}:
        return False
    return rank[a] <= rank[b]


class TestPreBilattice:
    def test_four_constructs(self) -> None:
        pb = PreBilattice(
            carrier=frozenset(["t", "f", "bot", "top"]),
            truth_leq=_four_truth_leq,
            knowledge_leq=_four_knowledge_leq,
        )
        assert pb.truth_join("f", "t") == "t"
        assert pb.knowledge_join("t", "f") == "top"
        assert pb.truth_meet("bot", "top") == "f"
        assert pb.knowledge_meet("bot", "top") == "bot"

    def test_non_reflexive_raises(self) -> None:
        with pytest.raises(ValueError, match="reflexivity"):
            PreBilattice(
                carrier=frozenset([0, 1]),
                truth_leq=lambda a, b: False,
                knowledge_leq=lambda a, b: a <= b,
            )

    def test_empty_carrier_raises(self) -> None:
        with pytest.raises(ValueError, match="non-empty"):
            PreBilattice(
                carrier=frozenset(),
                truth_leq=lambda a, b: True,
                knowledge_leq=lambda a, b: True,
            )

    def test_non_transitive_raises(self) -> None:
        with pytest.raises(ValueError, match="transitivity"):
            PreBilattice(
                carrier=frozenset([0, 1, 2]),
                truth_leq=lambda a, b: a == b or (a, b) in {(0, 1), (1, 2)},
                knowledge_leq=lambda a, b: a <= b,
            )
