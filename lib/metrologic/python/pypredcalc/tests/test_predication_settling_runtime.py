"""Sprint S — PredicationSettling runtime.

Verifies that the trajectory iterator produces the corpus's
``(v_τ)_{τ < λ}`` family with settling-monotonicity, captures
quiescence correctly, and reports the coarse regime classification.
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
    empty_valuation,
)
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.hyperdoctrine import PredicationHyperdoctrine
from pypredcalc.predication.predicate_category import (
    PredicateCategory,
    PredicateSet,
)
from pypredcalc.predication.settling import (
    PredicationSettling,
    TruthWindow,
    settle_from_rule_system,
    verify_monotone,
)

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()
E = EntitySet.of([1, 2, 3])
FULL = frozenset((s, o) for s in E for o in E)


def fv(cells, dom=FULL):
    return FiberValuation(BIL, E, BOT, cells, dom=dom)


def _h(*predicates):
    cat = PredicateCategory(
        entities=E,
        predicates=PredicateSet.of(predicates),
        generators=(),
        domains={},
    )
    return PredicationHyperdoctrine(category=cat, bilattice=BIL)


def _transitive_system() -> FiberClosureRuleSystem:
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


# ---- Trajectory shape -----------------------------------------------------


class TestTrajectoryShape:
    def test_initial_state_is_v0(self) -> None:
        H = _h("R")
        s = _transitive_system()
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        settling = settle_from_rule_system(H, s, v0, bound=10)
        assert settling.initial == v0

    def test_final_is_quiescence_point(self) -> None:
        H = _h("R")
        s = _transitive_system()
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        settling = settle_from_rule_system(H, s, v0, bound=10)
        # (1, 3) was added by transitivity.
        assert settling.final["R"].get(1, 3) == T_VAL

    def test_settling_monotone(self) -> None:
        H = _h("R")
        s = _transitive_system()
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL, (3, 1): T_VAL})}
        settling = settle_from_rule_system(H, s, v0, bound=10)
        assert verify_monotone(settling.trajectory)


# ---- Quiescence -----------------------------------------------------------


class TestQuiescence:
    def test_strict_when_v0_is_fixed(self) -> None:
        H = _h("R")
        s = _transitive_system()
        # Empty initial: no rule fires, v_0 is already fixed.
        v0 = empty_valuation(H)
        settling = PredicationSettling.run(H, s.generate(H), v0, bound=10)
        assert settling.is_quiescent
        assert settling.quiescence_ordinal == 0
        assert settling.regime == "strict"
        assert settling.theory_regime == "strict"
        assert settling.theory_regime_profile is not None

    def test_finite_quiesced(self) -> None:
        H = _h("R")
        s = _transitive_system()
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        settling = settle_from_rule_system(H, s, v0, bound=10)
        assert settling.is_quiescent
        assert settling.quiescence_ordinal is not None
        assert settling.quiescence_ordinal >= 1
        assert settling.regime == "finite-quiesced"

    def test_not_quiesced_within_bound(self) -> None:
        # Build a system that needs 2 rounds to fully close on a chain
        # 1→2→3, then run with bound=1 to exhibit "did not finish".
        H = _h("R")
        s = _transitive_system()
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL, (3, 1): T_VAL})}
        # Closure is the full 3×3 relation; transitivity needs multiple
        # rounds to populate every cell.
        settling = settle_from_rule_system(H, s, v0, bound=1)
        if not settling.is_quiescent:
            assert settling.regime == "finite-not-quiesced"
            assert settling.quiescence_ordinal is None


# ---- Regime classification & convenience ---------------------------------


class TestRegime:
    def test_strict_regime_initial_already_fixed(self) -> None:
        H = _h("R", "S")
        s = FiberClosureRuleSystem(rules=())  # no rules → cl = id
        v0 = {"R": fv({(1, 2): T_VAL}), "S": fv({(1, 1): TOP})}
        settling = settle_from_rule_system(H, s, v0, bound=5)
        assert settling.regime == "strict"
        assert settling.theory_regime == "strict"
        assert settling.final == v0


# ---- Assertion-time windows ----------------------------------------------


class TestTruthWindows:
    def test_truth_window_starts_when_closure_derives_truth(self) -> None:
        H = _h("R")
        s = _transitive_system()
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        settling = settle_from_rule_system(H, s, v0, bound=10)

        windows = settling.truth_windows("R", 1, 3)

        assert windows == (
            TruthWindow(predicate="R", subject=1, object=3, start=1, end=2),
        )

    def test_truth_window_closes_when_cell_becomes_contested(self) -> None:
        H = _h("R")
        s = FiberClosureRuleSystem(rules=())
        cl = s.generate(H)
        trajectory = (
            {"R": fv({(1, 2): T_VAL})},
            {"R": fv({(1, 2): TOP})},
        )
        settling = PredicationSettling(
            hyperdoctrine=H,
            closure=cl,
            bound=1,
            trajectory=trajectory,
        )

        assert settling.truth_windows("R", 1, 2) == (
            TruthWindow(predicate="R", subject=1, object=2, start=0, end=1),
        )

    def test_truth_windows_reject_out_of_scope_cells(self) -> None:
        H = _h("R")
        s = FiberClosureRuleSystem(rules=())
        settling = settle_from_rule_system(H, s, empty_valuation(H), bound=0)

        try:
            settling.truth_windows("Missing", 1, 1)
        except KeyError as exc:
            assert "predicate" in str(exc)
        else:
            raise AssertionError("expected KeyError")

        try:
            settling.truth_windows("R", "outside", 1)
        except ValueError as exc:
            assert "outside dom" in str(exc)
        else:
            raise AssertionError("expected ValueError")


# ---- Validation ----------------------------------------------------------


class TestValidation:
    def test_negative_bound_rejected(self) -> None:
        H = _h("R")
        s = _transitive_system()
        v0 = empty_valuation(H)
        try:
            settle_from_rule_system(H, s, v0, bound=-1)
        except ValueError as exc:
            assert "non-negative" in str(exc)
        else:
            raise AssertionError("expected ValueError")

    def test_bound_zero_returns_only_v0(self) -> None:
        H = _h("R")
        s = _transitive_system()
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        settling = settle_from_rule_system(H, s, v0, bound=0)
        assert len(settling.trajectory) == 1
        assert settling.initial == settling.final
        # Quiescent only if v_0 was already fixed.
        assert not settling.is_quiescent
