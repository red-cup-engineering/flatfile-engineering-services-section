"""Tests for the closure rule system primitive."""

import pytest

from pypredcalc.combinatorics.closure_rule import ClosureRuleSystem, Rule, rule


class TestRule:
    def test_fires_when_antecedents_present(self) -> None:
        r = Rule(antecedents=("a", "b"), consequents=("c",))
        assert r.fires_on(frozenset(["a", "b"]))

    def test_does_not_fire_when_antecedent_missing(self) -> None:
        r = Rule(antecedents=("a", "b"), consequents=("c",))
        assert not r.fires_on(frozenset(["a"]))

    def test_empty_antecedent_always_fires(self) -> None:
        assert Rule(antecedents=(), consequents=("x",)).fires_on(frozenset())

    def test_rule_convenience_constructor(self) -> None:
        r = rule(["a", "b"], ["c"])
        assert r.antecedents == ("a", "b")
        assert r.consequents == ("c",)


class TestClosureRuleSystem:
    def _simple_system(self) -> ClosureRuleSystem:
        return ClosureRuleSystem(
            rules=(rule(["a", "b"], ["c"]), rule(["c"], ["d"])),
        )

    def test_apply_fires_matching_rules(self) -> None:
        assert "c" in self._simple_system().apply(frozenset(["a", "b"]))

    def test_apply_is_monotone(self) -> None:
        sys = self._simple_system()
        state = frozenset(["a", "b"])
        assert state.issubset(sys.apply(state))

    def test_forward_trajectory_stabilizes(self) -> None:
        sys = self._simple_system()
        traj = sys.forward_trajectory(["a", "b"])
        assert traj[-1] == sys.apply(traj[-1])

    def test_forward_trajectory_full_chain(self) -> None:
        traj = self._simple_system().forward_trajectory(["a", "b"])
        final = traj[-1]
        for x in "abcd":
            assert x in final

    def test_empty_seed(self) -> None:
        traj = self._simple_system().forward_trajectory([])
        assert traj == [frozenset()]

    def test_closure_ordinal(self) -> None:
        assert self._simple_system().closure_ordinal([]) == 0
        assert self._simple_system().closure_ordinal(["a", "b"]) == 2

    def test_universe_validation(self) -> None:
        with pytest.raises(ValueError, match="not in universe"):
            ClosureRuleSystem(rules=(rule(["a"], ["b"]),), universe=frozenset(["a"]))

    def test_cosettling_identity(self) -> None:
        sys = ClosureRuleSystem(rules=())
        target = frozenset(["x", "y"])
        assert target in sys.cosettling(target)

    def test_cosettling_simple(self) -> None:
        sys = ClosureRuleSystem(rules=(rule(["a"], ["b"]),))
        cs = sys.cosettling(frozenset(["a", "b"]))
        assert frozenset(["a"]) in cs
        assert frozenset(["a", "b"]) in cs

    def test_iterated_cosettling(self) -> None:
        sys = ClosureRuleSystem(rules=(rule(["a"], ["b"]),))
        ics = sys.iterated_cosettling(frozenset(["a", "b"]))
        assert frozenset(["a", "b"]) in ics
        assert frozenset(["a"]) in ics

    def test_does_not_stabilize_raises(self) -> None:
        sys = ClosureRuleSystem(rules=(rule([], ["a"]),))
        with pytest.raises(RuntimeError, match="did not stabilize"):
            sys.forward_trajectory([], max_steps=0)
