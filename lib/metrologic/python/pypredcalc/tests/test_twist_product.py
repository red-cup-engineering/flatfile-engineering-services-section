"""Tests for Ginsberg's twist-product bilattice."""

import pytest

from pypredcalc.algebra.residuated_lattice import (
    ResiduatedLattice,
    boolean_residuated_lattice,
)
from pypredcalc.algebra.twist_product import TwistBilattice, boolean_twist


class TestBooleanTwistIsFour:
    """Verify that the twist of the 2-element Boolean lattice is FOUR.

    Encoding: t = (1,0), f = (0,1), bot = (0,0), top = (1,1).
    """

    def test_truth_join_f_t_is_t(self) -> None:
        tb = boolean_twist()
        assert tb.truth_join((0, 1), (1, 0)) == (1, 0)

    def test_knowledge_join_t_f_is_top(self) -> None:
        tb = boolean_twist()
        assert tb.knowledge_join((1, 0), (0, 1)) == (1, 1)

    def test_truth_meet_bot_top_is_f(self) -> None:
        tb = boolean_twist()
        assert tb.truth_meet((0, 0), (1, 1)) == (0, 1)

    def test_knowledge_meet_bot_top_is_bot(self) -> None:
        tb = boolean_twist()
        assert tb.knowledge_meet((0, 0), (1, 1)) == (0, 0)

    def test_negate_swaps_t_f(self) -> None:
        tb = boolean_twist()
        assert tb.negate((1, 0)) == (0, 1)
        assert tb.negate((0, 1)) == (1, 0)

    def test_negate_fixes_bot_top(self) -> None:
        tb = boolean_twist()
        assert tb.negate((0, 0)) == (0, 0)
        assert tb.negate((1, 1)) == (1, 1)

    def test_double_negation(self) -> None:
        tb = boolean_twist()
        for p in [(0, 0), (0, 1), (1, 0), (1, 1)]:
            assert tb.negate(tb.negate(p)) == p

    def test_truth_leq_orderings(self) -> None:
        tb = boolean_twist()
        # f ≤_t bot ≤_t t and f ≤_t top ≤_t t
        assert tb.truth_leq((0, 1), (0, 0))  # f ≤_t bot
        assert tb.truth_leq((0, 0), (1, 0))  # bot ≤_t t
        assert tb.truth_leq((0, 1), (1, 1))  # f ≤_t top
        assert tb.truth_leq((1, 1), (1, 0))  # top ≤_t t

    def test_knowledge_leq_orderings(self) -> None:
        tb = boolean_twist()
        # bot ≤_k f ≤_k top, bot ≤_k t ≤_k top
        assert tb.knowledge_leq((0, 0), (0, 1))
        assert tb.knowledge_leq((0, 1), (1, 1))
        assert tb.knowledge_leq((0, 0), (1, 0))
        assert tb.knowledge_leq((1, 0), (1, 1))


class TestGenericTwist:
    def test_three_element_chain(self) -> None:
        # Chain 0 < 1 < 2; twist gives 9 elements.
        tb = TwistBilattice(
            base_join=lambda a, b: max(a, b),
            base_meet=lambda a, b: min(a, b),
            base_leq=lambda a, b: a <= b,
        )
        assert tb.truth_join((1, 2), (2, 1)) == (2, 1)
        assert tb.knowledge_join((1, 2), (2, 1)) == (2, 2)


def _chain_heyting(n: int) -> ResiduatedLattice[int]:
    """The (n+1)-element chain Heyting algebra ``0 < 1 < ... < n`` with ⊗=∧."""
    carrier = frozenset(range(n + 1))
    return ResiduatedLattice(
        carrier=carrier,
        leq=lambda a, b: a <= b,
        join=lambda a, b: max(a, b),
        meet=lambda a, b: min(a, b),
        tensor=lambda a, b: min(a, b),
        unit=n,
    )


class TestTwistResiduatedStructure:
    """Twist-product fusion ⊙ and right residual ⇒ — corpus formulas.

    Recall: ``⟨x,y⟩ ⊙ ⟨z,v⟩ = ⟨x·z, (x→v) ∧ (z→y)⟩`` and
    ``⟨x,y⟩ ⇒ ⟨z,v⟩ = ⟨(x→z) ∧ (v→y), x·v⟩``.
    """

    def test_boolean_twist_carries_residuated_structure(self) -> None:
        tb = boolean_twist()
        assert tb.base_tensor is not None
        assert tb.base_residuum is not None
        assert tb.fusion_unit() == (1, 1)

    def test_fusion_unit_is_left_identity_on_boolean(self) -> None:
        tb = boolean_twist()
        unit = tb.fusion_unit()
        for p in [(0, 0), (0, 1), (1, 0), (1, 1)]:
            assert tb.fusion(unit, p) == p
            assert tb.fusion(p, unit) == p

    def test_fusion_commutes_on_boolean(self) -> None:
        tb = boolean_twist()
        carrier = [(a, b) for a in (0, 1) for b in (0, 1)]
        for p in carrier:
            for q in carrier:
                assert tb.fusion(p, q) == tb.fusion(q, p)

    def test_residuation_adjunction_on_boolean(self) -> None:
        """Corpus theorem twist-product-residuation: a⊙b ≤_t c iff a ≤_t b⇒c."""
        tb = boolean_twist()
        carrier = [(a, b) for a in (0, 1) for b in (0, 1)]
        for a in carrier:
            for b in carrier:
                for c in carrier:
                    lhs = tb.truth_leq(tb.fusion(a, b), c)
                    rhs = tb.truth_leq(a, tb.right_residual(b, c))
                    assert lhs == rhs, f"adjunction fails at ({a}, {b}, {c})"

    @pytest.mark.parametrize("n", [1, 2, 3, 4])
    def test_residuation_adjunction_on_chain_heyting(self, n: int) -> None:
        tb = TwistBilattice.from_residuated_lattice(_chain_heyting(n))
        carrier = [(a, b) for a in range(n + 1) for b in range(n + 1)]
        for a in carrier:
            for b in carrier:
                for c in carrier:
                    lhs = tb.truth_leq(tb.fusion(a, b), c)
                    rhs = tb.truth_leq(a, tb.right_residual(b, c))
                    assert lhs == rhs

    def test_from_residuated_lattice_recovers_boolean_twist(self) -> None:
        """The two paths to the Boolean twist agree on ⊙ and ⇒."""
        tb_factory = boolean_twist()
        tb_from_rl = TwistBilattice.from_residuated_lattice(
            boolean_residuated_lattice()
        )
        carrier = [(a, b) for a in (0, 1) for b in (0, 1)]
        for p in carrier:
            for q in carrier:
                assert tb_factory.fusion(p, q) == tb_from_rl.fusion(p, q)
                assert tb_factory.right_residual(p, q) == tb_from_rl.right_residual(
                    p, q
                )

    def test_fusion_raises_without_residuated_structure(self) -> None:
        tb = TwistBilattice(
            base_join=lambda a, b: max(a, b),
            base_meet=lambda a, b: min(a, b),
            base_leq=lambda a, b: a <= b,
        )
        with pytest.raises(ValueError, match="no residuated structure"):
            tb.fusion((0, 0), (1, 1))
        with pytest.raises(ValueError, match="no residuated structure"):
            tb.right_residual((0, 0), (1, 1))

    def test_fusion_unit_raises_without_unit(self) -> None:
        tb = TwistBilattice(
            base_join=lambda a, b: max(a, b),
            base_meet=lambda a, b: min(a, b),
            base_leq=lambda a, b: a <= b,
        )
        with pytest.raises(ValueError, match="no base_unit"):
            tb.fusion_unit()

    def test_fusion_first_coord_is_base_tensor(self) -> None:
        """⟨x,y⟩ ⊙ ⟨z,v⟩ has first coord exactly x·z (corpus formula)."""
        tb = TwistBilattice.from_residuated_lattice(_chain_heyting(3))
        for x in range(4):
            for y in range(4):
                for z in range(4):
                    for v in range(4):
                        assert tb.fusion((x, y), (z, v))[0] == min(x, z)

    def test_residual_second_coord_is_base_tensor(self) -> None:
        """⟨x,y⟩ ⇒ ⟨z,v⟩ has second coord exactly x·v (corpus formula)."""
        tb = TwistBilattice.from_residuated_lattice(_chain_heyting(3))
        for x in range(4):
            for y in range(4):
                for z in range(4):
                    for v in range(4):
                        assert tb.right_residual((x, y), (z, v))[1] == min(x, v)
