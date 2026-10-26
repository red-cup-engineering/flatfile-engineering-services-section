"""Tests for the four-element Belnap bilattice."""

from fractions import Fraction

import pytest

from pypredcalc._linalg import Matrix
from pypredcalc.algebra.bilattice import (
    BilatticeValue,
    knowledge_join,
    knowledge_leq,
    knowledge_meet,
    negate,
    negation_permutation,
    truth_join,
    truth_leq,
    truth_meet,
)

T = BilatticeValue.T
F = BilatticeValue.F
BOT = BilatticeValue.BOT
TOP = BilatticeValue.TOP
ALL = [T, F, BOT, TOP]


class TestTruthOrder:
    def test_reflexivity(self) -> None:
        for v in ALL:
            assert truth_leq(v, v)

    def test_f_leq_all(self) -> None:
        for v in ALL:
            assert truth_leq(F, v)

    def test_all_leq_t(self) -> None:
        for v in ALL:
            assert truth_leq(v, T)

    def test_bot_top_incomparable(self) -> None:
        assert not truth_leq(BOT, TOP)
        assert not truth_leq(TOP, BOT)

    def test_f_not_geq_bot(self) -> None:
        assert not truth_leq(BOT, F)

    def test_truth_join_table(self) -> None:
        assert truth_join(F, F) is F
        assert truth_join(F, BOT) is BOT
        assert truth_join(F, TOP) is TOP
        assert truth_join(F, T) is T
        assert truth_join(BOT, TOP) is T
        assert truth_join(T, T) is T
        assert truth_join(BOT, BOT) is BOT

    def test_truth_meet_table(self) -> None:
        assert truth_meet(T, T) is T
        assert truth_meet(T, BOT) is BOT
        assert truth_meet(T, TOP) is TOP
        assert truth_meet(BOT, TOP) is F
        assert truth_meet(F, F) is F
        assert truth_meet(T, F) is F

    def test_join_commutative(self) -> None:
        for a in ALL:
            for b in ALL:
                assert truth_join(a, b) is truth_join(b, a)

    def test_meet_commutative(self) -> None:
        for a in ALL:
            for b in ALL:
                assert truth_meet(a, b) is truth_meet(b, a)


class TestKnowledgeOrder:
    def test_reflexivity(self) -> None:
        for v in ALL:
            assert knowledge_leq(v, v)

    def test_bot_leq_all(self) -> None:
        for v in ALL:
            assert knowledge_leq(BOT, v)

    def test_all_leq_top(self) -> None:
        for v in ALL:
            assert knowledge_leq(v, TOP)

    def test_t_f_incomparable(self) -> None:
        assert not knowledge_leq(T, F)
        assert not knowledge_leq(F, T)

    def test_knowledge_join_table(self) -> None:
        assert knowledge_join(BOT, BOT) is BOT
        assert knowledge_join(BOT, T) is T
        assert knowledge_join(BOT, F) is F
        assert knowledge_join(T, F) is TOP
        assert knowledge_join(TOP, T) is TOP

    def test_knowledge_meet_table(self) -> None:
        assert knowledge_meet(TOP, TOP) is TOP
        assert knowledge_meet(TOP, T) is T
        assert knowledge_meet(TOP, F) is F
        assert knowledge_meet(T, F) is BOT
        assert knowledge_meet(BOT, T) is BOT


class TestNegation:
    def test_t_negates_to_f(self) -> None:
        assert negate(T) is F

    def test_f_negates_to_t(self) -> None:
        assert negate(F) is T

    def test_bot_fixed(self) -> None:
        assert negate(BOT) is BOT

    def test_top_fixed(self) -> None:
        assert negate(TOP) is TOP

    def test_double_negation(self) -> None:
        for v in ALL:
            assert negate(negate(v)) is v

    def test_negation_swaps_truth_order(self) -> None:
        for a in ALL:
            for b in ALL:
                if truth_leq(a, b):
                    assert truth_leq(negate(b), negate(a))

    def test_negation_preserves_knowledge_order(self) -> None:
        for a in ALL:
            for b in ALL:
                if knowledge_leq(a, b):
                    assert knowledge_leq(negate(a), negate(b))


class TestNegationPermutation:
    def test_fibonacci_valuation(self) -> None:
        valuation = {0: T, 1: F}
        alphabet = [0, 1]
        p = negation_permutation(valuation, alphabet)
        assert p.shape == (2, 2)
        assert p == Matrix.from_rows([[Fraction(0), Fraction(1)], [Fraction(1), Fraction(0)]])

    def test_non_closed_valuation_raises(self) -> None:
        valuation = {0: T, 1: T}
        alphabet = [0, 1]
        with pytest.raises(ValueError, match="not closed under negation"):
            negation_permutation(valuation, alphabet)

    def test_bot_top_fixed_point(self) -> None:
        valuation = {0: BOT, 1: TOP}
        alphabet = [0, 1]
        p = negation_permutation(valuation, alphabet)
        assert p == Matrix.from_rows([[1, 0], [0, 1]])
