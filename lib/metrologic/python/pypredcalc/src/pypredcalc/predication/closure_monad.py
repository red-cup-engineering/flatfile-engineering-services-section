"""Closure 2-monad on the predication-fibration 2-category.

Realises corpus morphism ``closure-2-monad``: given a 𝒞-natural closure
operator ``cl``, the 2-functor

    Cl : PrFib(L, C, E) → PrFib(L, C, E),    Cl(E)_q := cl_q(E_q)

with unit ``η : 1 ⇒ Cl`` (the inflationary inclusion ``v ≤_k cl(v)``)
and multiplication ``μ : Cl² ⇒ Cl`` (the nested-closure collapse,
identity in the strict-idempotent case).

In our model the predication fibration is presented as a
``(hyperdoctrine, cross-fiber valuation)`` pair: the hyperdoctrine is
the framework (categories, domains, bilattice) and the valuation is
the assignment ``Π → A_·``. ``Cl`` operates on the valuation while
leaving the framework fixed.

Algebra structure. A Cl-algebra is a fibration whose chosen valuation
is a fixed point of ``cl`` — equivalently, by corpus theorem
``closure-algebras-are-c-closed``, a fibration whose state is closed
under 𝒞-inference. :func:`is_cl_algebra` produces a structural
:class:`ClAlgebraWitness` recording ``cl(v)`` alongside ``v`` so the
caller can localise any failure cell.
"""

from __future__ import annotations

from collections.abc import Hashable, Iterable, Mapping
from dataclasses import dataclass
from typing import Generic, TypeVar

from .._realizes import realizes
from .closure_rule_system import (
    CrossFiberClosureOperator,
    cross_fiber_knowledge_leq,
)
from .fiber_valuation import FiberValuation

T = TypeVar("T", bound=Hashable)


# ---- Structural witnesses -------------------------------------------------


@dataclass(frozen=True)
class ClUnitWitness(Generic[T]):
    """Witness for the unit ``η_v : v ⇒ Cl(v)`` — inflationarity check.

    ``holds`` iff ``v ≤_k cl(v)`` pointwise across every fiber.
    """

    before: Mapping[Hashable, FiberValuation[T]]
    after: Mapping[Hashable, FiberValuation[T]]

    @property
    def holds(self) -> bool:
        return cross_fiber_knowledge_leq(self.before, self.after)

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class ClMultiplicationWitness(Generic[T]):
    """Witness for the multiplication ``μ_v : Cl²(v) ⇒ Cl(v)``.

    In the strict-idempotent case ``cl(cl(v)) == cl(v)``, so ``μ_v`` is
    the identity. ``holds`` records strict idempotence; ``discrepancy``
    surfaces the cells where it fails (for lax-idempotent operators).
    """

    cl_v: Mapping[Hashable, FiberValuation[T]]
    cl_cl_v: Mapping[Hashable, FiberValuation[T]]

    @property
    def holds(self) -> bool:
        if set(self.cl_v.keys()) != set(self.cl_cl_v.keys()):
            return False
        return all(self.cl_v[p] == self.cl_cl_v[p] for p in self.cl_v)

    @property
    def discrepancy(
        self,
    ) -> dict[Hashable, frozenset[tuple[Hashable, Hashable]]]:
        out: dict[Hashable, frozenset[tuple[Hashable, Hashable]]] = {}
        for p in self.cl_v:
            v1 = self.cl_v[p]
            v2 = self.cl_cl_v[p]
            cells = {
                cell
                for cell in v1.dom
                if v1.get(*cell) != v2.get(*cell)
            }
            if cells:
                out[p] = frozenset(cells)
        return out

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class ClAlgebraWitness(Generic[T]):
    """Witness that ``v`` is a Cl-algebra: ``cl(v) == v``.

    Realises the corpus characterisation
    ``closure-algebras-are-c-closed`` as a structural object: the
    witness *is* the equality check, with per-predicate per-cell
    evidence preserved on failure.
    """

    valuation: Mapping[Hashable, FiberValuation[T]]
    closure_image: Mapping[Hashable, FiberValuation[T]]

    @property
    def holds(self) -> bool:
        if set(self.valuation.keys()) != set(self.closure_image.keys()):
            return False
        return all(
            self.valuation[p] == self.closure_image[p] for p in self.valuation
        )

    @property
    def failures(
        self,
    ) -> dict[Hashable, frozenset[tuple[Hashable, Hashable]]]:
        out: dict[Hashable, frozenset[tuple[Hashable, Hashable]]] = {}
        for p in self.valuation:
            v = self.valuation[p]
            w = self.closure_image[p]
            cells = {
                cell for cell in v.dom if v.get(*cell) != w.get(*cell)
            }
            if cells:
                out[p] = frozenset(cells)
        return out

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class ClosureMonadLawWitness(Generic[T]):
    """Structural witness for the sampled closure-2-monad laws.

    For a closure operator on cross-fiber valuations, the executable
    checks are inflationarity of the unit and strict idempotence of the
    multiplication at each sampled valuation.
    """

    monad: ClosureMonad[T]
    unit_checks: tuple[ClUnitWitness[T], ...]
    multiplication_checks: tuple[ClMultiplicationWitness[T], ...]

    @property
    def holds(self) -> bool:
        return all(self.unit_checks) and all(self.multiplication_checks)

    @property
    def unit_failures(self) -> tuple[ClUnitWitness[T], ...]:
        return tuple(check for check in self.unit_checks if not check)

    @property
    def multiplication_failures(self) -> tuple[ClMultiplicationWitness[T], ...]:
        return tuple(check for check in self.multiplication_checks if not check)

    def __bool__(self) -> bool:
        return self.holds


# ---- The 2-monad itself ---------------------------------------------------


@realizes("morphisms/closure-2-monad")
@dataclass(frozen=True)
class ClosureMonad(Generic[T]):
    """The closure 2-monad ``Cl`` parametrised by a closure operator.

    Acts on cross-fiber valuations (the assignments ``Π → A_·`` that
    populate predication fibrations). Provides the unit, the
    multiplication, and the Cl-algebra check that realises
    ``theorems/closure-algebras-are-c-closed``.
    """

    closure: CrossFiberClosureOperator[T]

    def apply(
        self, valuation: Mapping[Hashable, FiberValuation[T]]
    ) -> Mapping[Hashable, FiberValuation[T]]:
        """``Cl(v) := cl(v)``."""
        return self.closure.at(valuation)

    def unit_at(
        self, valuation: Mapping[Hashable, FiberValuation[T]]
    ) -> ClUnitWitness[T]:
        """``η_v`` — the inflationary inclusion ``v ⇒ Cl(v)``."""
        return ClUnitWitness(before=valuation, after=self.apply(valuation))

    def multiplication_at(
        self, valuation: Mapping[Hashable, FiberValuation[T]]
    ) -> ClMultiplicationWitness[T]:
        """``μ_v`` — the nested-closure collapse ``Cl²(v) ⇒ Cl(v)``.

        Identity 2-cell when ``cl`` is strict-idempotent.
        """
        cl_v = self.apply(valuation)
        cl_cl_v = self.apply(cl_v)
        return ClMultiplicationWitness(cl_v=cl_v, cl_cl_v=cl_cl_v)

    def law_witness(
        self,
        valuations: Iterable[Mapping[Hashable, FiberValuation[T]]],
    ) -> ClosureMonadLawWitness[T]:
        """Sample the closure-2-monad laws over concrete valuations."""
        samples = tuple(valuations)
        return ClosureMonadLawWitness(
            monad=self,
            unit_checks=tuple(self.unit_at(v) for v in samples),
            multiplication_checks=tuple(self.multiplication_at(v) for v in samples),
        )


@realizes("theorems/closure-algebras-are-c-closed")
def is_cl_algebra(
    monad: ClosureMonad[T],
    valuation: Mapping[Hashable, FiberValuation[T]],
) -> ClAlgebraWitness[T]:
    """Decide whether ``valuation`` is a Cl-algebra.

    A Cl-algebra structure is an inverse to ``η_v`` up to canonical iso,
    forcing ``cl(v) = v``. By the corpus theorem this is equivalent to
    ``v`` being 𝒞-closed.
    """
    return ClAlgebraWitness(
        valuation=valuation, closure_image=monad.apply(valuation)
    )


__all__ = [
    "ClAlgebraWitness",
    "ClMultiplicationWitness",
    "ClUnitWitness",
    "ClosureMonad",
    "ClosureMonadLawWitness",
    "is_cl_algebra",
]
