"""Dualized closure 2-comonad and the Cl-algebra ↔ Cl*-coalgebra correspondence.

Realises corpus morphism ``dualized-closure-2-comonad`` and corpus
theorem ``closure-algebra-coalgebra-correspondence``.

The corpus puts ``Cl*`` on the Priestley-dual side: where the primal
``Cl`` inflates fiber-algebra valuations ("algebra grows"), ``Cl*``
restricts paired-Priestley spectra ("spectrum shrinks"). Both sides
share the **same fixed-point set** under Jung-Rivieccio duality
([closure-fixed-points-Priestley correspondence]); the corpus theorem
``closure-algebra-coalgebra-correspondence`` is precisely this: the
Cl-pseudo-algebras and Cl*-pseudo-coalgebras are in bijection, both
characterised by fixed-point status under ``cl``.

This module gives the algebra-side computational view of the
correspondence. We do not carry the Priestley spectrum explicitly; we
model ``Cl*`` structurally as the comonad whose fixed-point set
coincides with ``cl``'s, and we expose the bijection at the witness
level. The structural identity that makes this honest:

    is_cl_algebra(monad, v)         iff   cl(v) = v
    is_cl_coalgebra(comonad, v)     iff   cl(v) = v   (corpus theorem)

The bijection ``algebra_to_coalgebra`` / ``coalgebra_to_algebra`` is
therefore the witness-renaming that respects this shared underlying
condition.
"""

from __future__ import annotations

from collections.abc import Hashable, Iterable, Mapping
from dataclasses import dataclass
from typing import Generic, TypeVar

from .._realizes import realizes
from .closure_monad import (
    ClAlgebraWitness,
    ClosureMonad,
)
from .closure_rule_system import CrossFiberClosureOperator
from .fiber_valuation import FiberValuation

T = TypeVar("T", bound=Hashable)


# ---- Dual-side witnesses --------------------------------------------------


@dataclass(frozen=True)
class ClStarCounitWitness(Generic[T]):
    """Witness for the counit ``ε*_v : Cl*(v) ↪ v`` — the closed-subspace
    inclusion dual to the primal inflationarity unit.

    Practically: in our algebra-side model, ``Cl*(v)`` is identified
    with the unique fixed point reached by iterating ``cl`` from
    knowledge-meet candidates ≤_k v. ``holds`` records that ``v`` is
    already at fixed point (so the inclusion is identity), or surfaces
    the cells that would need to be removed.
    """

    valuation: Mapping[Hashable, FiberValuation[T]]
    closure_image: Mapping[Hashable, FiberValuation[T]]

    @property
    def holds(self) -> bool:
        """True iff ``cl(v) = v`` — equivalent to ``v`` being its own
        Cl*-image (the closed subspace coincides with the whole)."""
        if set(self.valuation.keys()) != set(self.closure_image.keys()):
            return False
        return all(
            self.valuation[p] == self.closure_image[p]
            for p in self.valuation
        )

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class ClStarComultiplicationWitness(Generic[T]):
    """Witness for the comultiplication ``δ*_v : Cl*(v) → Cl*²(v)``.

    Strict-idempotent ``cl`` ⟹ ``Cl*² = Cl*`` ⟹ ``δ*_v`` is the
    identity 2-cell. ``holds`` records this.
    """

    cl_v: Mapping[Hashable, FiberValuation[T]]
    cl_cl_v: Mapping[Hashable, FiberValuation[T]]

    @property
    def holds(self) -> bool:
        if set(self.cl_v.keys()) != set(self.cl_cl_v.keys()):
            return False
        return all(self.cl_v[p] == self.cl_cl_v[p] for p in self.cl_v)

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class ClCoalgebraWitness(Generic[T]):
    """Witness that ``v`` is a Cl*-coalgebra: the dualization of
    :class:`ClAlgebraWitness`.

    A pseudo-coalgebra structure forces ``v = Cl*(v)``; under the
    primal-dual correspondence this is the same fixed-point condition
    ``cl(v) = v`` as Cl-algebra membership. ``failures`` reports cells
    that violate the condition on the primal side, which is what we
    can compute directly.
    """

    valuation: Mapping[Hashable, FiberValuation[T]]
    closure_image: Mapping[Hashable, FiberValuation[T]]

    @property
    def holds(self) -> bool:
        if set(self.valuation.keys()) != set(self.closure_image.keys()):
            return False
        return all(
            self.valuation[p] == self.closure_image[p]
            for p in self.valuation
        )

    @property
    def failures(
        self,
    ) -> dict[Hashable, frozenset[tuple[Hashable, Hashable]]]:
        out: dict[Hashable, frozenset[tuple[Hashable, Hashable]]] = {}
        for p in self.valuation:
            v = self.valuation[p]
            w = self.closure_image[p]
            cells = {
                cell for cell in v.dom if v.get(*cell) != w.get(*cell)
            }
            if cells:
                out[p] = frozenset(cells)
        return out

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class DualizedClosureComonadLawWitness(Generic[T]):
    """Structural witness for sampled dualized closure-comonad laws."""

    comonad: DualizedClosureComonad[T]
    counit_checks: tuple[ClStarCounitWitness[T], ...]
    comultiplication_checks: tuple[ClStarComultiplicationWitness[T], ...]

    @property
    def holds(self) -> bool:
        return all(self.counit_checks) and all(self.comultiplication_checks)

    @property
    def counit_failures(self) -> tuple[ClStarCounitWitness[T], ...]:
        return tuple(check for check in self.counit_checks if not check)

    @property
    def comultiplication_failures(
        self,
    ) -> tuple[ClStarComultiplicationWitness[T], ...]:
        return tuple(check for check in self.comultiplication_checks if not check)

    def __bool__(self) -> bool:
        return self.holds


# ---- The 2-comonad --------------------------------------------------------


@realizes("morphisms/dualized-closure-2-comonad")
@dataclass(frozen=True)
class DualizedClosureComonad(Generic[T]):
    """The 2-comonad ``Cl*`` dual to :class:`ClosureMonad`.

    On the algebra side, we identify ``Cl*(v)`` with ``v`` whenever
    ``cl(v) = v`` (the closed-subspace inclusion is then identity).
    The full Priestley-spectrum machinery is not modelled here; the
    corpus's structural content — the bijection of fixed points under
    Jung-Rivieccio duality — is exposed via :func:`is_cl_coalgebra`,
    :func:`algebra_to_coalgebra`, and :func:`coalgebra_to_algebra`.
    """

    closure: CrossFiberClosureOperator[T]

    def counit_at(
        self, valuation: Mapping[Hashable, FiberValuation[T]]
    ) -> ClStarCounitWitness[T]:
        """``ε*_v`` — the closed-subspace inclusion ``Cl*(v) ↪ v``."""
        return ClStarCounitWitness(
            valuation=valuation, closure_image=self.closure.at(valuation)
        )

    def comultiplication_at(
        self, valuation: Mapping[Hashable, FiberValuation[T]]
    ) -> ClStarComultiplicationWitness[T]:
        """``δ*_v`` — the comultiplication. Identity on strict-idempotent
        ``cl``."""
        cl_v = self.closure.at(valuation)
        cl_cl_v = self.closure.at(cl_v)
        return ClStarComultiplicationWitness(cl_v=cl_v, cl_cl_v=cl_cl_v)

    def law_witness(
        self,
        valuations: Iterable[Mapping[Hashable, FiberValuation[T]]],
    ) -> DualizedClosureComonadLawWitness[T]:
        """Sample the dualized closure-comonad laws over concrete valuations."""
        samples = tuple(valuations)
        return DualizedClosureComonadLawWitness(
            comonad=self,
            counit_checks=tuple(self.counit_at(v) for v in samples),
            comultiplication_checks=tuple(
                self.comultiplication_at(v) for v in samples
            ),
        )


# ---- Coalgebra check + the correspondence --------------------------------


def is_cl_coalgebra(
    comonad: DualizedClosureComonad[T],
    valuation: Mapping[Hashable, FiberValuation[T]],
) -> ClCoalgebraWitness[T]:
    """Decide whether ``valuation`` is a Cl*-coalgebra.

    By the corpus theorem
    ``closure-algebra-coalgebra-correspondence``, this is the same
    condition as Cl-algebra membership: ``cl(valuation) = valuation``.
    """
    return ClCoalgebraWitness(
        valuation=valuation,
        closure_image=comonad.closure.at(valuation),
    )


@realizes("theorems/closure-algebra-coalgebra-correspondence")
def algebra_to_coalgebra(
    algebra_witness: ClAlgebraWitness[T],
) -> ClCoalgebraWitness[T]:
    """Bijection from Cl-algebras to Cl*-coalgebras.

    Realises the corpus theorem
    ``closure-algebra-coalgebra-correspondence``: under Jung-Rivieccio
    duality, the two characterisations agree on the underlying
    valuation. The bijection is therefore the structural rename of the
    witness type — same valuation, same closure image, same holds
    status, same per-cell failure data.
    """
    return ClCoalgebraWitness(
        valuation=algebra_witness.valuation,
        closure_image=algebra_witness.closure_image,
    )


@realizes("theorems/closure-algebra-coalgebra-correspondence")
def coalgebra_to_algebra(
    coalgebra_witness: ClCoalgebraWitness[T],
) -> ClAlgebraWitness[T]:
    """Inverse of :func:`algebra_to_coalgebra`."""
    return ClAlgebraWitness(
        valuation=coalgebra_witness.valuation,
        closure_image=coalgebra_witness.closure_image,
    )


def make_comonad_from_monad(
    monad: ClosureMonad[T],
) -> DualizedClosureComonad[T]:
    """Convenience: build the dualized comonad from the primal monad."""
    return DualizedClosureComonad(closure=monad.closure)


__all__ = [
    "ClCoalgebraWitness",
    "ClStarCounitWitness",
    "ClStarComultiplicationWitness",
    "DualizedClosureComonad",
    "DualizedClosureComonadLawWitness",
    "algebra_to_coalgebra",
    "coalgebra_to_algebra",
    "is_cl_coalgebra",
    "make_comonad_from_monad",
]
