"""Finite poset and its order complex.

Realizes corpus objects: `poset`, `order-complex`.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable
from dataclasses import dataclass
from itertools import combinations, permutations


@dataclass(frozen=True)
class Poset:
    """A finite poset: an iterable of elements + a `≤` predicate.

    Construction validates antisymmetry and transitivity (reflexivity is
    trusted; if `leq(a, a)` doesn't hold for some `a`, that's the caller's
    bug).
    """

    elements: frozenset[Hashable]
    leq: Callable[[Hashable, Hashable], bool]

    def __post_init__(self) -> None:
        elts = list(self.elements)
        for a in elts:
            assert self.leq(a, a), f"reflexivity fails at {a!r}"
        for a in elts:
            for b in elts:
                if self.leq(a, b) and self.leq(b, a) and a != b:
                    raise ValueError(
                        f"antisymmetry fails: {a!r} ≤ {b!r} and {b!r} ≤ {a!r} but a ≠ b"
                    )
                if self.leq(a, b):
                    for c in elts:
                        if self.leq(b, c) and not self.leq(a, c):
                            raise ValueError(
                                f"transitivity fails: {a!r} ≤ {b!r} ≤ {c!r} "
                                f"but ¬({a!r} ≤ {c!r})"
                            )

    def chains(self, length: int) -> list[tuple[Hashable, ...]]:
        """Return all strictly-ascending chains of the given length."""
        if length < 1:
            return []
        if length == 1:
            return [(e,) for e in self.elements]
        result: list[tuple[Hashable, ...]] = []
        for combo in combinations(self.elements, length):
            for perm in permutations(combo):
                if self._is_strict_chain(perm):
                    result.append(perm)
        return result

    def _is_strict_chain(self, sequence: tuple[Hashable, ...]) -> bool:
        return all(
            self.leq(sequence[i], sequence[i + 1]) and sequence[i] != sequence[i + 1]
            for i in range(len(sequence) - 1)
        )


@dataclass(frozen=True)
class OrderComplex:
    """The order complex of a poset: simplicial complex whose k-simplices are
    strictly-ascending chains of length k+1 in the poset.
    """

    poset: Poset

    def cells(self, dim: int) -> list[tuple[Hashable, ...]]:
        return self.poset.chains(dim + 1)

    def dimension(self) -> int:
        for d in range(len(self.poset.elements), -1, -1):
            if self.cells(d):
                return d
        return -1

    def faces(self, simplex: tuple[Hashable, ...]) -> list[tuple[Hashable, ...]]:
        if len(simplex) <= 1:
            return []
        return [tuple(simplex[:i] + simplex[i + 1:]) for i in range(len(simplex))]
