"""Finite-prefix settling-associated sheaf."""

from __future__ import annotations

from pypredcalc import (
    BigradedSettlingCohomologyWitness,
    FreeAbelianCellGroup,
    FreeAbelianPredicationGroup,
    FreeAbelianStagedPredicationGroup,
    InconsistencySheaf,
    NegativeParaconsistentSettlingSheaf,
    ParaconsistentSettlingAssociatedSheaf,
    SettlingAssociatedSheaf,
    SettlingH0Witness,
    SettlingH1Witness,
    SettlingQEnrichedSheafWitness,
    TruthKnowledgeH0SequenceWitness,
    bigraded_settling_cohomology,
    boolean_settling_q_enriched_sheaf,
    finite_settling_h0,
    finite_settling_h1_witness,
    inconsistency_sheaf,
    negative_paraconsistent_settling_sheaf,
    paraconsistent_settling_associated_sheaf,
    settling_associated_sheaf,
    settling_q_enriched_sheaf,
    truth_knowledge_h0_sequence_witness,
)
from pypredcalc.algebra.residuated_lattice import boolean_residuated_lattice
from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.closure_rule import CellAtom, FiberClosureRule, Var
from pypredcalc.predication.closure_rule_system import FiberClosureRuleSystem
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.hyperdoctrine import PredicationHyperdoctrine
from pypredcalc.predication.predicate_category import PredicateCategory, PredicateSet
from pypredcalc.predication.settling import PredicationSettling

T_VAL = (1, 0)
F_VAL = (0, 1)
TOP = (1, 1)
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
        "S": FiberValuation(
            BIL,
            E,
            BOT,
            {(2, 1): T_VAL, (1, 1): TOP, (2, 2): F_VAL},
            dom=FULL,
        ),
    }
    return PredicationSettling.run(hyperdoctrine, closure, initial, bound=4)


def test_settling_associated_sheaf_counts_new_truth_top_cells() -> None:
    sheaf = settling_associated_sheaf(_settling())

    assert isinstance(sheaf, SettlingAssociatedSheaf)
    assert (
        "objects/settling-associated-sheaf"
        in vars(SettlingAssociatedSheaf)["__realizes__"]
    )
    assert sheaf.delta_plus("R", 0) == frozenset({(1, 2)})
    assert sheaf.delta_plus("S", 0) == frozenset({(2, 1)})
    assert sheaf.delta_plus("S", 1) == frozenset({(1, 2)})
    assert sheaf.stage_ranks("S") == (1, 1)
    assert sheaf.total_rank() == 3


def test_stalk_is_free_abelian_group_on_local_increment_basis() -> None:
    sheaf = settling_associated_sheaf(_settling())
    stalk = sheaf.stalk("S", 1, clopen=frozenset({(1, 2), (2, 2)}))

    assert isinstance(stalk, FreeAbelianCellGroup)
    assert stalk.basis == frozenset({(1, 2)})
    assert stalk.rank == 1
    assert stalk.zero() == {(1, 2): 0}


def test_paraconsistent_and_inconsistency_sheaves_track_top_cells() -> None:
    settling = _settling()
    paraconsistent = paraconsistent_settling_associated_sheaf(settling)
    inconsistency = inconsistency_sheaf(settling)

    assert isinstance(paraconsistent, ParaconsistentSettlingAssociatedSheaf)
    assert isinstance(inconsistency, InconsistencySheaf)
    assert (
        "objects/paraconsistent-settling-associated-sheaf"
        in vars(ParaconsistentSettlingAssociatedSheaf)["__realizes__"]
    )
    assert (
        "objects/inconsistency-sheaf"
        in vars(InconsistencySheaf)["__realizes__"]
    )
    assert paraconsistent.delta_plus("S", 0) == frozenset({(2, 1), (1, 1)})
    assert inconsistency.delta_plus("S", 0) == frozenset({(1, 1)})
    assert paraconsistent.stage_ranks("S") == (2, 1)
    assert inconsistency.stage_ranks("S") == (1, 0)


def test_negative_paraconsistent_sheaf_tracks_false_and_top_cells() -> None:
    negative = negative_paraconsistent_settling_sheaf(_settling())

    assert isinstance(negative, NegativeParaconsistentSettlingSheaf)
    assert (
        "objects/negative-paraconsistent-settling-sheaf"
        in vars(NegativeParaconsistentSettlingSheaf)["__realizes__"]
    )
    assert negative.delta_plus("S", 0) == frozenset({(1, 1), (2, 2)})
    assert negative.stage_ranks("S") == (2, 0)


def test_clopen_must_lie_in_predicate_domain() -> None:
    sheaf = settling_associated_sheaf(_settling())

    try:
        sheaf.delta_plus("S", 0, clopen=frozenset({("outside", "domain")}))
    except ValueError as exc:
        assert "subset" in str(exc)
    else:
        raise AssertionError("expected ValueError")


def test_boolean_q_enrichment_weights_settling_site_points_by_rank() -> None:
    witness = boolean_settling_q_enriched_sheaf(_settling())

    assert isinstance(witness, SettlingQEnrichedSheafWitness)
    assert (
        "theorems/q-enriched-curry-grothendieck-site"
        in vars(SettlingQEnrichedSheafWitness)["__realizes__"]
    )
    full = frozenset(FULL)
    assert witness.rank_weights[("R", 0, full)] == 1
    assert witness.rank_weights[("R", 1, full)] == 0
    assert witness.rank_weights[("S", 1, full)] == 1
    assert witness.q_sheaf.stalk_at(("S", 1, full)) == 1
    assert witness.q_sheaf.restriction_constants == {}


def test_custom_q_enrichment_respects_supplied_clopens() -> None:
    settling = _settling()
    singleton = frozenset({(1, 2)})
    quantale = boolean_residuated_lattice()
    witness = settling_q_enriched_sheaf(
        settling,
        quantale,
        lambda rank: 1 if rank == 1 else 0,
        clopens={"S": (singleton,), "R": (singleton,)},
    )

    assert witness.rank_weights[("S", 1, singleton)] == 1
    assert ("S", 1, frozenset(FULL)) not in witness.rank_weights


def test_q_enriched_settling_bridge_accepts_site_restrictions() -> None:
    full = frozenset(FULL)
    parent = ("S", 0, full)
    child = ("S", 1, full)
    witness = boolean_settling_q_enriched_sheaf(
        _settling(),
        site_restriction_constants={(parent, child): 1},
    )

    assert (
        "theorems/q-enriched-sheaf-direct-inverse-image"
        in vars(SettlingQEnrichedSheafWitness)["__realizes__"]
    )
    assert witness.site_restriction_constants[(parent, child)] == 1
    assert witness.q_sheaf.restrict(parent, child, 1) == 1


def test_q_enriched_settling_bridge_rejects_unknown_restriction_points() -> None:
    full = frozenset(FULL)
    parent = ("S", 0, full)
    child = ("missing", 1, full)

    try:
        boolean_settling_q_enriched_sheaf(
            _settling(),
            site_restriction_constants={(parent, child): 1},
        )
    except ValueError as exc:
        assert "unknown site points" in str(exc)
    else:
        raise AssertionError("expected ValueError")


def test_finite_settling_h0_counts_predicate_labelled_designations() -> None:
    settling = _settling()
    truth_h0 = finite_settling_h0(
        settling_associated_sheaf(settling),
        variant="t",
    )
    knowledge_h0 = finite_settling_h0(
        paraconsistent_settling_associated_sheaf(settling),
        variant="k",
    )

    assert isinstance(truth_h0, SettlingH0Witness)
    assert (
        "theorems/finite-settling-h0-polynomial-time"
        in vars(SettlingH0Witness)["__realizes__"]
    )
    assert isinstance(truth_h0.group, FreeAbelianPredicationGroup)
    assert truth_h0.rank == 3
    assert knowledge_h0.rank == 4
    assert ("S", (1, 1)) in knowledge_h0.basis
    assert ("S", (1, 1)) not in truth_h0.basis


def test_truth_knowledge_h0_sequence_checks_degree_zero_exactness() -> None:
    sequence = truth_knowledge_h0_sequence_witness(_settling())

    assert isinstance(sequence, TruthKnowledgeH0SequenceWitness)
    assert (
        "theorems/truth-knowledge-cohomology-long-exact-sequence"
        in vars(TruthKnowledgeH0SequenceWitness)["__realizes__"]
    )
    assert sequence.holds
    assert sequence.failures == ()
    assert sequence.truth_h0.rank == 3
    assert sequence.knowledge_h0.rank == 4
    assert sequence.inconsistency_h0.rank == 1


def test_bigraded_settling_cohomology_packages_two_degree_zero_rows() -> None:
    witness = bigraded_settling_cohomology(_settling())

    assert isinstance(witness, BigradedSettlingCohomologyWitness)
    assert "objects/bigraded-settling-cohomology" in vars(
        BigradedSettlingCohomologyWitness
    )["__realizes__"]
    assert "theorems/bigraded-cohomology-via-mapping-cone" in vars(
        BigradedSettlingCohomologyWitness
    )["__realizes__"]
    assert witness.holds
    assert witness.row_ranks == ((0, 0, 3), (1, 0, 1))
    assert witness.total_degree_zero_rank == 4
    assert witness.extension_rank == 4


def test_finite_settling_h1_witness_validates_supplied_generators() -> None:
    settling = _settling()
    witness = finite_settling_h1_witness(
        settling_associated_sheaf(settling),
        generators=(("S", 1, (1, 2)),),
        variant="t",
    )

    assert isinstance(witness, SettlingH1Witness)
    assert (
        "theorems/transfinite-bounded-regime-h1-generators"
        in vars(SettlingH1Witness)["__realizes__"]
    )
    assert (
        "objects/aperiodic-classifying-invariant"
        in vars(SettlingH1Witness)["__realizes__"]
    )
    assert witness.holds
    assert witness.failures == ()
    assert isinstance(witness.group, FreeAbelianStagedPredicationGroup)
    assert witness.rank == 1
    assert witness.classifying_invariant == {("S", 1, (1, 2)): 1}


def test_finite_settling_h1_witness_localizes_invalid_generators() -> None:
    witness = finite_settling_h1_witness(
        settling_associated_sheaf(_settling()),
        generators=(("S", 1, (2, 2)),),
        variant="t",
    )

    assert not witness.holds
    assert witness.rank == 0
    assert len(witness.failures) == 1
    assert witness.failures[0].requested == ("S", 1, (2, 2))
    assert witness.failures[0].delta_plus == frozenset({(1, 2)})
