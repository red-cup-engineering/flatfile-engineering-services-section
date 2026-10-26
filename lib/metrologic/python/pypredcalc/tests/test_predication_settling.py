"""Tests for the strict-regime PredicationSettling orbit.

Drives the corpus's friendship-four-generators flavour: a small social
network with multiple predicates, increments arriving over time, and a
closure rule generating transitive consequence. Verifies:

- ``≤_k``-monotonicity of the orbit (settling-monotonicity);
- finite closure ordinal for finite ``L, E, 𝒞`` (strict regime);
- quiescence at ``v_κ`` (idempotence at the fixed point);
- ``𝒞``-naturality at quiescence on a category with a converse generator.
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
from pypredcalc.dynamics.settling import IncrementSequence, PredicationSettling
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.predicate_category import (
    PredicateCategory,
    PredicateConverse,
    PredicateSet,
)

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)


def _kleq_cross(bil, a, b) -> bool:
    """Pointwise ``≤_k`` between two cross-fiber valuations."""
    if set(a) != set(b):
        return False
    for p in a:
        for s in a[p].entities:
            for o in a[p].entities:
                if not bil.knowledge_leq(a[p].get(s, o), b[p].get(s, o)):
                    return False
    return True


class TestStrictRegimeOrbitIsMonotone:
    """Settling-monotonicity: ``v_σ ≤_k v_τ`` for ``σ ≤ τ``."""

    def test_orbit_is_knowledge_ascending(self) -> None:
        E = EntitySet.of([1, 2, 3])
        P = PredicateSet.of(["Knows"])
        cat = PredicateCategory(entities=E, predicates=P, generators=())
        bil = boolean_twist()
        # transitivity: Knows(x,y) ∧ Knows(y,z) ⇒ Knows(x,z) ≥_k T.
        rule = FiberClosureRule(
            antecedents=(
                CellAtom("Knows", "x", "y", T_VAL),
                CellAtom("Knows", "y", "z", T_VAL),
            ),
            consequent=CellConsequent("Knows", "x", "z", T_VAL),
            free_vars=("x", "y", "z"),
        )
        cl = ClosureOperator(cat, bil, BOT, (rule,))
        v0 = {"Knows": FiberValuation.full(bil, E, BOT, {(1, 2): T_VAL})}
        # Increments arriving in order: u_0 adds (2,3); u_1 adds (3,1).
        u0 = {"Knows": FiberValuation.full(bil, E, BOT, {(2, 3): T_VAL})}
        u1 = {"Knows": FiberValuation.full(bil, E, BOT, {(3, 1): T_VAL})}
        settling = PredicationSettling(
            closure=cl,
            increments=IncrementSequence(increments=(u0, u1)),
            initial_state=v0,
        )
        traj = settling.forward_trajectory()
        for i in range(len(traj) - 1):
            assert _kleq_cross(bil, traj[i], traj[i + 1])


class TestClosureOrdinalIsFinite:
    def test_kappa_finite_for_finite_base(self) -> None:
        E = EntitySet.of([1, 2, 3])
        P = PredicateSet.of(["P"])
        cat = PredicateCategory(entities=E, predicates=P, generators=())
        bil = boolean_twist()
        rule = FiberClosureRule(
            antecedents=(
                CellAtom("P", "x", "y", T_VAL),
                CellAtom("P", "y", "z", T_VAL),
            ),
            consequent=CellConsequent("P", "x", "z", T_VAL),
            free_vars=("x", "y", "z"),
        )
        cl = ClosureOperator(cat, bil, BOT, (rule,))
        v0 = {
            "P": FiberValuation.full(
                bil, E, BOT, {(1, 2): T_VAL, (2, 3): T_VAL}
            )
        }
        s = PredicationSettling(
            closure=cl, increments=IncrementSequence(()), initial_state=v0
        )
        kappa = s.closure_ordinal()
        assert isinstance(kappa, int)
        assert kappa < 100  # strict regime ⇒ finite, in practice tiny


class TestQuiescence:
    def test_quiescent_state_is_closure_fixed_point(self) -> None:
        E = EntitySet.of([1, 2])
        P = PredicateSet.of(["P"])
        cat = PredicateCategory(entities=E, predicates=P, generators=())
        bil = boolean_twist()
        rule = FiberClosureRule(
            antecedents=(CellAtom("P", "x", "y", T_VAL),),
            consequent=CellConsequent("P", "y", "x", T_VAL),
            free_vars=("x", "y"),
        )
        cl = ClosureOperator(cat, bil, BOT, (rule,))
        v0 = {"P": FiberValuation.full(bil, E, BOT, {(1, 2): T_VAL})}
        s = PredicationSettling(cl, IncrementSequence(()), v0)
        q = s.quiescent_state()
        assert s.is_quiescent(q)


class TestNaturalityAtQuiescenceUnderConverse:
    """When the predicate category has a converse generator ``f: P^c → P``,
    a closure-driven settling is ``𝒞``-natural at quiescence iff every fact
    asserted at ``P`` is also asserted at ``P^c`` with subject/object
    swapped — and vice versa.
    """

    def test_natural_when_evidence_is_symmetric(self) -> None:
        E = EntitySet.of([1, 2, 3])
        P = PredicateSet.of(["Friends", "FriendsConv"])
        # Converse generator: f: FriendsConv → Friends.
        f_conv = PredicateConverse(source="FriendsConv", target="Friends")
        cat = PredicateCategory(
            entities=E, predicates=P, generators=(f_conv,)
        )
        bil = boolean_twist()
        # Closure rule: if Friends(x,y) then Friends(y,x) ≥_k T (symmetry of friendship)
        # and analogously for FriendsConv.
        sym_friends = FiberClosureRule(
            antecedents=(CellAtom("Friends", "x", "y", T_VAL),),
            consequent=CellConsequent("Friends", "y", "x", T_VAL),
            free_vars=("x", "y"),
        )
        sym_conv = FiberClosureRule(
            antecedents=(CellAtom("FriendsConv", "x", "y", T_VAL),),
            consequent=CellConsequent("FriendsConv", "y", "x", T_VAL),
            free_vars=("x", "y"),
        )
        # Couple Friends and FriendsConv: Friends(x,y) implies FriendsConv(y,x).
        couple_fwd = FiberClosureRule(
            antecedents=(CellAtom("Friends", "x", "y", T_VAL),),
            consequent=CellConsequent("FriendsConv", "y", "x", T_VAL),
            free_vars=("x", "y"),
        )
        couple_back = FiberClosureRule(
            antecedents=(CellAtom("FriendsConv", "x", "y", T_VAL),),
            consequent=CellConsequent("Friends", "y", "x", T_VAL),
            free_vars=("x", "y"),
        )
        cl = ClosureOperator(
            cat, bil, BOT, (sym_friends, sym_conv, couple_fwd, couple_back)
        )
        v0 = {
            "Friends": FiberValuation.full(bil, E, BOT, {(1, 2): T_VAL}),
            "FriendsConv": FiberValuation.full(bil, E, BOT, {}),
        }
        s = PredicationSettling(cl, IncrementSequence(()), v0)
        assert s.is_natural_at_quiescence()


class TestIncrementsAreApplied:
    def test_increment_arrives_then_closes(self) -> None:
        """Initial state empty + increment (1,2):T should yield (1,2):T at v_1."""
        E = EntitySet.of([1, 2])
        P = PredicateSet.of(["P"])
        cat = PredicateCategory(entities=E, predicates=P, generators=())
        bil = boolean_twist()
        cl = ClosureOperator(cat, bil, BOT, ())
        v0 = {"P": FiberValuation.full(bil, E, BOT, {})}
        u0 = {"P": FiberValuation.full(bil, E, BOT, {(1, 2): T_VAL})}
        s = PredicationSettling(
            closure=cl, increments=IncrementSequence((u0,)), initial_state=v0
        )
        traj = s.forward_trajectory()
        # v_0 is empty, v_1 has the increment, v_2 == v_1 (no rules, no further increments).
        assert traj[0]["P"].cells == {}
        assert traj[1]["P"].get(1, 2) == T_VAL


class TestStubGuard:
    def test_unknown_attribute_raises_with_pointer(self) -> None:
        import pypredcalc.dynamics.settling as mod
        with pytest.raises(AttributeError, match="not yet implemented"):
            _ = mod.LorentzianCausalSettling
