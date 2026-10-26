"""Soundness check: ``IndexMap`` view of each generator agrees with the
generator class's own ``pullback`` / ``existential_*`` / ``universal_*``
methods.

Without this bridge, BC verification at the ``IndexMap`` level would
not transfer to the generator-level statement. With it, the BC tests
in ``test_b3_beck_chevalley.py`` pull through to the corpus claim about
the four generator classes.
"""

from __future__ import annotations

from itertools import product

from pypredcalc import (
    PredicateGeneratorIndexMapClassification as TopLevelClassification,
)
from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.index_map import (
    IndexMap,
    PredicateGeneratorIndexMapClassification,
)
from pypredcalc.predication.predicate_category import (
    PredicateConverse,
    PredicateIdentity,
    PredicateObjectProjection,
    PredicateSpecialization,
    PredicateSubjectProjection,
)

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()
FOUR = (T_VAL, F_VAL, BOT, TOP)

E = EntitySet.of([1, 2])
FULL = frozenset((s, o) for s in E for o in E)


def fv(cells=None, dom=None):
    return FiberValuation(BIL, E, BOT, cells or {}, dom=dom or FULL)


def _all_fibers_on(dom):
    cells_list = sorted(dom, key=lambda c: (str(c[0]), str(c[1])))
    if not cells_list:
        yield fv({}, dom=dom)
        return
    for assignment in product(FOUR, repeat=len(cells_list)):
        yield fv(dict(zip(cells_list, assignment, strict=True)), dom=dom)


def _check_agrees(generator, source_dom, target_dom):
    im = IndexMap.from_generator(
        generator,
        source_dom=source_dom,
        target_dom=target_dom,
        bilattice=BIL,
    )

    # Pullback agreement: gen.pullback(fiber on target) ≡ im.pullback_cells.
    for v in _all_fibers_on(target_dom):
        gen_pull = generator.pullback(v)
        im_pull_cells = im.pullback_cells(dict(v.cells))
        assert dict(gen_pull.cells) == im_pull_cells, (
            f"pullback disagrees for {type(generator).__name__}: "
            f"input={dict(v.cells)} gen={dict(gen_pull.cells)} "
            f"im={im_pull_cells}"
        )

    # Adjoint agreement: each of {∃_k, ∀_k, ∃_t, ∀_t}.
    for alpha in _all_fibers_on(source_dom):
        for op_name, gen_op, im_op in [
            (
                "existential_k",
                generator.existential_k,
                im.existential_k,
            ),
            (
                "universal_k",
                generator.universal_k,
                im.universal_k,
            ),
            (
                "existential_t",
                generator.existential_t,
                im.existential_t,
            ),
            (
                "universal_t",
                generator.universal_t,
                im.universal_t,
            ),
        ]:
            gen_out = gen_op(alpha, target_dom)
            im_out = im_op(dict(alpha.cells))
            assert dict(gen_out.cells) == im_out, (
                f"{op_name} disagrees for {type(generator).__name__}: "
                f"α={dict(alpha.cells)} gen={dict(gen_out.cells)} "
                f"im={im_out}"
            )


class TestIndexMapAgreesIdentity:
    def test_identity(self) -> None:
        _check_agrees(
            PredicateIdentity(source="p", target="p"),
            source_dom=FULL,
            target_dom=FULL,
        )


class TestIndexMapAgreesSpecialization:
    def test_specialization_offdiagonal_sub(self) -> None:
        sub = frozenset({(1, 2), (2, 1)})
        _check_agrees(
            PredicateSpecialization(source="q", target="p", sub_support=sub),
            source_dom=sub,
            target_dom=FULL,
        )

    def test_specialization_singleton_sub(self) -> None:
        sub = frozenset({(1, 1)})
        _check_agrees(
            PredicateSpecialization(source="q", target="p", sub_support=sub),
            source_dom=sub,
            target_dom=FULL,
        )


class TestIndexMapAgreesConverse:
    def test_converse(self) -> None:
        # source_dom = swap(target_dom); FULL is swap-symmetric.
        _check_agrees(
            PredicateConverse(source="p_c", target="p"),
            source_dom=FULL,
            target_dom=FULL,
        )


class TestIndexMapAgreesProjections:
    def test_subject_projection(self) -> None:
        _check_agrees(
            PredicateSubjectProjection(source="q", target="p"),
            source_dom=FULL,
            target_dom=FULL,
        )

    def test_object_projection(self) -> None:
        _check_agrees(
            PredicateObjectProjection(source="q", target="p"),
            source_dom=FULL,
            target_dom=FULL,
        )


class TestPredicateGeneratorClassification:
    def test_classifies_four_full_support_shapes(self) -> None:
        cases = [
            (
                PredicateIdentity(source="p", target="p"),
                FULL,
                FULL,
                "identity",
            ),
            (
                PredicateConverse(source="pc", target="p"),
                FULL,
                FULL,
                "converse",
            ),
            (
                PredicateSubjectProjection(source="sp", target="p"),
                FULL,
                FULL,
                "subject_projection",
            ),
            (
                PredicateObjectProjection(source="op", target="p"),
                FULL,
                FULL,
                "object_projection",
            ),
        ]
        for generator, source_dom, target_dom, expected in cases:
            index = IndexMap.from_generator(
                generator,
                source_dom=source_dom,
                target_dom=target_dom,
                bilattice=BIL,
            )

            witness = index.classify_predicate_generator(E)

            assert isinstance(witness, PredicateGeneratorIndexMapClassification)
            assert TopLevelClassification is PredicateGeneratorIndexMapClassification
            assert witness.holds
            assert witness.cell_endomorphism == "identity"
            assert not witness.non_cell_sources
            assert not witness.non_cell_targets
            assert expected in witness.kinds

    def test_records_theorem_scope_for_cardinality_and_orbit_support(self) -> None:
        entities = EntitySet.of([1, 2, 3])
        full = frozenset((s, o) for s in entities for o in entities)
        off_diagonal = frozenset(
            (s, o) for s in entities for o in entities if s != o
        )
        singleton = frozenset({(1, 2)})
        full_orbit_index = IndexMap.from_generator(
            PredicateSpecialization(
                source="q",
                target="p",
                sub_support=off_diagonal,
            ),
            source_dom=off_diagonal,
            target_dom=full,
            bilattice=BIL,
        )
        partial_index = IndexMap.from_generator(
            PredicateSpecialization(
                source="r",
                target="p",
                sub_support=singleton,
            ),
            source_dom=singleton,
            target_dom=full,
            bilattice=BIL,
        )

        full_orbit_witness = full_orbit_index.classify_predicate_generator(entities)
        partial_witness = partial_index.classify_predicate_generator(entities)

        assert full_orbit_witness.holds
        assert full_orbit_witness.in_exhaustiveness_scope
        assert full_orbit_witness.realizes_generator_exhaustiveness_fragment
        assert partial_witness.holds
        assert not partial_witness.in_exhaustiveness_scope
        assert not partial_witness.support_is_orbit_union

    def test_rejects_non_generator_shape(self) -> None:
        entities = EntitySet.of([1, 2, 3])
        full = frozenset((s, o) for s in entities for o in entities)
        index = IndexMap(
            source=full,
            target=full,
            phi={(s, o): (1, 1) for s, o in full},
            bilattice=BIL,
        )

        witness = index.classify_predicate_generator(entities)

        assert not witness.holds
        assert witness.kinds == ()

    def test_rejects_non_entity_pair_target_support(self) -> None:
        entities = EntitySet.of([1, 2, 3])
        full = frozenset((s, o) for s in entities for o in entities)
        target = full | frozenset({"not-a-cell"})
        index = IndexMap(
            source=full,
            target=target,
            phi={cell: cell for cell in full},
            bilattice=BIL,
        )

        witness = index.classify_predicate_generator(entities)

        assert not witness.holds
        assert witness.non_cell_targets == frozenset({"not-a-cell"})
