"""Tests for finite Priestley (Birkhoff) duality."""

import pytest

from pypredcalc.topology.priestley import (
    FiniteDistributiveLattice,
    lattice_from_poset,
    priestley_dual,
)


def _three_chain() -> FiniteDistributiveLattice[int]:
    return FiniteDistributiveLattice(
        carrier=frozenset([0, 1, 2]),
        join=lambda a, b: max(a, b),
        meet=lambda a, b: min(a, b),
    )


class TestFiniteDistributiveLattice:
    def test_chain_constructs(self) -> None:
        lat = _three_chain()
        assert lat.leq(0, 2)
        assert not lat.leq(2, 0)

    def test_chain_join_irreducibles(self) -> None:
        lat = _three_chain()
        # In a chain 0 < 1 < 2, the bottom (0) is excluded, and every other
        # element is join-irreducible.
        assert lat.join_irreducibles() == frozenset([1, 2])

    def test_diamond_join_irreducibles(self) -> None:
        # Diamond: bottom 0, atoms 'a' and 'b', top 1.
        carrier = frozenset(["bot", "a", "b", "top"])
        join_table = {
            ("bot", "bot"): "bot", ("bot", "a"): "a", ("bot", "b"): "b", ("bot", "top"): "top",
            ("a", "bot"): "a", ("a", "a"): "a", ("a", "b"): "top", ("a", "top"): "top",
            ("b", "bot"): "b", ("b", "a"): "top", ("b", "b"): "b", ("b", "top"): "top",
            ("top", "bot"): "top", ("top", "a"): "top", ("top", "b"): "top", ("top", "top"): "top",
        }
        meet_table = {
            ("bot", "bot"): "bot", ("bot", "a"): "bot", ("bot", "b"): "bot", ("bot", "top"): "bot",
            ("a", "bot"): "bot", ("a", "a"): "a", ("a", "b"): "bot", ("a", "top"): "a",
            ("b", "bot"): "bot", ("b", "a"): "bot", ("b", "b"): "b", ("b", "top"): "b",
            ("top", "bot"): "bot", ("top", "a"): "a", ("top", "b"): "b", ("top", "top"): "top",
        }
        lat = FiniteDistributiveLattice(
            carrier=carrier,
            join=lambda x, y: join_table[(x, y)],
            meet=lambda x, y: meet_table[(x, y)],
        )
        # In the diamond, atoms a and b are join-irreducible; top = a ∨ b is not.
        assert lat.join_irreducibles() == frozenset(["a", "b"])

    def test_non_distributive_raises(self) -> None:
        # Pentagon N5 is non-distributive — but here we just provide a
        # contrived non-distributive operation.
        # Pentagon N5 = {0, a, b, c, 1} with b < c, a parallel to b and c —
        # smallest non-distributive lattice. Use a literal table.
        carrier = frozenset(["0", "a", "b", "c", "1"])
        leq_pairs = {
            ("0", "0"), ("a", "a"), ("b", "b"), ("c", "c"), ("1", "1"),
            ("0", "a"), ("0", "b"), ("0", "c"), ("0", "1"),
            ("a", "1"), ("b", "c"), ("b", "1"), ("c", "1"),
        }
        leq = lambda x, y: (x, y) in leq_pairs

        def jn(x: str, y: str) -> str:
            ups = [z for z in carrier if leq(x, z) and leq(y, z)]
            return min(ups, key=lambda z: sum(1 for w in carrier if leq(w, z)))

        def mt(x: str, y: str) -> str:
            downs = [z for z in carrier if leq(z, x) and leq(z, y)]
            return max(downs, key=lambda z: sum(1 for w in carrier if leq(w, z)))

        with pytest.raises(ValueError, match="distributivity|absorption"):
            FiniteDistributiveLattice(carrier=carrier, join=jn, meet=mt)

    def test_empty_carrier_raises(self) -> None:
        with pytest.raises(ValueError, match="non-empty"):
            FiniteDistributiveLattice(
                carrier=frozenset(),
                join=lambda a, b: a,
                meet=lambda a, b: a,
            )


class TestBirkhoffDuality:
    def test_chain_roundtrip_count(self) -> None:
        lat = _three_chain()
        space = priestley_dual(lat)
        # J(chain of n+1) has n elements; down-sets recover (n+1) elements.
        assert len(space.points) == 2
        assert len(space.down_sets()) == 3

    def test_recovered_lattice_size_matches_original(self) -> None:
        # Diamond {bot, a, b, top}, J(L) = {a, b} antichain → 4 down-sets.
        carrier = frozenset(["bot", "a", "b", "top"])
        atoms = {"a", "b"}

        def jn(x: str, y: str) -> str:
            if x == "bot": return y
            if y == "bot": return x
            if x == y: return x
            if {x, y} <= atoms: return "top"
            return "top"

        def mt(x: str, y: str) -> str:
            if x == "top": return y
            if y == "top": return x
            if x == y: return x
            if {x, y} <= atoms: return "bot"
            return "bot"

        lat = FiniteDistributiveLattice(carrier=carrier, join=jn, meet=mt)
        space = priestley_dual(lat)
        recovered = lattice_from_poset(space.points, space.leq)
        assert len(recovered.carrier) == len(lat.carrier)

    def test_lattice_from_singleton_poset(self) -> None:
        # 1 point → 2 down-sets (∅ and the point) → 2-element chain.
        lat = lattice_from_poset(frozenset(["x"]), lambda a, b: a == b)
        assert len(lat.carrier) == 2

    def test_lattice_from_empty_poset_is_trivial(self) -> None:
        # Empty poset ↔ one-element lattice {∅}.
        lat = lattice_from_poset(frozenset(), lambda a, b: True)
        assert lat.carrier == frozenset([frozenset()])

    def test_dual_absorption_violation_raises(self) -> None:
        # Architect-supplied counterexample: join=(0,0,0,1), meet=(1,1,1,1)
        # passes one-sided absorption but fails the dual.
        join_table = {(0, 0): 0, (0, 1): 0, (1, 0): 0, (1, 1): 1}
        meet_table = {(0, 0): 1, (0, 1): 1, (1, 0): 1, (1, 1): 1}
        with pytest.raises(ValueError, match="absorption|idempotence"):
            FiniteDistributiveLattice(
                carrier=frozenset([0, 1]),
                join=lambda a, b: join_table[(a, b)],
                meet=lambda a, b: meet_table[(a, b)],
            )
