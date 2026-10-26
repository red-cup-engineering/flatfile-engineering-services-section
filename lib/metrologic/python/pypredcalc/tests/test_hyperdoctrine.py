"""Sprint H — PredicationHyperdoctrine aggregate.

The hyperdoctrine aggregate adds no new math; it routes the existing
B1k/B1t/B2k/B2t/B3/B4 primitives through a single object so that the
caller does not have to thread ``dom_p``, ``bilattice``, and the right
morphism instance into each call. These tests verify:

1. The aggregate's adjoint methods agree pointwise with the underlying
   ``PredicateMorphism`` adjoints.
2. The comprehension methods agree with :mod:`pypredcalc.predication.comprehension`.
3. The aggregate enforces ``fiber.dom == dom(predicate)`` so callers
   cannot smuggle a mis-domained fiber through the API.
"""

from __future__ import annotations

from pypredcalc import (
    PredicationHyperdoctrineWitness as TopLevelHyperdoctrineWitness,
)
from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.comprehension import ComprehensionAdjunctionWitness
from pypredcalc.predication.comprehension import (
    comprehension_t as raw_comp_t,
)
from pypredcalc.predication.comprehension import (
    extension_t as raw_ext_t,
)
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.hyperdoctrine import (
    PredicationHyperdoctrine,
    PredicationHyperdoctrineWitness,
)
from pypredcalc.predication.predicate_category import (
    PredicateCategory,
    PredicateConverse,
    PredicateObjectProjection,
    PredicateSet,
    PredicateSpecialization,
    PredicateSubjectProjection,
)
from pypredcalc.predication.witness import (
    BeckChevalleyWitness,
    FrobeniusWitness,
    FusionFrobeniusWitness,
    QuantifierAdjunctionWitness,
)

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()

E = EntitySet.of([1, 2])
FULL = frozenset((s, o) for s in E for o in E)
SUB = frozenset({(1, 2), (2, 1)})


def _category_with(*generators):
    """Build a PredicateCategory carrying a given generator inventory."""
    predicates = []
    domains = {}
    for gen in generators:
        for predicate in (gen.source, gen.target):
            if predicate not in predicates:
                predicates.append(predicate)
        if isinstance(gen, PredicateSpecialization):
            domains[gen.source] = gen.sub_support
    return PredicateCategory(
        entities=E,
        predicates=PredicateSet.of(predicates),
        generators=tuple(generators),
        domains=domains,
    )


def fv(cells, dom):
    return FiberValuation(BIL, E, BOT, cells, dom=dom)


# ---- Construction --------------------------------------------------------


class TestHyperdoctrineConstruction:
    def test_predicates_iter(self) -> None:
        cat = _category_with(PredicateSpecialization(source="q", target="p", sub_support=SUB))
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        assert set(H.predicates()) == {"q", "p"}

    def test_dom_lookup(self) -> None:
        cat = _category_with(PredicateSpecialization(source="q", target="p", sub_support=SUB))
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        assert H.dom("q") == SUB
        assert H.dom("p") == FULL

    def test_fiber_is_constant_bottom(self) -> None:
        cat = _category_with(PredicateSpecialization(source="q", target="p", sub_support=SUB))
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        f = H.fiber("p")
        assert f.dom == FULL
        assert dict(f.cells) == {}
        assert all(f.get(*c) == BOT for c in FULL)

    def test_aggregate_axiom_witness_packages_a_and_b_layers(self) -> None:
        spec = PredicateSpecialization(source="q", target="p", sub_support=SUB)
        cat = _category_with(spec)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)

        witness = H.check_axioms()

        assert isinstance(witness, PredicationHyperdoctrineWitness)
        assert TopLevelHyperdoctrineWitness is PredicationHyperdoctrineWitness
        assert witness.hyperdoctrine is H
        assert witness.holds
        assert witness.failures == ()
        assert witness.fibration.holds
        assert len(witness.b1) == 1
        assert len(witness.b2) == 1
        assert len(witness.b3) == 1
        assert [part.schema for part in witness.b4] == [
            "classical",
            "paraconsistent",
        ]


# ---- Adjoint surface agrees with primitive --------------------------------


class TestAdjointsAgreeWithPrimitive:
    """For every adjoint and every generator class, the aggregate result
    equals the result of calling the primitive directly with the right
    ``dom_p`` and the right method name."""

    def test_specialization_exists_k(self) -> None:
        spec = PredicateSpecialization(source="q", target="p", sub_support=SUB)
        cat = _category_with(spec)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        phi = fv({(1, 2): T_VAL, (2, 1): TOP}, dom=SUB)
        assert H.exists_k(spec, phi) == spec.existential_k(phi, FULL)

    def test_specialization_exists_t(self) -> None:
        spec = PredicateSpecialization(source="q", target="p", sub_support=SUB)
        cat = _category_with(spec)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        phi = fv({(1, 2): T_VAL, (2, 1): TOP}, dom=SUB)
        assert H.exists_t(spec, phi) == spec.existential_t(phi, FULL)

    def test_specialization_forall_k(self) -> None:
        spec = PredicateSpecialization(source="q", target="p", sub_support=SUB)
        cat = _category_with(spec)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        phi = fv({(1, 2): T_VAL, (2, 1): TOP}, dom=SUB)
        assert H.forall_k(spec, phi) == spec.universal_k(phi, FULL)

    def test_specialization_forall_t(self) -> None:
        spec = PredicateSpecialization(source="q", target="p", sub_support=SUB)
        cat = _category_with(spec)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        phi = fv({(1, 2): T_VAL, (2, 1): TOP}, dom=SUB)
        assert H.forall_t(spec, phi) == spec.universal_t(phi, FULL)

    def test_converse_exists_k(self) -> None:
        conv = PredicateConverse(source="p_c", target="p")
        cat = _category_with(conv)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        phi = fv({(1, 2): T_VAL, (2, 1): F_VAL}, dom=FULL)
        assert H.exists_k(conv, phi) == conv.existential_k(phi, FULL)

    def test_subject_projection_exists_k(self) -> None:
        sp = PredicateSubjectProjection(source="q", target="p")
        cat = _category_with(sp)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        phi = fv({(1, 2): T_VAL, (2, 1): F_VAL}, dom=FULL)
        assert H.exists_k(sp, phi) == sp.existential_k(phi, FULL)

    def test_object_projection_forall_t(self) -> None:
        op = PredicateObjectProjection(source="q", target="p")
        cat = _category_with(op)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        phi = fv({(1, 2): T_VAL, (2, 1): F_VAL}, dom=FULL)
        assert H.forall_t(op, phi) == op.universal_t(phi, FULL)


class TestQuantifierAdjunctionWitness:
    def test_specialization_witness_checks_all_four_adjunctions(self) -> None:
        spec = PredicateSpecialization(source="q", target="p", sub_support=SUB)
        cat = _category_with(spec)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)

        witness = H.quantifier_adjunctions(spec)

        assert isinstance(witness, QuantifierAdjunctionWitness)
        assert witness.holds
        assert {check.adjunction for check in witness.checks} == {
            "exists_k",
            "forall_k",
            "exists_t",
            "forall_t",
        }
        assert len(witness.checks) == 3 * 3 * 4
        assert witness.failures == ()

    def test_projection_witness_accepts_custom_samples(self) -> None:
        sp = PredicateSubjectProjection(source="q", target="p")
        cat = _category_with(sp)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        source = fv({(1, 2): T_VAL, (2, 1): F_VAL}, dom=FULL)
        target = fv({(1, 1): T_VAL, (2, 2): F_VAL}, dom=FULL)

        witness = H.quantifier_adjunctions(
            sp,
            source_samples=[source],
            target_samples=[target],
        )

        assert witness.holds
        assert len(witness.checks) == 4


class TestFrobeniusWitness:
    def test_specialization_witness_checks_k_and_t_frobenius(self) -> None:
        spec = PredicateSpecialization(source="q", target="p", sub_support=SUB)
        cat = _category_with(spec)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)

        witness = H.frobenius(spec)

        assert isinstance(witness, FrobeniusWitness)
        assert witness.holds
        assert {check.order for check in witness.checks} == {"k", "t"}
        assert len(witness.checks) == 3 * 3 * 2
        assert witness.failures == ()

    def test_projection_witness_accepts_custom_samples(self) -> None:
        sp = PredicateSubjectProjection(source="q", target="p")
        cat = _category_with(sp)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        target = fv({(1, 1): T_VAL, (2, 2): F_VAL}, dom=FULL)
        source = fv({(1, 2): T_VAL, (2, 1): F_VAL}, dom=FULL)

        witness = H.frobenius(
            sp,
            target_samples=[target],
            source_samples=[source],
        )

        assert witness.holds
        assert len(witness.checks) == 2

    def test_fusion_frobenius_fails_for_specialization(self) -> None:
        spec = PredicateSpecialization(
            source="q",
            target="p",
            sub_support=frozenset({(1, 1)}),
        )
        cat = PredicateCategory(
            entities=E,
            predicates=PredicateSet.of(["p", "q"]),
            generators=(spec,),
            domains={"q": spec.sub_support},
        )
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)

        witness = H.fusion_frobenius(spec)

        assert isinstance(witness, FusionFrobeniusWitness)
        assert not witness.holds
        assert witness.failures
        assert (1, 2) in witness.failures[0].discrepancy

    def test_fusion_frobenius_holds_for_converse(self) -> None:
        conv = PredicateConverse(source="p_c", target="p")
        cat = _category_with(conv)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)

        witness = H.fusion_frobenius(conv)

        assert witness.holds
        assert witness.failures == ()


# ---- f_star (reindexing) -------------------------------------------------


class TestFStar:
    def test_specialization_pullback(self) -> None:
        spec = PredicateSpecialization(source="q", target="p", sub_support=SUB)
        cat = _category_with(spec)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        v = fv({(1, 2): TOP, (2, 1): T_VAL, (1, 1): F_VAL}, dom=FULL)
        result = H.f_star(spec, v)
        assert result.dom == SUB
        assert result.get(1, 2) == TOP
        assert result.get(2, 1) == T_VAL

    def test_beck_chevalley_witness_routes_through_hyperdoctrine(self) -> None:
        f = PredicateSpecialization(source="q", target="p", sub_support=SUB)
        g = PredicateSpecialization(
            source="r",
            target="p",
            sub_support=frozenset({(1, 2)}),
        )
        cat = PredicateCategory(
            entities=E,
            predicates=PredicateSet.of(["p", "q", "r"]),
            generators=(f, g),
            domains={"q": SUB, "r": g.sub_support},
        )
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)

        witness = H.beck_chevalley(f, g)

        assert isinstance(witness, BeckChevalleyWitness)
        assert witness.holds
        assert {check.adjoint for check in witness.checks} == {
            "existential_k",
            "existential_t",
            "universal_k",
            "universal_t",
        }


# ---- Comprehension --------------------------------------------------------


class TestComprehension:
    def test_extension_t_agrees_with_module(self) -> None:
        spec = PredicateSpecialization(source="q", target="p", sub_support=SUB)
        cat = _category_with(spec)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        agg = H.extension_t(spec)
        raw = raw_ext_t(spec, BIL, entities=E, dom_p=FULL)
        assert agg == raw

    def test_comprehension_t_agrees_with_module(self) -> None:
        cat = _category_with(PredicateSpecialization(source="q", target="p", sub_support=SUB))
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        psi = fv({(1, 1): T_VAL, (1, 2): F_VAL, (2, 1): TOP, (2, 2): BOT}, dom=FULL)
        agg = H.comprehension_t("p", psi)
        raw = raw_comp_t("p", FULL, psi)
        assert agg == raw

    def test_extension_k_inverse_to_comprehension_k(self) -> None:
        spec = PredicateSpecialization(source="q", target="p", sub_support=SUB)
        cat = _category_with(spec)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        # Ext^k(g) places ⊤ on dom(q) and ⊥ elsewhere; comprehension_k
        # picks the cells valued at ⊤ and returns a specialisation whose
        # sub_support is exactly that. Composition recovers SUB.
        ext = H.extension_k(spec)
        comp = H.comprehension_k("p", ext)
        assert comp.sub_support == SUB

    def test_classical_comprehension_adjunction_witness(self) -> None:
        spec = PredicateSpecialization(source="q", target="p", sub_support=SUB)
        cat = _category_with(spec)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)

        witness = H.comprehension_adjunction(spec, schema="classical")

        assert isinstance(witness, ComprehensionAdjunctionWitness)
        assert witness.holds
        assert witness.schema == "classical"
        assert len(witness.checks) == 3

    def test_paraconsistent_comprehension_adjunction_witness(self) -> None:
        spec = PredicateSpecialization(source="q", target="p", sub_support=SUB)
        cat = _category_with(spec)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        psi = fv({(1, 2): TOP}, dom=FULL)

        witness = H.comprehension_adjunction(
            spec,
            psis=[psi],
            schema="paraconsistent",
        )

        assert witness.holds
        assert len(witness.checks) == 1


# ---- Domain enforcement ---------------------------------------------------


class TestDomainEnforcement:
    def test_exists_k_rejects_wrong_dom(self) -> None:
        spec = PredicateSpecialization(source="q", target="p", sub_support=SUB)
        cat = _category_with(spec)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        # Fiber over "q" must have dom == SUB; a fiber on FULL is wrong.
        phi_wrong = fv({(1, 2): T_VAL}, dom=FULL)
        try:
            H.exists_k(spec, phi_wrong)
        except ValueError as exc:
            assert "does not match" in str(exc)
        else:
            raise AssertionError("expected ValueError on dom mismatch")

    def test_f_star_rejects_wrong_target_dom(self) -> None:
        spec = PredicateSpecialization(source="q", target="p", sub_support=SUB)
        cat = _category_with(spec)
        H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
        # f^* expects a fiber over f.target == "p", which has dom == FULL.
        phi_wrong = fv({(1, 2): T_VAL}, dom=SUB)
        try:
            H.f_star(spec, phi_wrong)
        except ValueError as exc:
            assert "does not match" in str(exc)
        else:
            raise AssertionError("expected ValueError on dom mismatch")
