"""Finite visible automorphism witnesses."""

from __future__ import annotations

from pypredcalc import (
    AutomorphismH1ActionWitness,
    AutomorphismStrataWitness,
    CoarseModuliPointStratum,
    EntityPermutationAutomorphismWitness,
    FiberSwapAutomorphismWitness,
    NegationGaugeAutomorphismWitness,
    PredicateAutomorphismWitness,
    automorphism_h1_action_witness,
    automorphism_strata_witness,
    coarse_settling_moduli,
    entity_permutation_automorphism_witness,
    fiber_swap_automorphism_witness,
    finite_settling_h1_witness,
    invisible_entity_permutation_automorphisms,
    invisible_predicate_automorphisms,
    negation_gauge_automorphism_witness,
    predicate_automorphism_witness,
    settling_associated_sheaf,
    visible_entity_permutation_automorphisms,
    visible_predicate_automorphisms,
)
from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.closure_rule_system import FiberClosureRuleSystem
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.hyperdoctrine import PredicationHyperdoctrine
from pypredcalc.predication.predicate_category import PredicateCategory, PredicateSet
from pypredcalc.predication.settling import PredicationSettling

T_VAL = (1, 0)
TOP = (1, 1)
BOT = (0, 0)
BIL = boolean_twist()
E = EntitySet.of([1, 2])
FULL = frozenset((s, o) for s in E for o in E)
SWAP = {1: 2, 2: 1}


def _settling(cells: dict[tuple[int, int], tuple[int, int]]) -> PredicationSettling[int]:
    hyperdoctrine = PredicationHyperdoctrine(
        PredicateCategory(
            entities=E,
            predicates=PredicateSet.of(["R"]),
        ),
        BIL,
    )
    closure = FiberClosureRuleSystem(rules=()).generate(hyperdoctrine)
    initial = {
        "R": FiberValuation(BIL, E, BOT, cells, dom=FULL),
    }
    return PredicationSettling.run(hyperdoctrine, closure, initial, bound=1)


def _predicate_settling(
    r_cells: dict[tuple[int, int], tuple[int, int]],
    s_cells: dict[tuple[int, int], tuple[int, int]],
) -> PredicationSettling[int]:
    hyperdoctrine = PredicationHyperdoctrine(
        PredicateCategory(
            entities=E,
            predicates=PredicateSet.of(["R", "S"]),
        ),
        BIL,
    )
    closure = FiberClosureRuleSystem(rules=()).generate(hyperdoctrine)
    initial = {
        "R": FiberValuation(BIL, E, BOT, r_cells, dom=FULL),
        "S": FiberValuation(BIL, E, BOT, s_cells, dom=FULL),
    }
    return PredicationSettling.run(hyperdoctrine, closure, initial, bound=1)


def test_entity_permutation_visible_when_it_stabilizes_and_moves_new_cells() -> None:
    settling = _settling({(1, 2): T_VAL, (2, 1): T_VAL})

    witness = entity_permutation_automorphism_witness(settling, SWAP)

    assert isinstance(witness, EntityPermutationAutomorphismWitness)
    assert (
        "theorems/visible-automorphism-sources"
        in vars(EntityPermutationAutomorphismWitness)["__realizes__"]
    )
    assert witness.is_permutation
    assert witness.stabilizes_settling
    assert witness.acts_nontrivially_on_sheaf
    assert witness.contributes_to_visible_quotient
    assert ("R", 0, (1, 2)) in witness.moved_new_cells


def test_entity_permutation_must_stabilize_settling() -> None:
    settling = _settling({(1, 2): T_VAL})

    witness = entity_permutation_automorphism_witness(settling, SWAP)

    assert not witness.stabilizes_settling
    assert not witness.contributes_to_visible_quotient


def test_stabilizing_permutation_with_no_new_cells_is_invisible() -> None:
    settling = _settling({})

    witness = entity_permutation_automorphism_witness(settling, SWAP)

    assert witness.stabilizes_settling
    assert not witness.acts_nontrivially_on_sheaf
    assert not witness.contributes_to_visible_quotient
    assert witness.contributes_to_invisible_subgroup
    assert visible_entity_permutation_automorphisms(settling) == ()
    assert any(
        candidate.permutation == SWAP
        for candidate in invisible_entity_permutation_automorphisms(settling)
    )


def test_fiber_swap_visible_when_symmetric_off_diagonal_cells_are_new() -> None:
    settling = _settling({(1, 2): T_VAL, (2, 1): T_VAL})

    witness = fiber_swap_automorphism_witness(settling)

    assert isinstance(witness, FiberSwapAutomorphismWitness)
    assert (
        "theorems/visible-automorphism-sources"
        in vars(FiberSwapAutomorphismWitness)["__realizes__"]
    )
    assert witness.stabilizes_settling
    assert witness.acts_nontrivially_on_sheaf
    assert witness.contributes_to_visible_quotient
    assert ("R", 0, (1, 2)) in witness.moved_new_cells


def test_fiber_swap_must_stabilize_settling() -> None:
    settling = _settling({(1, 2): T_VAL})

    witness = fiber_swap_automorphism_witness(settling)

    assert not witness.stabilizes_settling
    assert not witness.contributes_to_visible_quotient


def test_fiber_swap_on_diagonal_new_cells_is_invisible() -> None:
    settling = _settling({(1, 1): T_VAL, (2, 2): T_VAL})

    witness = fiber_swap_automorphism_witness(settling)

    assert witness.stabilizes_settling
    assert not witness.acts_nontrivially_on_sheaf
    assert not witness.contributes_to_visible_quotient
    assert witness.contributes_to_invisible_subgroup


def test_predicate_automorphism_visible_when_equal_predicates_have_new_cells() -> None:
    settling = _predicate_settling(
        {(1, 2): T_VAL},
        {(1, 2): T_VAL},
    )

    witness = predicate_automorphism_witness(settling, {"R": "S", "S": "R"})

    assert isinstance(witness, PredicateAutomorphismWitness)
    assert (
        "theorems/visible-automorphism-sources"
        in vars(PredicateAutomorphismWitness)["__realizes__"]
    )
    assert witness.is_permutation
    assert witness.preserves_domains
    assert witness.preserves_generators
    assert witness.stabilizes_settling
    assert witness.acts_nontrivially_on_sheaf
    assert witness.contributes_to_visible_quotient
    assert ("R", 0, (1, 2)) in witness.moved_new_cells


def test_predicate_automorphism_must_stabilize_settling() -> None:
    settling = _predicate_settling(
        {(1, 2): T_VAL},
        {},
    )

    witness = predicate_automorphism_witness(settling, {"R": "S", "S": "R"})

    assert witness.is_permutation
    assert not witness.stabilizes_settling
    assert not witness.contributes_to_visible_quotient


def test_identity_predicate_automorphism_is_invisible() -> None:
    settling = _predicate_settling(
        {(1, 2): T_VAL},
        {},
    )

    witness = predicate_automorphism_witness(settling, {"R": "R", "S": "S"})

    assert witness.stabilizes_settling
    assert not witness.acts_nontrivially_on_sheaf
    assert not witness.contributes_to_visible_quotient
    assert witness.contributes_to_invisible_subgroup
    assert any(
        candidate.permutation == {"R": "R", "S": "S"}
        for candidate in invisible_predicate_automorphisms(settling)
    )


def test_visible_predicate_automorphism_enumerator() -> None:
    settling = _predicate_settling(
        {(1, 2): T_VAL},
        {(1, 2): T_VAL},
    )

    witnesses = visible_predicate_automorphisms(settling)

    assert len(witnesses) == 1
    assert witnesses[0].permutation == {"R": "S", "S": "R"}


def test_negation_gauge_is_invisible_when_it_stabilizes() -> None:
    settling = _settling({(1, 2): TOP})

    witness = negation_gauge_automorphism_witness(settling)

    assert isinstance(witness, NegationGaugeAutomorphismWitness)
    assert "concepts/internal-z2-gauge" in vars(
        NegationGaugeAutomorphismWitness
    )["__realizes__"]
    assert witness.stabilizes_settling
    assert witness.moved_new_cells == frozenset()
    assert not witness.acts_nontrivially_on_sheaf
    assert not witness.contributes_to_visible_quotient
    assert witness.contributes_to_invisible_subgroup


def test_negation_gauge_need_not_stabilize_settling() -> None:
    settling = _settling({(1, 2): T_VAL})

    witness = negation_gauge_automorphism_witness(settling)

    assert not witness.stabilizes_settling
    assert not witness.contributes_to_visible_quotient


def test_coarse_moduli_point_stratum_detects_orbifold_point() -> None:
    moduli = coarse_settling_moduli(
        _settling({(1, 2): T_VAL, (2, 1): T_VAL})
    )
    point = moduli.components()[0]

    stratum = moduli.point_stratum(point)

    assert isinstance(stratum, CoarseModuliPointStratum)
    assert "concepts/orbifold-moduli-point" in vars(
        CoarseModuliPointStratum
    )["__realizes__"]
    assert stratum.is_orbifold
    assert not stratum.is_rigid
    assert "fiber_swap" in stratum.visible_sources


def test_coarse_moduli_point_stratum_detects_rigid_point() -> None:
    moduli = coarse_settling_moduli(_settling({(1, 2): T_VAL}))
    point = moduli.components()[0]

    stratum = moduli.point_stratum(point)

    assert stratum.is_rigid
    assert not stratum.is_orbifold
    assert stratum.visible_sources == ()


def test_automorphism_strata_witness_separates_visible_and_invisible_sources() -> None:
    settling = _settling({(1, 2): T_VAL, (2, 1): T_VAL})

    witness = automorphism_strata_witness(settling)

    assert isinstance(witness, AutomorphismStrataWitness)
    assert "concepts/invisible-automorphism-subgroup" in vars(
        AutomorphismStrataWitness
    )["__realizes__"]
    assert "concepts/visible-automorphism-quotient" in vars(
        AutomorphismStrataWitness
    )["__realizes__"]
    assert witness.has_visible_quotient
    assert "fiber_swap" in witness.visible_sources
    assert "negation_gauge" not in witness.invisible_sources


def test_automorphism_strata_witness_records_invisible_subgroup_sources() -> None:
    settling = _settling({})

    witness = automorphism_strata_witness(settling)

    assert not witness.has_visible_quotient
    assert witness.has_invisible_subgroup
    assert "entity_permutation" in witness.invisible_sources
    assert "fiber_swap" in witness.invisible_sources
    assert "negation_gauge" in witness.invisible_sources


def test_automorphism_h1_action_witness_detects_moved_curvature_generators() -> None:
    settling = _settling({(1, 2): T_VAL, (2, 1): T_VAL})
    h1 = finite_settling_h1_witness(
        settling_associated_sheaf(settling),
        generators=(("R", 0, (1, 2)), ("R", 0, (2, 1))),
        variant="truth",
    )

    witness = automorphism_h1_action_witness(settling, h1)

    assert isinstance(witness, AutomorphismH1ActionWitness)
    assert "theorems/equivariant-settling-cohomology" in vars(
        AutomorphismH1ActionWitness
    )["__realizes__"]
    assert "theorems/settling-automorphism-decomposition" in vars(
        AutomorphismH1ActionWitness
    )["__realizes__"]
    assert witness.holds
    assert "fiber_swap" in witness.visible_sources
    assert "entity_permutation" in witness.visible_sources
    assert any(
        check.source == "fiber_swap"
        and check.moved_generators == {
            ("R", 0, (1, 2)),
            ("R", 0, (2, 1)),
        }
        for check in witness.checks
    )
