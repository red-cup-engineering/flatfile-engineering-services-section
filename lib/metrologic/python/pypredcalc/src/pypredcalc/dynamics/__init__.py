"""Substitution and settling dynamics.

Realized:
- `substitution` — `SubstitutionMatrix` (regime classification, Smith
  invariants, Perron spectrum, per-letter d-frame shadow accounting).
- `instances` — corpus benchmark instances: Fibonacci, Thue-Morse, Padovan,
  Tribonacci, Tetranacci with their default bilattice valuations.
- `closure` — `ClosureOperator`, `FiberClosureRule`, `CellAtom`,
  `CellConsequent`: the quantifier-free fragment of the
  closure-rule-language as a closure operator on cross-fiber valuations.

Stubs:
- `settling`, `cosettling` — settling/cosettling dynamics in their full form
  (multi-valued cells, transfinite ordinals, Lorentzian/stochastic regimes).
"""

from .closure import CellAtom, CellConsequent, ClosureOperator, FiberClosureRule
from .instances import (
    FIBONACCI,
    FIBONACCI_DEFAULT_VALUATION,
    PADOVAN,
    PADOVAN_DEFAULT_VALUATION,
    TETRANACCI,
    TETRANACCI_DEFAULT_VALUATION,
    THUE_MORSE,
    THUE_MORSE_DEFAULT_VALUATION,
    TRIBONACCI,
    TRIBONACCI_DEFAULT_VALUATION,
)
from .settling import IncrementSequence, PredicationSettling
from .substitution import SubstitutionMatrix

__all__ = [
    "CellAtom",
    "CellConsequent",
    "ClosureOperator",
    "FIBONACCI",
    "FIBONACCI_DEFAULT_VALUATION",
    "FiberClosureRule",
    "IncrementSequence",
    "PADOVAN",
    "PADOVAN_DEFAULT_VALUATION",
    "PredicationSettling",
    "SubstitutionMatrix",
    "TETRANACCI",
    "TETRANACCI_DEFAULT_VALUATION",
    "THUE_MORSE",
    "THUE_MORSE_DEFAULT_VALUATION",
    "TRIBONACCI",
    "TRIBONACCI_DEFAULT_VALUATION",
]
