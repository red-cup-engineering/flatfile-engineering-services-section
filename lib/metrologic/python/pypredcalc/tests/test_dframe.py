"""Tests for the DFrame primitive."""

import pytest

from pypredcalc.lattice.dframe import DFrame, settling_dframe_at_clopen
from pypredcalc.lattice.frame import PowersetFrame


def _simple_dframe() -> DFrame:
    L_plus = PowersetFrame(base=frozenset(["a"]))
    L_minus = PowersetFrame(base=frozenset(["b"]))
    con = frozenset((x, y) for x in L_plus.elements() for y in L_minus.elements())
    settled = frozenset(["a", "b"])
    tot = frozenset(
        (x, y) for x in L_plus.elements() for y in L_minus.elements()
        if settled.issubset(x | y)
    )
    return DFrame(L_plus=L_plus, L_minus=L_minus, con=con, tot=tot)


class TestDFrame:
    def test_check_con(self) -> None:
        df = _simple_dframe()
        assert df.check_con(frozenset(), frozenset())
        assert df.check_con(frozenset(["a"]), frozenset())

    def test_check_tot(self) -> None:
        df = _simple_dframe()
        assert df.check_tot(frozenset(["a"]), frozenset(["b"]))
        assert not df.check_tot(frozenset(), frozenset())

    def test_repr(self) -> None:
        assert "DFrame" in repr(_simple_dframe())

    def test_con_not_downward_closed_raises(self) -> None:
        L_plus = PowersetFrame(base=frozenset(["a"]))
        L_minus = PowersetFrame(base=frozenset(["b"]))
        bad_con = frozenset([(frozenset(["a"]), frozenset(["b"]))])
        with pytest.raises(ValueError, match="con not downward-closed"):
            DFrame(L_plus=L_plus, L_minus=L_minus, con=bad_con, tot=frozenset())

    def test_tot_not_upward_closed_raises(self) -> None:
        L_plus = PowersetFrame(base=frozenset(["a"]))
        L_minus = PowersetFrame(base=frozenset(["b"]))
        con = frozenset((x, y) for x in L_plus.elements() for y in L_minus.elements())
        bad_tot = frozenset([(frozenset(), frozenset())])
        with pytest.raises(ValueError, match="tot not upward-closed"):
            DFrame(L_plus=L_plus, L_minus=L_minus, con=con, tot=bad_tot)


class TestSettlingDFrameAtClopen:
    def test_empty_clopen(self) -> None:
        df = settling_dframe_at_clopen(
            clopen=frozenset(),
            delta_plus=frozenset(["a"]),
            delta_minus=frozenset(["b"]),
        )
        assert df.L_plus.base == frozenset()
        assert df.L_minus.base == frozenset()

    def test_full_clopen(self) -> None:
        df = settling_dframe_at_clopen(
            clopen=frozenset(["a", "b"]),
            delta_plus=frozenset(["a"]),
            delta_minus=frozenset(["b"]),
        )
        assert df.L_plus.base == frozenset(["a"])
        assert df.L_minus.base == frozenset(["b"])

    def test_con_is_disjoint_pairs(self) -> None:
        df = settling_dframe_at_clopen(
            clopen=frozenset(["a", "b"]),
            delta_plus=frozenset(["a"]),
            delta_minus=frozenset(["b"]),
        )
        for a, b in df.con:
            assert (a & b) == frozenset()

    def test_tot_covers_settled_cells(self) -> None:
        df = settling_dframe_at_clopen(
            clopen=frozenset(["a", "b"]),
            delta_plus=frozenset(["a"]),
            delta_minus=frozenset(["b"]),
        )
        settled = frozenset(["a", "b"])
        for a, b in df.tot:
            assert settled.issubset(a | b)
