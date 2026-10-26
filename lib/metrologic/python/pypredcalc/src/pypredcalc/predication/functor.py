"""Functors between :class:`PredicateCategory` instances.

A :class:`PredicateFunctor` ``F : 𝒞 → 𝒟`` carries:

- an **on-predicates** map ``F_0 : Ob(𝒞) → Ob(𝒟)``
- an **on-morphisms** map ``F_1`` over the generators of ``𝒞``,
  sending each generator ``f : q → p`` to a morphism
  ``F_1(f) : F_0(q) → F_0(p)`` of ``𝒟``.

The constructor enforces source/target compatibility on every supplied
generator image. Identities are sent to identities by convention
(:meth:`apply_to_morphism` returns ``identity(F_0(p))`` for any identity
on ``p``); composites are sent to composites of images.

Given a :class:`PredicateFunctor` ``F`` and a fiber-valuation on the
target category ``v_𝒟 : Π_𝒟 → ⋃_p A_p``, the **restriction along F**
``F^*(v_𝒟) : Π_𝒞 → ⋃_p A_p`` is the source-side valuation
``F^*(v_𝒟)(p) := v_𝒟(F_0(p))``. A standard categorical fact, which we
verify by tests at task-#3 / task-#4 boundary, is that **naturality is
preserved by restriction along a functor**: if ``v_𝒟`` is
``𝒟``-natural and every generator ``f`` of ``𝒞`` satisfies
``F_1(f)^*(v_𝒟(F_0(p))) = v_𝒟(F_0(q))``, then ``F^*(v_𝒟)`` is
``𝒞``-natural.

The natural-transformation surface (component family + naturality
square) is intentionally not modelled here; this minimal functor
realisation is sufficient for the corpus role of "interpretation
between predicate categories" and for the store↔fiber bridge to lift
between categories.
"""
from __future__ import annotations

from collections.abc import Hashable, Mapping
from dataclasses import dataclass, field
from types import MappingProxyType

from .fiber_valuation import FiberValuation
from .predicate_category import (
    PredicateCategory,
    PredicateIdentity,
    PredicateMorphism,
    _ComposedMorphism,
)

__all__ = [
    "PredicateFunctor",
]


@dataclass(frozen=True)
class PredicateFunctor:
    """A functor ``F : 𝒞 → 𝒟`` between two :class:`PredicateCategory` instances.

    ``on_predicates`` must map every predicate of ``source`` to a
    predicate of ``target``. ``on_morphisms`` must contain an entry for
    every generator of ``source``, and each image must be a morphism of
    ``target`` whose source/target predicates match the on-predicates
    image of the original generator's source/target.
    """

    source: PredicateCategory
    target: PredicateCategory
    on_predicates: Mapping[Hashable, Hashable]
    on_morphisms: Mapping[PredicateMorphism, PredicateMorphism] = field(
        default_factory=dict
    )

    def __post_init__(self) -> None:
        # Validate on_predicates: total on source predicates, lands in target.
        missing = [p for p in self.source.predicates if p not in self.on_predicates]
        if missing:
            raise ValueError(
                f"on_predicates not total on source: missing {missing!r}"
            )
        for src_p, tgt_p in self.on_predicates.items():
            if src_p not in self.source.predicates:
                raise ValueError(
                    f"on_predicates key {src_p!r} not a source predicate"
                )
            if tgt_p not in self.target.predicates:
                raise ValueError(
                    f"on_predicates value {tgt_p!r} not a target predicate"
                )
        # Validate on_morphisms: total on source generators, target arrows agree.
        for gen in self.source.generators:
            if gen not in self.on_morphisms:
                raise ValueError(
                    f"on_morphisms missing image for source generator {gen!r}"
                )
            image = self.on_morphisms[gen]
            expected_src = self.on_predicates[gen.source]
            expected_tgt = self.on_predicates[gen.target]
            if image.source != expected_src or image.target != expected_tgt:
                raise ValueError(
                    f"functoriality fails on {gen!r}: image {image!r} has "
                    f"(source, target)=({image.source!r}, {image.target!r}); "
                    f"expected ({expected_src!r}, {expected_tgt!r})"
                )
            if image.source not in self.target.predicates:
                raise ValueError(
                    f"image of {gen!r} has source {image.source!r} not in "
                    f"target predicates"
                )
            if image.target not in self.target.predicates:
                raise ValueError(
                    f"image of {gen!r} has target {image.target!r} not in "
                    f"target predicates"
                )
        # Wrap the on_predicates and on_morphisms mappings so external code
        # cannot mutate them after construction.
        object.__setattr__(
            self, "on_predicates", MappingProxyType(dict(self.on_predicates))
        )
        object.__setattr__(
            self, "on_morphisms", MappingProxyType(dict(self.on_morphisms))
        )

    def apply_to_predicate(self, predicate: Hashable) -> Hashable:
        """Return ``F_0(predicate)``."""
        if predicate not in self.on_predicates:
            raise KeyError(f"{predicate!r} not in source predicates")
        return self.on_predicates[predicate]

    def apply_to_morphism(self, morphism: PredicateMorphism) -> PredicateMorphism:
        """Return ``F_1(morphism)``, total on every arrow generated from source.

        Action by case:
          * **identities** ``id_p`` go to ``id_{F_0(p)}`` by convention;
          * **registered generators** look up directly in ``on_morphisms``;
          * **composites** ``g ∘ f`` (instances of the internal
            :class:`_ComposedMorphism`) recurse: ``F_1(g ∘ f) = F_1(g) ∘ F_1(f)``,
            using :meth:`PredicateCategory.compose` on the *target* category
            so the result lives in the right category.

        Raises :class:`KeyError` only if the morphism is neither an
        identity nor a generator nor a composite of those — i.e.
        something the source category did not produce.
        """
        if morphism.is_identity():
            target_predicate = self.apply_to_predicate(morphism.source)
            return PredicateIdentity(
                source=target_predicate, target=target_predicate
            )
        if morphism in self.on_morphisms:
            return self.on_morphisms[morphism]
        if isinstance(morphism, _ComposedMorphism):
            f_image = self.apply_to_morphism(morphism._first)
            g_image = self.apply_to_morphism(morphism._second)
            return self.target.compose(g_image, f_image)
        raise KeyError(
            f"no functor image for morphism {morphism!r} (must be either "
            f"an identity, a registered source generator, or a composite "
            f"thereof)"
        )

    def restrict_valuation(
        self, target_valuation: Mapping[Hashable, FiberValuation[Hashable]]
    ) -> dict[Hashable, FiberValuation[Hashable]]:
        """Pull a target-side valuation back to a source-side valuation along F.

        Definition: ``F^*(v_𝒟)(p) := v_𝒟(F_0(p))``. The result is
        keyed by source predicates.
        """
        for source_predicate in self.source.predicates:
            target_predicate = self.on_predicates[source_predicate]
            if target_predicate not in target_valuation:
                raise KeyError(
                    f"target valuation missing fiber for {target_predicate!r} "
                    f"(image of source predicate {source_predicate!r})"
                )
        return {
            source_predicate: target_valuation[
                self.on_predicates[source_predicate]
            ]
            for source_predicate in self.source.predicates
        }

    @classmethod
    def identity(cls, category: PredicateCategory) -> PredicateFunctor:
        """The identity functor ``id_𝒞 : 𝒞 → 𝒞``."""
        return cls(
            source=category,
            target=category,
            on_predicates={p: p for p in category.predicates},
            on_morphisms={g: g for g in category.generators},
        )

    def compose(self, other: PredicateFunctor) -> PredicateFunctor:
        """Return ``self ∘ other``: requires ``other.target == self.source``."""
        if other.target is not self.source:
            raise ValueError(
                "PredicateFunctor.compose requires other.target is self.source"
            )
        on_predicates = {
            p: self.on_predicates[other.on_predicates[p]]
            for p in other.source.predicates
        }
        on_morphisms = {
            gen: self.apply_to_morphism(other.on_morphisms[gen])
            for gen in other.source.generators
        }
        return PredicateFunctor(
            source=other.source,
            target=self.target,
            on_predicates=on_predicates,
            on_morphisms=on_morphisms,
        )
