"""FOUR <-> boolean twist encoding helpers for predication ingest.

Observation-side APIs use :class:`BilatticeValue`; fiber-side predication
machinery over the canonical boolean twist uses tuple values:

``T = (1, 0)``, ``F = (0, 1)``, ``BOT = (0, 0)``, ``TOP = (1, 1)``.
"""

from __future__ import annotations

from types import MappingProxyType

from ..algebra.bilattice import BilatticeValue

FOUR_TO_BOOLEAN_TWIST: MappingProxyType[BilatticeValue, tuple[int, int]] = (
    MappingProxyType(
        {
            BilatticeValue.T: (1, 0),
            BilatticeValue.F: (0, 1),
            BilatticeValue.BOT: (0, 0),
            BilatticeValue.TOP: (1, 1),
        }
    )
)

BOOLEAN_TWIST_TO_FOUR: MappingProxyType[tuple[int, int], BilatticeValue] = (
    MappingProxyType({v: k for k, v in FOUR_TO_BOOLEAN_TWIST.items()})
)


def four_to_twist(value: BilatticeValue) -> tuple[int, int]:
    """Encode a FOUR value as a boolean-twist pair."""
    return FOUR_TO_BOOLEAN_TWIST[value]


def twist_to_four(value: tuple[int, int]) -> BilatticeValue:
    """Decode a boolean-twist pair as a FOUR value."""
    return BOOLEAN_TWIST_TO_FOUR[value]


__all__ = [
    "BOOLEAN_TWIST_TO_FOUR",
    "FOUR_TO_BOOLEAN_TWIST",
    "four_to_twist",
    "twist_to_four",
]
