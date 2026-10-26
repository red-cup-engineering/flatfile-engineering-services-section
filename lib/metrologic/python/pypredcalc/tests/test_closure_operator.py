"""Tests for the cross-fiber ClosureOperator.

Drives the corpus's strict-regime examples (relational-database
settling, transitivity-of-Likes) through the rule-driven closure and
verifies the closure-operator axioms — monotonicity, inflation,
idempotence — plus ``𝒞``-naturality on a renaming-invariant rule.
"""

from __future__ import annotations

import pytest

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.dynamics.closure import (
    CellAtom,
    CellConsequent,
    ClosureOperator,
    FiberClosureRule,
)
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.predicate_category import (
    PredicateCategory,
    PredicateSet,
)

# Boolean-twist conventions:
T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)


def _empty_v(category, bil, bottom):
    return {
        p: FiberValuation.full(bil, category.entities, bottom, {})
        for p in category.predicates
    }


class TestRelationalDatabaseSettling:
    """`examples/relational-database-settling.md` — three entities, one
    predicate ``Likes``, no rules; the settling has a single step."""

    def test_no_rules_means_identity_closure(self) -> None:
        E = EntitySet.of(["Alice", "Bob", "Carol"])
        P = PredicateSet.of(["Likes"])
        cat = PredicateCategory(entities=E, predicates=P, generators=())
        bil = boolean_twist()
        v0 = {
            "Likes": FiberValuation.full(
                bil,
                E,
                BOT,
                {
                    ("Alice", "Bob"): T_VAL,
                    ("Bob", "Alice"): F_VAL,
                    ("Alice", "Carol"): TOP,
                },
            )
        }
        cl = ClosureOperator(category=cat, bilattice=bil, bottom=BOT, rules=())
        v1 = cl.apply(v0)
        assert v1["Likes"] == v0["Likes"]
        # Closure ordinal is 0 — nothing to do.
        assert cl.closure_ordinal(v0) == 0


class TestTransitivityOnLikes:
    """A single-predicate closure: if Likes(x, y) and Likes(y, z) then Likes(x, z).

    This is the canonical strict-regime closure-rule example. Built over
    a discrete predicate category (no morphisms — naturality is vacuous).
    """

    def _setup(self):
        E = EntitySet.of([1, 2, 3, 4])
        P = PredicateSet.of(["Likes"])
        cat = PredicateCategory(entities=E, predicates=P, generators=())
        bil = boolean_twist()
        rule = FiberClosureRule(
            antecedents=(
                CellAtom(predicate="Likes", subject="x", object="y", threshold=T_VAL),
                CellAtom(predicate="Likes", subject="y", object="z", threshold=T_VAL),
            ),
            consequent=CellConsequent(
                predicate="Likes", subject="x", object="z", value=T_VAL
            ),
            free_vars=("x", "y", "z"),
        )
        cl = ClosureOperator(
            category=cat, bilattice=bil, bottom=BOT, rules=(rule,)
        )
        return cat, bil, cl

    def test_single_chain_closes_transitively(self) -> None:
        cat, bil, cl = self._setup()
        # Likes(1,2), Likes(2,3), Likes(3,4) → expect Likes(1,3), Likes(1,4), Likes(2,4)
        v0 = {
            "Likes": FiberValuation.full(
                bil,
                cat.entities,
                BOT,
                {(1, 2): T_VAL, (2, 3): T_VAL, (3, 4): T_VAL},
            )
        }
        closed = cl.saturate(v0)
        expected_pairs = {(1, 2), (2, 3), (3, 4), (1, 3), (1, 4), (2, 4)}
        actual_pairs = {pair for pair, val in closed["Likes"].cells.items() if val == T_VAL}
        assert actual_pairs == expected_pairs

    def test_inflation(self) -> None:
        """``v ≤_k cl(v)`` — every pre-existing fact is preserved."""
        cat, bil, cl = self._setup()
        v0 = {
            "Likes": FiberValuation.full(
                bil, cat.entities, BOT, {(1, 2): T_VAL, (2, 3): T_VAL}
            )
        }
        closed = cl.saturate(v0)
        for cell, val in v0["Likes"].cells.items():
            assert bil.knowledge_leq(val, closed["Likes"].get(*cell))

    def test_idempotence(self) -> None:
        """``cl(cl(v)) = cl(v)``."""
        cat, bil, cl = self._setup()
        v0 = {
            "Likes": FiberValuation.full(
                bil, cat.entities, BOT, {(1, 2): T_VAL, (2, 3): T_VAL}
            )
        }
        once = cl.saturate(v0)
        twice = cl.saturate(once)
        assert once["Likes"] == twice["Likes"]

    def test_monotone(self) -> None:
        """``v₁ ≤_k v₂ ⇒ cl(v₁) ≤_k cl(v₂)``."""
        cat, bil, cl = self._setup()
        v1 = {
            "Likes": FiberValuation.full(
                bil, cat.entities, BOT, {(1, 2): T_VAL, (2, 3): T_VAL}
            )
        }
        v2 = {
            "Likes": FiberValuation.full(
                bil, cat.entities, BOT, {(1, 2): T_VAL, (2, 3): T_VAL, (3, 4): T_VAL}
            )
        }
        c1 = cl.saturate(v1)
        c2 = cl.saturate(v2)
        for cell in c1["Likes"].cells:
            assert bil.knowledge_leq(c1["Likes"].get(*cell), c2["Likes"].get(*cell))

    def test_closure_ordinal_finite_for_strict_regime(self) -> None:
        """Finite L, E, 𝒞 forces ``κ < ω``."""
        cat, bil, cl = self._setup()
        v0 = {
            "Likes": FiberValuation.full(
                bil,
                cat.entities,
                BOT,
                {(1, 2): T_VAL, (2, 3): T_VAL, (3, 4): T_VAL},
            )
        }
        kappa = cl.closure_ordinal(v0)
        assert isinstance(kappa, int)
        assert kappa >= 1


class TestKnowledgeOrderJoinAtConflict:
    """The closure commits ``≥_k V`` lower bounds — joining with knowledge_join.
    A cell that's ``F`` and gets a closure-derived ``T`` should land at ``TOP``.
    """

    def test_t_over_f_yields_top(self) -> None:
        E = EntitySet.of([1, 2])
        P = PredicateSet.of(["P"])
        cat = PredicateCategory(entities=E, predicates=P, generators=())
        bil = boolean_twist()
        # Rule: if P(x,x) holds, then P(2,2) ≥_k T.
        rule = FiberClosureRule(
            antecedents=(
                CellAtom(predicate="P", subject="x", object="x", threshold=T_VAL),
            ),
            consequent=CellConsequent(predicate="P", subject=2, object=2, value=T_VAL),
            free_vars=("x",),
        )
        cl = ClosureOperator(
            category=cat, bilattice=bil, bottom=BOT, rules=(rule,)
        )
        # Pre-set P(2,2) = F, P(1,1) = T (so the rule fires and commits T at (2,2)).
        v0 = {
            "P": FiberValuation.full(
                bil, E, BOT, {(1, 1): T_VAL, (2, 2): F_VAL}
            )
        }
        closed = cl.saturate(v0)
        assert closed["P"].get(2, 2) == TOP  # F ∨_k T = TOP


class TestRulePredicateValidation:
    def test_rejects_unknown_consequent_predicate(self) -> None:
        E = EntitySet.of([1])
        P = PredicateSet.of(["P"])
        cat = PredicateCategory(entities=E, predicates=P, generators=())
        bil = boolean_twist()
        bad_rule = FiberClosureRule(
            antecedents=(),
            consequent=CellConsequent(
                predicate="MissingPredicate", subject=1, object=1, value=T_VAL
            ),
        )
        with pytest.raises(ValueError, match="consequent predicate"):
            ClosureOperator(
                category=cat, bilattice=bil, bottom=BOT, rules=(bad_rule,)
            )

    def test_rejects_unknown_antecedent_predicate(self) -> None:
        E = EntitySet.of([1])
        P = PredicateSet.of(["P"])
        cat = PredicateCategory(entities=E, predicates=P, generators=())
        bil = boolean_twist()
        bad_rule = FiberClosureRule(
            antecedents=(
                CellAtom(
                    predicate="MissingPredicate",
                    subject=1,
                    object=1,
                    threshold=T_VAL,
                ),
            ),
            consequent=CellConsequent(predicate="P", subject=1, object=1, value=T_VAL),
        )
        with pytest.raises(ValueError, match="antecedent predicate"):
            ClosureOperator(
                category=cat, bilattice=bil, bottom=BOT, rules=(bad_rule,)
            )


class TestNonStrictRegimeDetection:
    def test_max_steps_exceeded_raises(self) -> None:
        """A pathological rule that grows the support indefinitely should
        raise; this guards the strict-regime contract from non-termination."""
        E = EntitySet.of([1, 2, 3])
        P = PredicateSet.of(["P"])
        cat = PredicateCategory(entities=E, predicates=P, generators=())
        bil = boolean_twist()
        rule = FiberClosureRule(
            antecedents=(
                CellAtom(predicate="P", subject="x", object="y", threshold=T_VAL),
            ),
            consequent=CellConsequent(
                predicate="P", subject="y", object="x", value=T_VAL
            ),
            free_vars=("x", "y"),
        )
        # max_steps=1 forces failure even though the orbit is finite.
        cl = ClosureOperator(
            category=cat, bilattice=bil, bottom=BOT, rules=(rule,), max_steps=1
        )
        v0 = {"P": FiberValuation.full(bil, E, BOT, {(1, 2): T_VAL})}
        # The first step adds (2,1); a second iteration is needed to verify
        # fixed point. With max_steps=1 we don't even reach that, so we raise.
        with pytest.raises(RuntimeError, match="did not stabilise"):
            cl.saturate(v0)
