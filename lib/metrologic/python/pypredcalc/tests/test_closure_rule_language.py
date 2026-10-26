"""Sprint C2 — fiber-atom closure-rule language.

Verifies the rule language's data model: term resolution, atom
evaluation, positive Boolean evaluation, ∀-block evaluation, the
quantifier-free classifier, and the construction-time invariants
(no overlap between free/∀ vars; antecedent vars in scope; consequent
vars in free_vars).
"""

from __future__ import annotations

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.closure_rule import (
    And,
    CellAtom,
    Const,
    FiberClosureRule,
    Or,
    Var,
    collect_atom_variables,
    resolve_term,
)
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()
E = EntitySet.of([1, 2])
ENTITIES = tuple(E)
FULL = frozenset((s, o) for s in E for o in E)


def fv(cells, dom=FULL):
    return FiberValuation(BIL, E, BOT, cells, dom=dom)


# ---- Term resolution ------------------------------------------------------


class TestResolveTerm:
    def test_const_resolves(self) -> None:
        assert resolve_term(Const(1), {}) == 1

    def test_var_resolves(self) -> None:
        assert resolve_term(Var("x"), {"x": 2}) == 2

    def test_unbound_var_raises(self) -> None:
        try:
            resolve_term(Var("z"), {"x": 1})
        except KeyError as exc:
            assert "z" in str(exc)
        else:
            raise AssertionError("expected KeyError on unbound var")


# ---- Atom evaluation ------------------------------------------------------


class TestCellAtom:
    def test_atom_holds_when_value_dominates_threshold(self) -> None:
        valuation = {"R": fv({(1, 2): T_VAL})}
        atom = CellAtom(predicate="R", subject=Var("x"), object_=Var("y"), threshold=T_VAL)
        assert atom.evaluate(valuation, {"x": 1, "y": 2}, BIL)
        # T_VAL ≤_k T_VAL by reflexivity.

    def test_atom_fails_when_value_below_threshold(self) -> None:
        valuation = {"R": fv({(1, 2): T_VAL})}
        # threshold TOP requires both knowledge-coords = 1; T_VAL = (1, 0) does not dominate TOP.
        atom = CellAtom(predicate="R", subject=Var("x"), object_=Var("y"), threshold=TOP)
        assert not atom.evaluate(valuation, {"x": 1, "y": 2}, BIL)

    def test_atom_with_constants(self) -> None:
        valuation = {"R": fv({(1, 1): TOP})}
        atom = CellAtom(predicate="R", subject=Const(1), object_=Const(1), threshold=TOP)
        assert atom.evaluate(valuation, {}, BIL)

    def test_atom_unknown_predicate_raises(self) -> None:
        valuation = {"R": fv({})}
        atom = CellAtom(predicate="S", subject=Const(1), object_=Const(1), threshold=BOT)
        try:
            atom.evaluate(valuation, {}, BIL)
        except KeyError as exc:
            assert "S" in str(exc)
        else:
            raise AssertionError("expected KeyError on missing predicate")


# ---- Boolean combinations -------------------------------------------------


class TestPositiveBoolean:
    def test_and(self) -> None:
        valuation = {"R": fv({(1, 2): T_VAL, (2, 1): T_VAL})}
        a1 = CellAtom("R", Var("x"), Var("y"), T_VAL)
        a2 = CellAtom("R", Var("y"), Var("x"), T_VAL)
        formula = And((a1, a2))
        assert formula.evaluate(valuation, {"x": 1, "y": 2}, BIL)
        # Same formula at (1, 1) — only the first atom holds.
        assert not formula.evaluate(valuation, {"x": 1, "y": 1}, BIL)

    def test_or(self) -> None:
        valuation = {"R": fv({(1, 2): T_VAL})}
        a1 = CellAtom("R", Const(1), Const(2), T_VAL)
        a2 = CellAtom("R", Const(2), Const(1), T_VAL)
        formula = Or((a1, a2))
        assert formula.evaluate(valuation, {}, BIL)


# ---- Variable collection --------------------------------------------------


class TestCollectAtomVariables:
    def test_free_atom(self) -> None:
        atom = CellAtom("R", Var("x"), Var("y"), T_VAL)
        assert collect_atom_variables(atom) == frozenset({"x", "y"})

    def test_constants_are_not_variables(self) -> None:
        atom = CellAtom("R", Const(1), Var("y"), T_VAL)
        assert collect_atom_variables(atom) == frozenset({"y"})

    def test_nested_and(self) -> None:
        formula = And(
            (
                CellAtom("R", Var("x"), Var("y"), T_VAL),
                Or(
                    (
                        CellAtom("R", Var("y"), Var("z"), T_VAL),
                        CellAtom("R", Var("z"), Const(1), T_VAL),
                    )
                ),
            )
        )
        assert collect_atom_variables(formula) == frozenset({"x", "y", "z"})


# ---- FiberClosureRule construction & firing ------------------------------


class TestFiberClosureRule:
    def test_quantifier_free_classifier(self) -> None:
        rule = FiberClosureRule(
            free_vars=("x", "y"),
            forall_vars=(),
            antecedent=CellAtom("R", Var("x"), Var("y"), T_VAL),
            consequent=CellAtom("R", Var("x"), Var("y"), TOP),
        )
        assert rule.is_quantifier_free

    def test_universally_blocked_rule(self) -> None:
        rule = FiberClosureRule(
            free_vars=("y",),
            forall_vars=("x",),
            antecedent=CellAtom("R", Var("x"), Var("y"), T_VAL),
            consequent=CellAtom("S", Var("y"), Var("y"), TOP),
        )
        assert not rule.is_quantifier_free

    def test_overlap_between_free_and_forall_rejected(self) -> None:
        try:
            FiberClosureRule(
                free_vars=("x",),
                forall_vars=("x",),
                antecedent=CellAtom("R", Var("x"), Var("x"), T_VAL),
                consequent=CellAtom("R", Var("x"), Var("x"), TOP),
            )
        except ValueError as exc:
            assert "overlap" in str(exc)
        else:
            raise AssertionError("expected ValueError on overlapping vars")

    def test_unbound_antecedent_var_rejected(self) -> None:
        try:
            FiberClosureRule(
                free_vars=("x",),
                forall_vars=(),
                antecedent=CellAtom("R", Var("x"), Var("z"), T_VAL),  # z unbound
                consequent=CellAtom("R", Var("x"), Var("x"), TOP),
            )
        except ValueError as exc:
            assert "unbound" in str(exc)
        else:
            raise AssertionError("expected ValueError on unbound antec var")

    def test_consequent_var_must_be_free(self) -> None:
        # ∀-vars are eliminated by the antecedent; can't appear in consequent.
        try:
            FiberClosureRule(
                free_vars=("y",),
                forall_vars=("x",),
                antecedent=CellAtom("R", Var("x"), Var("y"), T_VAL),
                consequent=CellAtom("S", Var("x"), Var("y"), TOP),  # x is bound, not free
            )
        except ValueError as exc:
            assert "consequent references variables not in free_vars" in str(exc)
        else:
            raise AssertionError("expected ValueError on bound consequent var")

    def test_quantifier_free_fires_at(self) -> None:
        rule = FiberClosureRule(
            free_vars=("x", "y"),
            forall_vars=(),
            antecedent=CellAtom("R", Var("x"), Var("y"), T_VAL),
            consequent=CellAtom("R", Var("x"), Var("y"), TOP),
        )
        valuation = {"R": fv({(1, 2): T_VAL})}
        assert rule.fires_at(valuation, {"x": 1, "y": 2}, ENTITIES, BIL)
        assert not rule.fires_at(valuation, {"x": 1, "y": 1}, ENTITIES, BIL)

    def test_universally_blocked_fires_at(self) -> None:
        # Rule: (∀ x. R(x, y) ≥_k T) ⟹ S(y, y) ≥_k T.
        # Fires at y iff R(_, y) is everywhere T.
        rule = FiberClosureRule(
            free_vars=("y",),
            forall_vars=("x",),
            antecedent=CellAtom("R", Var("x"), Var("y"), T_VAL),
            consequent=CellAtom("S", Var("y"), Var("y"), TOP),
        )
        # R at column y=2 only has (1, 2) ↦ T; (2, 2) ↦ ⊥. Doesn't fire.
        v_partial = {"R": fv({(1, 2): T_VAL}), "S": fv({})}
        assert not rule.fires_at(v_partial, {"y": 2}, ENTITIES, BIL)
        # R fully populated for column 2: fires.
        v_full = {"R": fv({(1, 2): T_VAL, (2, 2): T_VAL}), "S": fv({})}
        assert rule.fires_at(v_full, {"y": 2}, ENTITIES, BIL)

    def test_consequent_at(self) -> None:
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
        predicate, cell, threshold = rule.consequent_at({"x": 1, "y": 2, "z": 1})
        assert predicate == "R"
        assert cell == (1, 1)
        assert threshold == T_VAL

    def test_consequent_at_rejects_wrong_env_keys(self) -> None:
        rule = FiberClosureRule(
            free_vars=("x", "y"),
            forall_vars=(),
            antecedent=CellAtom("R", Var("x"), Var("y"), T_VAL),
            consequent=CellAtom("R", Var("x"), Var("y"), TOP),
        )
        try:
            rule.consequent_at({"x": 1})
        except ValueError as exc:
            assert "do not match free_vars" in str(exc)
        else:
            raise AssertionError("expected ValueError on missing free var")
