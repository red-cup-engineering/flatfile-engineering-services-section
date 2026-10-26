"""Lawvere comprehension for the predication hyperdoctrine.

The predication hyperdoctrine carries two comprehension schemas, one
per designated truth value:

- *Classical* (``≤_t``-system): ``Ext^t ⊣ {p : -}_t`` with
  ``Ext^t(g) = ∃_g^t(1_q^t)`` (the characteristic function of
  ``dom(q)``: ``t`` on ``dom(q)``, ``f`` elsewhere) and
  ``{p : ψ}_t`` the specialization ``q_ψ → p`` whose sub-support is
  ``ψ^{-1}(t) ⊆ dom(p)``.

- *Paraconsistent* (``≤_k``-system): ``Ext^k ⊣ {p : -}_⊤`` with
  ``Ext^k(g) = ∃_g^k(1_q^k)`` (``⊤`` on ``dom(q)``, ``⊥`` elsewhere)
  and ``{p : ψ}_⊤`` carrying sub-support ``ψ^{-1}(⊤) ⊆ dom(p)``.

Both adjunctions reduce to the same shape: ``Ext(g) ≤ ψ`` iff
``dom(q) ⊆ designated^{-1}(ψ)``. The corpus theorems are
``lawvere-comprehension-classical`` and
``lawvere-comprehension-paraconsistent``; this module realises both.
"""

from __future__ import annotations

from collections.abc import Hashable, Iterable
from dataclasses import dataclass
from typing import Generic, TypeVar

from .._realizes import realizes
from ..algebra.twist_product import TwistBilattice
from .entity_set import EntitySet
from .fiber_valuation import FiberValuation
from .predicate_category import PredicateSpecialization

T = TypeVar("T", bound=Hashable)


@realizes("theorems/lawvere-comprehension-classical")
def extension_t(
    g: PredicateSpecialization,
    bilattice: TwistBilattice[T],
    *,
    entities: EntitySet,
    dom_p: frozenset[tuple[Hashable, Hashable]],
) -> FiberValuation[T]:
    """``Ext^t(g) = ∃_g^t(1_q^t)`` — the characteristic function of
    ``dom(q) = g.sub_support`` in the truth order.

    ``t`` on ``dom(q)``, ``f`` elsewhere in ``dom(p)``.
    """
    one_q_t = FiberValuation(
        bilattice=bilattice,
        entities=entities,
        bottom=bilattice.knowledge_bottom(),
        cells={cell: bilattice.truth_top() for cell in g.sub_support},
        dom=g.sub_support,
    )
    return g.existential_t(one_q_t, dom_p)


@realizes("theorems/lawvere-comprehension-paraconsistent")
def extension_k(
    g: PredicateSpecialization,
    bilattice: TwistBilattice[T],
    *,
    entities: EntitySet,
    dom_p: frozenset[tuple[Hashable, Hashable]],
) -> FiberValuation[T]:
    """``Ext^k(g) = ∃_g^k(1_q^k)`` — the characteristic function of
    ``dom(q)`` in the knowledge order.

    ``⊤`` on ``dom(q)``, ``⊥`` elsewhere.
    """
    one_q_k = FiberValuation(
        bilattice=bilattice,
        entities=entities,
        bottom=bilattice.knowledge_bottom(),
        cells={cell: bilattice.knowledge_top() for cell in g.sub_support},
        dom=g.sub_support,
    )
    return g.existential_k(one_q_k, dom_p)


@realizes("theorems/lawvere-comprehension-classical")
def comprehension_t(
    p: Hashable, dom_p: frozenset[tuple[Hashable, Hashable]], psi: FiberValuation[T]
) -> PredicateSpecialization:
    """``{p : ψ}_t`` — the specialization ``q_ψ → p`` with
    ``dom(q_ψ) := ψ^{-1}(t) ⊆ dom(p)``.

    Right adjoint to :func:`extension_t`.
    """
    if psi.dom != dom_p:
        raise ValueError(
            "comprehension_t requires psi.dom == dom_p"
        )
    truth_top = psi.bilattice.truth_top()
    sub_support = frozenset(
        cell for cell in dom_p if psi.get(*cell) == truth_top
    )
    return PredicateSpecialization(
        source=("comprehension_t", p),
        target=p,
        sub_support=sub_support,
    )


@realizes("theorems/lawvere-comprehension-paraconsistent")
def comprehension_k(
    p: Hashable, dom_p: frozenset[tuple[Hashable, Hashable]], psi: FiberValuation[T]
) -> PredicateSpecialization:
    """``{p : ψ}_⊤`` — the specialization ``q_ψ → p`` with
    ``dom(q_ψ) := ψ^{-1}(⊤) ⊆ dom(p)``.

    Right adjoint to :func:`extension_k`.
    """
    if psi.dom != dom_p:
        raise ValueError(
            "comprehension_k requires psi.dom == dom_p"
        )
    knowledge_top = psi.bilattice.knowledge_top()
    sub_support = frozenset(
        cell for cell in dom_p if psi.get(*cell) == knowledge_top
    )
    return PredicateSpecialization(
        source=("comprehension_k", p),
        target=p,
        sub_support=sub_support,
    )


@dataclass(frozen=True)
class ComprehensionAdjunctionCheck(Generic[T]):
    """One direction of the comprehension adjunction at one (g, ψ).

    For the classical schema:
    ``LHS = (Ext^t(g) ≤_t ψ)``, ``RHS = (dom(q) ⊆ comprehension_t(p, ψ).sub_support)``.
    """

    schema: str  # "classical" or "paraconsistent"
    sub_support: frozenset[tuple[Hashable, Hashable]]
    psi: FiberValuation[T]
    lhs: bool
    rhs: bool

    @property
    def holds(self) -> bool:
        return self.lhs == self.rhs


@dataclass(frozen=True)
class ComprehensionAdjunctionWitness(Generic[T]):
    """Structural witness for one of the two comprehension adjunctions
    over a chosen sweep of ``(g, ψ)`` pairs."""

    schema: str
    checks: tuple[ComprehensionAdjunctionCheck[T], ...]

    @property
    def holds(self) -> bool:
        return all(c.holds for c in self.checks)

    @property
    def failures(self) -> tuple[ComprehensionAdjunctionCheck[T], ...]:
        return tuple(c for c in self.checks if not c.holds)

    def __bool__(self) -> bool:
        return self.holds


@realizes("theorems/lawvere-comprehension-classical")
@realizes("theorems/lawvere-comprehension-paraconsistent")
def comprehension_adjunction_witness(
    g: PredicateSpecialization,
    psis: Iterable[FiberValuation[T]],
    bilattice: TwistBilattice[T],
    *,
    entities: EntitySet,
    dom_p: frozenset[tuple[Hashable, Hashable]],
    schema: str,
) -> ComprehensionAdjunctionWitness[T]:
    """Build a sampled witness for one Lawvere comprehension adjunction."""
    checks: list[ComprehensionAdjunctionCheck[T]] = []
    for psi in psis:
        if schema == "classical":
            lhs = extension_t(g, bilattice, entities=entities, dom_p=dom_p).truth_leq(
                psi
            )
            rhs = g.sub_support <= comprehension_t(
                g.target,
                dom_p,
                psi,
            ).sub_support
        elif schema == "paraconsistent":
            lhs = extension_k(
                g,
                bilattice,
                entities=entities,
                dom_p=dom_p,
            ).knowledge_leq(psi)
            rhs = g.sub_support <= comprehension_k(
                g.target,
                dom_p,
                psi,
            ).sub_support
        else:
            raise ValueError(
                f"unknown comprehension schema {schema!r}; expected "
                "'classical' or 'paraconsistent'"
            )
        checks.append(
            ComprehensionAdjunctionCheck(
                schema=schema,
                sub_support=g.sub_support,
                psi=psi,
                lhs=lhs,
                rhs=rhs,
            )
        )
    return ComprehensionAdjunctionWitness(schema=schema, checks=tuple(checks))


__all__ = [
    "ComprehensionAdjunctionCheck",
    "ComprehensionAdjunctionWitness",
    "comprehension_adjunction_witness",
    "comprehension_k",
    "comprehension_t",
    "extension_k",
    "extension_t",
]
