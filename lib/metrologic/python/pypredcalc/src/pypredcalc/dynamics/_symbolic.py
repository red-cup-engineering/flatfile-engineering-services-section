"""Lazy sympy bridge for the optional `[symbolic]` extra.

Importing this module without sympy installed raises a clear error pointing
at the installation hint. Callers should guard the import or rely on
public functions that raise `SymbolicExtraNotInstalled`.
"""

from __future__ import annotations

from .._linalg.matrix import Matrix


class SymbolicExtraNotInstalled(ImportError):
    """Raised when a feature needs sympy but the `[symbolic]` extra is absent."""


def _require_sympy() -> object:
    try:
        import sympy as sp
    except ImportError as exc:
        raise SymbolicExtraNotInstalled(
            "this feature requires sympy; install with `pip install pypredcalc[symbolic]`"
        ) from exc
    return sp


def matrix_to_sympy(m: Matrix) -> object:
    """Convert a `pypredcalc._linalg.Matrix` to a `sympy.Matrix`."""
    sp = _require_sympy()
    return sp.Matrix([list(row) for row in m.rows])  # type: ignore[attr-defined]


def perron_exact_of(m: Matrix) -> object:
    """Exact symbolic Perron–Frobenius eigenvalue (largest |λ|).

    Returns a `sympy.Expr`. Defined for primitive non-negative matrices.
    Use `.evalf()` on the result for a numerical value.
    """
    _require_sympy()
    sm = matrix_to_sympy(m)
    roots = sm.charpoly().all_roots(multiple=True, radicals=False)  # type: ignore[attr-defined]
    return max(roots, key=lambda ev: abs(complex(ev.evalf())))
