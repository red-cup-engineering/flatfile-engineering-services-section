"""Predication-fiber-algebra elements over an arbitrary twist bilattice.

Realizes corpus object: ``predication-fiber-algebra`` (the algebra
``A_p = L^{⋈ dom(p)}`` of bilattice-valued cell maps on a per-predicate
domain ``dom(p) ⊆ E × E``, parameterised by a residuated lattice ``L``
and an entity set ``E``).

A fiber valuation is a function ``dom(p) → L^⋈``. Internally we store
only the cells that differ from the **knowledge-bottom**
``⟨L_⊥, L_⊥⟩`` of the twist bilattice — the default. The ``dom`` field
makes the per-predicate domain first-class: the fiber knows which
cells are in its index space, and bilattice operations iterate ``dom``,
not the full ``entities × entities`` rectangle.

Why ``dom`` is first-class. The corpus carries domain assignments
``dom : Π → 2^{E×E}`` per predicate; the fiber over ``q`` is naturally
``L^{⋈ dom(q)}``, not ``L^{⋈ E×E}``. Carrying ``dom`` on the fiber
keeps that math honest: there are no "out-of-dom values to interpret as
bottom" — those cells simply are not in this fiber's index. Pullbacks
along the four predicate-category generators compute their output
fiber's ``dom`` from the input's ``dom`` plus the morphism's index
transformation; see :meth:`PredicateMorphism.pullback`.

Iteration strategy.

- Order operations (``∨_k``, ``∧_k``, ``∨_t``, ``∧_t``) iterate
  ``(support(self) ∪ support(other)) ∩ dom``. At cells where both
  fibers are knowledge-bottom, every order operation produces
  knowledge-bottom too (verified algebraically), so skipping them is
  safe.

- Fusion ``⊙`` and right residual ``⇒`` iterate the full ``dom``
  because the knowledge-bottom is *not* the unit/absorber of either
  operation: ``⟨0,0⟩ ⊙ ⟨0,0⟩ = ⟨0, 0→0⟩`` which is non-default in any
  non-trivial residuated lattice.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable, Iterable, Mapping
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Generic, TypeVar

from .._realizes import realizes
from ..algebra.twist_product import TwistBilattice
from .entity_set import EntitySet

T = TypeVar("T", bound=Hashable)


@dataclass(frozen=True)
class PredicationFiberResiduationCheck(Generic[T]):
    """One cellwise check of ``v1 ⊙ v2 ≤_t v3 iff v1 ≤_t v2 ⇒ v3``."""

    cell: tuple[Hashable, Hashable]
    fusion_leq: bool
    residual_leq: bool

    @property
    def holds(self) -> bool:
        return self.fusion_leq == self.residual_leq


@dataclass(frozen=True)
class PredicationFiberResiduationWitness(Generic[T]):
    """Structural witness for pointwise predication-fiber residuation."""

    left: FiberValuation[T]
    right: FiberValuation[T]
    upper: FiberValuation[T]
    fusion: FiberValuation[T]
    residual: FiberValuation[T]
    checks: tuple[PredicationFiberResiduationCheck[T], ...]

    @property
    def fusion_leq_upper(self) -> bool:
        return self.fusion.truth_leq(self.upper)

    @property
    def left_leq_residual(self) -> bool:
        return self.left.truth_leq(self.residual)

    @property
    def holds(self) -> bool:
        return all(check.holds for check in self.checks)

    @property
    def failures(self) -> tuple[PredicationFiberResiduationCheck[T], ...]:
        return tuple(check for check in self.checks if not check.holds)

    def __bool__(self) -> bool:
        return self.holds


@realizes("objects/predication-fiber-algebra")
@dataclass(frozen=True)
class FiberValuation(Generic[T]):
    """An element of the predication-fiber-algebra ``A_p = L^{⋈ dom(p)}``.

    A fiber valuation is intrinsically a function ``dom(p) → L^⋈``. The
    domain ``dom`` is part of *what a fiber is*, not an optional
    constructor convenience: every fiber lives over a concrete subset of
    ``E × E``. There is no such thing as "a fiber without a domain"; the
    full-``E × E`` case is just one particular ``dom``, constructed
    explicitly by callers (or via :meth:`full`).

    Parameters
    ----------
    bilattice
        The twist bilattice ``L^⋈`` whose carrier is the value type.
    entities
        The entity set ``E`` — the universe within which ``dom`` lives.
    bottom
        The knowledge-bottom of the twist bilattice. The default value
        for cells in ``dom`` that aren't explicitly stored.
    dom
        The fiber's domain ``dom(p) ⊆ E × E``. Required.
    cells
        A finite map ``(s, o) → v ∈ L^⋈``. Every key must be in
        ``dom``; cells whose value equals ``bottom`` are dropped on
        construction (they coincide with the default).

    Equality is structural over ``(bilattice, entities, bottom, dom,
    canonicalised cells)``.
    """

    bilattice: TwistBilattice[T]
    entities: EntitySet
    bottom: tuple[T, T]
    cells: Mapping[tuple[Hashable, Hashable], tuple[T, T]] = field(
        default_factory=dict
    )
    dom: frozenset[tuple[Hashable, Hashable]] = field(kw_only=True)

    def __post_init__(self) -> None:
        # Verify dom ⊆ E × E.
        entity_set = set(self.entities)
        stray = [
            pair
            for pair in self.dom
            if pair[0] not in entity_set or pair[1] not in entity_set
        ]
        if stray:
            raise ValueError(
                f"dom contains cells outside E × E: {stray!r}"
            )
        object.__setattr__(self, "dom", frozenset(self.dom))

        # Verify cells ⊆ dom; drop bottom-valued cells.
        canonical: dict[tuple[Hashable, Hashable], tuple[T, T]] = {}
        for key, value in self.cells.items():
            if key not in self.dom:
                raise ValueError(
                    f"cell {key!r} is not in this fiber's dom"
                )
            if value != self.bottom:
                canonical[key] = value
        object.__setattr__(self, "cells", MappingProxyType(canonical))

    @classmethod
    def full(
        cls,
        bilattice: TwistBilattice[T],
        entities: EntitySet,
        bottom: tuple[T, T],
        cells: Mapping[tuple[Hashable, Hashable], tuple[T, T]] | None = None,
    ) -> FiberValuation[T]:
        """Build a fiber over the full ``E × E`` rectangle.

        Convenience for the common case where the predicate has no
        domain restriction. Equivalent to passing ``dom = entities ×
        entities`` explicitly.
        """
        full_dom = frozenset(
            (s, o) for s in entities for o in entities
        )
        return cls(
            bilattice=bilattice,
            entities=entities,
            bottom=bottom,
            dom=full_dom,
            cells=cells if cells is not None else {},
        )

    @staticmethod
    def full_dom(entities: Iterable[Hashable]) -> frozenset[tuple[Hashable, Hashable]]:
        """The full ``E × E`` rectangle for ``entities``.

        Useful when callers want to compute the full domain once and
        share it across many fibers.
        """
        ents = list(entities)
        return frozenset((s, o) for s in ents for o in ents)

    def get(self, subject: Hashable, object_: Hashable) -> tuple[T, T]:
        """Return the cell value, or ``bottom`` if the cell is unset
        (still in dom) — and also if it is outside dom. Outside-dom is
        a programming error in dom-aware code; the bottom return is a
        soft fallback rather than a raise."""
        return self.cells.get((subject, object_), self.bottom)

    def support(self) -> frozenset[tuple[Hashable, Hashable]]:
        return frozenset(self.cells)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, FiberValuation):
            return NotImplemented
        return (
            self.bilattice is other.bilattice
            and self.entities == other.entities
            and self.bottom == other.bottom
            and self.dom == other.dom
            and dict(self.cells) == dict(other.cells)
        )

    def __hash__(self) -> int:
        return hash(
            (
                id(self.bilattice),
                self.entities,
                self.bottom,
                self.dom,
                frozenset(self.cells.items()),
            )
        )

    # ---------------- pointwise bilattice operations ----------------

    def _binary_order(
        self,
        other: FiberValuation[T],
        op_fn: Callable[[tuple[T, T], tuple[T, T]], tuple[T, T]],
    ) -> FiberValuation[T]:
        """Apply an order op (∨_k, ∧_k, ∨_t, ∧_t) cellwise.

        At cells where both fibers are knowledge-bottom, every order op
        returns knowledge-bottom; iterate ``(support_a ∪ support_b) ∩ dom``
        (the cells where at least one fiber has a non-default value).
        """
        keys = (self.support() | other.support()) & self.dom
        new_cells: dict[tuple[Hashable, Hashable], tuple[T, T]] = {}
        for key in keys:
            new_cells[key] = op_fn(self.get(*key), other.get(*key))
        return self._with_cells(new_cells)

    def _binary_full(
        self,
        other: FiberValuation[T],
        op_fn: Callable[[tuple[T, T], tuple[T, T]], tuple[T, T]],
    ) -> FiberValuation[T]:
        """Apply a non-order op (⊙, ⇒) cellwise across the full ``dom``.

        Knowledge-bottom is not the unit/absorber for these ops, so
        bot-cells contribute non-default values and we have to iterate
        the full domain.
        """
        new_cells: dict[tuple[Hashable, Hashable], tuple[T, T]] = {}
        for key in self.dom:
            new_cells[key] = op_fn(self.get(*key), other.get(*key))
        return self._with_cells(new_cells)

    def _with_cells(
        self, cells: Mapping[tuple[Hashable, Hashable], tuple[T, T]]
    ) -> FiberValuation[T]:
        return FiberValuation(
            bilattice=self.bilattice,
            entities=self.entities,
            bottom=self.bottom,
            cells=cells,
            dom=self.dom,
        )

    def knowledge_join(self, other: FiberValuation[T]) -> FiberValuation[T]:
        """Pointwise ``∨_k`` over ``dom``."""
        self._require_compat(other)
        return self._binary_order(other, self.bilattice.knowledge_join)

    def knowledge_meet(self, other: FiberValuation[T]) -> FiberValuation[T]:
        """Pointwise ``∧_k`` over ``dom``."""
        self._require_compat(other)
        return self._binary_order(other, self.bilattice.knowledge_meet)

    def truth_join(self, other: FiberValuation[T]) -> FiberValuation[T]:
        """Pointwise ``∨_t`` over ``dom``."""
        self._require_compat(other)
        return self._binary_order(other, self.bilattice.truth_join)

    def truth_meet(self, other: FiberValuation[T]) -> FiberValuation[T]:
        """Pointwise ``∧_t`` over ``dom``."""
        self._require_compat(other)
        return self._binary_order(other, self.bilattice.truth_meet)

    def knowledge_leq(self, other: FiberValuation[T]) -> bool:
        """Pointwise comparison ``self ≤_k other`` over ``dom``.

        The order in the fiber algebra is the cellwise lift of the
        bilattice's knowledge order: ``v ≤_k w`` iff ``v(c) ≤_k w(c)``
        for every cell ``c ∈ dom``.

        Floor-level predicate — bool is the structure here. The cell
        coordinates where the comparison fails (if any) are recoverable
        by inspecting the two fibers; we don't surface that as a witness
        because the comparison itself is primitive.
        """
        self._require_compat(other)
        for cell in self.dom:
            if not self.bilattice.knowledge_leq(self.get(*cell), other.get(*cell)):
                return False
        return True

    def truth_leq(self, other: FiberValuation[T]) -> bool:
        """Pointwise comparison ``self ≤_t other`` over ``dom``."""
        self._require_compat(other)
        for cell in self.dom:
            if not self.bilattice.truth_leq(self.get(*cell), other.get(*cell)):
                return False
        return True

    def negate(self) -> FiberValuation[T]:
        """Pointwise bilattice negation. Negation fixes the
        knowledge-bottom, so the support is preserved."""
        new_cells = {
            key: self.bilattice.negate(value) for key, value in self.cells.items()
        }
        return self._with_cells(new_cells)

    def fusion(self, other: FiberValuation[T]) -> FiberValuation[T]:
        """Pointwise twist-product fusion ``⊙`` over ``dom``."""
        self._require_compat(other)
        return self._binary_full(other, self.bilattice.fusion)

    def right_residual(self, other: FiberValuation[T]) -> FiberValuation[T]:
        """Pointwise twist-product right residual ``⇒`` over ``dom``."""
        self._require_compat(other)
        return self._binary_full(other, self.bilattice.right_residual)

    def residuation_witness(
        self,
        right: FiberValuation[T],
        upper: FiberValuation[T],
    ) -> PredicationFiberResiduationWitness[T]:
        """Witness ``self ⊙ right ≤_t upper`` iff ``self ≤_t right ⇒ upper``."""
        return predication_fiber_residuation_witness(self, right, upper)

    def _require_compat(self, other: FiberValuation[T]) -> None:
        if self.bilattice is not other.bilattice:
            raise ValueError(
                "fiber valuations carry different bilattices; can't combine"
            )
        if self.entities != other.entities:
            raise ValueError(
                "fiber valuations carry different entity sets; can't combine"
            )
        if self.bottom != other.bottom:
            raise ValueError(
                "fiber valuations carry different bottoms; can't combine"
            )
        if self.dom != other.dom:
            raise ValueError(
                "fiber valuations carry different doms; can't combine "
                "(they live in different fiber algebras)"
            )

    def __repr__(self) -> str:
        # Render dom compactly: "full" if dom is everything, else its size.
        full_size = len(self.entities) ** 2
        dom_repr = "full" if len(self.dom) == full_size else f"|dom|={len(self.dom)}"
        return (
            f"FiberValuation(entities={self.entities!r}, "
            f"bottom={self.bottom!r}, {dom_repr}, "
            f"cells={dict(self.cells)!r})"
        )


@realizes("theorems/predication-fiber-residuation")
def predication_fiber_residuation_witness(
    left: FiberValuation[T],
    right: FiberValuation[T],
    upper: FiberValuation[T],
) -> PredicationFiberResiduationWitness[T]:
    """Build a cellwise witness for predication-fiber residuation."""
    left._require_compat(right)
    left._require_compat(upper)
    fusion = left.fusion(right)
    residual = right.right_residual(upper)
    checks: tuple[PredicationFiberResiduationCheck[T], ...] = tuple(
        PredicationFiberResiduationCheck(
            cell=cell,
            fusion_leq=left.bilattice.truth_leq(
                fusion.get(*cell),
                upper.get(*cell),
            ),
            residual_leq=left.bilattice.truth_leq(
                left.get(*cell),
                residual.get(*cell),
            ),
        )
        for cell in left.dom
    )
    return PredicationFiberResiduationWitness(
        left=left,
        right=right,
        upper=upper,
        fusion=fusion,
        residual=residual,
        checks=checks,
    )


__all__ = [
    "FiberValuation",
    "PredicationFiberResiduationCheck",
    "PredicationFiberResiduationWitness",
    "predication_fiber_residuation_witness",
]
