"""Tests for the structural-witness types.

The witnesses (``NaturalityWitness``, ``QuiescenceWitness``) carry the
per-generator / per-cell evidence that the corresponding predication-
categorical claim holds — or doesn't, and where. These tests verify
that the witness exposes that structure, not just a flat bool.
"""

from __future__ import annotations

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
BIL = boolean_twist()


def fv(entities, cells=None):
    return FiberValuation.full(BIL, entities, BOT, cells or {})


# ---- NaturalityWitness --------------------------------------------------


class TestNaturalityWitness:
    def _setup(self):
        E = EntitySet.of(["a", "b"])
        P = PredicateSet.of(["loves", "loved_by"])
        f = PredicateConverse(source="loved_by", target="loves")
        cat = PredicateCategory(entities=E, predicates=P, generators=(f,))
        return E, cat, f

    def test_witness_holds_for_consistent_valuation(self) -> None:
        E, cat, f = self._setup()
        v_loves = fv(E, {("a", "b"): T_VAL, ("b", "a"): F_VAL})
        v_loved_by = f.pullback(v_loves)
        witness = cat.naturality({"loves": v_loves, "loved_by": v_loved_by})
        assert witness.holds
        assert bool(witness) is True
        assert witness.failures == ()

    def test_witness_records_failing_generator(self) -> None:
        E, cat, f = self._setup()
        v_loves = fv(E, {("a", "b"): T_VAL})
        v_bad = fv(E, {("a", "b"): F_VAL})  # not the converse
        witness = cat.naturality({"loves": v_loves, "loved_by": v_bad})
        assert not witness.holds
        assert len(witness.failures) == 1
        failure = witness.failures[0]
        assert failure.generator is f
        # The pulled value f^*(v_loves) at (a,b) is v_loves(b,a) = BOT;
        # expected v_bad has (a,b)=F. So they disagree at (a,b).
        assert (("a", "b") in failure.discrepancy)

    def test_witness_records_one_check_per_generator(self) -> None:
        E, cat, f = self._setup()
        # Add a second generator on the same predicates.
        # (Two converses go from p → q and q → p.)
        f2 = PredicateConverse(source="loves", target="loved_by")
        cat2 = PredicateCategory(
            entities=E, predicates=cat.predicates, generators=(f, f2)
        )
        v_loves = fv(E, {("a", "b"): T_VAL})
        v_loved_by = f.pullback(v_loves)
        witness = cat2.naturality({"loves": v_loves, "loved_by": v_loved_by})
        assert len(witness.checks) == 2
        # Both should hold for this symmetric pair.
        assert all(c.holds for c in witness.checks)

    def test_discrepancy_is_empty_when_holds(self) -> None:
        E, cat, f = self._setup()
        v_loves = fv(E, {("a", "b"): T_VAL})
        v_loved_by = f.pullback(v_loves)
        witness = cat.naturality({"loves": v_loves, "loved_by": v_loved_by})
        for check in witness.checks:
            assert check.discrepancy == frozenset()


# ---- QuiescenceWitness --------------------------------------------------


class TestQuiescenceWitness:
    def _trans_setup(self):
        E = EntitySet.of([1, 2, 3])
        P = PredicateSet.of(["P"])
        cat = PredicateCategory(entities=E, predicates=P, generators=())
        rule = FiberClosureRule(
            antecedents=(
                CellAtom("P", "x", "y", T_VAL),
                CellAtom("P", "y", "z", T_VAL),
            ),
            consequent=CellConsequent("P", "x", "z", T_VAL),
            free_vars=("x", "y", "z"),
        )
        cl = ClosureOperator(cat, BIL, BOT, (rule,))
        return E, cat, cl

    def test_quiescence_witness_holds_at_fixed_point(self) -> None:
        E, cat, cl = self._trans_setup()
        v0 = {"P": fv(E, {(1, 2): T_VAL, (2, 3): T_VAL})}
        s = PredicationSettling(cl, IncrementSequence(()), v0)
        q = s.quiescent_state()
        witness = s.quiescence(q)
        assert witness.holds
        assert witness.changed_cells == {}

    def test_quiescence_witness_records_change_when_not_quiescent(self) -> None:
        E, cat, cl = self._trans_setup()
        not_yet = {"P": fv(E, {(1, 2): T_VAL, (2, 3): T_VAL})}
        s = PredicationSettling(cl, IncrementSequence(()), not_yet)
        # A non-fixed-point input: closure produces (1, 3) too.
        witness = s.quiescence(not_yet)
        assert not witness.holds
        # Changed cells per predicate: (1, 3) appeared at "P".
        assert "P" in witness.changed_cells
        assert (1, 3) in witness.changed_cells["P"]

    def test_quiescence_witness_before_and_after_present(self) -> None:
        E, cat, cl = self._trans_setup()
        v = {"P": fv(E, {(1, 2): T_VAL, (2, 3): T_VAL})}
        s = PredicationSettling(cl, IncrementSequence(()), v)
        witness = s.quiescence(v)
        assert "P" in witness.before
        assert "P" in witness.after
        # before(1, 3) is BOT; after(1, 3) is T (the closure step).
        assert witness.before["P"].get(1, 3) == BOT
        assert witness.after["P"].get(1, 3) == T_VAL


# ---- naturality_at_quiescence -----------------------------------------------


class TestNaturalityAtQuiescenceWitness:
    def test_returns_witness(self) -> None:
        E = EntitySet.of([1, 2])
        P = PredicateSet.of(["P"])
        cat = PredicateCategory(entities=E, predicates=P, generators=())
        cl = ClosureOperator(cat, BIL, BOT, ())
        v0 = {"P": fv(E, {(1, 2): T_VAL})}
        s = PredicationSettling(cl, IncrementSequence(()), v0)
        witness = s.naturality_at_quiescence()
        assert witness.holds  # no generators ⇒ vacuously natural
        assert witness.checks == ()


# ---- bool conveniences keep working -----------------------------------------


class TestBoolWrappers:
    def test_is_natural_is_bool_wrapper(self) -> None:
        E = EntitySet.of(["a", "b"])
        P = PredicateSet.of(["p"])
        cat = PredicateCategory(entities=E, predicates=P)
        result = cat.is_natural({"p": fv(E)})
        assert isinstance(result, bool)
        assert result is True

    def test_is_quiescent_is_bool_wrapper(self) -> None:
        E = EntitySet.of([1, 2])
        P = PredicateSet.of(["P"])
        cat = PredicateCategory(entities=E, predicates=P)
        cl = ClosureOperator(cat, BIL, BOT, ())
        s = PredicationSettling(cl, IncrementSequence(()), {"P": fv(E)})
        result = s.is_quiescent({"P": fv(E)})
        assert isinstance(result, bool)
