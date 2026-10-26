"""Phase 6 — Transfinite cell complex base type.

Tests the ω-bounded segment of corpus's `objects/transfinite-cell-complex`:
stage-indexed cell attachment, skeleton computation, face-incidence
validation, and the transfinite-induction witness.
"""

from __future__ import annotations

from pypredcalc.topology.transfinite_cell_complex import (
    TransfiniteCellComplex,
)

# ---- Construction --------------------------------------------------------


class TestConstruction:
    def test_empty_complex(self) -> None:
        complex_ = TransfiniteCellComplex(
            stages={}, face_incidence={}, settling_bound=0
        )
        assert complex_.cells() == frozenset()
        assert complex_.cells_at(0) == frozenset()
        assert complex_.skeleton(0) == frozenset()

    def test_single_stage_complex(self) -> None:
        complex_ = TransfiniteCellComplex(
            stages={0: frozenset({"v0", "v1"})},
            face_incidence={},
            settling_bound=0,
        )
        assert complex_.cells() == frozenset({"v0", "v1"})
        assert complex_.cells_at(0) == frozenset({"v0", "v1"})
        # skeleton(1) = stages 0..0 = stages with index < 1 = stage 0.
        assert complex_.skeleton(1) == frozenset({"v0", "v1"})

    def test_multi_stage_complex(self) -> None:
        # Two vertices at stage 0, one edge at stage 1.
        complex_ = TransfiniteCellComplex(
            stages={
                0: frozenset({"v0", "v1"}),
                1: frozenset({"e01"}),
            },
            face_incidence={"e01": frozenset({"v0", "v1"})},
            settling_bound=1,
        )
        assert complex_.cells() == frozenset({"v0", "v1", "e01"})
        assert complex_.cells_at(0) == frozenset({"v0", "v1"})
        assert complex_.cells_at(1) == frozenset({"e01"})
        # 0-skeleton: nothing.
        assert complex_.skeleton(0) == frozenset()
        # 1-skeleton: stage 0.
        assert complex_.skeleton(1) == frozenset({"v0", "v1"})
        # 2-skeleton: stages 0 + 1.
        assert complex_.skeleton(2) == frozenset({"v0", "v1", "e01"})

    def test_omega_bounded_complex(self) -> None:
        """Five stages: 5 cells, each attached at a successive stage."""
        complex_ = TransfiniteCellComplex(
            stages={i: frozenset({f"c{i}"}) for i in range(5)},
            face_incidence={
                f"c{i}": frozenset({f"c{i-1}"}) for i in range(1, 5)
            },
            settling_bound=4,
        )
        assert len(complex_.cells()) == 5
        for i in range(5):
            assert complex_.stage_of(f"c{i}") == i


# ---- Skeleton + faces ----------------------------------------------------


class TestSkeleton:
    def test_skeleton_at_each_stage(self) -> None:
        complex_ = TransfiniteCellComplex(
            stages={
                0: frozenset({"a"}),
                1: frozenset({"b"}),
                2: frozenset({"c"}),
            },
            face_incidence={
                "b": frozenset({"a"}),
                "c": frozenset({"a", "b"}),
            },
            settling_bound=2,
        )
        assert complex_.skeleton(0) == frozenset()
        assert complex_.skeleton(1) == frozenset({"a"})
        assert complex_.skeleton(2) == frozenset({"a", "b"})
        assert complex_.skeleton(3) == frozenset({"a", "b", "c"})
        # Past the bound, skeleton is the full cell set.
        assert complex_.skeleton(99) == frozenset({"a", "b", "c"})

    def test_faces_of_cell(self) -> None:
        complex_ = TransfiniteCellComplex(
            stages={
                0: frozenset({"v0", "v1"}),
                1: frozenset({"e01"}),
            },
            face_incidence={"e01": frozenset({"v0", "v1"})},
            settling_bound=1,
        )
        assert complex_.faces_of("e01") == frozenset({"v0", "v1"})
        # Cells without recorded faces have no faces.
        assert complex_.faces_of("v0") == frozenset()


# ---- Validation ----------------------------------------------------------


class TestValidation:
    def test_negative_bound_rejected(self) -> None:
        try:
            TransfiniteCellComplex(
                stages={}, face_incidence={}, settling_bound=-1
            )
        except ValueError as exc:
            assert "non-negative" in str(exc)
        else:
            raise AssertionError("expected ValueError")

    def test_stage_exceeding_bound_rejected(self) -> None:
        try:
            TransfiniteCellComplex(
                stages={5: frozenset({"x"})},
                face_incidence={},
                settling_bound=2,
            )
        except ValueError as exc:
            assert "exceeds settling_bound" in str(exc)
        else:
            raise AssertionError("expected ValueError")

    def test_duplicate_cell_across_stages_rejected(self) -> None:
        try:
            TransfiniteCellComplex(
                stages={
                    0: frozenset({"a"}),
                    1: frozenset({"a"}),  # duplicate
                },
                face_incidence={},
                settling_bound=1,
            )
        except ValueError as exc:
            assert "appears in multiple stages" in str(exc)
        else:
            raise AssertionError("expected ValueError")

    def test_face_at_later_stage_rejected(self) -> None:
        # cell "b" at stage 0 cannot be a face of cell "a" at stage 0
        # (faces must be at *strictly earlier* stages).
        try:
            TransfiniteCellComplex(
                stages={0: frozenset({"a", "b"})},
                face_incidence={"a": frozenset({"b"})},  # invalid
                settling_bound=0,
            )
        except ValueError as exc:
            assert "strictly earlier stages" in str(exc)
        else:
            raise AssertionError("expected ValueError")


# ---- Transfinite-induction witness ---------------------------------------


class TestTransfiniteInductionWitness:
    def test_property_holding_everywhere(self) -> None:
        """A property that holds for every cell-set produces a witness
        with `holds=True`."""
        complex_ = TransfiniteCellComplex(
            stages={
                0: frozenset({"a"}),
                1: frozenset({"b"}),
                2: frozenset({"c"}),
            },
            face_incidence={
                "b": frozenset({"a"}),
                "c": frozenset({"a", "b"}),
            },
            settling_bound=2,
        )
        witness = complex_.transfinite_induction_witness(
            lambda cells: True
        )
        assert witness.holds
        assert witness.limit_stage_holds

    def test_property_failing_at_some_stage(self) -> None:
        """A property that fails at one stage produces a witness with
        `holds=False` and a per-stage map showing where."""
        complex_ = TransfiniteCellComplex(
            stages={
                0: frozenset({"a"}),
                1: frozenset({"b"}),
            },
            face_incidence={"b": frozenset({"a"})},
            settling_bound=1,
        )
        # Property: |cells| < 2.
        witness = complex_.transfinite_induction_witness(
            lambda cells: len(cells) < 2
        )
        # skeleton(1) = {a}, |1| < 2 → True.
        # skeleton(2) = {a, b}, |2| < 2 → False.
        assert not witness.holds
        assert witness.per_stage[0]
        assert not witness.per_stage[1]
        assert not witness.limit_stage_holds


# ---- Realization claim test ---------------------------------------------


class TestRealizationClaim:
    """A realization-claim test for `objects/transfinite-cell-complex`:
    the corpus's directed-colimit characterization holds — the complex
    equals the union of its skeleta."""

    def test_complex_equals_union_of_skeleta(self) -> None:
        complex_ = TransfiniteCellComplex(
            stages={
                0: frozenset({"a", "b"}),
                1: frozenset({"c"}),
                2: frozenset({"d", "e"}),
            },
            face_incidence={
                "c": frozenset({"a"}),
                "d": frozenset({"c"}),
                "e": frozenset({"b", "c"}),
            },
            settling_bound=2,
        )
        # The colimit of skeleta equals the full cell set.
        union = frozenset()
        for tau in range(complex_.settling_bound + 2):
            union = union | complex_.skeleton(tau)
        assert union == complex_.cells()


# ---- is_attached_at ------------------------------------------------------


class TestIsAttachedAt:
    def test_returns_true_at_attaching_stage(self) -> None:
        complex_ = TransfiniteCellComplex(
            stages={
                0: frozenset({"v0", "v1"}),
                1: frozenset({"e01"}),
            },
            face_incidence={"e01": frozenset({"v0", "v1"})},
            settling_bound=1,
        )
        assert complex_.is_attached_at("v0", 0)
        assert complex_.is_attached_at("v1", 0)
        assert complex_.is_attached_at("e01", 1)

    def test_returns_false_at_other_stage(self) -> None:
        complex_ = TransfiniteCellComplex(
            stages={
                0: frozenset({"v0"}),
                1: frozenset({"e0"}),
            },
            face_incidence={"e0": frozenset({"v0"})},
            settling_bound=1,
        )
        assert not complex_.is_attached_at("v0", 1)
        assert not complex_.is_attached_at("e0", 0)

    def test_unknown_cell_raises_key_error(self) -> None:
        complex_ = TransfiniteCellComplex(
            stages={0: frozenset({"v0"})},
            face_incidence={},
            settling_bound=0,
        )
        try:
            complex_.is_attached_at("ghost", 0)
        except KeyError:
            pass
        else:
            raise AssertionError("expected KeyError")
