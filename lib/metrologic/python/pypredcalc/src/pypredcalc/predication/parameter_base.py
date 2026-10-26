"""Parameter base category ``B = ResLat × PredCat × Set × Ord``.

Realises corpus object ``parameter-base-category``: the 1-category whose
objects are predication settling base parameters ``(L, C, E, λ)`` and
whose morphisms are 4-tuples ``(ℓ, π, e, φ_λ)`` of morphisms in the
respective factor categories.

Composition is componentwise, finite limits are componentwise (each
factor has finite limits separately), and pullback / push-forward of a
settling along a base-morphism is componentwise application: ``ℓ``
acts on bilattice values, ``π`` on predicate identifiers and morphisms,
``e`` on entity coordinates, and ``φ_λ`` on stage indices.

This module exposes:

- :class:`ResidLatticeHom` — the ``ℓ`` component, a function lifting
  ``L → L'`` to ``L^⋈ → L'^⋈``.
- :class:`EntityMap` — the ``e`` component.
- :class:`OrdinalMap` — the ``φ_λ`` component.
- :class:`ParameterBase` — a base-tuple ``(L, C, E, λ)``.
- :class:`BaseMorphism` — a 4-tuple of components, with composition and
  push-forward operations on cross-fiber valuations and settlings.

The :class:`pypredcalc.predication.functor.PredicateFunctor` already
realises the predicate-category functor component; we reuse it here.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable, Mapping
from dataclasses import dataclass
from types import MappingProxyType
from typing import Generic, TypeVar

from .._realizes import realizes
from ..algebra.twist_product import TwistBilattice
from .closure_rule_system import CrossFiberClosureOperator
from .entity_set import EntitySet
from .fiber_valuation import FiberValuation
from .functor import PredicateFunctor
from .predicate_category import PredicateCategory
from .settling import PredicationSettling

T = TypeVar("T", bound=Hashable)
U = TypeVar("U", bound=Hashable)
V = TypeVar("V", bound=Hashable)


# ---- Components -----------------------------------------------------------


@dataclass(frozen=True)
class ResidLatticeHom(Generic[T, U]):
    """Residuated-lattice homomorphism ``ℓ : L → L'`` lifted to ``L^⋈``.

    ``forward`` is a function on the underlying value type. It must
    preserve the lattice / residuation structure for the morphism to be
    a true residuated-lattice homomorphism; we do not check this
    eagerly (the check requires sample input) but the lift to ``L^⋈``
    is structural — pointwise application to each twist coordinate.
    """

    forward: Callable[[T], U]
    source_bilattice: TwistBilattice[T]
    target_bilattice: TwistBilattice[U]

    def lift(self, value: tuple[T, T]) -> tuple[U, U]:
        """Apply ``ℓ`` pointwise to a twist value ``⟨a, b⟩``."""
        return (self.forward(value[0]), self.forward(value[1]))

    @staticmethod
    def identity(bilattice: TwistBilattice[T]) -> ResidLatticeHom[T, T]:
        """The identity homomorphism on a single bilattice."""
        return ResidLatticeHom[T, T](
            forward=lambda x: x,
            source_bilattice=bilattice,
            target_bilattice=bilattice,
        )


@dataclass(frozen=True)
class EntityMap:
    """A function ``e : E → E'`` on entity sets."""

    forward: Callable[[Hashable], Hashable]
    source: EntitySet
    target: EntitySet

    def __call__(self, entity: Hashable) -> Hashable:
        if entity not in self.source:
            raise KeyError(f"{entity!r} not in source entity set")
        result = self.forward(entity)
        if result not in self.target:
            raise ValueError(
                f"image of {entity!r} = {result!r} not in target entity set"
            )
        return result

    @classmethod
    def identity(cls, entity_set: EntitySet) -> EntityMap:
        return cls(
            forward=lambda x: x, source=entity_set, target=entity_set
        )


@dataclass(frozen=True)
class OrdinalMap:
    """An order-preserving map ``φ_λ : λ → λ'`` between settling bounds.

    Modelled here for finite ordinals as a function ``int → int``; the
    monotonicity check is deferred to :func:`is_monotone` on samples.
    """

    forward: Callable[[int], int]
    source_bound: int
    target_bound: int

    def __call__(self, stage: int) -> int:
        if not 0 <= stage <= self.source_bound:
            raise ValueError(
                f"stage {stage!r} outside source bound [0, {self.source_bound!r}]"
            )
        result = self.forward(stage)
        if not 0 <= result <= self.target_bound:
            raise ValueError(
                f"image stage {result!r} outside target bound "
                f"[0, {self.target_bound!r}]"
            )
        return result

    def is_monotone(self) -> bool:
        """Check ``i ≤ j ⟹ φ(i) ≤ φ(j)`` across the source range."""
        prev = self(0)
        for i in range(1, self.source_bound + 1):
            cur = self(i)
            if cur < prev:
                return False
            prev = cur
        return True

    @classmethod
    def identity(cls, bound: int) -> OrdinalMap:
        return cls(forward=lambda i: i, source_bound=bound, target_bound=bound)


# ---- ParameterBase --------------------------------------------------------


@realizes("objects/parameter-base-category")
@dataclass(frozen=True)
class ParameterBase(Generic[T]):
    """A base parameter tuple ``(L, C, E, λ)``."""

    bilattice: TwistBilattice[T]
    predicate_category: PredicateCategory
    entity_set: EntitySet
    settling_bound: int

    def __post_init__(self) -> None:
        if self.entity_set != self.predicate_category.entities:
            raise ValueError(
                "ParameterBase: entity_set must match predicate_category.entities"
            )
        if self.settling_bound < 0:
            raise ValueError(
                f"settling_bound must be non-negative, got "
                f"{self.settling_bound!r}"
            )


# ---- BaseMorphism ---------------------------------------------------------


@dataclass(frozen=True)
class BaseMorphism(Generic[T, U]):
    """A morphism of parameter bases ``σ : (L, C, E, λ) → (L', C', E', λ')``.

    The four components operate componentwise. Push-forward of a
    cross-fiber valuation along ``σ`` rebuilds each fiber: every cell
    ``(s, o)`` in ``dom(p)`` contributes its value lifted by ``ℓ`` to
    cell ``(e(s), e(o))`` in ``dom(π(p))``. When several source
    predicates map to the same target predicate, the contributions are
    knowledge-joined.
    """

    source: ParameterBase[T]
    target: ParameterBase[U]
    l_hom: ResidLatticeHom[T, U]
    predcat_functor: PredicateFunctor
    entity_map: EntityMap
    ordinal_map: OrdinalMap

    def __post_init__(self) -> None:
        if self.l_hom.source_bilattice is not self.source.bilattice:
            raise ValueError(
                "BaseMorphism: l_hom source bilattice does not match source base"
            )
        if self.l_hom.target_bilattice is not self.target.bilattice:
            raise ValueError(
                "BaseMorphism: l_hom target bilattice does not match target base"
            )
        if self.predcat_functor.source is not self.source.predicate_category:
            raise ValueError(
                "BaseMorphism: predcat_functor.source mismatch"
            )
        if self.predcat_functor.target is not self.target.predicate_category:
            raise ValueError(
                "BaseMorphism: predcat_functor.target mismatch"
            )
        if self.entity_map.source != self.source.entity_set:
            raise ValueError("BaseMorphism: entity_map.source mismatch")
        if self.entity_map.target != self.target.entity_set:
            raise ValueError("BaseMorphism: entity_map.target mismatch")
        if self.ordinal_map.source_bound != self.source.settling_bound:
            raise ValueError("BaseMorphism: ordinal_map.source_bound mismatch")
        if self.ordinal_map.target_bound > self.target.settling_bound:
            raise ValueError(
                "BaseMorphism: ordinal_map.target_bound exceeds target "
                "settling_bound"
            )

    # ---- valuation push-forward ------------------------------------------

    def apply_to_valuation(
        self,
        valuation: Mapping[Hashable, FiberValuation[T]],
    ) -> Mapping[Hashable, FiberValuation[U]]:
        """Push a cross-fiber valuation ``v : Π → A_·`` along ``σ``.

        Output maps ``v'(F(p))`` for each predicate ``p`` of the source
        category. When the predicate-category functor is non-injective on
        objects, source-side fibers sharing a target-predicate image are
        merged via knowledge-join.
        """
        # Validate inputs.
        for predicate in self.source.predicate_category.predicates:
            if predicate not in valuation:
                raise ValueError(
                    f"valuation missing source predicate {predicate!r}"
                )
            fiber = valuation[predicate]
            if fiber.dom != self.source.predicate_category.dom_of(predicate):
                raise ValueError(
                    f"fiber on {predicate!r} has dom mismatch with source "
                    f"category"
                )

        target_cat = self.target.predicate_category
        target_bil = self.target.bilattice

        # Build empty target fibers for every target predicate.
        target_cells: dict[
            Hashable, dict[tuple[Hashable, Hashable], tuple[U, U]]
        ] = {p: {} for p in target_cat.predicates}

        # Push every source-side cell forward.
        for src_pred in self.source.predicate_category.predicates:
            tgt_pred = self.predcat_functor.apply_to_predicate(src_pred)
            tgt_dom = target_cat.dom_of(tgt_pred)
            src_fiber = valuation[src_pred]
            for cell, value in src_fiber.cells.items():
                tgt_cell = (
                    self.entity_map(cell[0]),
                    self.entity_map(cell[1]),
                )
                if tgt_cell not in tgt_dom:
                    # The image cell is not in the target domain — skip
                    # (consistent with the corpus's domain-respecting view).
                    continue
                lifted = self.l_hom.lift(value)
                existing = target_cells[tgt_pred].get(
                    tgt_cell, target_bil.knowledge_bottom()
                )
                target_cells[tgt_pred][tgt_cell] = target_bil.knowledge_join(
                    existing, lifted
                )

        result: dict[Hashable, FiberValuation[U]] = {}
        for tgt_pred in target_cat.predicates:
            result[tgt_pred] = FiberValuation(
                bilattice=target_bil,
                entities=target_cat.entities,
                bottom=target_bil.knowledge_bottom(),
                cells=target_cells[tgt_pred],
                dom=target_cat.dom_of(tgt_pred),
            )
        return MappingProxyType(result)

    # ---- settling push-forward -------------------------------------------

    def apply_to_settling(
        self,
        settling: PredicationSettling[T],
        target_closure: CrossFiberClosureOperator[U],
    ) -> PredicationSettling[U]:
        """Push a settling along ``σ`` using an explicit target closure.

        This is the canonical settling base-change operation. A base
        morphism acts on the recorded trajectory componentwise; it does
        not derive the target-side closure from the source-side closure.
        Callers must supply the closure living over the target
        hyperdoctrine, so the returned settling is operationally
        meaningful after base-change.
        """
        return self.apply_to_settling_with_closure(settling, target_closure)

    def apply_to_settling_with_closure(
        self,
        settling: PredicationSettling[T],
        target_closure: CrossFiberClosureOperator[U],
    ) -> PredicationSettling[U]:
        """Push a settling along ``σ`` with a supplied target-side closure.

        The output's trajectory at stage ``φ_λ(τ)`` carries the
        push-forward of ``v_τ``. When ``φ_λ`` collapses several source
        stages onto one target stage, only the latest source stage's
        push-forward is recorded (consistent with monotone collapse).

        If ``φ_λ`` skips an intermediate finite stage that lies below
        the last mapped stage, the previous mapped valuation is carried
        forward so the returned ``PredicationSettling`` still has a
        dense Python trajectory tuple. The returned bound is
        ``φ_λ(settling.bound)``; the captured trajectory may stop before
        that bound just like a quiescent settling produced by
        :meth:`PredicationSettling.run`.
        """
        if settling.hyperdoctrine.category is not self.source.predicate_category:
            raise ValueError(
                "BaseMorphism.apply_to_settling: source predicate category "
                "does not match settling.hyperdoctrine.category"
            )
        if settling.hyperdoctrine.bilattice is not self.source.bilattice:
            raise ValueError(
                "BaseMorphism.apply_to_settling: source bilattice does not "
                "match settling.hyperdoctrine.bilattice"
            )
        if target_closure.hyperdoctrine.category is not self.target.predicate_category:
            raise ValueError(
                "BaseMorphism.apply_to_settling: target predicate category "
                "does not match target_closure.hyperdoctrine.category"
            )
        if target_closure.hyperdoctrine.bilattice is not self.target.bilattice:
            raise ValueError(
                "BaseMorphism.apply_to_settling: target bilattice does not "
                "match target_closure.hyperdoctrine.bilattice"
            )

        target_bound = self.ordinal_map(settling.bound)
        mapped: dict[int, Mapping[Hashable, FiberValuation[U]]] = {}
        for tau, stage in enumerate(settling.trajectory):
            target_tau = self.ordinal_map(tau)
            mapped[target_tau] = self.apply_to_valuation(stage)

        if not mapped:
            raise ValueError("cannot push a settling with an empty trajectory")

        max_stage = max(mapped)
        carried: Mapping[Hashable, FiberValuation[U]] | None = None
        dense: list[Mapping[Hashable, FiberValuation[U]]] = []
        empty = MappingProxyType(
            {
                p: target_closure.hyperdoctrine.fiber(p)
                for p in self.target.predicate_category.predicates
            }
        )
        for tau in range(max_stage + 1):
            if tau in mapped:
                carried = mapped[tau]
            if carried is None:
                carried = empty
            dense.append(MappingProxyType(dict(carried)))

        return PredicationSettling(
            hyperdoctrine=target_closure.hyperdoctrine,
            closure=target_closure,
            bound=target_bound,
            trajectory=tuple(dense),
        )

    # ---- composition -----------------------------------------------------

    def then(self, other: BaseMorphism[U, V]) -> BaseMorphism[T, V]:
        """Compose two base-morphisms: ``self ; other``.

        Requires ``self.target == other.source`` componentwise.
        """
        if self.target is not other.source:
            raise ValueError(
                "BaseMorphism.then requires self.target is other.source"
            )

        def composed_l(x: T) -> V:
            return other.l_hom.forward(self.l_hom.forward(x))

        def composed_e(x: Hashable) -> Hashable:
            return other.entity_map.forward(self.entity_map.forward(x))

        def composed_phi(i: int) -> int:
            return other.ordinal_map.forward(self.ordinal_map.forward(i))

        return BaseMorphism[T, V](
            source=self.source,
            target=other.target,
            l_hom=ResidLatticeHom[T, V](
                forward=composed_l,
                source_bilattice=self.l_hom.source_bilattice,
                target_bilattice=other.l_hom.target_bilattice,
            ),
            predcat_functor=_compose_functors(
                self.predcat_functor, other.predcat_functor
            ),
            entity_map=EntityMap(
                forward=composed_e,
                source=self.entity_map.source,
                target=other.entity_map.target,
            ),
            ordinal_map=OrdinalMap(
                forward=composed_phi,
                source_bound=self.ordinal_map.source_bound,
                target_bound=other.ordinal_map.target_bound,
            ),
        )

    @staticmethod
    def identity(base: ParameterBase[T]) -> BaseMorphism[T, T]:
        """The identity morphism on a base."""
        # Identity functor on the predicate category.
        on_predicates = {
            p: p for p in base.predicate_category.predicates
        }
        on_morphisms = {
            gen: gen for gen in base.predicate_category.generators
        }
        identity_functor = PredicateFunctor(
            source=base.predicate_category,
            target=base.predicate_category,
            on_predicates=on_predicates,
            on_morphisms=on_morphisms,
        )
        return BaseMorphism[T, T](
            source=base,
            target=base,
            l_hom=ResidLatticeHom.identity(base.bilattice),
            predcat_functor=identity_functor,
            entity_map=EntityMap.identity(base.entity_set),
            ordinal_map=OrdinalMap.identity(base.settling_bound),
        )


def _compose_functors(
    f: PredicateFunctor, g: PredicateFunctor
) -> PredicateFunctor:
    """Compose two predicate functors: ``g ∘ f``."""
    if f.target is not g.source:
        raise ValueError("functor composition: f.target is not g.source")
    on_predicates = {
        p: g.apply_to_predicate(f.apply_to_predicate(p))
        for p in f.source.predicates
    }
    on_morphisms = {}
    for gen in f.source.generators:
        f_image = f.on_morphisms[gen]
        g_image = g.on_morphisms.get(f_image, f_image)
        on_morphisms[gen] = g_image
    return PredicateFunctor(
        source=f.source,
        target=g.target,
        on_predicates=on_predicates,
        on_morphisms=on_morphisms,
    )


__all__ = [
    "BaseMorphism",
    "EntityMap",
    "OrdinalMap",
    "ParameterBase",
    "ResidLatticeHom",
]
