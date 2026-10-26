"""Positing morphisms and FOUR speech-act classes.

The observation-side store operation in PyPredCalc is not just a map update:
it is the corpus's positing morphism

    v |-> v ∨_k delta_(subject, predicate, object, value).

On FOUR, the datum classifies the illocutionary force of that act. This
module keeps that structure explicit for SDK callers while remaining a thin
wrapper around the existing knowledge-monotone ``PredicationStore``.
"""

from __future__ import annotations

from collections.abc import Hashable, Iterable
from dataclasses import dataclass
from enum import Enum
from typing import cast

from .._realizes import realizes
from ..algebra.bilattice import BilatticeValue, knowledge_join
from ..algebra.twist_product import TwistBilattice
from .cell import PredicationCell
from .fiber_valuation import FiberValuation
from .four import four_to_twist
from .hyperdoctrine import PredicationHyperdoctrine
from .index_map import IndexMap
from .predicate_category import PredicateCategory, PredicateMorphism
from .store import PredicationStore
from .witness import BatchPositingNaturalityWitness, PositingNaturalityWitness


@realizes("concepts/speech-act")
class SpeechActClass(Enum):
    """FOUR-valued speech-act classes for positing data."""

    ABSTAINING = "abstaining"
    ASSERTING = "asserting"
    DENYING = "denying"
    CONTESTING = "contesting"


@realizes("theorems/belnap-speech-act-partition")
def speech_act_class(value: BilatticeValue) -> SpeechActClass:
    """Classify a FOUR positing datum by the Belnap speech-act partition."""
    if value is BilatticeValue.BOT:
        return SpeechActClass.ABSTAINING
    if value is BilatticeValue.T:
        return SpeechActClass.ASSERTING
    if value is BilatticeValue.F:
        return SpeechActClass.DENYING
    if value is BilatticeValue.TOP:
        return SpeechActClass.CONTESTING
    raise AssertionError(f"unhandled FOUR value: {value!r}")


@realizes("morphisms/positing-morphism")
@dataclass(frozen=True)
class PositingMorphism:
    """A cell-targeted knowledge-monotone evidence injection."""

    subject: Hashable
    predicate: Hashable
    object: Hashable
    value: BilatticeValue

    @property
    def key(self) -> tuple[Hashable, Hashable, Hashable]:
        """The targeted predication cell, without its value."""
        return (self.subject, self.predicate, self.object)

    @property
    def cell(self) -> PredicationCell:
        """The delta-cell this morphism injects."""
        return PredicationCell(
            self.subject,
            self.predicate,
            self.object,
            self.value,
        )

    @property
    def speech_act(self) -> SpeechActClass:
        """The FOUR speech-act class of this positing datum."""
        return speech_act_class(self.value)

    def apply(self, store: PredicationStore) -> PredicationStore:
        """Apply ``v |-> v ∨_k delta`` to a store.

        Abstaining is the identity morphism, so it does not materialize a
        knowledge-bottom cell in the sparse store representation.
        """
        if self.value is BilatticeValue.BOT:
            return store
        return store.insert(self.cell)

    def then(self, second: PositingMorphism) -> PositingMorphism:
        """Compose two positing morphisms at the same cell."""
        if self.key != second.key:
            raise ValueError("same-cell positing composition requires matching keys")
        return PositingMorphism(
            subject=self.subject,
            predicate=self.predicate,
            object=self.object,
            value=knowledge_join(self.value, second.value),
        )

    def commutes_with(self, other: PositingMorphism) -> bool:
        """Return whether this morphism commutes with another positing morphism."""
        if self.key != other.key:
            return True
        return self.then(other).value is other.then(self).value


@realizes("morphisms/assertive-positing-morphism")
def assertive_positing(
    subject: Hashable,
    predicate: Hashable,
    object: Hashable,
) -> PositingMorphism:
    """Build the FOUR assertive positing morphism at a cell."""
    return PositingMorphism(subject, predicate, object, BilatticeValue.T)


@realizes("morphisms/denial-positing-morphism")
def denial_positing(
    subject: Hashable,
    predicate: Hashable,
    object: Hashable,
) -> PositingMorphism:
    """Build the FOUR denial positing morphism at a cell."""
    return PositingMorphism(subject, predicate, object, BilatticeValue.F)


@realizes("morphisms/contestation-positing-morphism")
def contestation_positing(
    subject: Hashable,
    predicate: Hashable,
    object: Hashable,
) -> PositingMorphism:
    """Build the FOUR contestation positing morphism at a cell."""
    return PositingMorphism(subject, predicate, object, BilatticeValue.TOP)


def apply_positings(
    store: PredicationStore,
    positings: Iterable[PositingMorphism],
) -> PredicationStore:
    """Apply a finite batch of positing morphisms in sequence."""
    out = store
    for morphism in positings:
        out = morphism.apply(out)
    return out


@realizes("theorems/positing-naturality")
def reindex_positing(
    category: PredicateCategory,
    bilattice: TwistBilattice[int],
    morphism: PredicateMorphism,
    positing: PositingMorphism,
) -> tuple[PositingMorphism, ...]:
    """Pull a target-side positing back along a predicate morphism.

    The result is a finite source-side batch. Specialization and converse
    return zero or one positing; subject/object projections can return many
    source positings over a target diagonal cell. Off-diagonal projection
    targets have empty inverse image, so the returned batch is empty.
    """
    if positing.predicate != morphism.target:
        raise ValueError(
            "positing predicate must be the morphism target for reindexing"
        )

    index = IndexMap.from_generator(
        morphism,
        source_dom=category.dom_of(morphism.source),
        target_dom=category.dom_of(morphism.target),
        bilattice=bilattice,
    )
    target_pair = (positing.subject, positing.object)
    if target_pair not in index.target:
        raise ValueError(
            f"positing cell ({positing.subject!r}, {positing.predicate!r}, "
            f"{positing.object!r}) is outside dom({morphism.target!r})"
        )

    source_pairs = cast(frozenset[tuple[Hashable, Hashable]], index.source)
    return tuple(
        PositingMorphism(
            subject=source_pair[0],
            predicate=morphism.source,
            object=source_pair[1],
            value=positing.value,
        )
        for source_pair in sorted(source_pairs, key=repr)
        if index.phi[source_pair] == target_pair
    )


@realizes("theorems/positing-naturality")
def positing_naturality_witness(
    hyperdoctrine: PredicationHyperdoctrine[int],
    morphism: PredicateMorphism,
    target_fiber: FiberValuation[int],
    positing: PositingMorphism,
) -> PositingNaturalityWitness[int]:
    """Witness that positing commutes with predicate-category reindexing."""
    if positing.predicate != morphism.target:
        raise ValueError(
            "positing predicate must be the morphism target for naturality"
        )
    if target_fiber.dom != hyperdoctrine.dom(morphism.target):
        raise ValueError(
            f"target_fiber.dom does not match dom({morphism.target!r})"
        )

    target_after = target_fiber.knowledge_join(
        _delta_fiber(
            hyperdoctrine,
            predicate=morphism.target,
            subject=positing.subject,
            object_=positing.object,
            value=positing.value,
        )
    )
    left = hyperdoctrine.f_star(morphism, target_after)

    source_before = hyperdoctrine.f_star(morphism, target_fiber)
    reindexed = reindex_positing(
        hyperdoctrine.category,
        hyperdoctrine.bilattice,
        morphism,
        positing,
    )
    source_cells = {(m.subject, m.object): four_to_twist(m.value) for m in reindexed}
    source_after = source_before.knowledge_join(
        FiberValuation(
            bilattice=hyperdoctrine.bilattice,
            entities=hyperdoctrine.category.entities,
            bottom=hyperdoctrine.bilattice.knowledge_bottom(),
            cells=source_cells,
            dom=hyperdoctrine.dom(morphism.source),
        )
    )

    return PositingNaturalityWitness(
        morphism=morphism,
        positing=positing,
        reindexed_positings=reindexed,
        left=left,
        right=source_after,
    )


@realizes("theorems/positing-naturality")
def batch_positing_naturality_witness(
    hyperdoctrine: PredicationHyperdoctrine[int],
    morphism: PredicateMorphism,
    target_fiber: FiberValuation[int],
    positings: Iterable[PositingMorphism],
) -> BatchPositingNaturalityWitness[int]:
    """Witness naturality for a finite batch of target-side positings."""
    positing_tuple = tuple(positings)
    if target_fiber.dom != hyperdoctrine.dom(morphism.target):
        raise ValueError(
            f"target_fiber.dom does not match dom({morphism.target!r})"
        )

    target_after = target_fiber
    reindexed: list[PositingMorphism] = []
    for positing in positing_tuple:
        if positing.predicate != morphism.target:
            raise ValueError(
                "every positing predicate must be the morphism target"
            )
        target_after = target_after.knowledge_join(
            _delta_fiber(
                hyperdoctrine,
                predicate=morphism.target,
                subject=positing.subject,
                object_=positing.object,
                value=positing.value,
            )
        )
        reindexed.extend(
            reindex_positing(
                hyperdoctrine.category,
                hyperdoctrine.bilattice,
                morphism,
                positing,
            )
        )

    left = hyperdoctrine.f_star(morphism, target_after)
    source_after = hyperdoctrine.f_star(morphism, target_fiber)
    for positing in reindexed:
        source_after = source_after.knowledge_join(
            FiberValuation(
                bilattice=hyperdoctrine.bilattice,
                entities=hyperdoctrine.category.entities,
                bottom=hyperdoctrine.bilattice.knowledge_bottom(),
                cells={(positing.subject, positing.object): four_to_twist(positing.value)},
                dom=hyperdoctrine.dom(morphism.source),
            )
        )
    return BatchPositingNaturalityWitness(
        morphism=morphism,
        positings=positing_tuple,
        reindexed_positings=tuple(reindexed),
        left=left,
        right=source_after,
    )


def _delta_fiber(
    hyperdoctrine: PredicationHyperdoctrine[int],
    *,
    predicate: Hashable,
    subject: Hashable,
    object_: Hashable,
    value: BilatticeValue,
) -> FiberValuation[int]:
    pair = (subject, object_)
    dom = hyperdoctrine.dom(predicate)
    if pair not in dom:
        raise ValueError(
            f"cell ({subject!r}, {predicate!r}, {object_!r}) is outside "
            f"dom({predicate!r})"
        )
    return FiberValuation(
        bilattice=hyperdoctrine.bilattice,
        entities=hyperdoctrine.category.entities,
        bottom=hyperdoctrine.bilattice.knowledge_bottom(),
        cells={pair: four_to_twist(value)},
        dom=dom,
    )


__all__ = [
    "PositingMorphism",
    "SpeechActClass",
    "apply_positings",
    "assertive_positing",
    "batch_positing_naturality_witness",
    "contestation_positing",
    "denial_positing",
    "positing_naturality_witness",
    "reindex_positing",
    "speech_act_class",
]
