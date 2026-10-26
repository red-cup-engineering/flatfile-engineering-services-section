"""Bridge between :class:`PredicationStore` and per-predicate
:class:`FiberValuation` views.

A :class:`PredicationStore` is a flat finite map keyed by the
``(subject, predicate, object)`` triple — a convenient ingest format for
observation cells with values in the four-element Belnap bilattice
``FOUR``. A :class:`PredicateCategory` operates on per-predicate **fiber
valuations** ``{predicate: FiberValuation[Hashable]}`` — one fiber-algebra element
``A_p = L^{⋈ E×E}`` per object of the category.

The corpus's fiber algebra is parameterised by an arbitrary residuated
lattice ``L``; the store is FOUR-flavoured. The bridge converts under a
fixed encoding ``T↔(1,0), F↔(0,1), BOT↔(0,0), TOP↔(1,1)`` corresponding
to the canonical isomorphism ``2^⋈ ≅ FOUR``. This makes the bridge
useful only when the target fiber valuations sit over the boolean twist
``2^⋈``; for arbitrary residuated bases, ingest cells in tuple form
directly into a :class:`FiberValuation`.
"""
from __future__ import annotations

from collections.abc import Hashable, Mapping

from ..algebra.twist_product import TwistBilattice, boolean_twist
from .cell import PredicationCell
from .fiber_valuation import FiberValuation
from .four import four_to_twist, twist_to_four
from .predicate_category import PredicateCategory
from .store import PredicationStore

__all__ = [
    "fibers_to_store",
    "store_to_fibers",
]


def store_to_fibers(
    store: PredicationStore,
    category: PredicateCategory,
    bilattice: TwistBilattice[int] | None = None,
) -> dict[Hashable, FiberValuation[int]]:
    """Slice a store into one :class:`FiberValuation` per category predicate.

    The returned fibers sit over ``bilattice`` (default: :func:`boolean_twist`),
    with the knowledge-bottom ``(0, 0)``. Each ``BilatticeValue`` cell is
    translated via the FOUR↔2^⋈ encoding; non-default cells become
    fiber entries, and ``BOT`` cells are dropped.

    Cells whose predicate is not in ``category.predicates`` are silently
    dropped. Cells whose ``(subject, object)`` is not in the predicate's
    declared domain are also dropped.

    The result is keyed by *every* predicate of the category, including
    predicates with no observed cells (which map to an empty
    :class:`FiberValuation`).
    """
    if bilattice is None:
        bilattice = boolean_twist()
    bottom = (0, 0)
    by_predicate: dict[Hashable, dict[tuple[Hashable, Hashable], tuple[int, int]]] = {
        predicate: {} for predicate in category.predicates
    }
    for cell in store.cells():
        if cell.predicate not in by_predicate:
            continue
        pair = (cell.subject, cell.object)
        if pair not in category.dom_of(cell.predicate):
            continue
        twist_value = four_to_twist(cell.value)
        by_predicate[cell.predicate][pair] = twist_value
    return {
        predicate: FiberValuation(
            bilattice=bilattice,
            entities=category.entities,
            bottom=bottom,
            cells=cells,
            dom=category.dom_of(predicate),
        )
        for predicate, cells in by_predicate.items()
    }


def fibers_to_store(
    fibers: Mapping[Hashable, FiberValuation[int]],
    category: PredicateCategory,
) -> PredicationStore:
    """Reassemble a :class:`PredicationStore` from per-predicate fibers.

    Every key in ``fibers`` must be a predicate of ``category``. Each
    fiber's cell values must be in the FOUR↔2^⋈ encoding (i.e. tuples
    drawn from ``{(0,0), (0,1), (1,0), (1,1)}``); unknown values raise.
    """
    entities = set(category.entities)
    cells: list[PredicationCell] = []
    for predicate, fiber in fibers.items():
        if predicate not in category.predicates:
            raise KeyError(
                f"predicate {predicate!r} not in category.predicates"
            )
        for (subject, object_), value in fiber.cells.items():
            if subject not in entities or object_ not in entities:
                raise ValueError(
                    f"fiber at predicate {predicate!r} carries cell "
                    f"({subject!r}, {object_!r}) outside E × E"
                )
            try:
                four_value = twist_to_four(value)
            except KeyError as exc:
                raise ValueError(
                    f"fiber at predicate {predicate!r} carries cell value "
                    f"{value!r} outside the FOUR encoding"
                ) from exc
            cells.append(
                PredicationCell(
                    subject=subject,
                    predicate=predicate,
                    object=object_,
                    value=four_value,
                )
            )
    return PredicationStore.from_cells(cells)
