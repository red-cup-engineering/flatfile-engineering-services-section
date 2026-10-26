"""Tests for `pypredcalc.predication.predicate_category`.

Fiber valuations sit over the canonical Boolean twist ``2^⋈ ≅ FOUR``;
cell values are written as tuples in the encoding
``T = (1, 0), F = (0, 1), BOT = (0, 0), TOP = (1, 1)``.
"""

from __future__ import annotations

import pytest

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.hyperdoctrine import PredicationHyperdoctrine
from pypredcalc.predication.predicate_category import (
    PredicateCategory,
    PredicateConverse,
    PredicateMorphism,
    PredicateObjectProjection,
    PredicateSet,
    PredicateSpecialization,
    PredicateSubjectProjection,
    PredicationCellSet,
)

T = (1, 0)
F = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()


def fv(entities, cells=None, dom=None):
    if dom is None:
        return FiberValuation.full(
            bilattice=BIL,
            entities=entities,
            bottom=BOT,
            cells=cells or {},
        )
    return FiberValuation(
        bilattice=BIL,
        entities=entities,
        bottom=BOT,
        cells=cells or {},
        dom=dom,
    )


# ---- PredicateSet -------------------------------------------------------


def test_predicate_set_of_dedupes_preserving_order() -> None:
    P = PredicateSet.of(["loves", "knows", "loves", "trusts"])
    assert list(P) == ["loves", "knows", "trusts"]
    assert len(P) == 3


def test_predicate_set_post_init_rejects_duplicates() -> None:
    with pytest.raises(ValueError):
        PredicateSet(("loves", "knows", "loves"))


def test_predicate_set_index_and_contains() -> None:
    P = PredicateSet.of(["a", "b", "c"])
    assert "b" in P
    assert "z" not in P
    assert P.index("c") == 2
    with pytest.raises(KeyError):
        P.index("z")


def test_predicate_set_union_and_intersection() -> None:
    P = PredicateSet.of(["a", "b"])
    Q = PredicateSet.of(["b", "c"])
    assert list(P.union(Q)) == ["a", "b", "c"]
    assert list(P.intersection(Q)) == ["b"]


# ---- PredicationCellSet -------------------------------------------------


def test_predication_cell_set_size_and_iter() -> None:
    E = EntitySet.of(["x", "y"])
    P = PredicateSet.of(["p", "q"])
    Phi = PredicationCellSet(E, P)
    assert len(Phi) == 2 * 2 * 2  # |E| * |Π| * |E|
    cells = list(Phi)
    assert cells[0] == ("x", "p", "x")
    assert cells[-1] == ("y", "q", "y")
    assert len(set(cells)) == len(cells)
    assert ("x", "p", "y") in Phi
    assert ("z", "p", "x") not in Phi
    assert "not-a-tuple" not in Phi


# ---- FiberValuation -----------------------------------------------------


def test_fiber_valuation_default_is_bot_and_drops_bot() -> None:
    E = EntitySet.of(["a", "b", "z"])
    v = fv(E, {("a", "b"): T, ("a", "a"): BOT})
    assert v.get("a", "b") == T
    assert v.get("a", "a") == BOT  # default
    assert v.get("z", "z") == BOT  # missing
    assert v.support() == frozenset({("a", "b")})


def test_fiber_valuation_equality_is_structural() -> None:
    E = EntitySet.of(["x", "y"])
    a = fv(E, {("x", "y"): T, ("y", "y"): F})
    b = fv(E, {("x", "y"): T, ("y", "y"): F})
    assert a == b
    assert hash(a) == hash(b)
    assert a != fv(E, {("x", "y"): T})


# ---- Predicate morphisms ------------------------------------------------


def test_specialization_restricts_to_sub_support() -> None:
    E = EntitySet.of(["a", "b", "c"])
    full = fv(
        E, {("a", "b"): T, ("a", "c"): F, ("b", "a"): TOP, ("c", "c"): T}
    )
    sub = frozenset({("a", "b"), ("c", "c")})
    f = PredicateSpecialization(source="q", target="p", sub_support=sub)
    pulled = f.pullback(full)
    assert pulled == fv(E, {("a", "b"): T, ("c", "c"): T}, dom=sub)


def test_converse_swaps_subject_and_object() -> None:
    E = EntitySet.of(["a", "b"])
    v = fv(E, {("a", "b"): T, ("b", "a"): F})
    f = PredicateConverse(source="p_c", target="p")
    pulled = f.pullback(v)
    assert pulled.get("a", "b") == F  # was v(b, a)
    assert pulled.get("b", "a") == T  # was v(a, b)


def test_converse_squared_is_identity() -> None:
    E = EntitySet.of(["a", "b", "c"])
    v = fv(E, {("a", "b"): T, ("c", "a"): F, ("b", "c"): TOP})
    f = PredicateConverse(source="p_c", target="p")
    g = PredicateConverse(source="p", target="p_c")
    assert g.pullback(f.pullback(v)) == v


def test_subject_projection_broadcasts_diagonal() -> None:
    E = EntitySet.of(["a", "b", "c"])
    v = fv(E, {("a", "a"): T, ("b", "b"): F, ("a", "b"): TOP})
    # only (s, s) cells matter for subject-projection.
    f = PredicateSubjectProjection(source="q", target="p")
    pulled = f.pullback(v)
    for s in ["a", "b", "c"]:
        for o in ["a", "b", "c"]:
            expected = v.get(s, s)
            assert pulled.get(s, o) == expected


def test_object_projection_broadcasts_diagonal() -> None:
    E = EntitySet.of(["a", "b", "c"])
    v = fv(E, {("a", "a"): T, ("b", "b"): F, ("a", "b"): TOP})
    f = PredicateObjectProjection(source="q", target="p")
    pulled = f.pullback(v)
    for s in ["a", "b", "c"]:
        for o in ["a", "b", "c"]:
            expected = v.get(o, o)
            assert pulled.get(s, o) == expected


# ---- PredicateCategory --------------------------------------------------


def test_predicate_category_construction_and_objects() -> None:
    E = EntitySet.of(["x", "y"])
    P = PredicateSet.of(["loves", "loved_by"])
    f = PredicateConverse(source="loved_by", target="loves")
    C = PredicateCategory(entities=E, predicates=P, generators=(f,))
    assert C.objects() is P
    assert C.cell_set() == PredicationCellSet(E, P)


def test_predicate_category_rejects_morphisms_outside_predicate_set() -> None:
    E = EntitySet.of(["x", "y"])
    P = PredicateSet.of(["loves"])
    with pytest.raises(ValueError):
        PredicateCategory(
            entities=E,
            predicates=P,
            generators=(PredicateConverse(source="other", target="loves"),),
        )


def test_predicate_category_rejects_non_predication_generators() -> None:
    E = EntitySet.of(["x", "y"])
    P = PredicateSet.of(["p", "q"])

    with pytest.raises(TypeError, match="four canonical"):
        PredicateCategory(
            entities=E,
            predicates=P,
            generators=(PredicateMorphism(source="q", target="p"),),
        )


def test_predicate_category_rejects_specialization_outside_entity_pairs() -> None:
    E = EntitySet.of(["x", "y"])
    P = PredicateSet.of(["p", "q"])
    with pytest.raises(ValueError):
        PredicateCategory(
            entities=E,
            predicates=P,
            generators=(
                PredicateSpecialization(
                    source="q",
                    target="p",
                    sub_support=frozenset({("z", "z")}),
                ),
            ),
        )


def test_predicate_category_requires_converse_source_domain_to_be_swap() -> None:
    E = EntitySet.of(["x", "y"])
    P = PredicateSet.of(["p", "p_c"])
    converse = PredicateConverse(source="p_c", target="p")
    dom_p = frozenset({("x", "y")})

    C = PredicateCategory(
        entities=E,
        predicates=P,
        generators=(converse,),
        domains={"p": dom_p, "p_c": frozenset({("y", "x")})},
    )
    assert C.dom_of("p_c") == frozenset({("y", "x")})

    with pytest.raises(ValueError, match="swap"):
        PredicateCategory(
            entities=E,
            predicates=P,
            generators=(converse,),
            domains={"p": dom_p, "p_c": dom_p},
        )


def test_predicate_category_requires_projection_source_domains() -> None:
    E = EntitySet.of(["x", "y"])
    P = PredicateSet.of(["p", "subject_p", "object_p"])
    dom_p = frozenset({("x", "x")})
    subject_source = frozenset({("x", "x"), ("x", "y")})
    object_source = frozenset({("x", "x"), ("y", "x")})

    C = PredicateCategory(
        entities=E,
        predicates=P,
        generators=(
            PredicateSubjectProjection(source="subject_p", target="p"),
            PredicateObjectProjection(source="object_p", target="p"),
        ),
        domains={
            "p": dom_p,
            "subject_p": subject_source,
            "object_p": object_source,
        },
    )
    assert C.dom_of("subject_p") == subject_source
    assert C.dom_of("object_p") == object_source

    with pytest.raises(ValueError, match="subject-diagonal"):
        PredicateCategory(
            entities=E,
            predicates=P,
            generators=(
                PredicateSubjectProjection(source="subject_p", target="p"),
            ),
            domains={"p": dom_p, "subject_p": object_source},
        )
    with pytest.raises(ValueError, match="object-diagonal"):
        PredicateCategory(
            entities=E,
            predicates=P,
            generators=(
                PredicateObjectProjection(source="object_p", target="p"),
            ),
            domains={"p": dom_p, "object_p": subject_source},
        )


def test_identity_pullback_is_no_op() -> None:
    E = EntitySet.of(["x", "y"])
    P = PredicateSet.of(["p"])
    C = PredicateCategory(entities=E, predicates=P)
    idp = C.identity("p")
    v = fv(E, {("x", "y"): T})
    assert idp.pullback(v) == v
    with pytest.raises(KeyError):
        C.identity("nope")


def test_compose_identity_collapses() -> None:
    E = EntitySet.of(["x", "y"])
    P = PredicateSet.of(["p", "p_c"])
    f = PredicateConverse(source="p_c", target="p")
    C = PredicateCategory(entities=E, predicates=P, generators=(f,))
    assert C.compose(C.identity("p"), f) is f
    assert C.compose(f, C.identity("p_c")) is f


def test_compose_two_converses_pullback_is_identity_action() -> None:
    E = EntitySet.of(["a", "b", "c"])
    P = PredicateSet.of(["p", "p_c"])
    f = PredicateConverse(source="p_c", target="p")
    g = PredicateConverse(source="p", target="p_c")
    C = PredicateCategory(entities=E, predicates=P, generators=(f, g))
    composed = C.compose(g, f)
    assert composed.source == "p_c"
    assert composed.target == "p_c"
    v = fv(E, {("a", "b"): T, ("c", "a"): F, ("b", "c"): TOP})
    assert composed.pullback(v) == v


def test_compose_requires_matching_endpoints() -> None:
    E = EntitySet.of(["x"])
    P = PredicateSet.of(["p", "q", "r"])
    f = PredicateConverse(source="q", target="p")
    g = PredicateConverse(source="r", target="q")
    C = PredicateCategory(entities=E, predicates=P, generators=(f, g))
    with pytest.raises(ValueError):
        C.compose(g, f)


def test_compose_rejects_non_member_morphism_with_matching_endpoints() -> None:
    E = EntitySet.of(["a", "b"])
    P = PredicateSet.of(["p", "q"])
    member = PredicateSpecialization(
        source="q",
        target="p",
        sub_support=frozenset({("a", "b")}),
    )
    stranger = PredicateSpecialization(
        source="q",
        target="p",
        sub_support=frozenset({("b", "a")}),
    )
    C = PredicateCategory(
        entities=E,
        predicates=P,
        generators=(member,),
        domains={
            "p": frozenset({("a", "b"), ("b", "a")}),
            "q": frozenset({("a", "b")}),
        },
    )

    assert C.contains_morphism(member)
    assert C.contains_morphism(C.identity("p"))
    assert not C.contains_morphism(stranger)
    with pytest.raises(KeyError, match="not a morphism"):
        C.compose(C.identity("p"), stranger)


def test_is_natural_holds_for_consistent_valuation() -> None:
    E = EntitySet.of(["a", "b"])
    P = PredicateSet.of(["loves", "loved_by"])
    f = PredicateConverse(source="loved_by", target="loves")
    C = PredicateCategory(entities=E, predicates=P, generators=(f,))
    v_loves = fv(E, {("a", "b"): T, ("b", "a"): F})
    v_loved_by = f.pullback(v_loves)
    assert C.is_natural({"loves": v_loves, "loved_by": v_loved_by})


def test_is_natural_fails_for_inconsistent_valuation() -> None:
    E = EntitySet.of(["a", "b"])
    P = PredicateSet.of(["loves", "loved_by"])
    f = PredicateConverse(source="loved_by", target="loves")
    C = PredicateCategory(entities=E, predicates=P, generators=(f,))
    v_loves = fv(E, {("a", "b"): T})
    v_bad = fv(E, {("a", "b"): F})  # not the converse of v_loves
    assert not C.is_natural({"loves": v_loves, "loved_by": v_bad})


def test_is_natural_requires_fiber_for_every_predicate() -> None:
    E = EntitySet.of(["a"])
    P = PredicateSet.of(["p", "q"])
    C = PredicateCategory(entities=E, predicates=P)
    with pytest.raises(KeyError):
        C.is_natural({"p": fv(E)})


def test_fiber_valuation_direct_constructor_canonicalises_bot() -> None:
    E = EntitySet.of(["a", "b", "c"])
    raw = fv(E, {("a", "b"): T, ("a", "a"): BOT, ("c", "c"): BOT})
    canonical = fv(E, {("a", "b"): T})
    assert raw == canonical
    assert hash(raw) == hash(canonical)
    assert raw.support() == frozenset({("a", "b")})


def test_fiber_valuation_defensively_copies_input_mapping() -> None:
    E = EntitySet.of(["a", "b", "c", "d"])
    raw: dict = {("a", "b"): T}
    v = fv(E, raw)
    raw[("c", "d")] = F
    assert v == fv(E, {("a", "b"): T})


def test_is_natural_holds_for_subject_projection() -> None:
    E = EntitySet.of(["a", "b"])
    P = PredicateSet.of(["p", "q"])
    f = PredicateSubjectProjection(source="q", target="p")
    C = PredicateCategory(entities=E, predicates=P, generators=(f,))
    v_p = fv(E, {("a", "a"): T, ("b", "b"): F, ("a", "b"): TOP})
    v_q = f.pullback(v_p)
    assert C.is_natural({"p": v_p, "q": v_q})
    bad = fv(E, {("a", "a"): T, ("a", "b"): F, ("b", "a"): F, ("b", "b"): F})
    assert not C.is_natural({"p": v_p, "q": bad})


def test_is_natural_holds_for_object_projection() -> None:
    E = EntitySet.of(["a", "b"])
    P = PredicateSet.of(["p", "q"])
    f = PredicateObjectProjection(source="q", target="p")
    C = PredicateCategory(entities=E, predicates=P, generators=(f,))
    v_p = fv(E, {("a", "a"): T, ("b", "b"): F})
    v_q = f.pullback(v_p)
    assert C.is_natural({"p": v_p, "q": v_q})


def test_compose_specialization_then_converse_is_contravariant() -> None:
    E = EntitySet.of(["a", "b", "c"])
    P = PredicateSet.of(["p", "q", "r"])
    sub = frozenset({("a", "b"), ("c", "a")})
    f = PredicateConverse(source="q", target="p")
    g = PredicateSpecialization(source="r", target="q", sub_support=sub)
    C = PredicateCategory(
        entities=E,
        predicates=P,
        generators=(f, g),
        domains={"r": sub},
    )
    composed = C.compose(f, g)
    assert composed.source == "r"
    assert composed.target == "p"
    v_p = fv(
        E, {("a", "b"): T, ("b", "a"): F, ("a", "c"): TOP, ("c", "a"): T}
    )
    swapped = f.pullback(v_p)
    expected = g.pullback(swapped)
    assert composed.pullback(v_p) == expected
    assert expected == fv(E, {("a", "b"): F, ("c", "a"): TOP}, dom=sub)


def test_composed_specialization_adjoints_are_staged() -> None:
    E = EntitySet.of(["a", "b"])
    full = frozenset((s, o) for s in E for o in E)
    q_dom = frozenset({("a", "a"), ("a", "b")})
    r_dom = frozenset({("a", "a")})
    f = PredicateSpecialization(source="r", target="q", sub_support=r_dom)
    g = PredicateSpecialization(source="q", target="p", sub_support=q_dom)
    C = PredicateCategory(
        entities=E,
        predicates=PredicateSet.of(["p", "q", "r"]),
        generators=(f, g),
        domains={"q": q_dom, "r": r_dom},
    )
    composed = C.compose(g, f)
    source = fv(E, {("a", "a"): T}, dom=r_dom)

    assert composed.existential_k(source, full) == g.existential_k(
        f.existential_k(source, q_dom),
        full,
    )
    assert composed.existential_t(source, full) == g.existential_t(
        f.existential_t(source, q_dom),
        full,
    )
    assert composed.universal_k(source, full) == g.universal_k(
        f.universal_k(source, q_dom),
        full,
    )
    assert composed.universal_t(source, full) == g.universal_t(
        f.universal_t(source, q_dom),
        full,
    )


def test_composed_morphism_satisfies_hyperdoctrine_adjunctions() -> None:
    E = EntitySet.of(["a", "b"])
    q_dom = frozenset({("a", "a"), ("a", "b")})
    r_dom = frozenset({("a", "a")})
    f = PredicateSpecialization(source="r", target="q", sub_support=r_dom)
    g = PredicateSpecialization(source="q", target="p", sub_support=q_dom)
    C = PredicateCategory(
        entities=E,
        predicates=PredicateSet.of(["p", "q", "r"]),
        generators=(f, g),
        domains={"q": q_dom, "r": r_dom},
    )
    H = PredicationHyperdoctrine(C, BIL)

    witness = H.quantifier_adjunctions(C.compose(g, f))

    assert witness.holds
    assert {check.adjunction for check in witness.checks} == {
        "exists_k",
        "forall_k",
        "exists_t",
        "forall_t",
    }


def test_is_natural_holds_for_specialization() -> None:
    E = EntitySet.of(["a", "b", "c"])
    P = PredicateSet.of(["p", "q"])
    sub = frozenset({("a", "b"), ("b", "c")})
    spec = PredicateSpecialization(source="q", target="p", sub_support=sub)
    C = PredicateCategory(
        entities=E, predicates=P, generators=(spec,), domains={"q": sub}
    )
    v_p = fv(
        E, {("a", "b"): T, ("b", "c"): F, ("c", "c"): TOP, ("a", "a"): T}
    )
    v_q = spec.pullback(v_p)
    assert v_q == fv(E, {("a", "b"): T, ("b", "c"): F}, dom=sub)
    assert C.is_natural({"p": v_p, "q": v_q})


# ---- Per-predicate domains ---------------------------------------------


def test_dom_of_defaults_to_full_entity_pair_set() -> None:
    E = EntitySet.of(["a", "b"])
    P = PredicateSet.of(["p"])
    C = PredicateCategory(entities=E, predicates=P)
    assert C.dom_of("p") == frozenset(
        {("a", "a"), ("a", "b"), ("b", "a"), ("b", "b")}
    )


def test_dom_of_uses_supplied_domain() -> None:
    E = EntitySet.of(["a", "b"])
    P = PredicateSet.of(["p", "q"])
    qdom = frozenset({("a", "b")})
    C = PredicateCategory(entities=E, predicates=P, domains={"q": qdom})
    assert C.dom_of("q") == qdom
    assert ("a", "a") in C.dom_of("p")


def test_dom_of_unknown_predicate_raises() -> None:
    E = EntitySet.of(["a"])
    P = PredicateSet.of(["p"])
    C = PredicateCategory(entities=E, predicates=P)
    with pytest.raises(KeyError):
        C.dom_of("nope")


def test_domain_outside_entity_pairs_rejected() -> None:
    E = EntitySet.of(["a", "b"])
    P = PredicateSet.of(["p"])
    with pytest.raises(ValueError):
        PredicateCategory(
            entities=E, predicates=P, domains={"p": frozenset({("z", "z")})}
        )


def test_domain_for_unknown_predicate_rejected() -> None:
    E = EntitySet.of(["a"])
    P = PredicateSet.of(["p"])
    with pytest.raises(ValueError):
        PredicateCategory(
            entities=E, predicates=P, domains={"nope": frozenset({("a", "a")})}
        )


def test_specialization_sub_support_must_equal_dom_source() -> None:
    E = EntitySet.of(["a", "b"])
    P = PredicateSet.of(["p", "q"])
    qdom = frozenset({("a", "b")})
    bad_spec = PredicateSpecialization(
        source="q", target="p", sub_support=frozenset({("a", "a")})
    )
    with pytest.raises(ValueError, match="sub_support must equal dom"):
        PredicateCategory(
            entities=E,
            predicates=P,
            generators=(bad_spec,),
            domains={"q": qdom},
        )


def test_specialization_dom_source_must_be_subset_of_dom_target() -> None:
    E = EntitySet.of(["a", "b"])
    P = PredicateSet.of(["p", "q"])
    pdom = frozenset({("a", "a")})
    qdom = frozenset({("a", "b")})  # not ⊆ pdom
    spec = PredicateSpecialization(source="q", target="p", sub_support=qdom)
    with pytest.raises(ValueError, match="dom\\(source\\) ⊄ dom\\(target\\)"):
        PredicateCategory(
            entities=E,
            predicates=P,
            generators=(spec,),
            domains={"p": pdom, "q": qdom},
        )


def test_specialization_dom_inclusion_accepted_when_correct() -> None:
    E = EntitySet.of(["a", "b"])
    P = PredicateSet.of(["p", "q"])
    pdom = frozenset({("a", "a"), ("a", "b"), ("b", "a")})
    qdom = frozenset({("a", "b")})
    spec = PredicateSpecialization(source="q", target="p", sub_support=qdom)
    C = PredicateCategory(
        entities=E,
        predicates=P,
        generators=(spec,),
        domains={"p": pdom, "q": qdom},
    )
    assert C.dom_of("q") == qdom
    assert C.dom_of("p") == pdom


# ---- validate_valuation -------------------------------------------------


def test_validate_valuation_accepts_in_domain_supports() -> None:
    E = EntitySet.of(["a", "b"])
    P = PredicateSet.of(["p"])
    pdom = frozenset({("a", "b")})
    C = PredicateCategory(entities=E, predicates=P, domains={"p": pdom})
    C.validate_valuation({"p": fv(E, {("a", "b"): T})})


def test_validate_valuation_rejects_out_of_domain_support() -> None:
    E = EntitySet.of(["a", "b"])
    P = PredicateSet.of(["p"])
    pdom = frozenset({("a", "b")})
    C = PredicateCategory(entities=E, predicates=P, domains={"p": pdom})
    with pytest.raises(ValueError, match="support outside dom"):
        C.validate_valuation({"p": fv(E, {("b", "a"): T})})


def test_fiber_valuation_cells_is_immutable_after_construction() -> None:
    E = EntitySet.of(["a", "b", "c", "d"])
    v = fv(E, {("a", "b"): T})
    with pytest.raises(TypeError):
        v.cells[("c", "d")] = F  # type: ignore[index]


def test_predicate_category_defensive_copies_input_domains() -> None:
    E = EntitySet.of(["a", "b"])
    P = PredicateSet.of(["p"])
    user_dict: dict[object, frozenset[tuple[object, object]]] = {
        "p": frozenset({("a", "b")})
    }
    C = PredicateCategory(entities=E, predicates=P, domains=user_dict)
    user_dict["p"] = frozenset({("b", "a")})
    user_dict["q"] = frozenset()
    assert C.dom_of("p") == frozenset({("a", "b")})
    assert "q" not in C.domains


def test_predicate_category_domains_is_immutable_after_construction() -> None:
    E = EntitySet.of(["a"])
    P = PredicateSet.of(["p"])
    C = PredicateCategory(entities=E, predicates=P)
    with pytest.raises(TypeError):
        C.domains["q"] = frozenset()  # type: ignore[index]


def test_validate_valuation_requires_fiber_for_every_predicate() -> None:
    E = EntitySet.of(["a"])
    P = PredicateSet.of(["p", "q"])
    C = PredicateCategory(entities=E, predicates=P)
    with pytest.raises(KeyError):
        C.validate_valuation({"p": fv(E)})
