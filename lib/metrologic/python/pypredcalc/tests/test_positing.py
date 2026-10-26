"""Positing morphisms realise FOUR speech-act structure."""

from __future__ import annotations

import pytest

from pypredcalc import (
    BatchPositingNaturalityWitness,
    BilatticeValue,
    PositingMorphism,
    PositingNaturalityWitness,
    PredicateSubjectProjection,
    PredicationCalculator,
    SpeechActClass,
    apply_positings,
    assertive_positing,
    contestation_positing,
    denial_positing,
    positing_naturality_witness,
    reindex_positing,
    speech_act_class,
)
from pypredcalc.predication import PredicateSpecialization
from pypredcalc.predication.store import PredicationStore


def test_speech_act_partition_is_exported_and_exhaustive() -> None:
    assert speech_act_class(BilatticeValue.BOT) is SpeechActClass.ABSTAINING
    assert speech_act_class(BilatticeValue.T) is SpeechActClass.ASSERTING
    assert speech_act_class(BilatticeValue.F) is SpeechActClass.DENYING
    assert speech_act_class(BilatticeValue.TOP) is SpeechActClass.CONTESTING


def test_positing_morphism_realizes_corpus_and_classifies_datum() -> None:
    realizations = vars(PositingMorphism)["__realizes__"]
    assert "morphisms/positing-morphism" in realizations

    morphism = assertive_positing("alice", "parent", "bob")

    assert morphism.key == ("alice", "parent", "bob")
    assert morphism.cell.value is BilatticeValue.T
    assert morphism.speech_act is SpeechActClass.ASSERTING


def test_apply_is_knowledge_monotone_and_abstaining_is_identity() -> None:
    store = PredicationStore.empty()
    assertive = assertive_positing("alice", "parent", "bob")
    denial = denial_positing("alice", "parent", "bob")
    abstaining = PositingMorphism(
        "alice",
        "parent",
        "bob",
        BilatticeValue.BOT,
    )

    after_assertion = assertive.apply(store)
    after_denial = denial.apply(after_assertion)

    assert after_assertion.get("alice", "parent", "bob") is BilatticeValue.T
    assert after_denial.get("alice", "parent", "bob") is BilatticeValue.TOP
    assert abstaining.apply(store) == store
    assert list(abstaining.apply(store).cells()) == []


def test_same_cell_composition_joins_positing_data() -> None:
    assertive = assertive_positing("alice", "parent", "bob")
    denial = denial_positing("alice", "parent", "bob")
    contesting = contestation_positing("alice", "parent", "bob")

    assert assertive.then(denial).value is BilatticeValue.TOP
    assert denial.then(assertive).value is BilatticeValue.TOP
    assert contesting.then(assertive).value is BilatticeValue.TOP
    assert assertive.commutes_with(denial)


def test_same_cell_composition_rejects_distinct_cells() -> None:
    assertive = assertive_positing("alice", "parent", "bob")
    other = assertive_positing("bob", "parent", "alice")

    with pytest.raises(ValueError, match="same-cell"):
        assertive.then(other)
    assert assertive.commutes_with(other)


def test_batch_positing_commutes_for_distinct_cells() -> None:
    left = assertive_positing("alice", "parent", "bob")
    right = denial_positing("bob", "parent", "alice")

    store_a = apply_positings(PredicationStore.empty(), [left, right])
    store_b = apply_positings(PredicationStore.empty(), [right, left])

    assert store_a == store_b
    assert store_a.get("alice", "parent", "bob") is BilatticeValue.T
    assert store_a.get("bob", "parent", "alice") is BilatticeValue.F


def test_specialization_reindexes_positing_to_same_source_cell() -> None:
    direct_dom = frozenset({("alice", "bob")})
    parent_dom = frozenset({("alice", "bob"), ("bob", "alice")})
    specializes = PredicateSpecialization(
        source="direct_parent",
        target="parent",
        sub_support=direct_dom,
    )
    calc = PredicationCalculator.of(
        entities=["alice", "bob"],
        predicates=["parent", "direct_parent"],
        generators=[specializes],
        domains={"parent": parent_dom, "direct_parent": direct_dom},
    )
    positing = calc.positing("alice", "parent", "bob")

    reindexed = calc.reindex_positing(specializes, positing)
    witness = calc.positing_naturality(specializes, positing)

    assert reindexed == (
        PositingMorphism(
            "alice",
            "direct_parent",
            "bob",
            BilatticeValue.T,
        ),
    )
    assert isinstance(witness, PositingNaturalityWitness)
    assert witness.holds
    assert witness.discrepancy == frozenset()
    assert witness.reindexed_positings == reindexed


def test_projection_reindexes_diagonal_positing_to_source_batch() -> None:
    projection = PredicateSubjectProjection(source="subject_p", target="p")
    calc = PredicationCalculator.of(
        entities=["alice", "bob"],
        predicates=["p", "subject_p"],
        generators=[projection],
    )
    positing = calc.positing("alice", "p", "alice", BilatticeValue.F)

    reindexed = reindex_positing(
        calc.category,
        calc.bilattice,
        projection,
        positing,
    )
    witness = positing_naturality_witness(
        calc.hyperdoctrine,
        projection,
        calc.fiber("p"),
        positing,
    )

    assert reindexed == (
        PositingMorphism("alice", "subject_p", "alice", BilatticeValue.F),
        PositingMorphism("alice", "subject_p", "bob", BilatticeValue.F),
    )
    assert witness.holds
    assert witness.right.get("alice", "alice") == (0, 1)
    assert witness.right.get("alice", "bob") == (0, 1)


def test_projection_reindexes_off_diagonal_positing_to_empty_batch() -> None:
    projection = PredicateSubjectProjection(source="subject_p", target="p")
    calc = PredicationCalculator.of(
        entities=["alice", "bob"],
        predicates=["p", "subject_p"],
        generators=[projection],
    )
    positing = calc.positing("alice", "p", "bob")

    witness = calc.positing_naturality(projection, positing)

    assert witness.reindexed_positings == ()
    assert witness.holds
    assert witness.right == calc.pullback(projection)


def test_batch_positing_naturality_reindexes_finite_composites() -> None:
    projection = PredicateSubjectProjection(source="subject_p", target="p")
    calc = PredicationCalculator.of(
        entities=["alice", "bob"],
        predicates=["p", "subject_p"],
        generators=[projection],
    )
    asserting = calc.positing("alice", "p", "alice", BilatticeValue.T)
    denying = calc.positing("bob", "p", "bob", BilatticeValue.F)

    witness = calc.batch_positing_naturality(projection, asserting, denying)

    assert isinstance(witness, BatchPositingNaturalityWitness)
    assert witness.holds
    assert len(witness.positings) == 2
    assert len(witness.reindexed_positings) == 4
    assert witness.right.get("alice", "bob") == (1, 0)
    assert witness.right.get("bob", "alice") == (0, 1)
