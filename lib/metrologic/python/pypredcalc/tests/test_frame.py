"""Tests for PowersetFrame and FrameMorphism."""

from pypredcalc.lattice.frame import FrameMorphism, PowersetFrame, restrict_with


def _frame2() -> PowersetFrame:
    return PowersetFrame(base=frozenset(["a", "b"]))


class TestPowersetFrame:
    def test_top_is_base(self) -> None:
        assert _frame2().top == frozenset(["a", "b"])

    def test_bottom_is_empty(self) -> None:
        assert _frame2().bottom == frozenset()

    def test_elements_count(self) -> None:
        assert len(list(_frame2().elements())) == 4

    def test_leq_subset(self) -> None:
        f = _frame2()
        assert f.leq(frozenset(["a"]), frozenset(["a", "b"]))
        assert not f.leq(frozenset(["a", "b"]), frozenset(["a"]))

    def test_meet_intersection(self) -> None:
        f = _frame2()
        assert f.meet(frozenset(["a"]), frozenset(["b"])) == frozenset()

    def test_join_union(self) -> None:
        f = _frame2()
        assert f.join(frozenset(["a"]), frozenset(["b"])) == frozenset(["a", "b"])

    def test_meet_empty_args_is_top(self) -> None:
        assert _frame2().meet() == _frame2().top

    def test_join_empty_args_is_bottom(self) -> None:
        assert _frame2().join() == _frame2().bottom

    def test_repr(self) -> None:
        assert "PowersetFrame" in repr(_frame2())


class TestFrameMorphism:
    def test_restrict_with_clopen(self) -> None:
        source = PowersetFrame(base=frozenset(["a", "b", "c"]))
        clopen = frozenset(["a", "b"])
        target = PowersetFrame(base=clopen)
        morph = restrict_with(source, target, clopen)
        assert morph(frozenset(["a", "c"])) == frozenset(["a"])

    def test_right_adjoint_is_right_adjoint(self) -> None:
        source = PowersetFrame(base=frozenset(["a", "b", "c"]))
        clopen = frozenset(["a", "b"])
        target = PowersetFrame(base=clopen)
        morph = restrict_with(source, target, clopen)
        adj = morph.right_adjoint()
        for x in source.elements():
            for y in target.elements():
                assert target.leq(morph(x), y) == source.leq(x, adj(y))

    def test_identity_morphism(self) -> None:
        f = _frame2()
        identity = FrameMorphism(source=f, target=f, mapping=lambda x: x)
        for x in f.elements():
            assert identity(x) == x
