"""Tests for the concrete predication calculator facade."""

from __future__ import annotations

import pytest

from pypredcalc import (
    BeckChevalleyWitness,
    BilatticeValue,
    ComprehensionAdjunctionWitness,
    FrobeniusWitness,
    FusionFrobeniusWitness,
    IndexMap,
    OperationalStep,
    PredicationCalculator,
    QuantifierAdjunctionWitness,
)
from pypredcalc.predication import (
    FiberClosureRule,
    FiberClosureRuleSystem,
    PredicateConverse,
    PredicateSpecialization,
    beck_chevalley_witness,
)
from pypredcalc.predication import (
    PredicationCalculator as PredicationCalculatorFromSubpackage,
)

ENTITIES = ("alice", "bob")
PARENT_DOM = frozenset({("alice", "bob"), ("bob", "alice")})
DIRECT_DOM = frozenset({("alice", "bob")})
T_VAL = (1, 0)
F_VAL = (0, 1)
TOP = (1, 1)
K_TOP = (1, 1)
TRUTH_BOTTOM = (0, 1)
TRUTH_TOP = (1, 0)


def _parent_calculator() -> PredicationCalculator:
    return PredicationCalculator.of(
        entities=ENTITIES,
        predicates=["parent"],
    )


def _direct_parent_specialization() -> PredicateSpecialization:
    return PredicateSpecialization(
        source="direct_parent",
        target="parent",
        sub_support=DIRECT_DOM,
    )


def _direct_parent_calculator() -> PredicationCalculator:
    specializes = _direct_parent_specialization()
    return PredicationCalculator.of(
        entities=ENTITIES,
        predicates=["parent", "direct_parent"],
        generators=[specializes],
        domains={"parent": PARENT_DOM, "direct_parent": DIRECT_DOM},
    )


def _parallel_specialization_calculator() -> PredicationCalculator:
    f = _direct_parent_specialization()
    g = PredicateSpecialization(
        source="reverse_direct_parent",
        target="parent",
        sub_support=frozenset({("bob", "alice")}),
    )
    return PredicationCalculator.of(
        entities=ENTITIES,
        predicates=["parent", "direct_parent", "reverse_direct_parent"],
        generators=[f, g],
        domains={
            "parent": PARENT_DOM,
            "direct_parent": DIRECT_DOM,
            "reverse_direct_parent": g.sub_support,
        },
    )


def _converse_calculator() -> PredicationCalculator:
    converse = PredicateConverse(source="loved_by", target="loves")
    return PredicationCalculator.of(
        entities=ENTITIES,
        predicates=["loves", "loved_by"],
        generators=[converse],
    )


def _parent_implies_ancestor_rule() -> FiberClosureRule[int]:
    s = PredicationCalculator.var("S")
    o = PredicationCalculator.var("O")
    return PredicationCalculator.rule(
        free_vars=("S", "O"),
        forall_vars=(),
        antecedent=PredicationCalculator.atom("parent", s, o),
        consequent=PredicationCalculator.atom("ancestor", s, o),
    )


def _ancestor_transitive_rule() -> FiberClosureRule[int]:
    s = PredicationCalculator.var("S")
    m = PredicationCalculator.var("M")
    o = PredicationCalculator.var("O")
    return PredicationCalculator.rule(
        free_vars=("S", "M", "O"),
        antecedent=PredicationCalculator.all_of(
            PredicationCalculator.atom("ancestor", s, m),
            PredicationCalculator.atom("ancestor", m, o),
        ),
        consequent=PredicationCalculator.atom("ancestor", s, o),
    )


def _ancestor_rules() -> FiberClosureRuleSystem[int]:
    return PredicationCalculator.rule_system(
        _parent_implies_ancestor_rule(),
        _ancestor_transitive_rule(),
    )


def test_calculator_is_exported_from_top_level_and_subpackage() -> None:
    assert PredicationCalculatorFromSubpackage is PredicationCalculator


def test_base_change_types_are_exported_from_sdk_surface() -> None:
    assert IndexMap.__name__ == "IndexMap"
    assert BeckChevalleyWitness.__name__ == "BeckChevalleyWitness"
    assert callable(beck_chevalley_witness)


def test_tell_records_four_value_and_fiber_value() -> None:
    calc = _parent_calculator().tell("alice", "parent", "bob")

    assert calc.value("alice", "parent", "bob") is BilatticeValue.T
    assert calc.fiber("parent").get("alice", "bob") == T_VAL


def test_calculator_is_immutable_and_knowledge_monotone() -> None:
    base = _parent_calculator()
    t_calc = base.tell("alice", "parent", "bob", BilatticeValue.T)
    top_calc = t_calc.deny("alice", "parent", "bob")

    assert base.value("alice", "parent", "bob") is BilatticeValue.BOT
    assert t_calc.value("alice", "parent", "bob") is BilatticeValue.T
    assert top_calc.value("alice", "parent", "bob") is BilatticeValue.TOP
    assert top_calc.fiber("parent").get("alice", "bob") == TOP


def test_calculator_exposes_positing_speech_act_surface() -> None:
    base = _parent_calculator()
    assertive = base.positing("alice", "parent", "bob")

    asserted = base.assert_("alice", "parent", "bob")
    contested = asserted.contest("alice", "parent", "bob")
    abstained = base.abstain("alice", "parent", "bob")

    assert assertive.value is BilatticeValue.T
    assert asserted.value("alice", "parent", "bob") is BilatticeValue.T
    assert contested.value("alice", "parent", "bob") is BilatticeValue.TOP
    assert abstained.store == base.store


def test_calculator_batches_positings_before_closure_step() -> None:
    calc = PredicationCalculator.of(
        entities=ENTITIES,
        predicates=["parent", "ancestor"],
    )
    parent = calc.positing("alice", "parent", "bob")

    step = calc.operational_step(parent, rule_system=_ancestor_rules())

    assert isinstance(step, OperationalStep)
    assert step.locution == frozenset({("alice", "parent", "bob")})
    assert step.after_positing.value("alice", "parent", "bob") is BilatticeValue.T
    assert step.after_positing.value("alice", "ancestor", "bob") is BilatticeValue.BOT
    assert step.final.value("alice", "ancestor", "bob") is BilatticeValue.T
    assert not step.is_trivial


def test_calculator_operational_step_handles_abstaining_identity() -> None:
    calc = PredicationCalculator.of(
        entities=ENTITIES,
        predicates=["parent", "ancestor"],
    )
    abstain = calc.positing("alice", "parent", "bob", BilatticeValue.BOT)

    step = calc.operational_step(abstain, rule_system=_ancestor_rules())

    assert step.is_trivial
    assert step.after_positing.store == calc.store
    assert step.final.store == calc.store


def test_calculator_rejects_out_of_scope_batch_positing() -> None:
    calc = _parent_calculator()
    outside = PredicationCalculator.of(
        entities=["carol", "dave"],
        predicates=["parent"],
    ).positing("carol", "parent", "dave")

    with pytest.raises(KeyError, match="subject"):
        calc.posit_batch(outside)


def test_rejects_unknown_or_out_of_domain_cells() -> None:
    calc = PredicationCalculator.of(
        entities=["alice", "bob"],
        predicates=["parent"],
        domains={"parent": frozenset({("alice", "bob")})},
    )

    with pytest.raises(KeyError, match="subject"):
        calc.tell("carol", "parent", "bob")
    with pytest.raises(KeyError, match="predicate"):
        calc.tell("alice", "friend", "bob")
    with pytest.raises(ValueError, match="outside dom"):
        calc.tell("bob", "parent", "alice")


def test_naturality_witness_uses_current_fibers_by_default() -> None:
    calc = (
        _converse_calculator()
        .tell("alice", "loves", "bob")
        .tell("bob", "loved_by", "alice")
    )

    witness = calc.naturality()

    assert witness.holds
    assert calc.is_natural()


def test_naturality_witness_records_current_fiber_failure() -> None:
    calc = _converse_calculator().tell("alice", "loves", "bob")

    witness = calc.naturality()

    assert not witness.holds
    assert calc.is_natural() is False
    assert len(witness.failures) == 1
    assert ("bob", "alice") in witness.failures[0].discrepancy


def test_pullback_uses_current_target_fiber_by_default() -> None:
    specializes = _direct_parent_specialization()
    calc = _direct_parent_calculator().tell("alice", "parent", "bob")

    pulled = calc.pullback(specializes)

    assert pulled.dom == DIRECT_DOM
    assert pulled.get("alice", "bob") == T_VAL


def test_pullback_rejects_morphism_outside_calculator_category() -> None:
    calc = _parent_calculator()
    outside = PredicateSpecialization(
        source="direct_parent",
        target="parent",
        sub_support=frozenset({("alice", "bob")}),
    )

    with pytest.raises(KeyError, match="morphism source"):
        calc.pullback(outside)


def test_pullback_rejects_non_member_morphism_with_matching_predicates() -> None:
    calc = _direct_parent_calculator()
    outside = PredicateSpecialization(
        source="direct_parent",
        target="parent",
        sub_support=frozenset({("bob", "alice")}),
    )

    with pytest.raises(KeyError, match="not a morphism"):
        calc.pullback(outside)


def test_supplied_fiber_must_match_morphism_side() -> None:
    specializes = _direct_parent_specialization()
    calc = _direct_parent_calculator()

    with pytest.raises(ValueError, match="fiber.dom"):
        calc.exists_k(specializes, calc.fiber("parent"))


def test_quantifier_adjoints_use_current_source_fiber_by_default() -> None:
    specializes = _direct_parent_specialization()
    calc = _direct_parent_calculator().tell("alice", "direct_parent", "bob")

    exists_k = calc.exists_k(specializes)
    exists_t = calc.exists_t(specializes)
    forall_k = calc.forall_k(specializes)
    forall_t = calc.forall_t(specializes)

    assert exists_k.dom == PARENT_DOM
    assert exists_k.get("alice", "bob") == T_VAL
    assert exists_k.get("bob", "alice") == (0, 0)
    assert exists_t.get("bob", "alice") == TRUTH_BOTTOM
    assert forall_k.get("bob", "alice") == K_TOP
    assert forall_t.get("bob", "alice") == TRUTH_TOP


def test_calculator_witnesses_quantifier_adjunctions() -> None:
    specializes = _direct_parent_specialization()
    calc = _direct_parent_calculator()

    witness = calc.quantifier_adjunctions(specializes)

    assert isinstance(witness, QuantifierAdjunctionWitness)
    assert witness.holds
    assert len(witness.checks) == 3 * 3 * 4


def test_calculator_witnesses_frobenius() -> None:
    specializes = _direct_parent_specialization()
    calc = _direct_parent_calculator()

    witness = calc.frobenius(specializes)

    assert isinstance(witness, FrobeniusWitness)
    assert witness.holds
    assert len(witness.checks) == 3 * 3 * 2


def test_calculator_witnesses_fusion_frobenius_failure() -> None:
    specializes = _direct_parent_specialization()
    calc = _direct_parent_calculator()

    witness = calc.fusion_frobenius(specializes)

    assert isinstance(witness, FusionFrobeniusWitness)
    assert not witness.holds
    assert witness.failures


def test_calculator_witnesses_comprehension_adjunction() -> None:
    specializes = _direct_parent_specialization()
    calc = _direct_parent_calculator()

    witness = calc.comprehension_adjunction(specializes, schema="classical")

    assert isinstance(witness, ComprehensionAdjunctionWitness)
    assert witness.holds
    assert len(witness.checks) == 3


def test_index_map_uses_calculator_domains() -> None:
    specializes = _direct_parent_specialization()
    calc = _direct_parent_calculator()

    index = calc.index_map(specializes)

    assert index.source == DIRECT_DOM
    assert index.target == PARENT_DOM
    assert index.phi == {("alice", "bob"): ("alice", "bob")}


def test_beck_chevalley_square_exposes_cellwise_pullback_maps() -> None:
    f = _direct_parent_specialization()
    g = PredicateSpecialization(
        source="also_direct_parent",
        target="parent",
        sub_support=DIRECT_DOM,
    )
    calc = PredicationCalculator.of(
        entities=ENTITIES,
        predicates=["parent", "direct_parent", "also_direct_parent"],
        generators=[f, g],
        domains={
            "parent": PARENT_DOM,
            "direct_parent": DIRECT_DOM,
            "also_direct_parent": DIRECT_DOM,
        },
    )

    p_a, p_b = calc.beck_chevalley_square(f, g)

    assert p_a.target == DIRECT_DOM
    assert p_b.target == DIRECT_DOM
    carrier = frozenset({(("alice", "bob"), ("alice", "bob"))})
    assert p_a.source == carrier
    assert p_b.source == carrier
    assert p_a.phi == {next(iter(carrier)): ("alice", "bob")}
    assert p_b.phi == {next(iter(carrier)): ("alice", "bob")}


def test_beck_chevalley_uses_current_source_fiber_by_default() -> None:
    calc = _parallel_specialization_calculator().tell(
        "bob", "reverse_direct_parent", "alice"
    )
    f, g = calc.category.generators

    witness = calc.beck_chevalley(f, g)

    assert witness.holds
    assert len(witness.checks) == 4


def test_beck_chevalley_rejects_non_parallel_morphisms() -> None:
    f = _direct_parent_specialization()
    g = PredicateSpecialization(
        source="narrow_parent",
        target="direct_parent",
        sub_support=DIRECT_DOM,
    )
    calc = PredicationCalculator.of(
        entities=ENTITIES,
        predicates=["parent", "direct_parent", "narrow_parent"],
        generators=[f, g],
        domains={
            "parent": PARENT_DOM,
            "direct_parent": DIRECT_DOM,
            "narrow_parent": DIRECT_DOM,
        },
    )

    with pytest.raises(ValueError, match="f.target == g.target"):
        calc.beck_chevalley(f, g)


def test_beck_chevalley_rejects_samples_outside_g_source_domain() -> None:
    calc = _parallel_specialization_calculator()
    f, g = calc.category.generators

    with pytest.raises(ValueError, match="outside dom"):
        calc.beck_chevalley(f, g, [{("alice", "alice"): T_VAL}])


def test_comprehension_uses_current_predicate_fiber_by_default() -> None:
    calc = _parent_calculator()
    truth_calc = calc.tell("alice", "parent", "bob", BilatticeValue.T)
    conflict_calc = truth_calc.tell(
        "bob", "parent", "alice", BilatticeValue.T
    ).deny("bob", "parent", "alice")

    truth_comp = conflict_calc.comprehension_t("parent")
    knowledge_comp = conflict_calc.comprehension_k("parent")

    assert truth_comp.target == "parent"
    assert truth_comp.sub_support == frozenset({("alice", "bob")})
    assert knowledge_comp.target == "parent"
    assert knowledge_comp.sub_support == frozenset({("bob", "alice")})


def test_refine_t_materializes_truth_comprehension_as_subpredicate() -> None:
    calc = _parent_calculator().tell("alice", "parent", "bob")

    refined = calc.refine_t("parent", as_predicate="known_parent")
    specialization = refined.category.generators[-1]

    assert "known_parent" in refined.category.predicates
    assert isinstance(specialization, PredicateSpecialization)
    assert specialization.source == "known_parent"
    assert specialization.target == "parent"
    assert refined.category.dom_of("known_parent") == frozenset(
        {("alice", "bob")}
    )
    assert refined.value("alice", "known_parent", "bob") is BilatticeValue.T
    assert refined.naturality().holds


def test_refine_k_materializes_knowledge_top_comprehension() -> None:
    calc = (
        _parent_calculator()
        .tell("bob", "parent", "alice")
        .deny("bob", "parent", "alice")
    )

    refined = calc.refine_k("parent", as_predicate="conflicted_parent")

    assert refined.category.dom_of("conflicted_parent") == frozenset(
        {("bob", "alice")}
    )
    assert (
        refined.value("bob", "conflicted_parent", "alice")
        is BilatticeValue.TOP
    )
    assert refined.naturality().holds


def test_refinement_rejects_existing_predicate_name() -> None:
    calc = _parent_calculator()

    with pytest.raises(ValueError, match="already exists"):
        calc.refine_t("parent", as_predicate="parent")


def test_extensions_calculate_characteristic_fibers() -> None:
    specializes = _direct_parent_specialization()
    calc = _direct_parent_calculator()

    extension_t = calc.extension_t(specializes)
    extension_k = calc.extension_k(specializes)

    assert extension_t.get("alice", "bob") == TRUTH_TOP
    assert extension_t.get("bob", "alice") == TRUTH_BOTTOM
    assert extension_k.get("alice", "bob") == K_TOP
    assert extension_k.get("bob", "alice") == (0, 0)


def test_settle_runs_rule_system_from_current_fibers() -> None:
    calc = PredicationCalculator.of(
        entities=ENTITIES,
        predicates=["parent", "ancestor"],
    ).tell("alice", "parent", "bob")

    settling = calc.settle(_ancestor_rules(), bound=4)

    assert settling.is_quiescent
    assert settling.final["ancestor"].get("alice", "bob") == T_VAL


def test_close_returns_calculator_at_settling_final_state() -> None:
    calc = PredicationCalculator.of(
        entities=ENTITIES,
        predicates=["parent", "ancestor"],
    ).tell("alice", "parent", "bob")

    closed = calc.close(
        _ancestor_rules(),
        bound=4,
    )

    assert closed.value("alice", "ancestor", "bob") is BilatticeValue.T


def test_infer_returns_calculator_closed_under_rule_system() -> None:
    calc = PredicationCalculator.of(
        entities=ENTITIES,
        predicates=["parent", "ancestor"],
    ).tell("alice", "parent", "bob")

    inferred = calc.infer(_ancestor_rules())

    assert inferred.value("alice", "ancestor", "bob") is BilatticeValue.T


def test_quiescence_witness_records_closure_changes() -> None:
    calc = PredicationCalculator.of(
        entities=ENTITIES,
        predicates=["parent", "ancestor"],
    ).tell("alice", "parent", "bob")

    witness = calc.quiescence(_ancestor_rules())

    assert not witness.holds
    assert calc.is_quiescent(_ancestor_rules()) is False
    assert "ancestor" in witness.changed_cells
    assert ("alice", "bob") in witness.changed_cells["ancestor"]


def test_quiescence_holds_after_inference() -> None:
    calc = PredicationCalculator.of(
        entities=ENTITIES,
        predicates=["parent", "ancestor"],
    ).tell("alice", "parent", "bob")

    inferred = calc.infer(_ancestor_rules())

    assert inferred.quiescence(_ancestor_rules()).holds
    assert inferred.is_quiescent(_ancestor_rules())


def test_positive_formula_builders_support_transitive_closure_rules() -> None:
    calc = PredicationCalculator.of(
        entities=("alice", "bob", "carol"),
        predicates=["parent", "ancestor"],
    ).tell("alice", "parent", "bob").tell("bob", "parent", "carol")

    closed = calc.close(_ancestor_rules(), bound=6)
    inferred = calc.infer(_ancestor_rules())

    assert closed.value("alice", "ancestor", "bob") is BilatticeValue.T
    assert closed.value("bob", "ancestor", "carol") is BilatticeValue.T
    assert closed.value("alice", "ancestor", "carol") is BilatticeValue.T
    assert inferred.store == closed.store


def test_formula_builders_reject_empty_formula_lists() -> None:
    with pytest.raises(ValueError, match="all_of"):
        PredicationCalculator.all_of()
    with pytest.raises(ValueError, match="any_of"):
        PredicationCalculator.any_of()


def test_with_store_validates_scope() -> None:
    calc = _parent_calculator()
    updated = calc.tell("alice", "parent", "bob", BilatticeValue.F)

    assert calc.with_store(updated.store).fiber("parent").get("alice", "bob") == F_VAL
