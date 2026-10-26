"""Characteristic polynomial via the Faddeev–LeVerrier recursion.

For a square matrix A, returns coefficients [c_n, c_{n-1}, ..., c_1, c_0]
of det(λI - A) = c_n λ^n + ... + c_0, with c_n = 1. Operates over Q
exactly (no division blow-up beyond the standard Faddeev–LeVerrier 1/k).
"""

from __future__ import annotations

from fractions import Fraction

from .matrix import Matrix


def charpoly(a: Matrix) -> tuple[Fraction, ...]:
    """Characteristic polynomial coefficients, leading first (monic, c_n = 1)."""
    if not a.is_square():
        raise ValueError(f"charpoly requires square matrix, got shape {a.shape}")
    n = a.n_rows
    if n == 0:
        return (Fraction(1),)
    coeffs: list[Fraction] = [Fraction(1)]
    m = Matrix.identity(n)
    for k in range(1, n + 1):
        m = a @ m
        c = -m.trace() / Fraction(k)
        coeffs.append(c)
        # Faddeev step: M_{k+1} starts from M_k + c_k I, then multiply by A next iter.
        if k < n:
            m = Matrix(
                tuple(
                    tuple(m.rows[i][j] + (c if i == j else Fraction(0)) for j in range(n))
                    for i in range(n)
                )
            )
    return tuple(coeffs)
