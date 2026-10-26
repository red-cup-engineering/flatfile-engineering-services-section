"""Twist-product fusion antecedents (Phase 3 / inbox follow-up).

Tests:

1. ``algebra.bilattice.fusion`` table on FOUR — commutativity, unit (T),
   absorber (F), and selected representative cases verified against the
   Ginsberg twist-product formula.
2. ``predication.closure_rule.FusionAtom`` evaluation on cross-fiber
   valuations — single-rule realization of the dispatch antecedent shape.
3. ``predication.store_closure.StoreFusionAntecedent`` evaluation on
   stores — the same shape at the observation-side flat presentation.
"""

from __future__ import annotations

from pypredcalc.algebra.bilattice import (
    BilatticeValue,
    fusion,
)
from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.cell import PredicationCell
from pypredcalc.predication.closure_rule import (
    Const,
    FiberClosureRule,
    FusionAtom,
    Var,
    collect_atom_variables,
)
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.store import PredicationStore
from pypredcalc.predication.store_closure import (
    StoreFusionAntecedent,
)

T = BilatticeValue.T
F = BilatticeValue.F
BOT = BilatticeValue.BOT
TOP = BilatticeValue.TOP

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT_VAL = (0, 0)
TOP_VAL = (1, 1)
BIL = boolean_twist()
E = EntitySet.of([1, 2, 3])
FULL = frozenset((s, o) for s in E for o in E)


def fv(cells, dom=FULL):
    return FiberValuation(BIL, E, BOT_VAL, cells, dom=dom)


# ---- Fusion table on FOUR -------------------------------------------------


class TestFusionTable:
    """The fusion table is consistent with the Ginsberg twist-product
    formula on the boolean base."""

    def test_unit_is_TOP(self) -> None:
        # Per corpus: fusion's monoidal unit is ⟨1,1⟩ = TOP, not the
        # truth-top T.
        for v in (T, F, BOT, TOP):
            assert fusion(v, TOP) == v
            assert fusion(TOP, v) == v

    def test_absorber_is_F(self) -> None:
        for v in (T, F, BOT, TOP):
            assert fusion(v, F) == F
            assert fusion(F, v) == F

    def test_commutativity(self) -> None:
        for a in (T, F, BOT, TOP):
            for b in (T, F, BOT, TOP):
                assert fusion(a, b) == fusion(b, a)

    def test_associativity(self) -> None:
        for a in (T, F, BOT, TOP):
            for b in (T, F, BOT, TOP):
                for c in (T, F, BOT, TOP):
                    assert fusion(fusion(a, b), c) == fusion(a, fusion(b, c))

    def test_matches_boolean_twist(self) -> None:
        """The pre-tabulated FOUR fusion matches what `boolean_twist().fusion`
        computes via Ginsberg's formula."""
        encode = {T: T_VAL, F: F_VAL, BOT: BOT_VAL, TOP: TOP_VAL}
        decode = {v: k for k, v in encode.items()}
        for a in (T, F, BOT, TOP):
            for b in (T, F, BOT, TOP):
                expected = decode[BIL.fusion(encode[a], encode[b])]
                assert fusion(a, b) == expected, (
                    f"fusion table mismatch at ({a}, {b}): table says "
                    f"{fusion(a, b)}, twist says {expected}"
                )


# ---- FusionAtom on fiber valuations ---------------------------------------


class TestFusionAtomEvaluation:
    """The corpus's dispatch antecedent shape, evaluated at the
    fiber-valuation level."""

    def test_fires_when_fused_meets_threshold(self) -> None:
        # capability(a=2) = T_VAL, required_cap(w=3) = T_VAL.
        # Fusion = T_VAL ⊙ T_VAL = T_VAL. Threshold T_VAL: leq holds.
        valuation = {
            "capability": fv({(1, 2): T_VAL}),
            "required_cap": fv({(1, 3): T_VAL}),
        }
        atom = FusionAtom(
            predicate_a="capability",
            subject_a=Const(1),
            object_a=Var("a"),
            predicate_b="required_cap",
            subject_b=Const(1),
            object_b=Var("w"),
            threshold=T_VAL,
        )
        assert atom.evaluate(valuation, {"a": 2, "w": 3}, BIL)

    def test_does_not_fire_when_one_input_F(self) -> None:
        # capability(a=2) = T_VAL, required_cap(w=3) = F_VAL.
        # Fusion = T_VAL ⊙ F_VAL = F_VAL. T_VAL is not ≤_t F_VAL.
        valuation = {
            "capability": fv({(1, 2): T_VAL}),
            "required_cap": fv({(1, 3): F_VAL}),
        }
        atom = FusionAtom(
            predicate_a="capability",
            subject_a=Const(1),
            object_a=Var("a"),
            predicate_b="required_cap",
            subject_b=Const(1),
            object_b=Var("w"),
            threshold=T_VAL,
        )
        assert not atom.evaluate(valuation, {"a": 2, "w": 3}, BIL)

    def test_collect_variables_includes_both_sides(self) -> None:
        atom = FusionAtom(
            predicate_a="p",
            subject_a=Var("x"),
            object_a=Var("y"),
            predicate_b="q",
            subject_b=Var("z"),
            object_b=Const(1),
            threshold=T_VAL,
        )
        assert collect_atom_variables(atom) == frozenset({"x", "y", "z"})

    def test_used_in_fiber_closure_rule(self) -> None:
        # Rule: capability(s, a) ⊙ required_cap(s, w) ≥_t T  ⟹  assigned(w, a) ≥_k T
        rule = FiberClosureRule(
            free_vars=("a", "w"),
            forall_vars=(),
            antecedent=FusionAtom(
                predicate_a="capability",
                subject_a=Const(1),
                object_a=Var("a"),
                predicate_b="required_cap",
                subject_b=Const(1),
                object_b=Var("w"),
                threshold=T_VAL,
            ),
            consequent=__import__(
                "pypredcalc.predication.closure_rule",
                fromlist=["CellAtom"],
            ).CellAtom(
                predicate="assigned",
                subject=Var("w"),
                object_=Var("a"),
                threshold=T_VAL,
            ),
        )
        # Rule fires at (a=2, w=3) iff fusion ≥_t T, i.e. both inputs ≥_t T.
        valuation_match = {
            "capability": fv({(1, 2): T_VAL}),
            "required_cap": fv({(1, 3): T_VAL}),
            "assigned": fv({}),
        }
        assert rule.fires_at(valuation_match, {"a": 2, "w": 3}, tuple(E), BIL)
        valuation_no_match = {
            "capability": fv({(1, 2): T_VAL}),
            "required_cap": fv({(1, 3): F_VAL}),
            "assigned": fv({}),
        }
        assert not rule.fires_at(
            valuation_no_match, {"a": 2, "w": 3}, tuple(E), BIL
        )


# ---- StoreFusionAntecedent at the store level -----------------------------


class TestStoreFusionAntecedent:
    def test_fires_when_fused_meets_threshold(self) -> None:
        store = PredicationStore.empty()
        store = store.insert(
            PredicationCell(
                subject="dispatch", predicate="capability",
                object="ep:groq", value=T,
            )
        )
        store = store.insert(
            PredicationCell(
                subject="task:t", predicate="required_cap",
                object="task:t", value=T,
            )
        )
        antecedent = StoreFusionAntecedent(
            cell_a=("task:t", "required_cap", "task:t"),
            cell_b=("dispatch", "capability", "ep:groq"),
            threshold=T,
        )
        assert antecedent.evaluate(store)

    def test_does_not_fire_when_one_input_missing(self) -> None:
        store = PredicationStore.empty()
        store = store.insert(
            PredicationCell(
                subject="dispatch", predicate="capability",
                object="ep:groq", value=T,
            )
        )
        # required_cap not set on task:t — defaults to BOT.
        antecedent = StoreFusionAntecedent(
            cell_a=("task:t", "required_cap", "task:t"),
            cell_b=("dispatch", "capability", "ep:groq"),
            threshold=T,
        )
        # Fusion T ⊙ BOT = BOT; threshold T ≰_t BOT.
        assert not antecedent.evaluate(store)


