"""Finite entity set: the carrier of subjects/objects in a predication category.

Realizes corpus object: `entity-set`.

An entity set is a finite, stably-ordered set of opaque hashable
identifiers. Stability of ordering matters: matrix-valued operations
(predication matrices, valuation tables) index rows/columns by the
entity ordering, so two equal entity sets must always present their
elements in the same order.
"""

from __future__ import annotations

from collections.abc import Hashable, Iterable, Iterator
from dataclasses import dataclass

from .._realizes import realizes


@realizes("objects/entity-set")
@dataclass(frozen=True)
class EntitySet:
    """A finite ordered set of entity identifiers.

    Stored as a tuple to lock element order; the constructor de-duplicates
    while preserving first-occurrence order.
    """

    entities: tuple[Hashable, ...]

    @classmethod
    def of(cls, items: Iterable[Hashable]) -> EntitySet:
        seen: set[Hashable] = set()
        out: list[Hashable] = []
        for x in items:
            if x in seen:
                continue
            seen.add(x)
            out.append(x)
        return cls(tuple(out))

    def __post_init__(self) -> None:
        if len(set(self.entities)) != len(self.entities):
            raise ValueError("EntitySet entities must be unique")

    def __len__(self) -> int:
        return len(self.entities)

    def __contains__(self, item: object) -> bool:
        return item in self.entities

    def __iter__(self) -> Iterator[Hashable]:
        return iter(self.entities)

    def index(self, item: Hashable) -> int:
        try:
            return self.entities.index(item)
        except ValueError as exc:
            raise KeyError(f"{item!r} not in EntitySet") from exc

    def union(self, other: EntitySet) -> EntitySet:
        """Order-preserving union: this set's elements first, then new ones from `other`."""
        return EntitySet.of(list(self.entities) + list(other.entities))

    def intersection(self, other: EntitySet) -> EntitySet:
        """Elements in both, in this set's order."""
        other_set = set(other.entities)
        return EntitySet(tuple(x for x in self.entities if x in other_set))

    def __repr__(self) -> str:
        return f"EntitySet({list(self.entities)!r})"
