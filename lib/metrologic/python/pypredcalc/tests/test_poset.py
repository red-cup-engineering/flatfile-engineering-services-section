"""Tests for the Poset and OrderComplex primitives."""

import pytest

from pypredcalc.combinatorics.poset import OrderComplex, Poset


def _chain3() -> Poset:
    return Poset(elements=frozenset([0, 1, 2]), leq=lambda a, b: a <= b)


def _antichain() -> Poset:
    return Poset(elements=frozenset(["a", "b", "c"]), leq=lambda a, b: a == b)


class TestPoset:
    def test_reflexivity_enforced(self) -> None:
        with pytest.raises(AssertionError):
            Poset(elements=frozenset([0]), leq=lambda a, b: False)

    def test_antisymmetry_enforced(self) -> None:
        with pytest.raises(ValueError, match="antisymmetry fails"):
            Poset(elements=frozenset([0, 1]), leq=lambda a, b: True)

    def test_transitivity_enforced(self) -> None:
        with pytest.raises(ValueError, match="transitivity fails"):
            Poset(
                elements=frozenset([0, 1, 2]),
                leq=lambda a, b: (a == b) or (a == 0 and b == 1) or (a == 1 and b == 2),
            )

    def test_chain3_chains_length1(self) -> None:
        assert len(_chain3().chains(1)) == 3

    def test_chain3_chains_length2(self) -> None:
        assert len(_chain3().chains(2)) == 3

    def test_chain3_chains_length3(self) -> None:
        chains = _chain3().chains(3)
        assert chains == [(0, 1, 2)]

    def test_antichain_no_length2_chains(self) -> None:
        assert _antichain().chains(2) == []

    def test_chain_length0_is_empty(self) -> None:
        assert _chain3().chains(0) == []


class TestOrderComplex:
    def test_interval_order_complex_has_correct_cells(self) -> None:
        oc = OrderComplex(poset=_chain3())
        assert len(oc.cells(0)) == 3
        assert len(oc.cells(1)) == 3
        assert len(oc.cells(2)) == 1

    def test_antichain_order_complex_is_discrete(self) -> None:
        oc = OrderComplex(poset=_antichain())
        assert len(oc.cells(0)) == 3
        assert len(oc.cells(1)) == 0

    def test_dimension_chain3(self) -> None:
        assert OrderComplex(poset=_chain3()).dimension() == 2

    def test_dimension_antichain(self) -> None:
        assert OrderComplex(poset=_antichain()).dimension() == 0

    def test_faces_of_simplex(self) -> None:
        oc = OrderComplex(poset=_chain3())
        faces = oc.faces((0, 1, 2))
        assert len(faces) == 3
        assert (0, 1) in faces and (1, 2) in faces and (0, 2) in faces

    def test_faces_of_vertex_is_empty(self) -> None:
        oc = OrderComplex(poset=_chain3())
        assert oc.faces((0,)) == []
