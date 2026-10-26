"""Tests for CellularSheaf and ConstantSheaf."""

import pytest

from pypredcalc.combinatorics.simplicial_complex import Simplex, SimplicialComplex
from pypredcalc.sheaf.cellular import CellularSheaf, ConstantSheaf


def _interval_complex() -> SimplicialComplex:
    return SimplicialComplex(frozenset([Simplex((0,)), Simplex((1,)), Simplex((0, 1))]))


def _circle_complex() -> SimplicialComplex:
    return SimplicialComplex(frozenset([
        Simplex((0,)), Simplex((1,)), Simplex((2,)),
        Simplex((0, 1)), Simplex((1, 2)), Simplex((0, 2)),
    ]))


class TestConstantSheaf:
    def test_interval_h0_h1(self) -> None:
        sc = ConstantSheaf(complex=_interval_complex())
        assert sc.cohomology_rank(0) == 1
        assert sc.cohomology_rank(1) == 0

    def test_circle_h0_h1(self) -> None:
        sc = ConstantSheaf(complex=_circle_complex())
        assert sc.cohomology_rank(0) == 1
        assert sc.cohomology_rank(1) == 1


class TestCellularSheaf:
    def _rank1_sheaf(self, sc: SimplicialComplex) -> CellularSheaf:
        return CellularSheaf(
            complex=sc,
            stalk_ranks={s: 1 for s in sc.simplices},
            restrictions={},
        )

    def test_rank1_interval_h0(self) -> None:
        assert self._rank1_sheaf(_interval_complex()).cohomology_rank(0) == 1

    def test_rank1_circle_h1(self) -> None:
        assert self._rank1_sheaf(_circle_complex()).cohomology_rank(1) == 1

    def test_higher_rank_raises(self) -> None:
        sc = _interval_complex()
        sheaf = CellularSheaf(
            complex=sc, stalk_ranks={s: 2 for s in sc.simplices}, restrictions={}
        )
        with pytest.raises(NotImplementedError, match="higher-rank"):
            sheaf.cohomology_rank(0)
