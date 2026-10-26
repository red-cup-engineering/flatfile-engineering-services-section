"""Finite Priestley duality (Birkhoff representation).

Realizes corpus object: `priestley-space`.

For a **finite** bounded distributive lattice ``L``, Birkhoff's
representation theorem gives an order isomorphism

    L  ≅  DownSets(J(L))

where ``J(L)`` is the poset of join-irreducible elements of ``L``
ordered by the lattice's restriction to ``J(L)``. The dual operation
takes a finite poset ``P`` to its lattice of down-sets, ordered by
inclusion.

This module realises both directions for the finite case. The full
Priestley duality (compact totally-order-disconnected spaces ↔ bounded
distributive lattices) requires topological completion and is out of
scope for the zero-dependency core; finite Birkhoff is sufficient for
the cellular settings the corpus targets.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable
from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T", bound=Hashable)


@dataclass(frozen=True)
class FiniteDistributiveLattice(Generic[T]):
    """A finite bounded distributive lattice on an explicit carrier.

    Construction validates that ``join`` and ``meet`` are closed,
    commutative, associative, absorptive, and that meet distributes
    over join. ``leq`` is derived as ``a ≤ b iff a ∨ b = b``.
    """

    carrier: frozenset[T]
    join: Callable[[T, T], T]
    meet: Callable[[T, T], T]

    def __post_init__(self) -> None:
        if not self.carrier:
            raise ValueError("distributive lattice carrier must be non-empty")
        for a in self.carrier:
            for b in self.carrier:
                j = self.join(a, b)
                m = self.meet(a, b)
                if j not in self.carrier or m not in self.carrier:
                    raise ValueError(f"join/meet not closed at ({a!r}, {b!r})")
                if self.join(b, a) != j or self.meet(b, a) != m:
                    raise ValueError(f"join/meet not commutative at ({a!r}, {b!r})")
                if self.join(a, self.meet(a, b)) != a:
                    raise ValueError(f"absorption fails at ({a!r}, {b!r})")
                if self.meet(a, self.join(a, b)) != a:
                    raise ValueError(f"dual absorption fails at ({a!r}, {b!r})")
                if self.join(a, a) != a:
                    raise ValueError(f"join idempotence fails at {a!r}")
                if self.meet(a, a) != a:
                    raise ValueError(f"meet idempotence fails at {a!r}")
                for c in self.carrier:
                    if self.join(self.join(a, b), c) != self.join(a, self.join(b, c)):
                        raise ValueError(
                            f"join associativity fails at ({a!r}, {b!r}, {c!r})"
                        )
                    if self.meet(self.meet(a, b), c) != self.meet(a, self.meet(b, c)):
                        raise ValueError(
                            f"meet associativity fails at ({a!r}, {b!r}, {c!r})"
                        )
                for c in self.carrier:
                    if self.meet(a, self.join(b, c)) != self.join(
                        self.meet(a, b), self.meet(a, c)
                    ):
                        raise ValueError(
                            f"distributivity fails at ({a!r}, {b!r}, {c!r})"
                        )

    def leq(self, a: T, b: T) -> bool:
        return self.join(a, b) == b

    def is_join_irreducible(self, x: T) -> bool:
        """``x`` is join-irreducible iff ``x = a ∨ b`` implies ``x = a`` or ``x = b``,
        and ``x`` is not the bottom element."""
        below = [y for y in self.carrier if self.leq(y, x) and y != x]
        if not below:
            return False  # x is the bottom
        for a in self.carrier:
            for b in self.carrier:
                if self.join(a, b) == x and a != x and b != x:
                    return False
        return True

    def join_irreducibles(self) -> frozenset[T]:
        return frozenset(x for x in self.carrier if self.is_join_irreducible(x))


@dataclass(frozen=True)
class FinitePriestleySpace(Generic[T]):
    """The finite Priestley dual of a distributive lattice.

    Carrier is the set of join-irreducibles ``J(L)``; order is the
    restriction of the lattice order. Recovered lattice elements are in
    bijection with **down-sets** of ``J(L)``.
    """

    points: frozenset[T]
    leq: Callable[[T, T], bool]

    def down_sets(self) -> frozenset[frozenset[T]]:
        """Enumerate every down-set (= every recovered lattice element)."""
        elements = sorted(self.points, key=hash)
        n = len(elements)
        result: set[frozenset[T]] = set()
        for mask in range(1 << n):
            subset = frozenset(elements[i] for i in range(n) if mask & (1 << i))
            if all(
                (y in subset) for x in subset for y in self.points if self.leq(y, x)
            ):
                result.add(subset)
        return frozenset(result)


def priestley_dual(lattice: FiniteDistributiveLattice[T]) -> FinitePriestleySpace[T]:
    """Birkhoff dual: ``L ↦ J(L)`` with restricted order."""
    points = lattice.join_irreducibles()
    leq = lattice.leq
    return FinitePriestleySpace(points=points, leq=leq)


def lattice_from_poset(
    points: frozenset[T], leq: Callable[[T, T], bool]
) -> FiniteDistributiveLattice[frozenset[T]]:
    """Birkhoff dual: ``P ↦ DownSets(P)`` with set-theoretic ∪ and ∩.

    The empty poset is permitted: it dualises to the one-element lattice
    ``{∅}`` (so the duality round-trips on the trivial lattice).
    """
    elements = sorted(points, key=hash)
    n = len(elements)
    down_sets: set[frozenset[T]] = {frozenset()}
    for mask in range(1 << n):
        subset = frozenset(elements[i] for i in range(n) if mask & (1 << i))
        if all(
            (y in subset) for x in subset for y in points if leq(y, x)
        ):
            down_sets.add(subset)
    return FiniteDistributiveLattice(
        carrier=frozenset(down_sets),
        join=lambda a, b: a | b,
        meet=lambda a, b: a & b,
    )
