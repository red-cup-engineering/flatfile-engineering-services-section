"""Tests for SimplicialComplex and the cohomology functions in pypredcalc.sheaf."""

import pytest

from pypredcalc.combinatorics.simplicial_complex import Simplex, SimplicialComplex
from pypredcalc.sheaf.cohomology import cohomology_rank


def _interval() -> SimplicialComplex:
    return SimplicialComplex(frozenset([Simplex((0,)), Simplex((1,)), Simplex((0, 1))]))


def _circle() -> SimplicialComplex:
    return SimplicialComplex(frozenset([
        Simplex((0,)), Simplex((1,)), Simplex((2,)),
        Simplex((0, 1)), Simplex((1, 2)), Simplex((0, 2)),
    ]))


def _filled_triangle() -> SimplicialComplex:
    return SimplicialComplex(frozenset([
        Simplex((0,)), Simplex((1,)), Simplex((2,)),
        Simplex((0, 1)), Simplex((1, 2)), Simplex((0, 2)),
        Simplex((0, 1, 2)),
    ]))


class TestSimplex:
    def test_dimension(self) -> None:
        assert Simplex((0,)).dim == 0
        assert Simplex((0, 1)).dim == 1
        assert Simplex((0, 1, 2)).dim == 2

    def test_faces_of_vertex(self) -> None:
        assert Simplex((0,)).faces() == []

    def test_faces_of_edge(self) -> None:
        faces = Simplex((0, 1)).faces()
        assert Simplex((0,)) in faces and Simplex((1,)) in faces
        assert len(faces) == 2

    def test_faces_of_triangle(self) -> None:
        faces = Simplex((0, 1, 2)).faces()
        assert len(faces) == 3

    def test_hashable(self) -> None:
        assert len({Simplex((0,)), Simplex((0,))}) == 1


class TestSimplicialComplex:
    def test_not_closed_raises(self) -> None:
        with pytest.raises(ValueError, match="not closed under faces"):
            SimplicialComplex(frozenset([Simplex((0, 1))]))

    def test_cells_by_dimension(self) -> None:
        sc = _interval()
        assert len(sc.cells(0)) == 2
        assert len(sc.cells(1)) == 1
        assert sc.cells(2) == []

    def test_dimension_interval(self) -> None:
        assert _interval().dimension() == 1

    def test_dimension_filled_triangle(self) -> None:
        assert _filled_triangle().dimension() == 2


class TestCohomology:
    def test_interval(self) -> None:
        sc = _interval()
        assert cohomology_rank(sc, 0) == 1
        assert cohomology_rank(sc, 1) == 0

    def test_circle(self) -> None:
        sc = _circle()
        assert cohomology_rank(sc, 0) == 1
        assert cohomology_rank(sc, 1) == 1

    def test_filled_triangle(self) -> None:
        sc = _filled_triangle()
        assert cohomology_rank(sc, 0) == 1
        assert cohomology_rank(sc, 1) == 0
        assert cohomology_rank(sc, 2) == 0

    def test_two_isolated_vertices(self) -> None:
        sc = SimplicialComplex(frozenset([Simplex((0,)), Simplex((1,))]))
        assert cohomology_rank(sc, 0) == 2

    def test_beyond_dimension(self) -> None:
        assert cohomology_rank(_interval(), 5) == 0
