"""Zero-dependency linear algebra over the rationals.

Internal module — exact-arithmetic primitives over `fractions.Fraction`,
plus a numerical eigenvalue solver for Pisot-spectrum diagnostics. All public
pypredcalc APIs that need linear algebra route through here; sympy is no longer a
runtime dependency.
"""

from .charpoly import charpoly
from .determinant import det, rank
from .eigenvalues import ConvergenceError, eigenvalues_numeric, spectral_radius
from .inverse import inverse, solve
from .matrix import Matrix
from .smith import integer_rank, smith_normal_form

__all__ = [
    "ConvergenceError",
    "Matrix",
    "charpoly",
    "det",
    "eigenvalues_numeric",
    "integer_rank",
    "inverse",
    "rank",
    "smith_normal_form",
    "solve",
    "spectral_radius",
]
