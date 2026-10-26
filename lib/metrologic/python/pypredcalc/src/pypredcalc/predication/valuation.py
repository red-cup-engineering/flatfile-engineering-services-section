"""World-indexed bilattice valuations on predication cells.

Realizes corpus objects: `predication-valuation`, `world-set`.

A valuation assigns a `BilatticeValue` to every (subject, predicate,
object) triple in a fixed `EntitySet × predicates × EntitySet` space,
indexed by a world identifier. World-indexed valuations are the bridge
from raw observation cells to modal/possibilistic semantics: each world
contributes its own `PredicationStore`, and aggregate operations
(knowledge-merge across worlds, truth-collapse to a single world) are
expressed in terms of the underlying bilattice operations.
"""

from __future__ import annotations

from collections.abc import Hashable, Iterable, Iterator
from dataclasses import dataclass, field

from ..algebra.bilattice import BilatticeValue, truth_meet
from .entity_set import EntitySet
from .store import PredicationStore


@dataclass(frozen=True)
class PredicationValuation:
    """A finite world-indexed map of predication stores.

    Constraints: every store's cells must reference subjects and objects
    that lie in `subjects` / `objects` and predicates in `predicates`.
    """

    subjects: EntitySet
    predicates: EntitySet
    objects: EntitySet
    by_world: dict[Hashable, PredicationStore] = field(default_factory=dict)

    def worlds(self) -> Iterator[Hashable]:
        return iter(self.by_world)

    def get(self, world: Hashable) -> PredicationStore:
        """Return the store at `world`, or an empty store if absent."""
        return self.by_world.get(world, PredicationStore.empty())

    def with_store(
        self, world: Hashable, store: PredicationStore
    ) -> PredicationValuation:
        """Return a new valuation where `world` maps to `store` (validated)."""
        for cell in store.cells():
            if cell.subject not in self.subjects:
                raise ValueError(f"subject {cell.subject!r} not in EntitySet")
            if cell.predicate not in self.predicates:
                raise ValueError(f"predicate {cell.predicate!r} not in predicates")
            if cell.object not in self.objects:
                raise ValueError(f"object {cell.object!r} not in EntitySet")
        new_by_world = dict(self.by_world)
        new_by_world[world] = store
        return PredicationValuation(
            subjects=self.subjects,
            predicates=self.predicates,
            objects=self.objects,
            by_world=new_by_world,
        )

    def knowledge_merge_all(self) -> PredicationStore:
        """Merge every world's store under the bilattice knowledge order.

        Worlds contribute *additively* in the knowledge dimension: if one
        world says ``t`` and another says ``f`` for the same key, the
        merged value is ``top`` (= conflict).
        """
        result = PredicationStore.empty()
        for store in self.by_world.values():
            result = result.merge(store)
        return result

    def truth_consensus(self, worlds: Iterable[Hashable]) -> PredicationStore:
        """For every key, collapse across given worlds with the truth meet.

        Conservative consensus: the result asserts a value only as strong
        as every selected world (truth meet of values, defaulting to
        ``bot`` for absent worlds).
        """
        worlds = list(worlds)
        if not worlds:
            return PredicationStore.empty()
        keys: set[tuple[Hashable, Hashable, Hashable]] = set()
        for w in worlds:
            for cell in self.get(w).cells():
                keys.add(cell.key)
        from .cell import PredicationCell
        cells: list[PredicationCell] = []
        for key in keys:
            value = BilatticeValue.T
            for w in worlds:
                value = truth_meet(value, self.get(w).get(*key))
            if value != BilatticeValue.BOT:
                cells.append(
                    PredicationCell(
                        subject=key[0],
                        predicate=key[1],
                        object=key[2],
                        value=value,
                    )
                )
        return PredicationStore.from_cells(cells)


__all__ = ["PredicationValuation"]
