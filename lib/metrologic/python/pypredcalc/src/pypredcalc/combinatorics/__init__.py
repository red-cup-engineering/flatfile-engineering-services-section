"""Order- and complex-theoretic combinatorial primitives.

Realized:
- `poset` — finite poset and its order complex.
- `simplicial_complex` — finite simplicial complex with face structure.
- `closure_rule` — closure-rule systems with forward and backward operators.
"""

from .closure_rule import ClosureRuleSystem, Rule, State, rule
from .poset import OrderComplex, Poset
from .simplicial_complex import Simplex, SimplicialComplex

__all__ = [
    "ClosureRuleSystem",
    "OrderComplex",
    "Poset",
    "Rule",
    "Simplex",
    "SimplicialComplex",
    "State",
    "rule",
]
