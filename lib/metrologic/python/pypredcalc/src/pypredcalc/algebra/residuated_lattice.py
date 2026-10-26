"""Commutative integral residuated lattice on a finite carrier.

Realizes corpus object: `residuated-lattice`.

A commutative integral residuated lattice is a structure
``(L, ≤, ∧, ∨, ⊗, →, 1)`` where:

- ``(L, ≤, ∧, ∨)`` is a bounded lattice.
- ``(L, ⊗, 1)`` is a commutative monoid with unit ``1`` equal to the top
  element of the lattice (integrality).
- Residuation: ``a ⊗ b ≤ c`` iff ``b ≤ a → c`` (equivalently, ``a → -``
  is right adjoint to ``a ⊗ -``).

The Q-enriched-sheaf primitives are parameterised by such a lattice.
This module ships a finite axiom-checker and a derived ``residuum``
function. Construction validates closure of operations on the carrier,
the partial-order axioms of ``leq``, true least-upper / greatest-lower
characterisations of ``join`` / ``meet``, monoid associativity and
commutativity, integrality of the unit, monotonicity of ``⊗``, and the
full residuation biconditional ``a ⊗ b ≤ c iff b ≤ a → c``.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable
from dataclasses import dataclass
from typing import Generic, TypeVar

from .._realizes import realizes

T = TypeVar("T", bound=Hashable)


@realizes("objects/residuated-lattice")
@dataclass(frozen=True)
class ResiduatedLattice(Generic[T]):
    """Finite commutative integral residuated lattice."""

    carrier: frozenset[T]
    leq: Callable[[T, T], bool]
    join: Callable[[T, T], T]
    meet: Callable[[T, T], T]
    tensor: Callable[[T, T], T]
    unit: T

    def __post_init__(self) -> None:
        if not self.carrier:
            raise ValueError("residuated-lattice carrier must be non-empty")
        if self.unit not in self.carrier:
            raise ValueError(f"unit {self.unit!r} not in carrier")
        self._validate_partial_order()
        self._validate_closure_and_lattice()
        self._validate_monoid()
        self._validate_unit_is_top()
        self._validate_monotone_tensor()
        self._validate_residuation()

    def _validate_partial_order(self) -> None:
        for a in self.carrier:
            if not self.leq(a, a):
                raise ValueError(f"order: reflexivity fails at {a!r}")
        for a in self.carrier:
            for b in self.carrier:
                if self.leq(a, b) and self.leq(b, a) and a != b:
                    raise ValueError(f"order: antisymmetry fails at ({a!r}, {b!r})")
                for c in self.carrier:
                    if self.leq(a, b) and self.leq(b, c) and not self.leq(a, c):
                        raise ValueError(
                            f"order: transitivity fails at ({a!r}, {b!r}, {c!r})"
                        )

    def _validate_closure_and_lattice(self) -> None:
        for a in self.carrier:
            for b in self.carrier:
                j = self.join(a, b)
                m = self.meet(a, b)
                if j not in self.carrier:
                    raise ValueError(f"join: {a!r} ∨ {b!r} = {j!r} not in carrier")
                if m not in self.carrier:
                    raise ValueError(f"meet: {a!r} ∧ {b!r} = {m!r} not in carrier")
                if not (self.leq(a, j) and self.leq(b, j)):
                    raise ValueError(f"join: not upper bound at ({a!r}, {b!r})")
                if not (self.leq(m, a) and self.leq(m, b)):
                    raise ValueError(f"meet: not lower bound at ({a!r}, {b!r})")
                # True LUB: every common upper bound dominates the join.
                for c in self.carrier:
                    if self.leq(a, c) and self.leq(b, c) and not self.leq(j, c):
                        raise ValueError(
                            f"join: not LEAST upper bound — {c!r} is upper bound "
                            f"of ({a!r}, {b!r}) but {j!r} ≰ {c!r}"
                        )
                    if self.leq(c, a) and self.leq(c, b) and not self.leq(c, m):
                        raise ValueError(
                            f"meet: not GREATEST lower bound — {c!r} is lower "
                            f"bound of ({a!r}, {b!r}) but {c!r} ≰ {m!r}"
                        )

    def _validate_monoid(self) -> None:
        for a in self.carrier:
            for b in self.carrier:
                t = self.tensor(a, b)
                if t not in self.carrier:
                    raise ValueError(f"tensor: {a!r} ⊗ {b!r} = {t!r} not in carrier")
                if t != self.tensor(b, a):
                    raise ValueError(f"tensor: not commutative at ({a!r}, {b!r})")
                for c in self.carrier:
                    lhs = self.tensor(self.tensor(a, b), c)
                    rhs = self.tensor(a, self.tensor(b, c))
                    if lhs != rhs:
                        raise ValueError(
                            f"tensor: not associative at ({a!r}, {b!r}, {c!r})"
                        )

    def _validate_unit_is_top(self) -> None:
        for a in self.carrier:
            if self.tensor(self.unit, a) != a:
                raise ValueError(f"unit: {self.unit!r} ⊗ {a!r} ≠ {a!r}")
            if not self.leq(a, self.unit):
                raise ValueError(
                    f"integrality: unit {self.unit!r} must be top, but {a!r} ≰ unit"
                )

    def _validate_monotone_tensor(self) -> None:
        for a in self.carrier:
            for b in self.carrier:
                if not self.leq(a, b):
                    continue
                for c in self.carrier:
                    if not self.leq(self.tensor(a, c), self.tensor(b, c)):
                        raise ValueError(
                            f"tensor: not monotone — {a!r} ≤ {b!r} but "
                            f"{a!r}⊗{c!r} ≰ {b!r}⊗{c!r}"
                        )

    def _validate_residuation(self) -> None:
        # Existence of greatest x with a⊗x ≤ c, plus full adjunction.
        for a in self.carrier:
            for c in self.carrier:
                upper = [x for x in self.carrier if self.leq(self.tensor(a, x), c)]
                if not upper:
                    raise ValueError(
                        f"residuation: no x with {a!r}⊗x ≤ {c!r}; "
                        "carrier likely missing bottom"
                    )
                greatest = upper[0]
                for x in upper[1:]:
                    greatest = self.join(greatest, x)
                if not all(self.leq(x, greatest) for x in upper):
                    raise ValueError(
                        f"residuation adjunction fails at ({a!r}, {c!r}): "
                        f"upper-set has no greatest element"
                    )
        # Verify the biconditional explicitly across all triples.
        for a in self.carrier:
            for b in self.carrier:
                for c in self.carrier:
                    lhs = self.leq(self.tensor(a, b), c)
                    rhs = self.leq(b, self.residuum(a, c))
                    if lhs != rhs:
                        raise ValueError(
                            f"residuation biconditional fails at "
                            f"({a!r}, {b!r}, {c!r}): a⊗b≤c is {lhs}, "
                            f"b≤(a→c) is {rhs}"
                        )

    def residuum(self, a: T, c: T) -> T:
        """Compute ``a → c`` as the largest ``x`` with ``a ⊗ x ≤ c``."""
        upper = [x for x in self.carrier if self.leq(self.tensor(a, x), c)]
        result = upper[0]
        for x in upper[1:]:
            result = self.join(result, x)
        return result


def boolean_residuated_lattice() -> ResiduatedLattice[int]:
    """The two-element Boolean lattice as a residuated lattice (⊗ = ∧, → = material implication)."""
    return ResiduatedLattice(
        carrier=frozenset([0, 1]),
        leq=lambda a, b: a <= b,
        join=lambda a, b: max(a, b),
        meet=lambda a, b: min(a, b),
        tensor=lambda a, b: min(a, b),
        unit=1,
    )
