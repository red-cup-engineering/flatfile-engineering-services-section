"""Topological primitives for predication-native settings.

Realized:
- `alexandrov` — finite Alexandrov topology on a preorder, with
  `specialisation_preorder` recovering the preorder from the opens.
- `priestley` — finite Birkhoff duality between bounded distributive
  lattices and finite posets via `priestley_dual` and
  `lattice_from_poset`.
- `transfinite_cell_complex` — `TransfiniteCellComplex` for ω-bounded
  cell complexes with stage-indexed cell attachment, skeleton
  computation, and the transfinite-induction witness.
"""

from .alexandrov import AlexandrovTopology, specialisation_preorder
from .priestley import (
    FiniteDistributiveLattice,
    FinitePriestleySpace,
    lattice_from_poset,
    priestley_dual,
)
from .transfinite_cell_complex import (
    TransfiniteCellComplex,
    TransfiniteInductionWitness,
)

__all__ = [
    "AlexandrovTopology",
    "FiniteDistributiveLattice",
    "FinitePriestleySpace",
    "TransfiniteCellComplex",
    "TransfiniteInductionWitness",
    "lattice_from_poset",
    "priestley_dual",
    "specialisation_preorder",
]
