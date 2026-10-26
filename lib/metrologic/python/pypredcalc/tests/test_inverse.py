"""Tests for exact inverse and linear solve over Q."""

from fractions import Fraction

import pytest

from pypredcalc._linalg import Matrix, inverse, solve


class TestInverse:
    def test_identity_inverse(self) -> None:
        assert inverse(Matrix.identity(3)) == Matrix.identity(3)

    def test_two_by_two(self) -> None:
        a = Matrix.from_rows([[1, 2], [3, 4]])
        inv = inverse(a)
        assert (a @ inv) == Matrix.identity(2)
        assert (inv @ a) == Matrix.identity(2)

    def test_rational_entries(self) -> None:
        a = Matrix.from_rows([[Fraction(1, 2), Fraction(1, 3)], [Fraction(1, 4), 1]])
        inv = inverse(a)
        product = a @ inv
        assert product == Matrix.identity(2)

    def test_singular_raises(self) -> None:
        with pytest.raises(ValueError, match="singular"):
            inverse(Matrix.from_rows([[1, 2], [2, 4]]))

    def test_non_square_raises(self) -> None:
        with pytest.raises(ValueError, match="square"):
            inverse(Matrix.from_rows([[1, 2, 3], [4, 5, 6]]))


class TestSolve:
    def test_solve_unique(self) -> None:
        a = Matrix.from_rows([[2, 1], [1, 3]])
        b = Matrix.from_rows([[5], [10]])
        x = solve(a, b)
        assert (a @ x) == b

    def test_solve_multi_rhs(self) -> None:
        a = Matrix.from_rows([[1, 2], [3, 4]])
        b = Matrix.from_rows([[1, 0], [0, 1]])
        x = solve(a, b)
        assert (a @ x) == b
        assert x == inverse(a)

    def test_solve_singular_raises(self) -> None:
        with pytest.raises(ValueError, match="singular"):
            solve(
                Matrix.from_rows([[1, 1], [1, 1]]),
                Matrix.from_rows([[1], [2]]),
            )


class TestPower:
    def test_power_zero_is_identity(self) -> None:
        a = Matrix.from_rows([[2, 3], [5, 7]])
        assert (a ** 0) == Matrix.identity(2)

    def test_power_one(self) -> None:
        a = Matrix.from_rows([[2, 3], [5, 7]])
        assert (a ** 1) == a

    def test_power_matches_repeated_matmul(self) -> None:
        a = Matrix.from_rows([[1, 1], [1, 0]])  # Fibonacci
        manual = Matrix.identity(2)
        for _ in range(8):
            manual = manual @ a
        assert (a ** 8) == manual

    def test_power_negative_raises(self) -> None:
        with pytest.raises(ValueError, match="non-negative"):
            Matrix.identity(2) ** -1
