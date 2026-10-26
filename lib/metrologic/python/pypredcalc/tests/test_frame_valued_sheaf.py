"""Tests for the FrameValuedSheaf primitive."""

from pypredcalc.combinatorics.simplicial_complex import Simplex, SimplicialComplex
from pypredcalc.lattice.frame import PowersetFrame, restrict_with
from pypredcalc.sheaf.frame_valued import FrameValuedSheaf


def _two_vertex_sheaf() -> FrameValuedSheaf:
    v0 = Simplex((0,))
    v1 = Simplex((1,))
    e01 = Simplex((0, 1))
    sc = SimplicialComplex(frozenset([v0, v1, e01]))
    stalk_v0 = PowersetFrame(base=frozenset(["a", "b"]))
    stalk_v1 = PowersetFrame(base=frozenset(["a", "b", "c"]))
    restriction = restrict_with(stalk_v1, stalk_v0, frozenset(["a", "b"]))
    return FrameValuedSheaf(
        complex=sc,
        vertex_stalks={v0: stalk_v0, v1: stalk_v1},
        vertex_restrictions={(v0, v1): restriction},
    )


def _trivial_sheaf() -> FrameValuedSheaf:
    v0 = Simplex((0,))
    return FrameValuedSheaf(
        complex=SimplicialComplex(frozenset([v0])),
        vertex_stalks={v0: PowersetFrame(base=frozenset(["x", "y"]))},
        vertex_restrictions={},
    )


class TestFrameValuedSheaf:
    def test_stalk_at_vertex(self) -> None:
        assert _two_vertex_sheaf().stalk_at(Simplex((0,))).base == frozenset(["a", "b"])

    def test_stalk_at_edge_uses_smallest_vertex(self) -> None:
        assert _two_vertex_sheaf().stalk_at(Simplex((0, 1))).base == frozenset(["a", "b"])

    def test_global_sections_nonempty(self) -> None:
        assert len(_two_vertex_sheaf().global_sections()) > 0

    def test_global_sections_satisfy_coherence(self) -> None:
        sheaf = _two_vertex_sheaf()
        v0, v1 = Simplex((0,)), Simplex((1,))
        restriction = sheaf.vertex_restrictions[(v0, v1)]
        for section in sheaf.global_sections():
            assignment = dict(section)
            assert restriction(assignment[v1]) == assignment[v0]

    def test_trivial_sheaf_global_sections_count(self) -> None:
        assert len(_trivial_sheaf().global_sections()) == 4

    def test_cosheaf_h0_total_count(self) -> None:
        sheaf = _two_vertex_sheaf()
        h0 = sheaf.cosheaf_h0()
        total = sum(
            len(list(sheaf.vertex_stalks[v].elements())) for v in sheaf.complex.cells(0)
        )
        assert sum(h0.values()) == total

    def test_edge_restriction_from_left_is_identity(self) -> None:
        sheaf = _two_vertex_sheaf()
        morph = sheaf.edge_restriction_from_left(Simplex((0, 1)))
        for x in sheaf.vertex_stalks[Simplex((0,))].elements():
            assert morph(x) == x

    def test_edge_restriction_from_right(self) -> None:
        sheaf = _two_vertex_sheaf()
        morph = sheaf.edge_restriction_from_right(Simplex((0, 1)))
        assert morph(frozenset(["a", "c"])) == frozenset(["a"])
