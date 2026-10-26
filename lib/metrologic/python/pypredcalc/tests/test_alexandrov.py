"""Tests for finite Alexandrov topology."""

import pytest

from pypredcalc.topology import AlexandrovTopology, specialisation_preorder


class TestThreeChain:
    """Carrier {0, 1, 2} with usual order — Sierpiński-like Alexandrov space."""

    def _top(self) -> AlexandrovTopology[int]:
        return AlexandrovTopology(
            carrier=frozenset([0, 1, 2]),
            leq=lambda a, b: a <= b,
        )

    def test_minimal_open(self) -> None:
        t = self._top()
        assert t.minimal_open(0) == frozenset([0, 1, 2])
        assert t.minimal_open(1) == frozenset([1, 2])
        assert t.minimal_open(2) == frozenset([2])

    def test_closure_of_top_singleton(self) -> None:
        t = self._top()
        # cl({2}) — everything below 2 — = whole carrier
        assert t.closure(frozenset([2])) == frozenset([0, 1, 2])
        assert t.closure(frozenset([0])) == frozenset([0])

    def test_is_open(self) -> None:
        t = self._top()
        assert t.is_open(frozenset([1, 2]))
        assert t.is_open(frozenset([2]))
        assert not t.is_open(frozenset([0]))  # not upward-closed
        assert not t.is_open(frozenset([0, 2]))  # missing 1

    def test_opens_count(self) -> None:
        t = self._top()
        # Up-sets of a 3-chain: ∅, {2}, {1,2}, {0,1,2} — 4 opens
        assert len(t.opens()) == 4


class TestAntichain:
    def _top(self) -> AlexandrovTopology[int]:
        # Discrete topology: leq is equality.
        return AlexandrovTopology(
            carrier=frozenset([0, 1, 2]),
            leq=lambda a, b: a == b,
        )

    def test_discrete_has_2n_opens(self) -> None:
        t = self._top()
        assert len(t.opens()) == 2 ** 3


class TestSpecialisationPreorder:
    def test_recovers_original_preorder(self) -> None:
        original = AlexandrovTopology(
            carrier=frozenset([0, 1, 2]),
            leq=lambda a, b: a <= b,
        )
        opens = original.opens()
        recovered = specialisation_preorder(original.carrier, opens)
        for x in original.carrier:
            for y in original.carrier:
                assert original.leq(x, y) == recovered.leq(x, y)


class TestValidation:
    def test_non_transitive_raises(self) -> None:
        with pytest.raises(ValueError, match="transitivity"):
            AlexandrovTopology(
                carrier=frozenset([0, 1, 2]),
                leq=lambda a, b: a == b or (a, b) in {(0, 1), (1, 2)},
            )

    def test_empty_raises(self) -> None:
        with pytest.raises(ValueError, match="non-empty"):
            AlexandrovTopology(carrier=frozenset(), leq=lambda a, b: True)


class TestSpecialisationPreorderValidation:
    def test_missing_empty_set_raises(self) -> None:
        with pytest.raises(ValueError, match="empty set"):
            specialisation_preorder(
                frozenset([0, 1]),
                frozenset([frozenset([0, 1])]),
            )

    def test_missing_whole_carrier_raises(self) -> None:
        with pytest.raises(ValueError, match="whole carrier"):
            specialisation_preorder(
                frozenset([0, 1]),
                frozenset([frozenset(), frozenset([0])]),
            )

    def test_open_not_subset_raises(self) -> None:
        with pytest.raises(ValueError, match="subset of carrier"):
            specialisation_preorder(
                frozenset([0, 1]),
                frozenset([frozenset(), frozenset([0, 1, 99]), frozenset([0, 1])]),
            )

    def test_not_closed_under_union_raises(self) -> None:
        with pytest.raises(ValueError, match="union"):
            specialisation_preorder(
                frozenset([0, 1, 2]),
                frozenset([
                    frozenset(),
                    frozenset([0]),
                    frozenset([1]),
                    frozenset([0, 1, 2]),
                ]),
            )
