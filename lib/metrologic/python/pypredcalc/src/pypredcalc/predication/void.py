"""Finite void-cone witnesses for captured predication settlings."""

from __future__ import annotations

from collections.abc import Hashable
from dataclasses import dataclass
from typing import Generic, TypeVar

from .._realizes import realizes
from .settling import PredicationSettling
from .settling_sheaf import SettlingH1Witness, StagedPredicatedCell

T = TypeVar("T", bound=Hashable)


@realizes("theorems/value-agnostic-void-cone-axiomatic")
@dataclass(frozen=True)
class VoidCone(Generic[T]):
    """Void filtration of a finite captured settling prefix.

    ``V_tau(q)`` is the set of predicate-domain cells whose value is the
    bilattice knowledge-bottom at captured stage ``tau``. The associated
    graded records cells leaving the void at each stage.
    """

    settling: PredicationSettling[T]

    def void_at(
        self,
        predicate: Hashable,
        stage: int,
    ) -> frozenset[tuple[Hashable, Hashable]]:
        self._require_stage(stage)
        fiber = self.settling.trajectory[stage][predicate]
        bottom = fiber.bilattice.knowledge_bottom()
        return frozenset(cell for cell in fiber.dom if fiber.get(*cell) == bottom)

    def limit_void(
        self,
        predicate: Hashable,
    ) -> frozenset[tuple[Hashable, Hashable]]:
        """Cells that remain in the void for every captured stage."""
        domain = self.settling.hyperdoctrine.dom(predicate)
        result = set(domain)
        for stage in range(len(self.settling.trajectory)):
            result &= set(self.void_at(predicate, stage))
        return frozenset(result)

    def left_void(
        self,
        predicate: Hashable,
        stage: int,
    ) -> frozenset[tuple[Hashable, Hashable]]:
        """Cells in the stage-``stage`` associated graded of the void."""
        self._require_stage(stage)
        previous = (
            self.settling.hyperdoctrine.dom(predicate)
            if stage == 0
            else self.void_at(predicate, stage - 1)
        )
        return previous - self.void_at(predicate, stage)

    def associated_graded(
        self,
        predicate: Hashable,
    ) -> tuple[tuple[int, frozenset[tuple[Hashable, Hashable]]], ...]:
        return tuple(
            (stage, self.left_void(predicate, stage))
            for stage in range(len(self.settling.trajectory))
        )

    def total_graded_rank(self) -> int:
        return sum(
            len(self.left_void(predicate, stage))
            for predicate in self.settling.hyperdoctrine.predicates()
            for stage in range(len(self.settling.trajectory))
        )

    def _require_stage(self, stage: int) -> None:
        if stage < 0 or stage >= len(self.settling.trajectory):
            raise IndexError(
                f"stage {stage!r} outside captured trajectory "
                f"0..{len(self.settling.trajectory) - 1}"
            )


@dataclass(frozen=True)
class VoidH1PairingCheck:
    """Checks one H1 generator against the void associated graded."""

    generator: StagedPredicatedCell
    left_void: frozenset[tuple[Hashable, Hashable]]

    @property
    def holds(self) -> bool:
        _predicate, _stage, cell = self.generator
        return cell in self.left_void


@realizes("theorems/void-cone-associated-graded-direct")
@dataclass(frozen=True)
class VoidConeAssociatedGradedWitness(Generic[T]):
    """Finite chain-level pairing between void graded cells and H1 generators."""

    void_cone: VoidCone[T]
    h1_witness: SettlingH1Witness
    checks: tuple[VoidH1PairingCheck, ...]

    @property
    def paired_generators(self) -> frozenset[StagedPredicatedCell]:
        return frozenset(check.generator for check in self.checks if check.holds)

    @property
    def holds(self) -> bool:
        return self.h1_witness.holds and all(check.holds for check in self.checks)

    @property
    def failures(self) -> tuple[VoidH1PairingCheck, ...]:
        return tuple(check for check in self.checks if not check.holds)

    @property
    def rank_agrees(self) -> bool:
        return len(self.paired_generators) == self.h1_witness.rank


def void_cone(settling: PredicationSettling[T]) -> VoidCone[T]:
    """Convenience constructor for a finite captured void cone."""
    return VoidCone(settling)


def void_cone_associated_graded_witness(
    settling: PredicationSettling[T],
    h1_witness: SettlingH1Witness,
) -> VoidConeAssociatedGradedWitness[T]:
    """Pair supplied H1 firing generators with cells leaving the void."""
    cone = void_cone(settling)
    checks = tuple(
        VoidH1PairingCheck(
            generator=generator,
            left_void=cone.left_void(generator[0], generator[1]),
        )
        for generator in h1_witness.generator_basis
    )
    return VoidConeAssociatedGradedWitness(
        void_cone=cone,
        h1_witness=h1_witness,
        checks=checks,
    )


__all__ = [
    "VoidCone",
    "VoidConeAssociatedGradedWitness",
    "VoidH1PairingCheck",
    "void_cone",
    "void_cone_associated_graded_witness",
]
