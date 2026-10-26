"""Numerical eigenvalues via Durand–Kerner on the characteristic polynomial.

For substitution-matrix regime classification we need the spectral radius
(Perron eigenvalue) and a numerical witness of dominance. Durand–Kerner is a
~30-line all-roots solver with cubic local convergence; sufficient for the
small (≤ 8×8) primitive matrices that arise in the corpus's benchmark suite.

Convergence: Durand–Kerner converges slowly (linearly) on multiple roots.
Pass ``strict=True`` to raise `ConvergenceError` if the tolerance is not met
within ``max_iter`` iterations. The default permissive mode returns the
last iterate without raising.

For exact symbolic Perron eigenvalues of substitution matrices, install the
optional ``[symbolic]`` extra and use
``pypredcalc.dynamics.substitution.SubstitutionMatrix.perron_exact``.
"""

from __future__ import annotations

from collections.abc import Sequence

from .charpoly import charpoly
from .matrix import Matrix

Complex = complex


class ConvergenceError(RuntimeError):
    """Raised by `eigenvalues_numeric(..., strict=True)` when Durand–Kerner
    fails to reach the requested tolerance within ``max_iter`` iterations."""


def _eval_poly(coeffs: Sequence[Complex], z: Complex) -> Complex:
    """Horner evaluation. `coeffs` ordered leading-first (c_n, ..., c_0)."""
    result: Complex = 0j
    for c in coeffs:
        result = result * z + c
    return result


def _all_roots_durand_kerner(
    coeffs: Sequence[Complex],
    max_iter: int = 200,
    tol: float = 1e-12,
    strict: bool = False,
) -> list[Complex]:
    n = len(coeffs) - 1
    if n <= 0:
        return []
    leading = coeffs[0]
    if leading == 0:
        raise ValueError("non-monic-or-zero leading coefficient")
    bound = 1.0 + max((abs(c / leading) for c in coeffs[1:]), default=0.0)
    seed = 0.4 + 0.9j
    roots: list[Complex] = [bound * (seed**k) for k in range(n)]
    last_max_delta = float("inf")
    for _ in range(max_iter):
        new_roots: list[Complex] = []
        max_delta = 0.0
        for i, ri in enumerate(roots):
            denom: Complex = leading
            for j, rj in enumerate(roots):
                if i != j:
                    denom *= (ri - rj)
            if denom == 0:
                new_roots.append(ri)
                continue
            delta = _eval_poly(coeffs, ri) / denom
            new_roots.append(ri - delta)
            if abs(delta) > max_delta:
                max_delta = abs(delta)
        roots = new_roots
        last_max_delta = max_delta
        if max_delta < tol:
            return roots
    if strict:
        raise ConvergenceError(
            f"Durand-Kerner did not converge within {max_iter} iterations; "
            f"last max-delta = {last_max_delta:.3e} (tol = {tol:.3e}). "
            f"This is typical for polynomials with multiple/clustered roots."
        )
    return roots


def eigenvalues_numeric(
    a: Matrix,
    *,
    max_iter: int = 200,
    tol: float = 1e-12,
    strict: bool = False,
) -> list[Complex]:
    """Numerical eigenvalues of a square matrix (Durand–Kerner on char-poly).

    Parameters
    ----------
    a : Matrix
        Square rational matrix.
    max_iter : int
        Maximum Durand–Kerner iterations.
    tol : float
        Convergence tolerance on the per-iteration root displacement.
    strict : bool
        If True, raise `ConvergenceError` when ``max_iter`` is exhausted
        without reaching ``tol``. Otherwise return the last iterate.
    """
    poly = [complex(c) for c in charpoly(a)]
    return _all_roots_durand_kerner(poly, max_iter=max_iter, tol=tol, strict=strict)


def spectral_radius(a: Matrix, *, max_iter: int = 200, tol: float = 1e-12) -> float:
    """Largest |λ| over the spectrum, numerically."""
    eigs = eigenvalues_numeric(a, max_iter=max_iter, tol=tol)
    if not eigs:
        return 0.0
    return max(abs(e) for e in eigs)
