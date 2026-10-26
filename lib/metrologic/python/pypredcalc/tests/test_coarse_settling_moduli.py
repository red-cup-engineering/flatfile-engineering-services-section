"""Finite coarse-settling moduli via sheaf signatures."""

from __future__ import annotations

from pypredcalc import (
    CoarseSettlingModuli,
    CombinedCohomologySignature,
    SettlingSheafIsoSignature,
)
from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication import (
    coarse_settling_moduli,
    combined_cohomology_signature,
)
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


def _hyperdoctrine() -> PredicationHyperdoctrine[int]:
    return PredicationHyperdoctrine(
        PredicateCategory(
            entities=E,
            predicates=PredicateSet.of(["R", "S"]),
        ),
        BIL,
    )


def _settling(r_cells: dict[tuple[int, int], tuple[int, int]]) -> PredicationSettling[int]:
    hyperdoctrine = _hyperdoctrine()
    rule = FiberClosureRule(
        free_vars=("x", "y"),
        forall_vars=(),
        antecedent=CellAtom("R", Var("x"), Var("y"), T_VAL),
        consequent=CellAtom("S", Var("x"), Var("y"), T_VAL),
    )
    closure = FiberClosureRuleSystem(rules=(rule,)).generate(hyperdoctrine)
    initial = {
        "R": FiberValuation(BIL, E, BOT, r_cells, dom=FULL),
        "S": FiberValuation(BIL, E, BOT, {}, dom=FULL),
    }
    return PredicationSettling.run(hyperdoctrine, closure, initial, bound=3)


def test_coarse_moduli_groups_by_sheaf_iso_signature() -> None:
    moduli = coarse_settling_moduli(
        _settling({(1, 2): T_VAL}),
        _settling({(2, 1): T_VAL}),
        _settling({(1, 2): T_VAL, (2, 1): T_VAL}),
    )

    assert isinstance(moduli, CoarseSettlingModuli)
    assert (
        "objects/coarse-settling-moduli"
        in vars(CoarseSettlingModuli)["__realizes__"]
    )
    components = moduli.components()

    assert len(components) == 2
    assert components[0].member_indices == (0, 1)
    assert components[1].member_indices == (2,)
    assert components[1].is_singleton


def test_classifying_function_returns_sheaf_signature_per_component() -> None:
    moduli = coarse_settling_moduli(
        _settling({(1, 2): T_VAL}),
        _settling({(2, 1): T_VAL}),
    )

    classifying = moduli.classifying_function()

    assert set(classifying) == {0}
    signature = classifying[0]
    assert isinstance(signature, SettlingSheafIsoSignature)
    assert (
        "morphisms/moduli-classifying-function"
        in vars(SettlingSheafIsoSignature)["__realizes__"]
    )
    assert signature.predicate_stage_ranks == (
        ("R", (1, 0)),
        ("S", (0, 1)),
    )
    assert signature.total_rank == 2


def test_combined_cohomology_signature_packages_h0_plus_h1() -> None:
    settling = _settling({(1, 2): T_VAL})

    signature = combined_cohomology_signature(
        settling,
        h1_generators=(("S", 1, (1, 2)),),
    )

    assert isinstance(signature, CombinedCohomologySignature)
    assert "morphisms/combined-cohomology-classifying-morphism" in vars(
        CombinedCohomologySignature
    )["__realizes__"]
    assert signature.h0_rank == 2
    assert signature.h1_rank == 1
    assert signature.h0_plus_h1_rank == 3
    assert signature.h1_generators == (("S", 1, (1, 2)),)
    assert signature.h1_classifying_invariant == (((("S", 1, (1, 2))), 1),)
    assert signature.holds
    assert signature.bigraded_h0.row_ranks == ((0, 0, 2), (1, 0, 0))
    assert signature.bigraded_h0.total_degree_zero_rank == 2


def test_coarse_moduli_combined_classifying_function_uses_representatives() -> None:
    first = _settling({(1, 2): T_VAL})
    second = _settling({(2, 1): T_VAL})
    moduli = coarse_settling_moduli(first, second)

    classifying = moduli.combined_classifying_function(
        {0: (("S", 1, (1, 2)),)}
    )

    assert set(classifying) == {0}
    assert classifying[0].h0_rank == 2
    assert classifying[0].h1_rank == 1


def test_moduli_rejects_mixed_bases() -> None:
    first = _settling({(1, 2): T_VAL})
    other_hyperdoctrine = PredicationHyperdoctrine(
        PredicateCategory(
            entities=EntitySet.of([1, 2, 3]),
            predicates=PredicateSet.of(["R", "S"]),
        ),
        BIL,
    )
    closure = FiberClosureRuleSystem(rules=()).generate(other_hyperdoctrine)
    other_full = frozenset((s, o) for s in other_hyperdoctrine.category.entities for o in other_hyperdoctrine.category.entities)
    second = PredicationSettling.run(
        other_hyperdoctrine,
        closure,
        {
            "R": FiberValuation(BIL, other_hyperdoctrine.category.entities, BOT, {}, dom=other_full),
            "S": FiberValuation(BIL, other_hyperdoctrine.category.entities, BOT, {}, dom=other_full),
        },
        bound=3,
    )

    try:
        coarse_settling_moduli(first, second)
    except ValueError as exc:
        assert "same base" in str(exc)
    else:
        raise AssertionError("expected ValueError")
