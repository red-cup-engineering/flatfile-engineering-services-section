"""Structural witnesses for predication-categorical claims.

In predication category theory the answer to a structural question is
the *categorical object* that witnesses it, not a flat truth value. This
module defines witness types for naturality and quiescence — the
predication-categorical claims that PyPredCalc currently produces — so
that calling code can inspect *why* a claim holds or fails, not just
read a yes/no off it.

Witnesses are frozen dataclasses with a ``holds: bool`` property and a
``__bool__`` so callers who only want the summary can still write
``if witness:`` or ``assert witness``. The structural fields (per-cell
discrepancies, per-generator failures, the closure-step shape) live on
the witness; the bool is read off the structure, not the other way
around.

Why this shape. A bool collapses ``∀f. f^*(v(p)) = v(q)`` to a single
bit; the witness preserves the per-generator data (which generator's
pullback was checked, what value it produced, where it agreed or
disagreed with the source fiber) so downstream code can localise the
failure or build further structure on the witness. PyPredCalc's job is
to compute *with* this structure, not to summarise it away.
"""

from __future__ import annotations

from collections.abc import Hashable, Mapping
from dataclasses import dataclass
from typing import Generic, TypeVar

from .fiber_valuation import FiberValuation

T = TypeVar("T", bound=Hashable)


@dataclass(frozen=True)
class GeneratorNaturalityCheck(Generic[T]):
    """Witness for one generator's naturality check.

    For a generator ``f : q → p`` and a cross-fiber valuation ``v``:

    - :attr:`pulled` is the fiber ``f^*(v(p))`` — the pullback of the
      target fiber along ``f``.
    - :attr:`expected` is ``v(q)`` — the source fiber.
    - :attr:`holds` is ``pulled == expected``.
    - :attr:`discrepancy` is the set of cells where ``pulled`` and
      ``expected`` disagree (empty when ``holds``).
    """

    generator: object  # PredicateMorphism, but avoid circular import
    pulled: FiberValuation[T]
    expected: FiberValuation[T]

    @property
    def holds(self) -> bool:
        return self.pulled == self.expected

    @property
    def discrepancy(self) -> frozenset[tuple[Hashable, Hashable]]:
        if self.pulled == self.expected:
            return frozenset()
        cells: set[tuple[Hashable, Hashable]] = set()
        for s in self.pulled.entities:
            for o in self.pulled.entities:
                if self.pulled.get(s, o) != self.expected.get(s, o):
                    cells.add((s, o))
        return frozenset(cells)


@dataclass(frozen=True)
class NaturalityWitness(Generic[T]):
    """Structural witness for ``𝒞``-naturality of a cross-fiber valuation.

    Records one :class:`GeneratorNaturalityCheck` per generator of the
    predicate category. The witness's ``holds`` is the conjunction
    across every check; ``failures`` exposes the sub-tuple that did not
    hold so callers can localise the failure.

    Implements ``__bool__`` for ergonomic ``if witness:`` checks; the
    structural fields are still present and authoritative. Tests that
    want the bool can use ``bool(witness)`` or ``witness.holds``.
    """

    valuation: Mapping[Hashable, FiberValuation[T]]
    checks: tuple[GeneratorNaturalityCheck[T], ...]

    @property
    def holds(self) -> bool:
        return all(check.holds for check in self.checks)

    @property
    def failures(self) -> tuple[GeneratorNaturalityCheck[T], ...]:
        return tuple(c for c in self.checks if not c.holds)

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class QuiescenceWitness(Generic[T]):
    """Structural witness for closure quiescence ``cl(v) = v``.

    Records the input ``v``, the closure's image ``after = cl(v)``, and
    (when the two differ) the set of cells per predicate that changed.
    Quiescence is the fixed-point statement; the witness records the
    closure-step shape that justifies (or refutes) it.
    """

    before: Mapping[Hashable, FiberValuation[T]]
    after: Mapping[Hashable, FiberValuation[T]]

    @property
    def holds(self) -> bool:
        if set(self.before) != set(self.after):
            return False
        for predicate in self.before:
            if self.before[predicate] != self.after[predicate]:
                return False
        return True

    @property
    def changed_cells(self) -> dict[Hashable, frozenset[tuple[Hashable, Hashable]]]:
        """Per-predicate set of cells where ``cl(v)`` differs from ``v``."""
        out: dict[Hashable, frozenset[tuple[Hashable, Hashable]]] = {}
        keys = set(self.before) | set(self.after)
        for p in keys:
            if p not in self.before or p not in self.after:
                # An entire fiber appeared or disappeared — flag with a
                # sentinel: the whole index of one side.
                fiber = self.after.get(p) or self.before.get(p)
                if fiber is None:
                    continue
                out[p] = frozenset(
                    (s, o) for s in fiber.entities for o in fiber.entities
                )
                continue
            v_before = self.before[p]
            v_after = self.after[p]
            if v_before == v_after:
                continue
            cells: set[tuple[Hashable, Hashable]] = set()
            for s in v_before.entities:
                for o in v_before.entities:
                    if v_before.get(s, o) != v_after.get(s, o):
                        cells.add((s, o))
            out[p] = frozenset(cells)
        return out

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class BeckChevalleyCheck(Generic[T]):
    """One BC commutation check for a chosen adjoint and one input fiber.

    Records the LHS ``∃_{p_A}(p_B^*(φ))`` (or ``∀_{p_A} ...`` for the
    universal variant) and the RHS ``f^*(∃_g(φ))``, both as cell-dicts
    on the carrier of ``f.source``. ``holds`` iff the two are equal.
    """

    adjoint: str  # "existential_k", "existential_t", "universal_k", "universal_t"
    # Keys are IndexMap labels — Hashable in the general case; for the
    # predication-fibration use sites, cell coordinates `(s, o)`.
    phi: Mapping[Hashable, tuple[T, T]]
    lhs: Mapping[Hashable, tuple[T, T]]
    rhs: Mapping[Hashable, tuple[T, T]]

    @property
    def holds(self) -> bool:
        return dict(self.lhs) == dict(self.rhs)

    @property
    def discrepancy(self) -> frozenset[Hashable]:
        if self.holds:
            return frozenset()
        keys = set(self.lhs) | set(self.rhs)
        return frozenset(
            k for k in keys if dict(self.lhs).get(k) != dict(self.rhs).get(k)
        )


@dataclass(frozen=True)
class BeckChevalleyWitness(Generic[T]):
    """Structural witness for Beck-Chevalley commutation along a pullback square.

    Records the four families of checks (existential/universal × k/t)
    over the chosen sweep of input fibers. ``holds`` is the conjunction
    across every check; ``failures`` exposes the sub-tuple that did not
    hold so callers can localise the failure.

    Realises the corpus theorem
    ``beck-chevalley-commutation-on-predication-bilattices`` as a
    structural object: the witness *is* the cellwise verification, with
    per-(adjoint, fiber) evidence preserved.
    """

    f_source: frozenset[Hashable]
    g_source: frozenset[Hashable]
    pullback_carrier: frozenset[Hashable]
    checks: tuple[BeckChevalleyCheck[T], ...]

    @property
    def holds(self) -> bool:
        return all(c.holds for c in self.checks)

    @property
    def failures(self) -> tuple[BeckChevalleyCheck[T], ...]:
        return tuple(c for c in self.checks if not c.holds)

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class PositingNaturalityWitness(Generic[T]):
    """Structural witness for positing/reindexing commutation.

    For ``f : q -> p`` and a positing datum at a cell of ``p``, records
    both sides of the naturality equation:

    ``f^*(posit_phi(v)) = posit_{f^*(phi)}(f^*(v))``.

    The right-hand side may be a finite batch of source positings, because
    projection generators have many source cells over one target diagonal
    cell and no source cells over off-diagonal target cells.
    """

    morphism: object
    positing: object
    reindexed_positings: tuple[object, ...]
    left: FiberValuation[T]
    right: FiberValuation[T]

    @property
    def holds(self) -> bool:
        return self.left == self.right

    @property
    def discrepancy(self) -> frozenset[tuple[Hashable, Hashable]]:
        if self.holds:
            return frozenset()
        cells: set[tuple[Hashable, Hashable]] = set()
        for cell in self.left.dom | self.right.dom:
            if self.left.get(*cell) != self.right.get(*cell):
                cells.add(cell)
        return frozenset(cells)

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class BatchPositingNaturalityWitness(Generic[T]):
    """Structural witness for finite-batch positing naturality."""

    morphism: object
    positings: tuple[object, ...]
    reindexed_positings: tuple[object, ...]
    left: FiberValuation[T]
    right: FiberValuation[T]

    @property
    def holds(self) -> bool:
        return self.left == self.right

    @property
    def discrepancy(self) -> frozenset[tuple[Hashable, Hashable]]:
        if self.holds:
            return frozenset()
        cells: set[tuple[Hashable, Hashable]] = set()
        for cell in self.left.dom | self.right.dom:
            if self.left.get(*cell) != self.right.get(*cell):
                cells.add(cell)
        return frozenset(cells)

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class QuantifierAdjunctionCheck(Generic[T]):
    """One sampled B1 adjunction equivalence check.

    ``left_holds`` and ``right_holds`` are the two sides of one iff:

    - ``exists_k``: ``∃_f^k(α) ≤_k β`` iff ``α ≤_k f^*(β)``
    - ``forall_k``: ``f^*(β) ≤_k α`` iff ``β ≤_k ∀_f^k(α)``
    - truth-order variants replace ``≤_k`` with ``≤_t``.
    """

    morphism: object
    adjunction: str
    source: FiberValuation[T]
    target: FiberValuation[T]
    left_holds: bool
    right_holds: bool

    @property
    def holds(self) -> bool:
        return self.left_holds == self.right_holds

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class QuantifierAdjunctionWitness(Generic[T]):
    """Structural witness for B1k/B1t quantifier adjunctions."""

    hyperdoctrine: object
    morphism: object
    checks: tuple[QuantifierAdjunctionCheck[T], ...]

    @property
    def holds(self) -> bool:
        return all(check.holds for check in self.checks)

    @property
    def failures(self) -> tuple[QuantifierAdjunctionCheck[T], ...]:
        return tuple(check for check in self.checks if not check.holds)

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class FrobeniusCheck(Generic[T]):
    """One sampled B2 Frobenius reciprocity check."""

    morphism: object
    order: str
    target: FiberValuation[T]
    source: FiberValuation[T]
    lhs: FiberValuation[T]
    rhs: FiberValuation[T]

    @property
    def holds(self) -> bool:
        return self.lhs == self.rhs

    @property
    def discrepancy(self) -> frozenset[tuple[Hashable, Hashable]]:
        if self.holds:
            return frozenset()
        cells: set[tuple[Hashable, Hashable]] = set()
        for cell in self.lhs.dom | self.rhs.dom:
            if self.lhs.get(*cell) != self.rhs.get(*cell):
                cells.add(cell)
        return frozenset(cells)

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class FrobeniusWitness(Generic[T]):
    """Structural witness for B2k/B2t Frobenius reciprocity."""

    hyperdoctrine: object
    morphism: object
    checks: tuple[FrobeniusCheck[T], ...]

    @property
    def holds(self) -> bool:
        return all(check.holds for check in self.checks)

    @property
    def failures(self) -> tuple[FrobeniusCheck[T], ...]:
        return tuple(check for check in self.checks if not check.holds)

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class FusionFrobeniusCheck(Generic[T]):
    """One sampled check for the non-axiomatic fusion-Frobenius identity."""

    morphism: object
    target: FiberValuation[T]
    source: FiberValuation[T]
    lhs: FiberValuation[T]
    rhs: FiberValuation[T]

    @property
    def holds(self) -> bool:
        return self.lhs == self.rhs

    @property
    def discrepancy(self) -> frozenset[tuple[Hashable, Hashable]]:
        if self.holds:
            return frozenset()
        cells: set[tuple[Hashable, Hashable]] = set()
        for cell in self.lhs.dom | self.rhs.dom:
            if self.lhs.get(*cell) != self.rhs.get(*cell):
                cells.add(cell)
        return frozenset(cells)

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class FusionFrobeniusWitness(Generic[T]):
    """Negative/positive witness for Frobenius reciprocity with fusion."""

    hyperdoctrine: object
    morphism: object
    checks: tuple[FusionFrobeniusCheck[T], ...]

    @property
    def holds(self) -> bool:
        return all(check.holds for check in self.checks)

    @property
    def failures(self) -> tuple[FusionFrobeniusCheck[T], ...]:
        return tuple(check for check in self.checks if not check.holds)

    def __bool__(self) -> bool:
        return self.holds


__all__ = [
    "BeckChevalleyCheck",
    "BeckChevalleyWitness",
    "BatchPositingNaturalityWitness",
    "FrobeniusCheck",
    "FrobeniusWitness",
    "FusionFrobeniusCheck",
    "FusionFrobeniusWitness",
    "GeneratorNaturalityCheck",
    "NaturalityWitness",
    "PositingNaturalityWitness",
    "QuantifierAdjunctionCheck",
    "QuantifierAdjunctionWitness",
    "QuiescenceWitness",
]
