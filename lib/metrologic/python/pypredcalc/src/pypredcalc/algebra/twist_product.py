"""Ginsberg's twist construction L⋈L on a bounded lattice L.

Realizes corpus object: `twist-product`.
Realizes corpus morphisms: `twist-product-fusion`, `twist-product-right-residual`.

Given a bounded lattice ``L`` with order ``≤``, joins ``∨`` and meets ``∧``,
the twist-product ``L⋈L`` has carrier ``L × L`` with two orders:

- truth order:     ``(a, b) ≤_t (c, d)``  iff  ``a ≤ c``  and  ``d ≤ b``
- knowledge order: ``(a, b) ≤_k (c, d)``  iff  ``a ≤ c``  and  ``b ≤ d``

The construction yields an interlaced bilattice with negation
``~(a, b) = (b, a)``. When ``L`` is the two-element Boolean lattice
``{0, 1}``, the twist product is the four-element Belnap bilattice FOUR
(with the encoding ``t = (1, 0), f = (0, 1), bot = (0, 0), top = (1, 1)``).

When ``L`` additionally carries an integral commutative residuated-lattice
structure ``(·, →, 1)``, the twist product inherits a (non-integral)
commutative residuated structure ``(⊙, ⇒, ⟨1, 1⟩)`` adjoint under the
truth order — see corpus theorem `twist-product-residuation`. The
formulas, taken from `morphisms/twist-product-fusion.md` and
`morphisms/twist-product-right-residual.md`:

    ⟨x, y⟩ ⊙ ⟨z, v⟩ = ⟨x · z,  (x → v) ∧ (z → y)⟩
    ⟨x, y⟩ ⇒ ⟨z, v⟩ = ⟨(x → z) ∧ (v → y),  x · v⟩
"""

from __future__ import annotations

from collections.abc import Callable, Hashable
from dataclasses import dataclass
from typing import TYPE_CHECKING, Generic, TypeVar

from .._realizes import realizes

if TYPE_CHECKING:
    from .residuated_lattice import ResiduatedLattice

T = TypeVar("T", bound=Hashable)


@realizes("objects/twist-product")
@dataclass(frozen=True)
class TwistBilattice(Generic[T]):
    """Twist-product bilattice ``L⋈L`` parameterised by a base lattice ``L``.

    Required: ``base_join``, ``base_meet``, ``base_leq`` for the bilattice
    operations and the two orders. Optional: ``base_tensor`` (the residuated
    lattice's ``·``), ``base_residuum`` (its ``→``), and ``base_unit`` (the
    monoidal unit ``1``). When all three are supplied, :meth:`fusion` and
    :meth:`right_residual` realise the inherited residuated structure on
    ``L⋈L``; without them, those methods raise ``ValueError``.
    """

    base_join: Callable[[T, T], T]
    base_meet: Callable[[T, T], T]
    base_leq: Callable[[T, T], bool]
    base_tensor: Callable[[T, T], T] | None = None
    base_residuum: Callable[[T, T], T] | None = None
    base_unit: T | None = None
    base_zero: T | None = None

    def truth_leq(self, p: tuple[T, T], q: tuple[T, T]) -> bool:
        a, b = p
        c, d = q
        return self.base_leq(a, c) and self.base_leq(d, b)

    def knowledge_leq(self, p: tuple[T, T], q: tuple[T, T]) -> bool:
        a, b = p
        c, d = q
        return self.base_leq(a, c) and self.base_leq(b, d)

    def truth_join(self, p: tuple[T, T], q: tuple[T, T]) -> tuple[T, T]:
        a, b = p
        c, d = q
        return (self.base_join(a, c), self.base_meet(b, d))

    def truth_meet(self, p: tuple[T, T], q: tuple[T, T]) -> tuple[T, T]:
        a, b = p
        c, d = q
        return (self.base_meet(a, c), self.base_join(b, d))

    def knowledge_join(self, p: tuple[T, T], q: tuple[T, T]) -> tuple[T, T]:
        a, b = p
        c, d = q
        return (self.base_join(a, c), self.base_join(b, d))

    def knowledge_meet(self, p: tuple[T, T], q: tuple[T, T]) -> tuple[T, T]:
        a, b = p
        c, d = q
        return (self.base_meet(a, c), self.base_meet(b, d))

    def negate(self, p: tuple[T, T]) -> tuple[T, T]:
        a, b = p
        return (b, a)

    def _require_residuated(self) -> tuple[Callable[[T, T], T], Callable[[T, T], T]]:
        if self.base_tensor is None or self.base_residuum is None:
            raise ValueError(
                "TwistBilattice has no residuated structure: "
                "construct with base_tensor and base_residuum, or via "
                "TwistBilattice.from_residuated_lattice(...)"
            )
        return self.base_tensor, self.base_residuum

    @realizes("morphisms/twist-product-fusion")
    def fusion(self, p: tuple[T, T], q: tuple[T, T]) -> tuple[T, T]:
        """Twist-product fusion ``⟨x,y⟩ ⊙ ⟨z,v⟩``.

        Defined as ``⟨x · z, (x → v) ∧ (z → y)⟩`` per the corpus formula.
        """
        tensor, residuum = self._require_residuated()
        x, y = p
        z, v = q
        return (tensor(x, z), self.base_meet(residuum(x, v), residuum(z, y)))

    @realizes("morphisms/twist-product-right-residual")
    def right_residual(self, p: tuple[T, T], q: tuple[T, T]) -> tuple[T, T]:
        """Twist-product right residual ``⟨x,y⟩ ⇒ ⟨z,v⟩``.

        Defined as ``⟨(x → z) ∧ (v → y), x · v⟩`` per the corpus formula.
        """
        tensor, residuum = self._require_residuated()
        x, y = p
        z, v = q
        return (self.base_meet(residuum(x, z), residuum(v, y)), tensor(x, v))

    def fusion_unit(self) -> tuple[T, T]:
        """The monoidal unit of fusion: ``⟨1, 1⟩``."""
        if self.base_unit is None:
            raise ValueError(
                "TwistBilattice has no base_unit; supply one or use "
                "from_residuated_lattice(...)"
            )
        return (self.base_unit, self.base_unit)

    def knowledge_top(self) -> tuple[T, T]:
        """The ``≤_k``-top of the bilattice: ``⟨1_L, 1_L⟩``.

        Under integrality of the base residuated structure the unit
        ``1_L`` is the top of ``L``, so ``⟨1_L, 1_L⟩`` is the
        coordinatewise max — the knowledge-top. Available exactly when
        ``base_unit`` is supplied.
        """
        if self.base_unit is None:
            raise ValueError(
                "TwistBilattice has no base_unit; cannot compute "
                "knowledge_top without it"
            )
        return (self.base_unit, self.base_unit)

    def knowledge_bottom(self) -> tuple[T, T]:
        """The ``≤_k``-bottom of the bilattice: ``⟨0_L, 0_L⟩``."""
        if self.base_zero is None:
            raise ValueError(
                "TwistBilattice has no base_zero; cannot compute "
                "knowledge_bottom without it"
            )
        return (self.base_zero, self.base_zero)

    def truth_top(self) -> tuple[T, T]:
        """The ``≤_t``-top of the bilattice: ``⟨1_L, 0_L⟩``.

        On the twist product, truth raises positive evidence and lowers
        negative evidence — so the top is positive=top, negative=bottom.
        For the boolean twist this is ``(1, 0) = T``.
        """
        if self.base_unit is None or self.base_zero is None:
            raise ValueError(
                "TwistBilattice needs both base_unit and base_zero to "
                "compute truth_top"
            )
        return (self.base_unit, self.base_zero)

    def truth_bottom(self) -> tuple[T, T]:
        """The ``≤_t``-bottom of the bilattice: ``⟨0_L, 1_L⟩``.

        Positive=bottom, negative=top — the truth-falsity coordinate.
        For the boolean twist this is ``(0, 1) = F``.
        """
        if self.base_unit is None or self.base_zero is None:
            raise ValueError(
                "TwistBilattice needs both base_unit and base_zero to "
                "compute truth_bottom"
            )
        return (self.base_zero, self.base_unit)

    @classmethod
    def from_residuated_lattice(
        cls, rl: ResiduatedLattice[T]
    ) -> TwistBilattice[T]:
        """Build the twist product ``L⋈L`` over a residuated lattice ``L``.

        The result carries fusion, right-residual, ``base_unit`` (=
        ``1_L``), and ``base_zero`` (= ``0_L``, recovered as the unique
        carrier element below every other) derived from ``rl``.
        """
        # 0_L is the unique element below every other; for finite finite
        # carriers it's the meet of all elements.
        carrier = list(rl.carrier)
        if not carrier:
            raise ValueError("residuated lattice has empty carrier")
        zero = carrier[0]
        for x in carrier[1:]:
            zero = rl.meet(zero, x)
        return cls(
            base_join=rl.join,
            base_meet=rl.meet,
            base_leq=rl.leq,
            base_tensor=rl.tensor,
            base_residuum=rl.residuum,
            base_unit=rl.unit,
            base_zero=zero,
        )


def boolean_twist() -> TwistBilattice[int]:
    """The twist product of the two-element Boolean lattice — recovers FOUR.

    Encoding: ``t = (1, 0), f = (0, 1), bot = (0, 0), top = (1, 1)``.

    Equipped with fusion, right-residual, ``base_unit = 1`` (lattice
    top), and ``base_zero = 0`` (lattice bottom), so all of
    ``knowledge_top``, ``knowledge_bottom``, ``truth_top``,
    ``truth_bottom``, ``fusion``, and ``right_residual`` are available.
    """
    return TwistBilattice(
        base_join=lambda a, b: max(a, b),
        base_meet=lambda a, b: min(a, b),
        base_leq=lambda a, b: a <= b,
        base_tensor=lambda a, b: min(a, b),
        base_residuum=lambda a, c: 1 if a <= c else c,
        base_unit=1,
        base_zero=0,
    )
