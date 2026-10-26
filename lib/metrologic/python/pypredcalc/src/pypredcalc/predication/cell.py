"""Immutable (subject, predicate, object, value) predication cells.

Realizes corpus object: `predication-cell`.
"""

from __future__ import annotations

from collections.abc import Hashable
from dataclasses import dataclass

from .._realizes import realizes
from ..algebra.bilattice import BilatticeValue


@realizes("concepts/predication-cell")
@dataclass(frozen=True)
class PredicationCell:
    """An immutable ``(subject, predicate, object, value)`` predication cell."""

    subject: Hashable
    predicate: Hashable
    object: Hashable
    value: BilatticeValue = BilatticeValue.T

    @property
    def key(self) -> tuple[Hashable, Hashable, Hashable]:
        """Return the value-independent predication key."""
        return (self.subject, self.predicate, self.object)
