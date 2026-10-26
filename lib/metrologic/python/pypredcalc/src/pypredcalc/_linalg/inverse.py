"""Exact inverse and linear solve over Q.

Both operations share a Bareiss-style fraction-free Gauss elimination,
returning exact `Fraction` results for rational input.
"""

from __future__ import annotations

from fractions import Fraction

from .matrix import Matrix


def _augment(rows: list[list[Fraction]], rhs: list[list[Fraction]]) -> list[list[Fraction]]:
    return [row + r for row, r in zip(rows, rhs, strict=True)]


def _gauss_jordan(aug: list[list[Fraction]], n: int, m: int) -> list[list[Fraction]]:
    """Reduce ``aug`` (n × (n+m)) to identity-augmented form. Raises if singular."""
    for col in range(n):
        pivot_row = next((i for i in range(col, n) if aug[i][col] != 0), None)
        if pivot_row is None:
            raise ValueError("singular matrix")
        if pivot_row != col:
            aug[col], aug[pivot_row] = aug[pivot_row], aug[col]
        pivot = aug[col][col]
        aug[col] = [x / pivot for x in aug[col]]
        for i in range(n):
            if i == col or aug[i][col] == 0:
                continue
            factor = aug[i][col]
            aug[i] = [x - factor * y for x, y in zip(aug[i], aug[col], strict=True)]
    return aug


def inverse(a: Matrix) -> Matrix:
    """Inverse of a square invertible matrix over Q. Raises on singularity."""
    if not a.is_square():
        raise ValueError(f"inverse requires square matrix, got shape {a.shape}")
    n = a.n_rows
    if n == 0:
        return a
    rows = [list(row) for row in a.rows]
    identity = [
        [Fraction(1) if i == j else Fraction(0) for j in range(n)] for i in range(n)
    ]
    aug = _gauss_jordan(_augment(rows, identity), n, n)
    inv_rows = tuple(tuple(row[n:]) for row in aug)
    return Matrix(inv_rows)


def solve(a: Matrix, b: Matrix) -> Matrix:
    """Solve ``A x = b`` for square invertible ``A``. ``b`` may have multiple RHS columns."""
    if not a.is_square():
        raise ValueError(f"solve requires square A, got shape {a.shape}")
    if a.n_rows != b.n_rows:
        raise ValueError(f"shape mismatch: A is {a.shape}, b is {b.shape}")
    n = a.n_rows
    m = b.n_cols
    if n == 0:
        return b
    rows = [list(row) for row in a.rows]
    rhs = [list(row) for row in b.rows]
    aug = _gauss_jordan(_augment(rows, rhs), n, m)
    sol_rows = tuple(tuple(row[n:]) for row in aug)
    return Matrix(sol_rows)
