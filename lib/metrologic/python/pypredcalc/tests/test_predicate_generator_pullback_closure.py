"""PredCat-level pullback closure for the four generator classes."""

from __future__ import annotations

from pypredcalc.predication import (
    EntitySet,
    PredicateCategory,
    PredicateConverse,
    PredicateGeneratorPullbackClosureWitness,
    PredicateIdentity,
    PredicateObjectProjection,
    PredicateSet,
    PredicateSpecialization,
    PredicateSubjectProjection,
)

E = EntitySet.of([1, 2, 3])
FULL = frozenset((s, o) for s in E for o in E)
DIAG = frozenset((e, e) for e in E)
OFF = FULL - DIAG
EMPTY = frozenset()


def _category() -> tuple[PredicateCategory, tuple[object, ...]]:
    generators = (
        PredicateSpecialization(
            source="spec_diag",
            target="p",
            sub_support=DIAG,
        ),
        PredicateSpecialization(
            source="spec_off",
            target="p",
            sub_support=OFF,
        ),
        PredicateSpecialization(
            source="spec_empty",
            target="p",
            sub_support=EMPTY,
        ),
        PredicateConverse(source="conv", target="p"),
        PredicateSubjectProjection(source="subj", target="p"),
        PredicateObjectProjection(source="obj", target="p"),
    )
    category = PredicateCategory(
        entities=E,
        predicates=PredicateSet.of(
            [
                "p",
                "spec_diag",
                "spec_off",
                "spec_empty",
                "conv",
                "subj",
                "obj",
            ]
        ),
        generators=generators,
        domains={
            "p": FULL,
            "spec_diag": DIAG,
            "spec_off": OFF,
            "spec_empty": EMPTY,
            "conv": FULL,
            "subj": FULL,
            "obj": FULL,
        },
    )
    arrows = (PredicateIdentity("p", "p"), *generators)
    return category, arrows


class TestPredicateGeneratorPullbackClosure:
    def test_every_generator_pair_has_predcat_pullback_witness(self) -> None:
        category, arrows = _category()

        for f in arrows:
            for g in arrows:
                witness = category.generator_pullback_closure(f, g)

                assert isinstance(
                    witness,
                    PredicateGeneratorPullbackClosureWitness,
                )
                assert witness.holds, (
                    f"pullback closure failed for {witness.case}: "
                    f"{witness.left_composite!r} != {witness.right_composite!r}"
                )
                assert witness.pullback_domain <= FULL

    def test_subject_object_pullback_is_diagonal_not_generic_cell_product(
        self,
    ) -> None:
        category, _arrows = _category()
        subject = PredicateSubjectProjection(source="subj", target="p")
        object_ = PredicateObjectProjection(source="obj", target="p")

        witness = category.generator_pullback_closure(subject, object_)

        assert witness.case == "subject_projection/object_projection"
        assert witness.pullback_domain == DIAG
        assert isinstance(witness.p_a, PredicateSpecialization)
        assert isinstance(witness.p_b, PredicateSpecialization)
        assert witness.commutes

    def test_specialization_projection_cases_compute_broadcast_subsupport(
        self,
    ) -> None:
        category, _arrows = _category()
        spec = PredicateSpecialization(
            source="spec_diag",
            target="p",
            sub_support=DIAG,
        )
        subject = PredicateSubjectProjection(source="subj", target="p")
        off = PredicateSpecialization(
            source="spec_off",
            target="p",
            sub_support=OFF,
        )

        diag_subject = category.generator_pullback_closure(spec, subject)
        off_subject = category.generator_pullback_closure(off, subject)

        assert diag_subject.pullback_domain == FULL
        assert isinstance(diag_subject.p_a, PredicateSubjectProjection)
        assert isinstance(diag_subject.p_b, PredicateSpecialization)
        assert off_subject.pullback_domain == EMPTY
        assert off_subject.holds

