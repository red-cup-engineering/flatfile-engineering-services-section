"""Transfinite cell complex for non-strict-regime settling dynamics.

Realises corpus object ``transfinite-cell-complex`` for the
finite-stage / ω-bounded case: a sequence of stages
``X_0 ⊆ X_1 ⊆ ... ⊆ X_λ`` indexed by a non-negative integer ``λ``,
with cells attached at each successor stage and the limit-stage
``X_ω`` realised as the union of all preceding stages.

A transfinite cell complex carries:

- A **stage assignment** ``stages : N → 2^{cell}`` per finite stage.
- A **face-incidence relation** between cells: ``σ ≺ τ`` if ``σ`` is
  a face of ``τ``. Faces of a cell are attached at strictly earlier
  stages.
- A **settling bound** ``λ`` — the carrier ordinal (currently a
  Python int; transfinite ordinals beyond ``ω`` are deferred).

The corpus characterises the transfinite cell complex as a directed
colimit of finite sub-complexes:

    X = colim_{F ⊆_fin cells(X)} X|_F.

For ω-bounded complexes, this directed colimit is presented step-by-
step: the ``β``-skeleton is the union of all stages ``< β``. At the
limit stage ``ω``, the skeleton equals the full cell set.

The transfinite Curry equivalence (corpus theorem
``q-enriched-curry-transfinite-cw``) is the next-stage realisation
this carrier supports. That theorem is realised in a follow-up task.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable, Mapping
from dataclasses import dataclass
from types import MappingProxyType

from .._realizes import realizes


@dataclass(frozen=True)
class TransfiniteInductionWitness:
    """Structural witness that a property holds at every stage of a
    transfinite cell complex, including the limit stage.

    For finite-stage complexes the witness records per-stage evidence;
    at limit stages the property must hold by the directed-colimit
    construction (a property holds at the colimit iff it holds at
    cofinally-many stages, for properties stable under the colimit's
    direct system).
    """

    per_stage: Mapping[int, bool]
    limit_stage_holds: bool

    @property
    def holds(self) -> bool:
        return all(self.per_stage.values()) and self.limit_stage_holds

    def __bool__(self) -> bool:
        return self.holds


@realizes("objects/transfinite-cell-complex")
@dataclass(frozen=True)
class TransfiniteCellComplex:
    """A transfinite cell complex up to ``ω`` (finite-stage segment).

    Parameters
    ----------
    stages
        Map from stage ``τ`` (an integer ≥ 0) to the set of cells
        attached *at* that stage. Cells in stage ``τ`` are not present
        in stages ``< τ`` and are present in skeleta ``≥ τ``.
    face_incidence
        Map from cell to the set of cells that are its faces. Faces of
        a cell at stage ``τ`` must be attached at stages ``< τ``.
    settling_bound
        The carrier ordinal ``λ``. For finite-stage complexes,
        ``stages.keys() ⊆ {0, 1, ..., settling_bound}``. The complex
        admits the limit stage ``settling_bound + 1 → ∞`` (modelled
        here as the union of all preceding stages).

    Construction validates:

    - Stage indices are non-negative integers within ``[0, settling_bound]``.
    - Cells are unique across stages (a cell appears in exactly one stage).
    - Face-incidence respects stage ordering: every face of a cell at
      stage ``τ`` is attached at some stage ``< τ``.
    """

    stages: Mapping[int, frozenset[Hashable]]
    face_incidence: Mapping[Hashable, frozenset[Hashable]]
    settling_bound: int

    def __post_init__(self) -> None:
        if self.settling_bound < 0:
            raise ValueError(
                f"settling_bound must be non-negative, got "
                f"{self.settling_bound!r}"
            )
        for stage in self.stages:
            if not isinstance(stage, int) or stage < 0:
                raise ValueError(
                    f"stage indices must be non-negative integers; got "
                    f"{stage!r}"
                )
            if stage > self.settling_bound:
                raise ValueError(
                    f"stage {stage} exceeds settling_bound "
                    f"{self.settling_bound}"
                )

        seen: set[Hashable] = set()
        for cells in self.stages.values():
            for cell in cells:
                if cell in seen:
                    raise ValueError(
                        f"cell {cell!r} appears in multiple stages"
                    )
                seen.add(cell)
        all_cells = frozenset(seen)

        cell_to_stage: dict[Hashable, int] = {}
        for stage, cells in self.stages.items():
            for cell in cells:
                cell_to_stage[cell] = stage

        for cell, faces in self.face_incidence.items():
            if cell not in all_cells:
                raise ValueError(
                    f"face_incidence keyed at {cell!r} but cell not in any "
                    f"stage"
                )
            cell_stage = cell_to_stage[cell]
            for face in faces:
                if face not in all_cells:
                    raise ValueError(
                        f"face {face!r} of cell {cell!r} not in any stage"
                    )
                if cell_to_stage[face] >= cell_stage:
                    raise ValueError(
                        f"face {face!r} of cell {cell!r} is at stage "
                        f"{cell_to_stage[face]} ≥ cell's stage "
                        f"{cell_stage}; faces must be at strictly earlier "
                        f"stages"
                    )

        canonical_stages = {
            stage: frozenset(cells)
            for stage, cells in self.stages.items()
        }
        canonical_faces = {
            cell: frozenset(faces)
            for cell, faces in self.face_incidence.items()
        }
        object.__setattr__(self, "stages", MappingProxyType(canonical_stages))
        object.__setattr__(
            self, "face_incidence", MappingProxyType(canonical_faces)
        )

    # ---- Cell access ------------------------------------------------------

    def cells(self) -> frozenset[Hashable]:
        """All cells in the complex (every stage)."""
        result: set[Hashable] = set()
        for cells in self.stages.values():
            result.update(cells)
        return frozenset(result)

    def cells_at(self, stage: int) -> frozenset[Hashable]:
        """Cells attached *at* stage ``τ`` (not including earlier stages)."""
        return self.stages.get(stage, frozenset())

    def skeleton(self, stage: int) -> frozenset[Hashable]:
        """The ``β``-skeleton: union of stages ``< β``.

        Per the corpus's transfinite-skeleton recursion: at successor
        stages ``β = β' + 1``, the skeleton equals the prior skeleton
        plus the cell at index ``β'``; at limit stages, it equals the
        union of all preceding stages. For ``β`` exceeding the bound,
        returns the full cell set.
        """
        if stage < 0:
            return frozenset()
        result: set[Hashable] = set()
        for s in range(stage):
            result.update(self.stages.get(s, frozenset()))
        return frozenset(result)

    def stage_of(self, cell: Hashable) -> int:
        """The stage at which ``cell`` is attached.

        Raises ``KeyError`` if the cell is not in this complex.
        """
        for stage, cells in self.stages.items():
            if cell in cells:
                return stage
        raise KeyError(f"{cell!r} not in this complex")

    def is_attached_at(self, cell: Hashable, stage: int) -> bool:
        """Return ``True`` iff ``cell`` is attached at ``stage``.

        The complement of ``stage_of(cell) == stage``, with the same
        ``KeyError`` semantics for cells outside the complex.
        """
        return self.stage_of(cell) == stage

    def faces_of(self, cell: Hashable) -> frozenset[Hashable]:
        """The faces of ``cell`` per the face-incidence relation."""
        return self.face_incidence.get(cell, frozenset())

    # ---- Transfinite-induction witness -----------------------------------

    def transfinite_induction_witness(
        self, property_holds: Callable[[frozenset[Hashable]], bool]
    ) -> TransfiniteInductionWitness:
        """Verify ``property_holds`` at every skeleton plus the full
        cell set (limit stage).

        ``property_holds`` is a predicate on cell-sets: returns ``True``
        iff the property holds at the skeleton consisting of those
        cells.

        The witness records per-stage evidence
        ``per_stage[τ] = property_holds(skeleton(τ+1))`` and
        ``limit_stage_holds = property_holds(cells())``. For properties
        stable under directed colimit, per-stage evidence implies
        limit-stage evidence; the witness records both.
        """
        per_stage: dict[int, bool] = {}
        for tau in range(self.settling_bound + 1):
            per_stage[tau] = property_holds(self.skeleton(tau + 1))
        limit_holds = property_holds(self.cells())
        return TransfiniteInductionWitness(
            per_stage=MappingProxyType(per_stage),
            limit_stage_holds=limit_holds,
        )


__all__ = [
    "TransfiniteCellComplex",
    "TransfiniteInductionWitness",
]
