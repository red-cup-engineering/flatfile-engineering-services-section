"""Pre-defined corpus substitution instances and their default valuations.

These match `tools/anderson-putnam-cohomology/` and `tools/regime-classifier/`'s
SUBSTITUTIONS dict, and the Step 1 valuations of each `examples/benchmark-N-*.md`.
"""

from __future__ import annotations

from .._linalg import Matrix
from ..algebra.bilattice import BilatticeValue
from .substitution import SubstitutionMatrix

FIBONACCI = SubstitutionMatrix(Matrix.from_rows([[1, 1], [1, 0]]))
"""Fibonacci substitution: σ(a)=ab, σ(b)=a. Unimodular (det = -1)."""

THUE_MORSE = SubstitutionMatrix(Matrix.from_rows([[1, 1], [1, 1]]))
"""Thue-Morse substitution: σ(a)=ab, σ(b)=ba. Singular (det = 0)."""

PADOVAN = SubstitutionMatrix(
    Matrix.from_rows([[0, 1, 0], [0, 0, 1], [1, 1, 0]])
)
"""Padovan substitution. Unimodular (det = 1)."""

TRIBONACCI = SubstitutionMatrix(
    Matrix.from_rows([[1, 1, 0], [1, 0, 1], [1, 0, 0]])
)
"""Tribonacci substitution. Unimodular."""

TETRANACCI = SubstitutionMatrix(
    Matrix.from_rows(
        [[1, 1, 0, 0], [1, 0, 1, 0], [1, 0, 0, 1], [1, 0, 0, 0]]
    )
)
"""Tetranacci substitution. Unimodular."""


FIBONACCI_DEFAULT_VALUATION = {0: BilatticeValue.T, 1: BilatticeValue.F}
"""Fibonacci default: a → t, b → f."""

THUE_MORSE_DEFAULT_VALUATION = {0: BilatticeValue.F, 1: BilatticeValue.T}
"""Thue-Morse default: 0 → f, 1 → t.

The unique labeling of {0, 1} → {t, f} under which σ commutes with bilattice
negation: M·P = P·M where P is the swap permutation."""

PADOVAN_DEFAULT_VALUATION = {
    0: BilatticeValue.T,
    1: BilatticeValue.F,
    2: BilatticeValue.TOP,
}
"""Padovan default: a → t, b → f, c → top."""

TRIBONACCI_DEFAULT_VALUATION = {
    0: BilatticeValue.T,
    1: BilatticeValue.F,
    2: BilatticeValue.TOP,
}
"""Tribonacci default: a → t, b → f, c → top."""

TETRANACCI_DEFAULT_VALUATION = {
    0: BilatticeValue.BOT,
    1: BilatticeValue.T,
    2: BilatticeValue.F,
    3: BilatticeValue.TOP,
}
"""Tetranacci default: a → bot, b → t, c → f, d → top.

The unique named substitution where every bilattice value is represented
exactly once — the cardinality boundary of step-n-and-bilattice correspondence."""
