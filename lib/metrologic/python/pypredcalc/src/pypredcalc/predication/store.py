"""Finite predication store: keys → bilattice values, knowledge-monotone."""

from __future__ import annotations

from collections.abc import Hashable, Iterable, Iterator
from dataclasses import dataclass

from ..algebra.bilattice import BilatticeValue, knowledge_join
from .cell import PredicationCell


@dataclass(frozen=True)
class PredicationStore:
    """A finite map of predication keys to bilattice values.

    Re-inserting the same ``(subject, predicate, object)`` merges values with
    the bilattice knowledge join. Repeated observations are monotone in
    evidence: learning both ``t`` and ``f`` yields ``top``.
    """

    _values: dict[tuple[Hashable, Hashable, Hashable], BilatticeValue]

    @classmethod
    def empty(cls) -> PredicationStore:
        return cls({})

    @classmethod
    def from_cells(cls, cells: Iterable[PredicationCell]) -> PredicationStore:
        values: dict[tuple[Hashable, Hashable, Hashable], BilatticeValue] = {}
        for cell in cells:
            existing = values.get(cell.key, BilatticeValue.BOT)
            values[cell.key] = knowledge_join(existing, cell.value)
        return cls(values)

    def insert(self, cell: PredicationCell) -> PredicationStore:
        values = dict(self._values)
        existing = values.get(cell.key, BilatticeValue.BOT)
        values[cell.key] = knowledge_join(existing, cell.value)
        return PredicationStore(values)

    def get(
        self,
        subject: Hashable,
        predicate: Hashable,
        object: Hashable,
        default: BilatticeValue = BilatticeValue.BOT,
    ) -> BilatticeValue:
        return self._values.get((subject, predicate, object), default)

    def cells(self) -> Iterator[PredicationCell]:
        """Yield all cells in deterministic key order."""
        for subject, predicate, object_ in sorted(
            self._values, key=lambda item: tuple(map(str, item))
        ):
            yield PredicationCell(
                subject=subject,
                predicate=predicate,
                object=object_,
                value=self._values[(subject, predicate, object_)],
            )

    def merge(self, other: PredicationStore) -> PredicationStore:
        """Knowledge-merge two stores."""
        values = dict(self._values)
        for key, value in other._values.items():
            existing = values.get(key, BilatticeValue.BOT)
            values[key] = knowledge_join(existing, value)
        return PredicationStore(values)
