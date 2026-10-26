"""Tests for :class:`PredicateFunctor`."""
from __future__ import annotations

import pytest

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication import (
    EntitySet,
    FiberValuation,
    PredicateCategory,
    PredicateConverse,
    PredicateFunctor,
    PredicateIdentity,
    PredicateSet,
)

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
BIL = boolean_twist()


def fv(entities, cells=None):
    return FiberValuation.full(BIL, entities, BOT, cells or {})


def _converse_category() -> PredicateCategory:
    return PredicateCategory(
        entities=EntitySet([1, 2, 3]),
        predicates=PredicateSet(["r", "r_check"]),
        generators=[PredicateConverse(source="r", target="r_check")],
    )


def _renamed_converse_category() -> PredicateCategory:
    return PredicateCategory(
        entities=EntitySet([1, 2, 3]),
        predicates=PredicateSet(["s", "s_check"]),
        generators=[PredicateConverse(source="s", target="s_check")],
    )


# ---------------- construction & validation ----------------


def test_identity_functor_constructs() -> None:
    cat = _converse_category()
    F = PredicateFunctor.identity(cat)
    assert F.source is cat and F.target is cat
    for p in cat.predicates:
        assert F.apply_to_predicate(p) == p
    for g in cat.generators:
        assert F.apply_to_morphism(g) is g


def test_renaming_functor_constructs() -> None:
    src = _converse_category()
    tgt = _renamed_converse_category()
    src_gen = src.generators[0]
    tgt_gen = tgt.generators[0]
    F = PredicateFunctor(
        source=src,
        target=tgt,
        on_predicates={"r": "s", "r_check": "s_check"},
        on_morphisms={src_gen: tgt_gen},
    )
    assert F.apply_to_predicate("r") == "s"
    assert F.apply_to_morphism(src_gen) is tgt_gen


def test_constructor_rejects_partial_on_predicates() -> None:
    src = _converse_category()
    tgt = _renamed_converse_category()
    src_gen = src.generators[0]
    tgt_gen = tgt.generators[0]
    with pytest.raises(ValueError, match="not total"):
        PredicateFunctor(
            source=src,
            target=tgt,
            on_predicates={"r": "s"},  # missing r_check
            on_morphisms={src_gen: tgt_gen},
        )


def test_constructor_rejects_unknown_target_predicate() -> None:
    src = _converse_category()
    tgt = _renamed_converse_category()
    src_gen = src.generators[0]
    tgt_gen = tgt.generators[0]
    with pytest.raises(ValueError, match="not a target predicate"):
        PredicateFunctor(
            source=src,
            target=tgt,
            on_predicates={"r": "s", "r_check": "alien"},
            on_morphisms={src_gen: tgt_gen},
        )


def test_constructor_rejects_missing_generator_image() -> None:
    src = _converse_category()
    tgt = _renamed_converse_category()
    with pytest.raises(ValueError, match="missing image"):
        PredicateFunctor(
            source=src,
            target=tgt,
            on_predicates={"r": "s", "r_check": "s_check"},
            on_morphisms={},
        )


def test_constructor_rejects_image_with_wrong_source_target() -> None:
    src = _converse_category()
    tgt = _renamed_converse_category()
    src_gen = src.generators[0]
    # image source/target don't agree with on_predicates(src_gen.source/target).
    bad_image = PredicateConverse(source="s_check", target="s")  # swapped
    with pytest.raises(ValueError, match="functoriality fails"):
        PredicateFunctor(
            source=src,
            target=tgt,
            on_predicates={"r": "s", "r_check": "s_check"},
            on_morphisms={src_gen: bad_image},
        )


# ---------------- composition ----------------


def test_compose_identity_is_neutral() -> None:
    cat = _converse_category()
    F = PredicateFunctor.identity(cat)
    G = PredicateFunctor.identity(cat)
    H = F.compose(G)
    for p in cat.predicates:
        assert H.apply_to_predicate(p) == p


def test_compose_chains_renaming() -> None:
    A = _converse_category()                 # predicates r, r_check
    B = _renamed_converse_category()         # predicates s, s_check
    C = PredicateCategory(
        entities=EntitySet([1, 2, 3]),
        predicates=PredicateSet(["t", "t_check"]),
        generators=[PredicateConverse(source="t", target="t_check")],
    )
    F = PredicateFunctor(
        source=A, target=B,
        on_predicates={"r": "s", "r_check": "s_check"},
        on_morphisms={A.generators[0]: B.generators[0]},
    )
    G = PredicateFunctor(
        source=B, target=C,
        on_predicates={"s": "t", "s_check": "t_check"},
        on_morphisms={B.generators[0]: C.generators[0]},
    )
    GF = G.compose(F)
    assert GF.source is A and GF.target is C
    assert GF.apply_to_predicate("r") == "t"
    assert GF.apply_to_predicate("r_check") == "t_check"
    assert GF.apply_to_morphism(A.generators[0]) is C.generators[0]


def test_compose_rejects_mismatched_endpoints() -> None:
    A = _converse_category()
    B = _renamed_converse_category()
    F = PredicateFunctor.identity(A)
    G = PredicateFunctor.identity(B)
    with pytest.raises(ValueError, match="other.target is self.source"):
        F.compose(G)


# ---------------- identities and apply_to_morphism ----------------


def test_apply_to_morphism_sends_identity_to_identity() -> None:
    src = _converse_category()
    tgt = _renamed_converse_category()
    F = PredicateFunctor(
        source=src, target=tgt,
        on_predicates={"r": "s", "r_check": "s_check"},
        on_morphisms={src.generators[0]: tgt.generators[0]},
    )
    img = F.apply_to_morphism(PredicateIdentity(source="r", target="r"))
    assert isinstance(img, PredicateIdentity)
    assert img.source == "s" and img.target == "s"


def test_apply_to_morphism_unknown_morphism_raises() -> None:
    src = _converse_category()
    F = PredicateFunctor.identity(src)
    stranger = PredicateConverse(source="r_check", target="r")
    with pytest.raises(KeyError, match="no functor image"):
        F.apply_to_morphism(stranger)


def test_apply_to_morphism_recurses_on_composites() -> None:
    """``F_1(g ∘ f) = F_1(g) ∘ F_1(f)`` — total on generated arrows."""
    A = PredicateCategory(
        entities=EntitySet([1, 2, 3]),
        predicates=PredicateSet(["p", "q", "r"]),
        generators=[
            PredicateConverse(source="p", target="q"),
            PredicateConverse(source="q", target="r"),
        ],
    )
    B = PredicateCategory(
        entities=EntitySet([1, 2, 3]),
        predicates=PredicateSet(["p2", "q2", "r2"]),
        generators=[
            PredicateConverse(source="p2", target="q2"),
            PredicateConverse(source="q2", target="r2"),
        ],
    )
    F = PredicateFunctor(
        source=A, target=B,
        on_predicates={"p": "p2", "q": "q2", "r": "r2"},
        on_morphisms={
            A.generators[0]: B.generators[0],
            A.generators[1]: B.generators[1],
        },
    )
    f = A.generators[0]                  # p → q
    g = A.generators[1]                  # q → r
    composite = A.compose(g, f)          # p → r
    image = F.apply_to_morphism(composite)
    # Endpoints in target match the on_predicates renaming.
    assert image.source == "p2"
    assert image.target == "r2"


# ---------------- restrict_valuation: F^*(v_𝒟)(p) := v_𝒟(F(p)) ----------------


def test_restrict_valuation_substitutes_along_on_predicates() -> None:
    src = _converse_category()
    tgt = _renamed_converse_category()
    F = PredicateFunctor(
        source=src, target=tgt,
        on_predicates={"r": "s", "r_check": "s_check"},
        on_morphisms={src.generators[0]: tgt.generators[0]},
    )
    fiber_s = fv(tgt.entities, {(1, 2): T_VAL})
    fiber_s_check = fv(tgt.entities, {(2, 1): T_VAL})
    pulled = F.restrict_valuation({"s": fiber_s, "s_check": fiber_s_check})
    assert pulled["r"] is fiber_s
    assert pulled["r_check"] is fiber_s_check


def test_restrict_valuation_missing_target_fiber_raises() -> None:
    src = _converse_category()
    tgt = _renamed_converse_category()
    F = PredicateFunctor(
        source=src, target=tgt,
        on_predicates={"r": "s", "r_check": "s_check"},
        on_morphisms={src.generators[0]: tgt.generators[0]},
    )
    with pytest.raises(KeyError, match="missing fiber for"):
        F.restrict_valuation({"s": fv(tgt.entities)})  # missing s_check


def test_restrict_valuation_preserves_naturality() -> None:
    """If v on 𝒟 is natural and F is a renaming, F*(v) on 𝒞 is natural."""
    src = _converse_category()
    tgt = _renamed_converse_category()
    F = PredicateFunctor(
        source=src, target=tgt,
        on_predicates={"r": "s", "r_check": "s_check"},
        on_morphisms={src.generators[0]: tgt.generators[0]},
    )
    # Build a natural target valuation by pulling back along the unique generator.
    target_fiber = fv(tgt.entities, {(1, 2): T_VAL, (3, 1): F_VAL})
    pulled_back = tgt.generators[0].pullback(target_fiber)
    target_val = {"s_check": target_fiber, "s": pulled_back}
    assert tgt.is_natural(target_val)
    source_val = F.restrict_valuation(target_val)
    assert src.is_natural(source_val)
