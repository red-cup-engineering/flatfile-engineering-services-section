"""Pre-bilattice: two complete lattice orders on a common carrier.

Realizes corpus object: `pre-bilattice`.

A pre-bilattice is a structure ``(L, ≤_t, ≤_k)`` where each order makes
``L`` into a bounded lattice. No interaction axioms between the two orders
are assumed (that is the role of full bilattice / interlaced bilattice
upgrades). Negation is *not* part of the pre-bilattice signature; use
``pypredcalc.algebra.bilattice`` for the negation-equipped FOUR.

Implementation note: this module operationalises the axiom-checker
predicate. For finite carriers it brute-force-validates lattice axioms
over every pair / triple. For infinite carriers, callers must supply
externally-validated orders.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable
from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T", bound=Hashable)


@dataclass(frozen=True)
class PreBilattice(Generic[T]):
    """Finite pre-bilattice on a frozenset carrier.

    The two ``leq`` callables must be reflexive, antisymmetric, transitive,
    and pairwise-meet-and-join total over the carrier (lattice axioms).
    Construction validates these axioms; ``ValueError`` on violation.
    """

    carrier: frozenset[T]
    truth_leq: Callable[[T, T], bool]
    knowledge_leq: Callable[[T, T], bool]

    def __post_init__(self) -> None:
        if not self.carrier:
            raise ValueError("pre-bilattice carrier must be non-empty (bounded lattice)")
        for name, leq in (("truth", self.truth_leq), ("knowledge", self.knowledge_leq)):
            self._validate_partial_order(name, leq)
            self._validate_lattice(name, leq)

    def _validate_partial_order(self, name: str, leq: Callable[[T, T], bool]) -> None:
        for a in self.carrier:
            if not leq(a, a):
                raise ValueError(f"{name} order: reflexivity fails at {a!r}")
        for a in self.carrier:
            for b in self.carrier:
                if leq(a, b) and leq(b, a) and a != b:
                    raise ValueError(f"{name} order: antisymmetry fails at ({a!r}, {b!r})")
                for c in self.carrier:
                    if leq(a, b) and leq(b, c) and not leq(a, c):
                        raise ValueError(
                            f"{name} order: transitivity fails at ({a!r}, {b!r}, {c!r})"
                        )

    def _validate_lattice(self, name: str, leq: Callable[[T, T], bool]) -> None:
        for a in self.carrier:
            for b in self.carrier:
                if self._join(a, b, leq) is None:
                    raise ValueError(f"{name} order: no join for ({a!r}, {b!r})")
                if self._meet(a, b, leq) is None:
                    raise ValueError(f"{name} order: no meet for ({a!r}, {b!r})")

    def _join(self, a: T, b: T, leq: Callable[[T, T], bool]) -> T | None:
        upper = [c for c in self.carrier if leq(a, c) and leq(b, c)]
        for u in upper:
            if all(leq(u, v) for v in upper):
                return u
        return None

    def _meet(self, a: T, b: T, leq: Callable[[T, T], bool]) -> T | None:
        lower = [c for c in self.carrier if leq(c, a) and leq(c, b)]
        for cand in lower:
            if all(leq(v, cand) for v in lower):
                return cand
        return None

    def truth_join(self, a: T, b: T) -> T:
        result = self._join(a, b, self.truth_leq)
        assert result is not None  # guaranteed by _validate_lattice
        return result

    def truth_meet(self, a: T, b: T) -> T:
        result = self._meet(a, b, self.truth_leq)
        assert result is not None
        return result

    def knowledge_join(self, a: T, b: T) -> T:
        result = self._join(a, b, self.knowledge_leq)
        assert result is not None
        return result

    def knowledge_meet(self, a: T, b: T) -> T:
        result = self._meet(a, b, self.knowledge_leq)
        assert result is not None
        return result
