"""Immutable rational matrix stored as a tuple of tuples of `Fraction`.

Designed for small dense matrices (≲ 50×50): substitution incidence matrices,
coboundary matrices on small simplicial complexes, permutation matrices on
finite alphabets. Not a numerics workhorse — exact arithmetic only.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from fractions import Fraction

Rational = Fraction | int


def _to_fraction(x: Rational) -> Fraction:
    return x if isinstance(x, Fraction) else Fraction(x)


@dataclass(frozen=True)
class Matrix:
    """Rational matrix, row-major, immutable.

    Use `Matrix.from_rows(...)` for construction; the raw `rows` field is
    the canonical tuple-of-tuples form.
    """

    rows: tuple[tuple[Fraction, ...], ...]

    @classmethod
    def from_rows(cls, rows: Iterable[Iterable[Rational]]) -> Matrix:
        materialized = tuple(tuple(_to_fraction(x) for x in row) for row in rows)
        if materialized and any(len(r) != len(materialized[0]) for r in materialized):
            raise ValueError("ragged matrix: rows have unequal length")
        return cls(materialized)

    @classmethod
    def zeros(cls, n_rows: int, n_cols: int) -> Matrix:
        z = Fraction(0)
        return cls(tuple((z,) * n_cols for _ in range(n_rows)))

    @classmethod
    def identity(cls, n: int) -> Matrix:
        z, o = Fraction(0), Fraction(1)
        return cls(tuple(tuple(o if i == j else z for j in range(n)) for i in range(n)))

    @property
    def shape(self) -> tuple[int, int]:
        if not self.rows:
            return (0, 0)
        return (len(self.rows), len(self.rows[0]))

    @property
    def n_rows(self) -> int:
        return self.shape[0]

    @property
    def n_cols(self) -> int:
        return self.shape[1]

    def is_square(self) -> bool:
        r, c = self.shape
        return r == c

    def get(self, i: int, j: int) -> Fraction:
        return self.rows[i][j]

    def with_entry(self, i: int, j: int, value: Rational) -> Matrix:
        new_rows = list(list(row) for row in self.rows)
        new_rows[i][j] = _to_fraction(value)
        return Matrix(tuple(tuple(row) for row in new_rows))

    def transpose(self) -> Matrix:
        r, c = self.shape
        return Matrix(tuple(tuple(self.rows[i][j] for i in range(r)) for j in range(c)))

    def __matmul__(self, other: Matrix) -> Matrix:
        if self.n_cols != other.n_rows:
            raise ValueError(f"shape mismatch for matmul: {self.shape} @ {other.shape}")
        z = Fraction(0)
        result = []
        for i in range(self.n_rows):
            row = []
            for j in range(other.n_cols):
                s = z
                for k in range(self.n_cols):
                    s += self.rows[i][k] * other.rows[k][j]
                row.append(s)
            result.append(tuple(row))
        return Matrix(tuple(result))

    def __add__(self, other: Matrix) -> Matrix:
        if self.shape != other.shape:
            raise ValueError(f"shape mismatch for add: {self.shape} vs {other.shape}")
        return Matrix(
            tuple(
                tuple(a + b for a, b in zip(self.rows[i], other.rows[i], strict=True))
                for i in range(self.n_rows)
            )
        )

    def scalar_mul(self, s: Rational) -> Matrix:
        f = _to_fraction(s)
        return Matrix(tuple(tuple(f * x for x in row) for row in self.rows))

    def trace(self) -> Fraction:
        if not self.is_square():
            raise ValueError("trace requires a square matrix")
        return sum((self.rows[i][i] for i in range(self.n_rows)), Fraction(0))

    def to_lists(self) -> list[list[Fraction]]:
        return [list(row) for row in self.rows]

    def is_nonnegative(self) -> bool:
        """Whether every entry is ``≥ 0``."""
        return all(x >= 0 for row in self.rows for x in row)

    def is_positive(self) -> bool:
        """Whether every entry is ``> 0``."""
        return all(x > 0 for row in self.rows for x in row)

    def kronecker(self, other: Matrix) -> Matrix:
        """Kronecker (tensor) product. Block ``A_ij · B`` for each entry of ``A``."""
        a_rows, a_cols = self.shape
        b_rows, b_cols = other.shape
        z = Fraction(0)
        result = [[z] * (a_cols * b_cols) for _ in range(a_rows * b_rows)]
        for i in range(a_rows):
            for j in range(a_cols):
                aij = self.rows[i][j]
                for k in range(b_rows):
                    for col in range(b_cols):
                        result[i * b_rows + k][j * b_cols + col] = aij * other.rows[k][col]
        return Matrix.from_rows(result)

    def power(self, k: int) -> Matrix:
        """Integer matrix power via binary exponentiation. ``k >= 0``."""
        if not self.is_square():
            raise ValueError(f"power requires a square matrix, got shape {self.shape}")
        if k < 0:
            raise ValueError(f"power requires non-negative exponent, got {k}")
        result = Matrix.identity(self.n_rows)
        base = self
        while k > 0:
            if k & 1:
                result = result @ base
            k >>= 1
            if k > 0:
                base = base @ base
        return result

    def __pow__(self, k: int) -> Matrix:
        return self.power(k)


def column_vector(entries: Sequence[Rational]) -> Matrix:
    """Construct a column vector from a sequence of rationals."""
    return Matrix.from_rows([[x] for x in entries])
