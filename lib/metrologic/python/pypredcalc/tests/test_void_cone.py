"""Finite void-cone witnesses."""

from __future__ import annotations

from pypredcalc import (
    VoidCone,
    VoidConeAssociatedGradedWitness,
    finite_settling_h1_witness,
    settling_associated_sheaf,
    void_cone,
    void_cone_associated_graded_witness,
)
from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.closure_rule import CellAtom, FiberClosureRule, Var
from pypredcalc.predication.closure_rule_system import FiberClosureRuleSystem
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.hyperdoctrine import PredicationHyperdoctrine
from pypredcalc.predication.predicate_category import PredicateCategory, PredicateSet
from pypredcalc.predication.settling import PredicationSettling

T_VAL = (1, 0)
BOT = (0, 0)
BIL = boolean_twist()
E = EntitySet.of([1, 2])
FULL = frozenset((s, o) for s in E for o in E)


def _settling() -> PredicationSettling[int]:
    category = PredicateCategory(
        entities=E,
        predicates=PredicateSet.of(["R", "S"]),
    )
    hyperdoctrine = PredicationHyperdoctrine(category, BIL)
    rule = FiberClosureRule(
        free_vars=("x", "y"),
        forall_vars=(),
        antecedent=CellAtom("R", Var("x"), Var("y"), T_VAL),
        consequent=CellAtom("S", Var("x"), Var("y"), T_VAL),
    )
    closure = FiberClosureRuleSystem(rules=(rule,)).generate(hyperdoctrine)
    initial = {
        "R": FiberValuation(BIL, E, BOT, {(1, 2): T_VAL}, dom=FULL),
        "S": FiberValuation(BIL, E, BOT, {}, dom=FULL),
    }
    return PredicationSettling.run(hyperdoctrine, closure, initial, bound=4)


def test_void_cone_tracks_cells_leaving_bottom() -> None:
    cone = void_cone(_settling())

    assert isinstance(cone, VoidCone)
    assert (
        "theorems/value-agnostic-void-cone-axiomatic"
        in vars(VoidCone)["__realizes__"]
    )
    assert cone.left_void("R", 0) == frozenset({(1, 2)})
    assert cone.left_void("S", 0) == frozenset()
    assert cone.left_void("S", 1) == frozenset({(1, 2)})
    assert (1, 2) not in cone.limit_void("S")
    assert cone.total_graded_rank() == 2


def test_void_associated_graded_pairs_with_supplied_h1_generators() -> None:
    settling = _settling()
    h1 = finite_settling_h1_witness(
        settling_associated_sheaf(settling),
        generators=(("S", 1, (1, 2)),),
        variant="t",
    )
    witness = void_cone_associated_graded_witness(settling, h1)

    assert isinstance(witness, VoidConeAssociatedGradedWitness)
    assert (
        "theorems/void-cone-associated-graded-direct"
        in vars(VoidConeAssociatedGradedWitness)["__realizes__"]
    )
    assert witness.holds
    assert witness.rank_agrees
    assert witness.paired_generators == frozenset({("S", 1, (1, 2))})
