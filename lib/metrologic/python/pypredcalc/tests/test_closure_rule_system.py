"""Sprint C3 — FiberClosureRuleSystem generates a closure operator.

Verifies that the rule-system → closure-operator construction matches
hand-computed fixed points on canonical small systems:

- Transitive closure of a binary relation.
- Symmetric closure of a binary relation.
- Multi-predicate propagation: R(x, y) ⟹ S(x, y).
- A system with a ``∀``-block rule.

And that the generated operator passes the four
:class:`ClosureOperator` axiom checks (where they apply pointwise).
"""

from __future__ import annotations

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.closure_rule import (
    And,
    CellAtom,
    FiberClosureRule,
    Var,
)
from pypredcalc.predication.closure_rule_system import (
    FiberClosureRuleSystem,
    RuleSystemRegimeProfile,
    cross_fiber_knowledge_leq,
    empty_valuation,
)
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.hyperdoctrine import PredicationHyperdoctrine
from pypredcalc.predication.predicate_category import (
    PredicateCategory,
    PredicateSet,
    PredicateSpecialization,
)

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()
E = EntitySet.of([1, 2, 3])
FULL = frozenset((s, o) for s in E for o in E)
SUB = frozenset({(1, 2), (2, 1)})


def fv(cells, dom=FULL):
    return FiberValuation(BIL, E, BOT, cells, dom=dom)


def _h(*predicates) -> PredicationHyperdoctrine:
    cat = PredicateCategory(
        entities=E,
        predicates=PredicateSet.of(predicates),
        generators=(),
        domains={},
    )
    return PredicationHyperdoctrine(category=cat, bilattice=BIL)


def _specialization_hyperdoctrine() -> PredicationHyperdoctrine:
    spec = PredicateSpecialization(source="q", target="p", sub_support=SUB)
    cat = PredicateCategory(
        entities=E,
        predicates=PredicateSet.of(["p", "q"]),
        generators=(spec,),
        domains={"p": FULL, "q": SUB},
    )
    return PredicationHyperdoctrine(category=cat, bilattice=BIL)


# ---- Transitive closure --------------------------------------------------


class TestTransitiveClosure:
    """Rule: R(x, y) ∧ R(y, z) ⟹ R(x, z), threshold T_VAL.

    Starting state: R = {(1, 2), (2, 3)}. Transitive closure adds (1, 3).
    """

    @staticmethod
    def _make_system() -> FiberClosureRuleSystem:
        rule = FiberClosureRule(
            free_vars=("x", "y", "z"),
            forall_vars=(),
            antecedent=And(
                (
                    CellAtom("R", Var("x"), Var("y"), T_VAL),
                    CellAtom("R", Var("y"), Var("z"), T_VAL),
                )
            ),
            consequent=CellAtom("R", Var("x"), Var("z"), T_VAL),
        )
        return FiberClosureRuleSystem(rules=(rule,))

    def test_two_step_chain_closes(self) -> None:
        system = self._make_system()
        H = _h("R")
        cl = system.generate(H)
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        v_inf = cl.at(v0)
        # (1, 3) should be added by transitivity.
        assert v_inf["R"].get(1, 3) == T_VAL
        # (1, 2) and (2, 3) preserved.
        assert v_inf["R"].get(1, 2) == T_VAL
        assert v_inf["R"].get(2, 3) == T_VAL
        # No spurious cells.
        non_t = {c for c in FULL if v_inf["R"].get(*c) != T_VAL and v_inf["R"].get(*c) != BOT}
        assert not non_t

    def test_three_step_chain_closes(self) -> None:
        # Chain 1→2→3→1 should yield full transitive closure on {1,2,3}.
        system = self._make_system()
        H = _h("R")
        cl = system.generate(H)
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL, (3, 1): T_VAL})}
        v_inf = cl.at(v0)
        # Closure is the full 3×3 relation since the cycle reaches everything.
        for s in [1, 2, 3]:
            for o in [1, 2, 3]:
                assert v_inf["R"].get(s, o) == T_VAL

    def test_idempotent(self) -> None:
        # Running the closure twice equals running it once.
        system = self._make_system()
        H = _h("R")
        cl = system.generate(H)
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        once = cl.at(v0)
        twice = cl.at(once)
        assert dict(once["R"].cells) == dict(twice["R"].cells)

    def test_inflationary(self) -> None:
        system = self._make_system()
        H = _h("R")
        cl = system.generate(H)
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        v_inf = cl.at(v0)
        assert cross_fiber_knowledge_leq(v0, v_inf)


# ---- Symmetric closure ----------------------------------------------------


class TestSymmetricClosure:
    """Rule: R(x, y) ⟹ R(y, x), threshold T_VAL."""

    @staticmethod
    def _make_system() -> FiberClosureRuleSystem:
        rule = FiberClosureRule(
            free_vars=("x", "y"),
            forall_vars=(),
            antecedent=CellAtom("R", Var("x"), Var("y"), T_VAL),
            consequent=CellAtom("R", Var("y"), Var("x"), T_VAL),
        )
        return FiberClosureRuleSystem(rules=(rule,))

    def test_pair_becomes_symmetric(self) -> None:
        system = self._make_system()
        H = _h("R")
        cl = system.generate(H)
        v0 = {"R": fv({(1, 2): T_VAL})}
        v_inf = cl.at(v0)
        assert v_inf["R"].get(1, 2) == T_VAL
        assert v_inf["R"].get(2, 1) == T_VAL


# ---- Multi-predicate propagation -----------------------------------------


class TestMultiPredicatePropagation:
    """Rule: R(x, y) ⟹ S(x, y). The closure adds an S-cell for every
    R-cell, demonstrating cross-fiber dependence."""

    def test_propagation(self) -> None:
        rule = FiberClosureRule(
            free_vars=("x", "y"),
            forall_vars=(),
            antecedent=CellAtom("R", Var("x"), Var("y"), T_VAL),
            consequent=CellAtom("S", Var("x"), Var("y"), T_VAL),
        )
        system = FiberClosureRuleSystem(rules=(rule,))
        H = _h("R", "S")
        cl = system.generate(H)
        v0 = {"R": fv({(1, 2): T_VAL, (3, 1): T_VAL}), "S": fv({})}
        v_inf = cl.at(v0)
        # S now mirrors R on those cells.
        assert v_inf["S"].get(1, 2) == T_VAL
        assert v_inf["S"].get(3, 1) == T_VAL
        # R was not affected.
        assert v_inf["R"].get(1, 2) == T_VAL
        assert v_inf["R"].get(3, 1) == T_VAL


class TestCrossFiberOutputNaturality:
    """A rule-generated closure can be checked as producing a C-closed state."""

    def test_rule_restores_specialization_naturality(self) -> None:
        rule = FiberClosureRule(
            free_vars=("x", "y"),
            forall_vars=(),
            antecedent=CellAtom("p", Var("x"), Var("y"), T_VAL),
            consequent=CellAtom("q", Var("x"), Var("y"), T_VAL),
        )
        system = FiberClosureRuleSystem(rules=(rule,))
        H = _specialization_hyperdoctrine()
        cl = system.generate(H)
        v0 = {
            "p": fv({(1, 2): T_VAL, (3, 3): T_VAL}),
            "q": fv({}, dom=SUB),
        }

        witness = cl.output_naturality(v0)

        assert witness.holds
        assert witness.valuation["q"].get(1, 2) == T_VAL
        assert witness.valuation["q"].dom == SUB

    def test_missing_naturality_rule_is_reported(self) -> None:
        system = FiberClosureRuleSystem(rules=())
        H = _specialization_hyperdoctrine()
        cl = system.generate(H)
        v0 = {
            "p": fv({(1, 2): T_VAL}),
            "q": fv({}, dom=SUB),
        }

        witness = cl.output_naturality(v0)

        assert not witness.holds
        assert (1, 2) in witness.failures[0].discrepancy


# ---- ∀-block rule ---------------------------------------------------------


class TestForallBlockRule:
    """Rule: (∀ x. R(x, y)) ⟹ S(y, y), threshold T_VAL.

    Fires at y when R(_, y) is everywhere ≥_k T."""

    def test_partial_column_does_not_fire(self) -> None:
        rule = FiberClosureRule(
            free_vars=("y",),
            forall_vars=("x",),
            antecedent=CellAtom("R", Var("x"), Var("y"), T_VAL),
            consequent=CellAtom("S", Var("y"), Var("y"), T_VAL),
        )
        system = FiberClosureRuleSystem(rules=(rule,))
        assert not system.is_scott_continuous  # has ∀-block
        H = _h("R", "S")
        cl = system.generate(H)
        v0 = {"R": fv({(1, 2): T_VAL}), "S": fv({})}
        v_inf = cl.at(v0)
        # S unchanged: column 2 has only (1, 2), missing (2, 2) and (3, 2).
        assert dict(v_inf["S"].cells) == {}

    def test_full_column_fires(self) -> None:
        rule = FiberClosureRule(
            free_vars=("y",),
            forall_vars=("x",),
            antecedent=CellAtom("R", Var("x"), Var("y"), T_VAL),
            consequent=CellAtom("S", Var("y"), Var("y"), T_VAL),
        )
        system = FiberClosureRuleSystem(rules=(rule,))
        H = _h("R", "S")
        cl = system.generate(H)
        # Populate the entire column y=1 of R.
        v0 = {
            "R": fv({(1, 1): T_VAL, (2, 1): T_VAL, (3, 1): T_VAL}),
            "S": fv({}),
        }
        v_inf = cl.at(v0)
        assert v_inf["S"].get(1, 1) == T_VAL


# ---- Four-regime syntactic profile ----------------------------------------


class TestRuleSystemRegimeProfile:
    def test_quantifier_free_finite_base_is_strict(self) -> None:
        system = TestTransitiveClosure._make_system()

        profile = system.regime_profile()

        assert isinstance(profile, RuleSystemRegimeProfile)
        assert profile.finite_base
        assert profile.is_scott_continuous
        assert profile.regime == "strict"
        assert not profile.has_transfinite_obstruction

    def test_quantifier_free_infinite_base_is_scott_continuous(self) -> None:
        system = TestTransitiveClosure._make_system()

        profile = system.regime_profile(finite_entities=False)

        assert not profile.finite_base
        assert profile.is_scott_continuous
        assert profile.regime == "scott-continuous"

    def test_forall_rule_countable_state_space_is_transfinite_bounded(self) -> None:
        rule = FiberClosureRule(
            free_vars=("y",),
            forall_vars=("x",),
            antecedent=CellAtom("R", Var("x"), Var("y"), T_VAL),
            consequent=CellAtom("S", Var("y"), Var("y"), T_VAL),
        )
        system = FiberClosureRuleSystem(rules=(rule,))

        profile = system.regime_profile(
            finite_entities=False,
            state_space_cofinality="countable",
        )

        assert not profile.is_scott_continuous
        assert profile.has_transfinite_obstruction
        assert profile.regime == "transfinite-bounded"

    def test_forall_rule_uncountable_state_space_is_aperiodic(self) -> None:
        rule = FiberClosureRule(
            free_vars=("y",),
            forall_vars=("x",),
            antecedent=CellAtom("R", Var("x"), Var("y"), T_VAL),
            consequent=CellAtom("S", Var("y"), Var("y"), T_VAL),
        )
        system = FiberClosureRuleSystem(rules=(rule,))

        profile = system.regime_profile(
            finite_entities=False,
            state_space_cofinality="uncountable",
        )

        assert profile.regime == "aperiodic"

    def test_forall_rule_unknown_cofinality_keeps_bounded_vs_aperiodic_open(self) -> None:
        rule = FiberClosureRule(
            free_vars=("y",),
            forall_vars=("x",),
            antecedent=CellAtom("R", Var("x"), Var("y"), T_VAL),
            consequent=CellAtom("S", Var("y"), Var("y"), T_VAL),
        )
        system = FiberClosureRuleSystem(rules=(rule,))

        profile = system.regime_profile(
            finite_entities=False,
            state_space_cofinality="unknown",
        )

        assert profile.regime == "transfinite-bounded-or-aperiodic"


# ---- Construction validation ----------------------------------------------


class TestCrossFiberValidation:
    def test_at_rejects_missing_predicate(self) -> None:
        system = FiberClosureRuleSystem(rules=())
        H = _h("R", "S")
        cl = system.generate(H)
        try:
            cl.at({"R": fv({})})
        except ValueError as exc:
            assert "missing predicate" in str(exc)
        else:
            raise AssertionError("expected ValueError")

    def test_at_rejects_dom_mismatch(self) -> None:
        system = FiberClosureRuleSystem(rules=())
        H = _h("R")
        cl = system.generate(H)
        try:
            cl.at({"R": fv({}, dom=frozenset({(1, 1)}))})
        except ValueError as exc:
            assert "dom" in str(exc)
        else:
            raise AssertionError("expected ValueError")

    def test_empty_valuation_helper(self) -> None:
        H = _h("R", "S")
        ev = empty_valuation(H)
        assert set(ev.keys()) == {"R", "S"}
        assert dict(ev["R"].cells) == {}
        assert dict(ev["S"].cells) == {}


# ---- The generated operator passes axioms ---------------------------------


class TestGeneratedOperatorAxioms:
    """The cross-fiber operator generated from a rule system is, by
    construction, monotone-in-≤_k, inflationary, and idempotent on
    cross-fiber states. We verify these properties on a sample of
    inputs for the transitive-closure system."""

    @staticmethod
    def _system_and_cl():
        rule = FiberClosureRule(
            free_vars=("x", "y", "z"),
            forall_vars=(),
            antecedent=And(
                (
                    CellAtom("R", Var("x"), Var("y"), T_VAL),
                    CellAtom("R", Var("y"), Var("z"), T_VAL),
                )
            ),
            consequent=CellAtom("R", Var("x"), Var("z"), T_VAL),
        )
        system = FiberClosureRuleSystem(rules=(rule,))
        H = _h("R")
        return system, system.generate(H)

    def test_inflationary_on_samples(self) -> None:
        _system, cl = self._system_and_cl()
        for cells in [
            {},
            {(1, 2): T_VAL},
            {(1, 2): T_VAL, (2, 3): T_VAL},
            {(1, 2): T_VAL, (2, 3): T_VAL, (3, 1): T_VAL},
        ]:
            v = {"R": fv(cells)}
            v_cl = cl.at(v)
            assert cross_fiber_knowledge_leq(v, v_cl)

    def test_monotone_on_samples(self) -> None:
        _system, cl = self._system_and_cl()
        v_small = {"R": fv({(1, 2): T_VAL})}
        v_large = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        cl_small = cl.at(v_small)
        cl_large = cl.at(v_large)
        assert cross_fiber_knowledge_leq(cl_small, cl_large)

    def test_idempotent_on_samples(self) -> None:
        _system, cl = self._system_and_cl()
        for cells in [
            {(1, 2): T_VAL},
            {(1, 2): T_VAL, (2, 3): T_VAL},
            {(1, 2): T_VAL, (2, 3): T_VAL, (3, 1): T_VAL},
        ]:
            v = {"R": fv(cells)}
            once = cl.at(v)
            twice = cl.at(once)
            assert dict(once["R"].cells) == dict(twice["R"].cells)
