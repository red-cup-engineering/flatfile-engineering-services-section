"""Exact determinant via the Bareiss fraction-free algorithm.

Bareiss preserves integrality when entries are integers and avoids the
numerical-cancellation issues of naive Gauss elimination on rationals.
For our matrices (small, exact) it is also asymptotically optimal:
O(n^3) ring operations with no fraction-blow-up.
"""

from __future__ import annotations

from fractions import Fraction

from .matrix import Matrix


def det(m: Matrix) -> Fraction:
    """Determinant of a square matrix via Bareiss elimination."""
    if not m.is_square():
        raise ValueError(f"det requires square matrix, got shape {m.shape}")
    n = m.n_rows
    if n == 0:
        return Fraction(1)
    a = [list(row) for row in m.rows]
    sign = 1
    prev_pivot = Fraction(1)
    for k in range(n - 1):
        if a[k][k] == 0:
            swap = next((r for r in range(k + 1, n) if a[r][k] != 0), None)
            if swap is None:
                return Fraction(0)
            a[k], a[swap] = a[swap], a[k]
            sign = -sign
        for i in range(k + 1, n):
            for j in range(k + 1, n):
                a[i][j] = (a[i][j] * a[k][k] - a[i][k] * a[k][j]) / prev_pivot
            a[i][k] = Fraction(0)
        prev_pivot = a[k][k]
    return Fraction(sign) * a[n - 1][n - 1]


def rank(m: Matrix) -> int:
    """Rank over Q via Bareiss-style row reduction."""
    if m.n_rows == 0 or m.n_cols == 0:
        return 0
    a = [list(row) for row in m.rows]
    n_rows, n_cols = m.shape
    r = 0
    for col in range(n_cols):
        if r >= n_rows:
            break
        pivot_row = next((i for i in range(r, n_rows) if a[i][col] != 0), None)
        if pivot_row is None:
            continue
        if pivot_row != r:
            a[r], a[pivot_row] = a[pivot_row], a[r]
        pivot = a[r][col]
        for i in range(n_rows):
            if i == r or a[i][col] == 0:
                continue
            factor = a[i][col] / pivot
            for j in range(col, n_cols):
                a[i][j] = a[i][j] - factor * a[r][j]
        r += 1
    return r
