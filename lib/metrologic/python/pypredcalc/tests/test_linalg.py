"""Tests for the internal _linalg layer.

Covers Matrix construction and arithmetic, Bareiss determinant + rank,
Faddeev-LeVerrier characteristic polynomial, Durand-Kerner numerical
eigenvalues + spectral radius, and Smith normal form.
"""

from fractions import Fraction

import pytest

from pypredcalc._linalg import (
    Matrix,
    charpoly,
    det,
    eigenvalues_numeric,
    integer_rank,
    rank,
    smith_normal_form,
    spectral_radius,
)


class TestMatrix:
    def test_shape(self) -> None:
        m = Matrix.from_rows([[1, 2, 3], [4, 5, 6]])
        assert m.shape == (2, 3)
        assert m.n_rows == 2
        assert m.n_cols == 3

    def test_zeros(self) -> None:
        m = Matrix.zeros(2, 3)
        assert m.shape == (2, 3)
        assert all(x == 0 for row in m.rows for x in row)

    def test_identity(self) -> None:
        i = Matrix.identity(3)
        assert i.shape == (3, 3)
        for r in range(3):
            for c in range(3):
                assert i.get(r, c) == (1 if r == c else 0)

    def test_ragged_raises(self) -> None:
        with pytest.raises(ValueError, match="ragged"):
            Matrix.from_rows([[1, 2], [3]])

    def test_matmul(self) -> None:
        a = Matrix.from_rows([[1, 2], [3, 4]])
        b = Matrix.from_rows([[5, 6], [7, 8]])
        result = a @ b
        assert result == Matrix.from_rows([[19, 22], [43, 50]])

    def test_matmul_shape_mismatch(self) -> None:
        a = Matrix.from_rows([[1, 2]])
        b = Matrix.from_rows([[1, 2]])
        with pytest.raises(ValueError, match="shape mismatch"):
            a @ b

    def test_add(self) -> None:
        a = Matrix.from_rows([[1, 2], [3, 4]])
        b = Matrix.from_rows([[5, 6], [7, 8]])
        assert a + b == Matrix.from_rows([[6, 8], [10, 12]])

    def test_transpose(self) -> None:
        m = Matrix.from_rows([[1, 2, 3], [4, 5, 6]])
        assert m.transpose() == Matrix.from_rows([[1, 4], [2, 5], [3, 6]])

    def test_trace(self) -> None:
        m = Matrix.from_rows([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
        assert m.trace() == Fraction(15)

    def test_fractional_entries(self) -> None:
        m = Matrix.from_rows([[Fraction(1, 2), Fraction(1, 3)]])
        assert m.get(0, 0) == Fraction(1, 2)


class TestDeterminant:
    def test_2x2(self) -> None:
        assert det(Matrix.from_rows([[1, 2], [3, 4]])) == Fraction(-2)

    def test_3x3(self) -> None:
        assert det(Matrix.from_rows([[1, 2, 3], [0, 1, 4], [5, 6, 0]])) == Fraction(1)

    def test_singular(self) -> None:
        assert det(Matrix.from_rows([[1, 1], [1, 1]])) == Fraction(0)

    def test_identity_is_one(self) -> None:
        assert det(Matrix.identity(5)) == Fraction(1)

    def test_swap_changes_sign(self) -> None:
        a = Matrix.from_rows([[0, 1], [1, 0]])
        assert det(a) == Fraction(-1)

    def test_non_square_raises(self) -> None:
        with pytest.raises(ValueError, match="square"):
            det(Matrix.from_rows([[1, 2, 3]]))

    def test_fractional(self) -> None:
        m = Matrix.from_rows([
            [Fraction(1, 2), Fraction(1, 3)],
            [Fraction(1, 4), Fraction(1, 5)],
        ])
        # det = 1/10 - 1/12 = 6/60 - 5/60 = 1/60
        assert det(m) == Fraction(1, 60)


class TestRank:
    def test_full_rank(self) -> None:
        assert rank(Matrix.identity(3)) == 3

    def test_zero_matrix(self) -> None:
        assert rank(Matrix.zeros(3, 3)) == 0

    def test_rank_deficient(self) -> None:
        assert rank(Matrix.from_rows([[1, 1], [1, 1]])) == 1

    def test_rectangular(self) -> None:
        assert rank(Matrix.from_rows([[1, 0, 0], [0, 1, 0]])) == 2


class TestCharpoly:
    def test_identity_2x2(self) -> None:
        # det(λI - I) = (λ-1)^2 = λ^2 - 2λ + 1
        coeffs = charpoly(Matrix.identity(2))
        assert coeffs == (Fraction(1), Fraction(-2), Fraction(1))

    def test_zero_2x2(self) -> None:
        # det(λI) = λ^2
        coeffs = charpoly(Matrix.zeros(2, 2))
        assert coeffs == (Fraction(1), Fraction(0), Fraction(0))

    def test_fibonacci_matrix(self) -> None:
        # M = [[1,1],[1,0]]; charpoly = λ^2 - λ - 1
        coeffs = charpoly(Matrix.from_rows([[1, 1], [1, 0]]))
        assert coeffs == (Fraction(1), Fraction(-1), Fraction(-1))

    def test_diagonal(self) -> None:
        # diag(2,3) → charpoly = (λ-2)(λ-3) = λ^2 - 5λ + 6
        coeffs = charpoly(Matrix.from_rows([[2, 0], [0, 3]]))
        assert coeffs == (Fraction(1), Fraction(-5), Fraction(6))


class TestEigenvalues:
    def test_identity_eigenvalues(self) -> None:
        # Durand-Kerner converges slowly on multiple roots; tolerance relaxed.
        eigs = eigenvalues_numeric(Matrix.identity(3))
        for ev in eigs:
            assert abs(ev - 1.0) < 1e-3

    def test_diagonal(self) -> None:
        eigs = eigenvalues_numeric(Matrix.from_rows([[2, 0], [0, 3]]))
        abs_vals = sorted([abs(e) for e in eigs])
        assert abs(abs_vals[0] - 2.0) < 1e-9
        assert abs(abs_vals[1] - 3.0) < 1e-9

    def test_fibonacci_perron(self) -> None:
        # Fibonacci's Perron eigenvalue is the golden ratio
        radius = spectral_radius(Matrix.from_rows([[1, 1], [1, 0]]))
        assert abs(radius - 1.6180339887498949) < 1e-9

    def test_spectral_radius_zero(self) -> None:
        assert spectral_radius(Matrix.zeros(2, 2)) < 1e-9


class TestSmithNormalForm:
    def test_identity(self) -> None:
        assert smith_normal_form(Matrix.identity(3)) == (1, 1, 1)

    def test_zero(self) -> None:
        assert smith_normal_form(Matrix.zeros(2, 2)) == ()

    def test_diagonal_already_invariant(self) -> None:
        assert smith_normal_form(Matrix.from_rows([[1, 0], [0, 6]])) == (1, 6)

    def test_2x2_with_torsion(self) -> None:
        # diag(2,4) → SNF = diag(2,4) (2 | 4)
        assert smith_normal_form(Matrix.from_rows([[2, 0], [0, 4]])) == (2, 4)

    def test_2x2_swapping_required(self) -> None:
        assert smith_normal_form(Matrix.from_rows([[0, 1], [1, 0]])) == (1, 1)

    def test_fibonacci_matrix(self) -> None:
        # Fibonacci matrix is unimodular ⇒ SNF = (1, 1)
        assert smith_normal_form(Matrix.from_rows([[1, 1], [1, 0]])) == (1, 1)

    def test_singular_thue_morse(self) -> None:
        # [[1,1],[1,1]] has rank 1 → one nonzero invariant
        assert smith_normal_form(Matrix.from_rows([[1, 1], [1, 1]])) == (1,)

    def test_integer_rank(self) -> None:
        assert integer_rank(Matrix.identity(4)) == 4
        assert integer_rank(Matrix.zeros(3, 3)) == 0
        assert integer_rank(Matrix.from_rows([[1, 1], [1, 1]])) == 1

    def test_non_integer_raises(self) -> None:
        with pytest.raises(ValueError, match="integer"):
            smith_normal_form(Matrix.from_rows([[Fraction(1, 2)]]))
