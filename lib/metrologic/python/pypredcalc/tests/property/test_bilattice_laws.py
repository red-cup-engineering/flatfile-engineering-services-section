"""Property tests: algebraic laws of the four-element Belnap bilattice FOUR.

The carrier is finite (|FOUR| = 4), so we use exhaustive ``hypothesis``
strategies over ``BilatticeValue`` and assert each law on every tuple.
This is the regression net for the canonical bilattice operations
(``truth_join``, ``truth_meet``, ``knowledge_join``, ``knowledge_meet``,
``negate``) — independent of the validating constructors that build
larger bilattices on top of them.
"""
from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from pypredcalc.algebra import (
    BilatticeValue,
    knowledge_join,
    knowledge_leq,
    knowledge_meet,
    negate,
    truth_join,
    truth_leq,
    truth_meet,
)

# Exhaustive strategy over the 4-element carrier.
values = st.sampled_from(list(BilatticeValue))


# ---------------- truth-order lattice laws ----------------


@given(a=values, b=values)
def test_truth_join_commutative(a: BilatticeValue, b: BilatticeValue) -> None:
    assert truth_join(a, b) == truth_join(b, a)


@given(a=values, b=values, c=values)
def test_truth_join_associative(
    a: BilatticeValue, b: BilatticeValue, c: BilatticeValue
) -> None:
    assert truth_join(truth_join(a, b), c) == truth_join(a, truth_join(b, c))


@given(a=values)
def test_truth_join_idempotent(a: BilatticeValue) -> None:
    assert truth_join(a, a) == a


@given(a=values, b=values)
def test_truth_meet_commutative(a: BilatticeValue, b: BilatticeValue) -> None:
    assert truth_meet(a, b) == truth_meet(b, a)


@given(a=values, b=values, c=values)
def test_truth_meet_associative(
    a: BilatticeValue, b: BilatticeValue, c: BilatticeValue
) -> None:
    assert truth_meet(truth_meet(a, b), c) == truth_meet(a, truth_meet(b, c))


@given(a=values)
def test_truth_meet_idempotent(a: BilatticeValue) -> None:
    assert truth_meet(a, a) == a


@given(a=values, b=values)
def test_truth_absorption(a: BilatticeValue, b: BilatticeValue) -> None:
    """``a ∨_t (a ∧_t b) = a`` and dually."""
    assert truth_join(a, truth_meet(a, b)) == a
    assert truth_meet(a, truth_join(a, b)) == a


@given(a=values, b=values)
def test_truth_join_meet_consistency_with_order(
    a: BilatticeValue, b: BilatticeValue
) -> None:
    """``a ≤_t b`` iff ``a ∨_t b = b`` iff ``a ∧_t b = a``."""
    leq = truth_leq(a, b)
    assert leq == (truth_join(a, b) == b)
    assert leq == (truth_meet(a, b) == a)


# ---------------- knowledge-order lattice laws ----------------


@given(a=values, b=values)
def test_knowledge_join_commutative(a: BilatticeValue, b: BilatticeValue) -> None:
    assert knowledge_join(a, b) == knowledge_join(b, a)


@given(a=values, b=values, c=values)
def test_knowledge_join_associative(
    a: BilatticeValue, b: BilatticeValue, c: BilatticeValue
) -> None:
    assert knowledge_join(knowledge_join(a, b), c) == knowledge_join(
        a, knowledge_join(b, c)
    )


@given(a=values, b=values)
def test_knowledge_meet_commutative(a: BilatticeValue, b: BilatticeValue) -> None:
    assert knowledge_meet(a, b) == knowledge_meet(b, a)


@given(a=values, b=values, c=values)
def test_knowledge_meet_associative(
    a: BilatticeValue, b: BilatticeValue, c: BilatticeValue
) -> None:
    assert knowledge_meet(knowledge_meet(a, b), c) == knowledge_meet(
        a, knowledge_meet(b, c)
    )


@given(a=values, b=values)
def test_knowledge_absorption(a: BilatticeValue, b: BilatticeValue) -> None:
    assert knowledge_join(a, knowledge_meet(a, b)) == a
    assert knowledge_meet(a, knowledge_join(a, b)) == a


@given(a=values, b=values)
def test_knowledge_join_meet_consistency_with_order(
    a: BilatticeValue, b: BilatticeValue
) -> None:
    leq = knowledge_leq(a, b)
    assert leq == (knowledge_join(a, b) == b)
    assert leq == (knowledge_meet(a, b) == a)


# ---------------- negation laws ----------------


@given(a=values)
def test_negate_involutive(a: BilatticeValue) -> None:
    """``¬¬a = a``."""
    assert negate(negate(a)) == a


@given(a=values, b=values)
def test_negate_de_morgan_truth(a: BilatticeValue, b: BilatticeValue) -> None:
    """``¬(a ∨_t b) = ¬a ∧_t ¬b`` and dually."""
    assert negate(truth_join(a, b)) == truth_meet(negate(a), negate(b))
    assert negate(truth_meet(a, b)) == truth_join(negate(a), negate(b))


@given(a=values, b=values)
def test_negate_preserves_knowledge_order(
    a: BilatticeValue, b: BilatticeValue
) -> None:
    """Negation is a knowledge-order homomorphism (preserves ∨_k and ∧_k)."""
    assert negate(knowledge_join(a, b)) == knowledge_join(negate(a), negate(b))
    assert negate(knowledge_meet(a, b)) == knowledge_meet(negate(a), negate(b))


def test_negate_fixes_information_extremes() -> None:
    """Belnap negation fixes BOT and TOP."""
    assert negate(BilatticeValue.BOT) == BilatticeValue.BOT
    assert negate(BilatticeValue.TOP) == BilatticeValue.TOP


def test_negate_swaps_truth_extremes() -> None:
    """Belnap negation swaps T and F."""
    assert negate(BilatticeValue.T) == BilatticeValue.F
    assert negate(BilatticeValue.F) == BilatticeValue.T


# ---------------- interlacing: monotonicity across orders ----------------
#
# A bilattice is **interlaced** when every truth-order operation is
# monotone in the knowledge order, and every knowledge-order operation
# is monotone in the truth order. FOUR is interlaced; these properties
# lock that in.


@given(a=values, b=values, c=values)
def test_truth_join_monotone_in_knowledge(
    a: BilatticeValue, b: BilatticeValue, c: BilatticeValue
) -> None:
    if knowledge_leq(a, b):
        assert knowledge_leq(truth_join(a, c), truth_join(b, c))


@given(a=values, b=values, c=values)
def test_truth_meet_monotone_in_knowledge(
    a: BilatticeValue, b: BilatticeValue, c: BilatticeValue
) -> None:
    if knowledge_leq(a, b):
        assert knowledge_leq(truth_meet(a, c), truth_meet(b, c))


@given(a=values, b=values, c=values)
def test_knowledge_join_monotone_in_truth(
    a: BilatticeValue, b: BilatticeValue, c: BilatticeValue
) -> None:
    if truth_leq(a, b):
        assert truth_leq(knowledge_join(a, c), knowledge_join(b, c))


@given(a=values, b=values, c=values)
def test_knowledge_meet_monotone_in_truth(
    a: BilatticeValue, b: BilatticeValue, c: BilatticeValue
) -> None:
    if truth_leq(a, b):
        assert truth_leq(knowledge_meet(a, c), knowledge_meet(b, c))


# ---------------- distributivity (FOUR is distributive in both orders) ----


@given(a=values, b=values, c=values)
def test_truth_distributive(
    a: BilatticeValue, b: BilatticeValue, c: BilatticeValue
) -> None:
    """``a ∧_t (b ∨_t c) = (a ∧_t b) ∨_t (a ∧_t c)`` and dually."""
    assert truth_meet(a, truth_join(b, c)) == truth_join(
        truth_meet(a, b), truth_meet(a, c)
    )
    assert truth_join(a, truth_meet(b, c)) == truth_meet(
        truth_join(a, b), truth_join(a, c)
    )


@given(a=values, b=values, c=values)
def test_knowledge_distributive(
    a: BilatticeValue, b: BilatticeValue, c: BilatticeValue
) -> None:
    assert knowledge_meet(a, knowledge_join(b, c)) == knowledge_join(
        knowledge_meet(a, b), knowledge_meet(a, c)
    )
    assert knowledge_join(a, knowledge_meet(b, c)) == knowledge_meet(
        knowledge_join(a, b), knowledge_join(a, c)
    )
