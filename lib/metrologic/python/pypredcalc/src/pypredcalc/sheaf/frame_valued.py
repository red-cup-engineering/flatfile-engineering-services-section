"""Frame-valued cellular sheaf (Čech parallel-pair convention).

Realizes corpus object: `frame-valued-cellular-sheaf`.

In the per-fiber Curry investigation on the Belnap fiber, the L⁺ shadow sheaf
has powerset-frame stalks and restriction-with-clopen morphisms. This module
provides H⁰ (global sections) by enumeration and H₀ of the cosheaf side via
union-find.

Conventions (matching the corpus markdown):
- Stalk at a higher cell σ = stalk at the smallest vertex of σ's chain.
- Sheaf restriction from V_y (with x < y) to E_{xy} = the lattice restriction
  F(V_y) → F(V_x).
- Cosheaf extension is the right adjoint of the corresponding sheaf restriction.
"""

from __future__ import annotations

from collections.abc import Hashable
from dataclasses import dataclass
from itertools import product

from ..combinatorics.simplicial_complex import Simplex, SimplicialComplex
from ..lattice.frame import FrameMorphism, PowersetFrame

_Element = tuple[Simplex, frozenset[Hashable]]
_Section = tuple[tuple[Simplex, frozenset[Hashable]], ...]


@dataclass(frozen=True)
class FrameValuedSheaf:
    """Cellular sheaf on a simplicial complex with PowersetFrame stalks at vertices."""

    complex: SimplicialComplex
    vertex_stalks: dict[Simplex, PowersetFrame]
    vertex_restrictions: dict[tuple[Simplex, Simplex], FrameMorphism]

    def stalk_at(self, simplex: Simplex) -> PowersetFrame:
        """Stalk at any cell, using the parallel-pair convention."""
        smallest_vertex = Simplex((simplex.vertices[0],))
        return self.vertex_stalks[smallest_vertex]

    def edge_restriction_from_left(self, edge: Simplex) -> FrameMorphism:
        """For edge e = (x < y), restriction F(V_x) → F(e) is identity."""
        v_x = Simplex((edge.vertices[0],))
        return _identity_morphism(self.vertex_stalks[v_x])

    def edge_restriction_from_right(self, edge: Simplex) -> FrameMorphism:
        """For edge e = (x < y), restriction F(V_y) → F(e) is the lattice
        restriction F(V_y) → F(V_x)."""
        v_x = Simplex((edge.vertices[0],))
        v_y = Simplex((edge.vertices[1],))
        return self.vertex_restrictions[(v_x, v_y)]

    def global_sections(self) -> set[_Section]:
        """H⁰ by enumeration: tuples of stalk-elements satisfying restriction-coherence."""
        vertices = self.complex.cells(0)
        edges = self.complex.cells(1)

        all_stalks = [self.vertex_stalks[v] for v in vertices]
        all_choices = product(*[list(s.elements()) for s in all_stalks])

        result: set[_Section] = set()
        for choice in all_choices:
            assignment = dict(zip(vertices, choice, strict=True))
            if self._is_global_section(assignment, edges):
                result.add(tuple((v, assignment[v]) for v in vertices))
        return result

    def _is_global_section(
        self,
        assignment: dict[Simplex, frozenset[Hashable]],
        edges: list[Simplex],
    ) -> bool:
        for edge in edges:
            v_x = Simplex((edge.vertices[0],))
            v_y = Simplex((edge.vertices[1],))
            left = self.edge_restriction_from_left(edge)(assignment[v_x])
            right = self.edge_restriction_from_right(edge)(assignment[v_y])
            if left != right:
                return False
        return True

    def cosheaf_h0(self) -> dict[frozenset[_Element], int]:
        """H₀ of the cosheaf side: identifications via right adjoints, union-find."""
        vertices = self.complex.cells(0)
        edges = self.complex.cells(1)

        elements: set[_Element] = set()
        for v in vertices:
            for x in self.vertex_stalks[v].elements():
                elements.add((v, x))

        parent: dict[_Element, _Element] = {e: e for e in elements}

        def find(x: _Element) -> _Element:
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        def union(a: _Element, b: _Element) -> None:
            ra, rb = find(a), find(b)
            if ra != rb:
                key_a = (str(ra[0].vertices), str(sorted(ra[1], key=str)))
                key_b = (str(rb[0].vertices), str(sorted(rb[1], key=str)))
                if key_a < key_b:
                    parent[rb] = ra
                else:
                    parent[ra] = rb

        for edge in edges:
            v_x = Simplex((edge.vertices[0],))
            v_y = Simplex((edge.vertices[1],))
            sheaf_restriction = self.vertex_restrictions[(v_x, v_y)]
            extension_y = sheaf_restriction.right_adjoint()
            for z in self.vertex_stalks[v_x].elements():
                union((v_x, z), (v_y, extension_y(z)))

        classes: dict[_Element, set[_Element]] = {}
        for e in elements:
            r = find(e)
            classes.setdefault(r, set()).add(e)

        return {frozenset(s): len(s) for s in classes.values()}


def _identity_morphism(frame: PowersetFrame) -> FrameMorphism:
    return FrameMorphism(source=frame, target=frame, mapping=lambda x: x)
