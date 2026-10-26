"""Frame primitive: finite `PowersetFrame` + `FrameMorphism`.

Realizes corpus objects: `frame`, `powerset-frame`, `frame-morphism`.

A frame is a poset with arbitrary joins, finite meets, and meet distributing
over arbitrary joins. We implement the concrete `PowersetFrame` (subsets of a
finite base set, ordered by ⊂) — the only frame the corpus's finite-cellular
settings need. Generalization to non-powerset frames is a future expansion.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable, Iterator
from dataclasses import dataclass
from itertools import combinations


@dataclass(frozen=True)
class PowersetFrame:
    """The frame of subsets of a finite base set, ordered by inclusion."""

    base: frozenset[Hashable]

    @property
    def top(self) -> frozenset[Hashable]:
        return self.base

    @property
    def bottom(self) -> frozenset[Hashable]:
        return frozenset()

    def elements(self) -> Iterator[frozenset[Hashable]]:
        """Yield all subsets of base. Total count is 2^|base|."""
        items = tuple(self.base)
        for size in range(len(items) + 1):
            for combo in combinations(items, size):
                yield frozenset(combo)

    def meet(self, *items: frozenset[Hashable]) -> frozenset[Hashable]:
        if not items:
            return self.top
        result = items[0]
        for x in items[1:]:
            result = result & x
        return result

    def join(self, *items: frozenset[Hashable]) -> frozenset[Hashable]:
        if not items:
            return self.bottom
        result = items[0]
        for x in items[1:]:
            result = result | x
        return result

    def leq(self, a: frozenset[Hashable], b: frozenset[Hashable]) -> bool:
        return a.issubset(b)

    def __repr__(self) -> str:
        return f"PowersetFrame({set(self.base)!r})"


@dataclass(frozen=True)
class FrameMorphism:
    """A join-preserving function between PowersetFrames.

    For finite powerset frames, right adjoints exist (frames are sup-lattices)
    and are computed by enumeration.
    """

    source: PowersetFrame
    target: PowersetFrame
    mapping: Callable[[frozenset[Hashable]], frozenset[Hashable]]

    def __call__(self, x: frozenset[Hashable]) -> frozenset[Hashable]:
        return self.mapping(x)

    def right_adjoint(self) -> FrameMorphism:
        """Compute the right adjoint f^*: target → source.

        f^*(y) = sup {x ∈ source : f(x) ≤ y}, computed by enumeration.
        """
        source_elements = list(self.source.elements())

        def adjoint(y: frozenset[Hashable]) -> frozenset[Hashable]:
            preimage = [x for x in source_elements if self.target.leq(self.mapping(x), y)]
            return self.source.join(*preimage)

        return FrameMorphism(source=self.target, target=self.source, mapping=adjoint)


def restrict_with(
    source: PowersetFrame,
    target: PowersetFrame,
    clopen: frozenset[Hashable],
) -> FrameMorphism:
    """Construct the restriction-with-clopen morphism `f(x) = x ∩ clopen`."""
    return FrameMorphism(source=source, target=target, mapping=lambda x: x & clopen)
