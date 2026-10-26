"""Layer-0 algebraic carriers for predication-native computation.

Realized:
- `bilattice` — four-element Belnap bilattice FOUR.
- `pre_bilattice` — finite pre-bilattice axiom-checker.
- `twist_product` — Ginsberg's L⋈L; `boolean_twist()` recovers FOUR.
- `residuated_lattice` — finite commutative integral residuated lattice
  axiom-checker with derived residuum; `boolean_residuated_lattice()`
  gives the two-element Boolean case.
"""

from .bilattice import (
    BilatticeValue,
    fusion,
    knowledge_join,
    knowledge_leq,
    knowledge_meet,
    negate,
    negation_permutation,
    truth_join,
    truth_leq,
    truth_meet,
)
from .pre_bilattice import PreBilattice
from .residuated_lattice import ResiduatedLattice, boolean_residuated_lattice
from .twist_product import TwistBilattice, boolean_twist

__all__ = [
    "BilatticeValue",
    "PreBilattice",
    "ResiduatedLattice",
    "TwistBilattice",
    "boolean_residuated_lattice",
    "boolean_twist",
    "fusion",
    "knowledge_join",
    "knowledge_leq",
    "knowledge_meet",
    "negate",
    "negation_permutation",
    "truth_join",
    "truth_leq",
    "truth_meet",
]
