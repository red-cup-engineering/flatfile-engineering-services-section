"""Cellular sheaf: constant-stalk + Z coefficients (minimal scope).

Realizes corpus objects: `cellular-sheaf`, `constant-sheaf`.

Stalks are sized Z^{n_σ}; restrictions are integer coefficients (1 for identity).
Generalization to richer stalks (frames, d-frames) lives in `frame_valued`.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..combinatorics.simplicial_complex import Simplex, SimplicialComplex
from .cohomology import cohomology_rank as _cohomology_rank


@dataclass(frozen=True)
class ConstantSheaf:
    """The constant sheaf with stalk Z on a simplicial complex."""

    complex: SimplicialComplex

    def cohomology_rank(self, n: int) -> int:
        """Rank of Hⁿ as a Q-vector-space dimension (= Z-rank of free part)."""
        return _cohomology_rank(self.complex, n)


@dataclass(frozen=True)
class CellularSheaf:
    """Z-valued cellular sheaf with arbitrary integer restriction maps.

    For the per-fiber Curry on the Belnap fiber, Pass 1 uses ConstantSheaf;
    later passes will use richer stalk types.
    """

    complex: SimplicialComplex
    stalk_ranks: dict[Simplex, int]
    restrictions: dict[tuple[Simplex, Simplex], int]

    def cohomology_rank(self, n: int) -> int:
        """Compute rank of Hⁿ. Currently supports rank-1 stalks only."""
        for _cell, r in self.stalk_ranks.items():
            if r != 1:
                raise NotImplementedError(
                    "higher-rank cellular sheaves not yet supported"
                )
        return _cohomology_rank(self.complex, n)
