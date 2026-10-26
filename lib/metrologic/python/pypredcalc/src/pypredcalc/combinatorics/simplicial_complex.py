"""Finite simplicial complex with explicit face structure.

Realizes corpus object: `simplicial-complex`. Z-coefficient cohomology
lives in `pypredcalc.sheaf.cohomology` (not here): cohomology is a derived
construction, not part of the carrier.
"""

from __future__ import annotations

from collections.abc import Hashable
from dataclasses import dataclass


@dataclass(frozen=True)
class Simplex:
    """A simplex: a tuple of vertices + dimension."""

    vertices: tuple[Hashable, ...]

    @property
    def dim(self) -> int:
        return len(self.vertices) - 1

    def faces(self) -> list[Simplex]:
        """Return the codim-1 faces: simplices obtained by omitting one vertex."""
        if self.dim < 1:
            return []
        return [
            Simplex(tuple(self.vertices[:i] + self.vertices[i + 1:]))
            for i in range(len(self.vertices))
        ]

    def __repr__(self) -> str:
        return f"Simplex({self.vertices})"


@dataclass(frozen=True)
class SimplicialComplex:
    """A finite simplicial complex: a set of Simplex objects, closed under faces."""

    simplices: frozenset[Simplex]

    def __post_init__(self) -> None:
        for s in self.simplices:
            for face in s.faces():
                if face not in self.simplices:
                    raise ValueError(
                        f"complex not closed under faces: {s} has face {face} missing"
                    )

    def cells(self, dim: int) -> list[Simplex]:
        """Return all dim-dimensional cells, in deterministic order."""
        return sorted([s for s in self.simplices if s.dim == dim], key=lambda s: s.vertices)

    def dimension(self) -> int:
        return max((s.dim for s in self.simplices), default=-1)
