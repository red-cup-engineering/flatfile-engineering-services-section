"""``IndexMap(E)`` — the cellwise calculus of PredCat generator maps.

The corpus's Beck–Chevalley proof
([beck-chevalley-commutation-on-predication-bilattices](
../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/beck-chevalley-commutation-on-predication-bilattices.md))
reduces BC on the predication fibration to cellwise base-change in the
category ``IndexMap(E)`` of equivariant partial maps on ``E × E``.

This module realises ``IndexMap(E)`` directly:

- :class:`IndexMap` is a partial function ``φ : source ⇀ target`` between
  two finite carriers, with a bilattice for fiber-side operations.
- :meth:`IndexMap.pullback_cells` is the cellwise reindexing
  ``φ^*(v)(x) = v(φ(x))``.
- :meth:`IndexMap.existential_k`, ``_t`` are the left adjoints
  (cellwise joins along the pre-image, default ``⊥_*``).
- :meth:`IndexMap.universal_k`, ``_t`` are the right adjoints
  (cellwise meets, default ``⊤_*``).
- :meth:`IndexMap.pullback_square` computes the coordinate square used by
  the Beck-Chevalley proof; predicate-category pullback closure itself is
  represented by :meth:`PredicateCategory.generator_pullback_closure`.

The four generator classes of :mod:`predicate_category` each have a
``to_index_map(target_dom)`` adaptor that surfaces this view; the
generator-side adjoints and the ``IndexMap``-side adjoints agree
cellwise (see ``tests/test_index_map_agrees_with_generators.py``).

``IndexMap`` is a coordinate helper, not an alternate category. Public
PredCat-facing pullback closure lives in
``PredicateCategory.generator_pullback_closure`` and re-expresses the
square by predicate objects and the four generator classes.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable, Iterable, Mapping
from dataclasses import dataclass
from types import MappingProxyType
from typing import TYPE_CHECKING, Generic, TypeVar, cast

from .._realizes import realizes
from ..algebra.twist_product import TwistBilattice

if TYPE_CHECKING:
    from .witness import BeckChevalleyWitness

T = TypeVar("T", bound=Hashable)


@dataclass(frozen=True)
class PredicateGeneratorIndexMapClassification(Generic[T]):
    """Witness for the PredCat generator-exhaustiveness cell component.

    The predicate-generator exhaustiveness theorem classifies natural
    bottom-preserving bilattice homomorphisms by:

    - an invariant sub-support ``D``;
    - one of the four equivariant entity-pair maps;
    - a bounded bilattice endomorphism ``ψ`` on the cell values.

    This witness records the first two components for an existing
    ``IndexMap`` and records the represented endomorphism component as the
    identity, which is the component induced by the canonical PredCat
    generator classes themselves.
    """

    index_map: IndexMap[T]
    entities: frozenset[Hashable]
    kinds: tuple[str, ...]
    support_is_orbit_union: bool
    cardinality_condition_holds: bool
    non_cell_sources: frozenset[Hashable]
    non_cell_targets: frozenset[Hashable]
    cell_endomorphism: str = "identity"

    @property
    def holds(self) -> bool:
        return (
            bool(self.kinds)
            and not self.non_cell_sources
            and not self.non_cell_targets
            and self.cell_endomorphism == "identity"
        )

    @property
    def primary_kind(self) -> str | None:
        return self.kinds[0] if self.kinds else None

    @property
    def in_exhaustiveness_scope(self) -> bool:
        """True when the corpus theorem's stated hypotheses are met."""
        return (
            self.holds
            and self.support_is_orbit_union
            and self.cardinality_condition_holds
        )

    @property
    def realizes_generator_exhaustiveness_fragment(self) -> bool:
        """True for the canonical PredCat-generator ``ψ = id`` fragment."""
        return self.in_exhaustiveness_scope

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class IndexPullbackSquareWitness(Generic[T]):
    """Witness for a pullback square in ``IndexMap(E)``."""

    f: IndexMap[T]
    g: IndexMap[T]
    p_a: IndexMap[T]
    p_b: IndexMap[T]

    @property
    def carrier(self) -> frozenset[Hashable]:
        return self.p_a.source

    @property
    def left_composite(self) -> Mapping[Hashable, Hashable]:
        return {x: self.f.phi[self.p_a.phi[x]] for x in self.carrier}

    @property
    def right_composite(self) -> Mapping[Hashable, Hashable]:
        return {x: self.g.phi[self.p_b.phi[x]] for x in self.carrier}

    @property
    def commutes(self) -> bool:
        return dict(self.left_composite) == dict(self.right_composite)

    @property
    def holds(self) -> bool:
        return (
            self.p_a.source == self.p_b.source
            and self.p_a.target == self.f.source
            and self.p_b.target == self.g.source
            and self.commutes
        )

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class IndexMap(Generic[T]):
    """A partial function ``φ : source ⇀ target`` carrying the data needed
    for cellwise reindexing and quantifier adjoints.

    Parameters
    ----------
    source
        Finite frozenset of cell labels for ``A_source``.
    target
        Finite frozenset of cell labels for ``A_target``.
    phi
        Total mapping ``source → target`` (we require ``phi`` defined on
        every element of ``source``; "partial" means ``source`` is allowed
        to be a strict subset of some ambient space, not that ``phi`` is
        partial on ``source``).
    bilattice
        The twist bilattice ``L^⋈`` whose carrier is the cell-value type.
    """

    source: frozenset[Hashable]
    target: frozenset[Hashable]
    phi: Mapping[Hashable, Hashable]
    bilattice: TwistBilattice[T]

    def __post_init__(self) -> None:
        # Verify phi is a function source → target.
        if frozenset(self.phi.keys()) != self.source:
            missing = self.source - frozenset(self.phi.keys())
            extra = frozenset(self.phi.keys()) - self.source
            raise ValueError(
                f"phi must be defined on exactly source; "
                f"missing={set(missing)!r}, extra={set(extra)!r}"
            )
        stray = [v for v in self.phi.values() if v not in self.target]
        if stray:
            raise ValueError(
                f"phi values must lie in target; stray={stray!r}"
            )
        object.__setattr__(self, "phi", MappingProxyType(dict(self.phi)))
        object.__setattr__(self, "source", frozenset(self.source))
        object.__setattr__(self, "target", frozenset(self.target))

    # ------------------------------------------------------------------
    # Cell-map fiber operations (FiberValuation-shaped, but agnostic to
    # whether labels are entity-pairs or arbitrary tuples).
    # ------------------------------------------------------------------

    def pullback_cells(
        self, cells_at_target: Mapping[Hashable, tuple[T, T]]
    ) -> dict[Hashable, tuple[T, T]]:
        """``φ^*(v)(x) = v(φ(x))`` for ``x ∈ source``.

        Returns a dict over ``source``, dropping cells whose value equals
        ``knowledge_bottom`` (the default).
        """
        bot = self.bilattice.knowledge_bottom()
        out: dict[Hashable, tuple[T, T]] = {}
        for x in self.source:
            v = cells_at_target.get(self.phi[x], bot)
            if v != bot:
                out[x] = v
        return out

    def _existential(
        self,
        cells_at_source: Mapping[Hashable, tuple[T, T]],
        *,
        join: Callable[[tuple[T, T], tuple[T, T]], tuple[T, T]],
        empty: tuple[T, T],
    ) -> dict[Hashable, tuple[T, T]]:
        """``∃_φ(α)(y) = ⋁ {α(x) : φ(x) = y}`` (default ``empty`` if no
        pre-image)."""
        out: dict[Hashable, tuple[T, T]] = {}
        bot_default = self.bilattice.knowledge_bottom()
        for y in self.target:
            preimage = [x for x in self.source if self.phi[x] == y]
            if not preimage:
                value = empty
            else:
                value = cells_at_source.get(preimage[0], bot_default)
                for x in preimage[1:]:
                    value = join(value, cells_at_source.get(x, bot_default))
            if value != bot_default:
                out[y] = value
        return out

    def _universal(
        self,
        cells_at_source: Mapping[Hashable, tuple[T, T]],
        *,
        meet: Callable[[tuple[T, T], tuple[T, T]], tuple[T, T]],
        empty: tuple[T, T],
    ) -> dict[Hashable, tuple[T, T]]:
        """``∀_φ(α)(y) = ⋀ {α(x) : φ(x) = y}`` (default ``empty`` if no
        pre-image)."""
        out: dict[Hashable, tuple[T, T]] = {}
        bot_default = self.bilattice.knowledge_bottom()
        for y in self.target:
            preimage = [x for x in self.source if self.phi[x] == y]
            if not preimage:
                value = empty
            else:
                value = cells_at_source.get(preimage[0], bot_default)
                for x in preimage[1:]:
                    value = meet(value, cells_at_source.get(x, bot_default))
            if value != bot_default:
                out[y] = value
        return out

    def existential_k(
        self, cells_at_source: Mapping[Hashable, tuple[T, T]]
    ) -> dict[Hashable, tuple[T, T]]:
        return self._existential(
            cells_at_source,
            join=self.bilattice.knowledge_join,
            empty=self.bilattice.knowledge_bottom(),
        )

    def existential_t(
        self, cells_at_source: Mapping[Hashable, tuple[T, T]]
    ) -> dict[Hashable, tuple[T, T]]:
        return self._existential(
            cells_at_source,
            join=self.bilattice.truth_join,
            empty=self.bilattice.truth_bottom(),
        )

    def universal_k(
        self, cells_at_source: Mapping[Hashable, tuple[T, T]]
    ) -> dict[Hashable, tuple[T, T]]:
        return self._universal(
            cells_at_source,
            meet=self.bilattice.knowledge_meet,
            empty=self.bilattice.knowledge_top(),
        )

    def universal_t(
        self, cells_at_source: Mapping[Hashable, tuple[T, T]]
    ) -> dict[Hashable, tuple[T, T]]:
        return self._universal(
            cells_at_source,
            meet=self.bilattice.truth_meet,
            empty=self.bilattice.truth_top(),
        )

    # ------------------------------------------------------------------
    # Composition and pullback in IndexMap(E).
    # ------------------------------------------------------------------

    def then(self, second: IndexMap[T]) -> IndexMap[T]:
        """Compose: ``second ∘ self``. Requires ``self.target == second.source``."""
        if self.target != second.source:
            raise ValueError(
                "cannot compose: self.target != second.source"
            )
        return IndexMap(
            source=self.source,
            target=second.target,
            phi={x: second.phi[self.phi[x]] for x in self.source},
            bilattice=self.bilattice,
        )

    def classify_predicate_generator(
        self,
        entities: Iterable[Hashable],
    ) -> PredicateGeneratorIndexMapClassification[T]:
        """Classify this cell map by the four PredCat generator shapes.

        This is the executable surface of the corpus's
        ``predicate-generator-exhaustiveness`` theorem for the canonical
        generator-induced ``ψ = id`` case. ``holds`` means the map is
        cellwise one of identity, swap, subject-collapse, or
        object-collapse on entity-pair source and target supports.
        ``in_exhaustiveness_scope`` additionally checks the theorem's
        ``|E| >= 3`` and invariant sub-support hypotheses.
        """
        entity_set = frozenset(entities)
        non_cells = frozenset(
            cell
            for cell in self.source
            if not _is_entity_pair(cell, entity_set)
        )
        non_cell_targets = frozenset(
            cell
            for cell in self.target
            if not _is_entity_pair(cell, entity_set)
        )
        kinds: list[str] = []
        if not non_cells and not non_cell_targets:
            for kind, map_cell in _GENERATOR_SHAPE_MAPS.items():
                if all(self.phi[cell] == map_cell(cell) for cell in self.source):
                    kinds.append(kind)
        return PredicateGeneratorIndexMapClassification(
            index_map=self,
            entities=entity_set,
            kinds=tuple(kinds),
            support_is_orbit_union=_support_is_orbit_union(
                self.source,
                entity_set,
            ),
            cardinality_condition_holds=len(entity_set) >= 3,
            non_cell_sources=non_cells,
            non_cell_targets=non_cell_targets,
        )

    @staticmethod
    def pullback_square(
        f: IndexMap[T], g: IndexMap[T]
    ) -> tuple[IndexMap[T], IndexMap[T]]:
        """The pullback in ``IndexMap(E)`` of ``f`` and ``g`` (shared
        codomain).

        Returns ``(p_A, p_B)`` with ``p_A : P → f.source``,
        ``p_B : P → g.source``, ``f ∘ p_A = g ∘ p_B``, and the universal
        property among partial maps with that property.

        ``P`` is the equalizer-style fibered product
        ``{(x, y) ∈ source(f) × source(g) : φ_f(x) = φ_g(y)}``, with
        ``p_A`` and ``p_B`` the projections.

        The corpus's
        :class:`predicate-generator-pullback-closure` theorem says that
        when ``f`` and ``g`` are generators, ``P`` can be reparametrised
        as a sub-support of ``E × E`` and ``p_A, p_B`` as generators —
        but that reparametrisation is not load-bearing for verifying
        Beck–Chevalley, which holds at this generic ``IndexMap`` level.
        """
        if f.target != g.target:
            raise ValueError(
                "pullback requires shared codomain (f.target == g.target)"
            )
        if f.bilattice is not g.bilattice:
            raise ValueError(
                "pullback requires shared bilattice"
            )
        P = frozenset(
            (x, y)
            for x in f.source
            for y in g.source
            if f.phi[x] == g.phi[y]
        )
        p_A = IndexMap(
            source=P,
            target=f.source,
            phi={pair: pair[0] for pair in P},
            bilattice=f.bilattice,
        )
        p_B = IndexMap(
            source=P,
            target=g.source,
            phi={pair: pair[1] for pair in P},
            bilattice=f.bilattice,
        )
        return p_A, p_B

    @staticmethod
    def pullback_square_witness(
        f: IndexMap[T], g: IndexMap[T]
    ) -> IndexPullbackSquareWitness[T]:
        """Return the explicit pullback-square witness for ``f`` and ``g``."""
        p_a, p_b = IndexMap.pullback_square(f, g)
        return IndexPullbackSquareWitness(f=f, g=g, p_a=p_a, p_b=p_b)

    # ------------------------------------------------------------------
    # Adaptors from generator classes.
    # ------------------------------------------------------------------

    @staticmethod
    def from_generator(
        generator: object,
        *,
        source_dom: frozenset[tuple[Hashable, Hashable]],
        target_dom: frozenset[tuple[Hashable, Hashable]],
        bilattice: TwistBilattice[T],
    ) -> IndexMap[T]:
        """Build an :class:`IndexMap` from a predicate-category generator
        plus its source/target domains.

        Each of the five canonical generator classes
        (:class:`PredicateIdentity`, :class:`PredicateSpecialization`,
        :class:`PredicateConverse`, :class:`PredicateSubjectProjection`,
        :class:`PredicateObjectProjection`) is mapped to its underlying
        equivariant partial function on entity-pairs.
        """
        # Local import to avoid module-level cycles.
        from .predicate_category import (
            PredicateConverse,
            PredicateIdentity,
            PredicateObjectProjection,
            PredicateSpecialization,
            PredicateSubjectProjection,
        )

        if isinstance(generator, PredicateIdentity):
            if source_dom != target_dom:
                raise ValueError(
                    "identity generator requires source_dom == target_dom"
                )
            return IndexMap(
                source=source_dom,
                target=target_dom,
                phi={c: c for c in source_dom},
                bilattice=bilattice,
            )
        if isinstance(generator, PredicateSpecialization):
            if source_dom != generator.sub_support:
                raise ValueError(
                    "specialization source_dom must equal sub_support"
                )
            if not source_dom <= target_dom:
                raise ValueError(
                    "specialization source_dom must be subset of target_dom"
                )
            return IndexMap(
                source=source_dom,
                target=target_dom,
                phi={c: c for c in source_dom},
                bilattice=bilattice,
            )
        if isinstance(generator, PredicateConverse):
            expected = frozenset((o, s) for (s, o) in target_dom)
            if source_dom != expected:
                raise ValueError(
                    "converse source_dom must equal swap(target_dom)"
                )
            return IndexMap(
                source=source_dom,
                target=target_dom,
                phi={(s, o): (o, s) for (s, o) in source_dom},
                bilattice=bilattice,
            )
        if isinstance(generator, PredicateSubjectProjection):
            # phi: (s, o) ↦ (s, s); requires (s, s) ∈ target_dom for every
            # (s, o) ∈ source_dom.
            for (s, o) in source_dom:
                if (s, s) not in target_dom:
                    raise ValueError(
                        f"subject-projection: source cell ({s!r},{o!r}) "
                        f"projects to ({s!r},{s!r}) ∉ target_dom"
                    )
            return IndexMap(
                source=source_dom,
                target=target_dom,
                phi={(s, o): (s, s) for (s, o) in source_dom},
                bilattice=bilattice,
            )
        if isinstance(generator, PredicateObjectProjection):
            for (s, o) in source_dom:
                if (o, o) not in target_dom:
                    raise ValueError(
                        f"object-projection: source cell ({s!r},{o!r}) "
                        f"projects to ({o!r},{o!r}) ∉ target_dom"
                    )
            return IndexMap(
                source=source_dom,
                target=target_dom,
                phi={(s, o): (o, o) for (s, o) in source_dom},
                bilattice=bilattice,
            )
        raise TypeError(
            f"unknown generator class: {type(generator).__name__}"
        )


@realizes("theorems/beck-chevalley-commutation-on-predication-bilattices")
def beck_chevalley_witness(
    f: IndexMap[T],
    g: IndexMap[T],
    fibers_at_g_source: Iterable[Mapping[Hashable, tuple[T, T]]],
) -> BeckChevalleyWitness[T]:
    """Build the structural witness for Beck-Chevalley along the pullback
    square of ``f`` and ``g`` (shared codomain), checked over the supplied
    sweep of input fibers on ``g.source``.

    For each ``φ`` in the sweep and each adjoint kind
    (``∃^k``, ``∃^t``, ``∀^k``, ``∀^t``), records both sides:

        LHS = ∃_{p_A}(p_B^*(φ))   (or ∀_{p_A}(...) for universal)
        RHS = f^*(∃_g(φ))         (or f^*(∀_g(φ)) for universal)

    The witness's ``holds`` is the conjunction across all checks. The
    structure preserves per-fiber, per-adjoint evidence so callers can
    localise any failure.
    """
    # Local import to avoid module-level cycles.
    from .witness import BeckChevalleyCheck, BeckChevalleyWitness

    p_A, p_B = IndexMap.pullback_square(f, g)
    adjoints = [
        ("existential_k", IndexMap.existential_k),
        ("existential_t", IndexMap.existential_t),
        ("universal_k", IndexMap.universal_k),
        ("universal_t", IndexMap.universal_t),
    ]
    checks: list[BeckChevalleyCheck[T]] = []
    for phi in fibers_at_g_source:
        phi_d = dict(phi)
        pulled = p_B.pullback_cells(phi_d)
        for name, adjoint_op in adjoints:
            lhs = adjoint_op(p_A, pulled)
            rhs = f.pullback_cells(adjoint_op(g, phi_d))
            checks.append(
                BeckChevalleyCheck(adjoint=name, phi=phi_d, lhs=lhs, rhs=rhs)
            )
    return BeckChevalleyWitness(
        f_source=f.source,
        g_source=g.source,
        pullback_carrier=p_A.source,
        checks=tuple(checks),
    )


def _is_entity_pair(cell: Hashable, entities: frozenset[Hashable]) -> bool:
    return (
        isinstance(cell, tuple)
        and len(cell) == 2
        and cell[0] in entities
        and cell[1] in entities
    )


def _identity_cell(cell: Hashable) -> Hashable:
    subject, object_ = cast(tuple[Hashable, Hashable], cell)
    return (subject, object_)


def _swap_cell(cell: Hashable) -> Hashable:
    subject, object_ = cast(tuple[Hashable, Hashable], cell)
    return (object_, subject)


def _subject_cell(cell: Hashable) -> Hashable:
    subject, _object = cast(tuple[Hashable, Hashable], cell)
    return (subject, subject)


def _object_cell(cell: Hashable) -> Hashable:
    _subject, object_ = cast(tuple[Hashable, Hashable], cell)
    return (object_, object_)


_GENERATOR_SHAPE_MAPS: Mapping[str, Callable[[Hashable], Hashable]] = {
    "identity": _identity_cell,
    "converse": _swap_cell,
    "subject_projection": _subject_cell,
    "object_projection": _object_cell,
}


def _support_is_orbit_union(
    source: frozenset[Hashable],
    entities: frozenset[Hashable],
) -> bool:
    diagonal = frozenset((e, e) for e in entities)
    off_diagonal = frozenset(
        (s, o) for s in entities for o in entities if s != o
    )
    return (
        (source & diagonal in (frozenset(), diagonal))
        and (source & off_diagonal in (frozenset(), off_diagonal))
        and source <= diagonal | off_diagonal
    )


__all__ = [
    "IndexMap",
    "IndexPullbackSquareWitness",
    "PredicateGeneratorIndexMapClassification",
    "beck_chevalley_witness",
]
