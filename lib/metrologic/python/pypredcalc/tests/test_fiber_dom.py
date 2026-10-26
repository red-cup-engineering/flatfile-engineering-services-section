"""Tests for first-class ``dom`` on ``FiberValuation``.

The fiber over predicate ``p`` lives in ``A_p = L^{⋈ dom(p)}``; the
``dom`` field on FiberValuation makes that explicit. Operations iterate
``dom``, pullbacks carry the morphism-induced dom transformation, and
two fibers with different ``dom`` are *different fiber algebras* and
can't be combined.
"""

from __future__ import annotations

import pytest

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.predicate_category import (
    PredicateConverse,
    PredicateObjectProjection,
    PredicateSpecialization,
    PredicateSubjectProjection,
)

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()


def fv(entities, cells=None, dom=None):
    if dom is None:
        return FiberValuation.full(BIL, entities, BOT, cells or {})
    return FiberValuation(BIL, entities, BOT, cells or {}, dom=dom)
# ---- dom validation -----------------------------------------------------


class TestDomValidation:
    def test_default_dom_is_full_e_squared(self) -> None:
        E = EntitySet.of([1, 2, 3])
        v = fv(E, {(1, 2): T_VAL})
        expected = frozenset((s, o) for s in E for o in E)
        assert v.dom == expected

    def test_explicit_dom_is_kept(self) -> None:
        E = EntitySet.of([1, 2, 3])
        sub = frozenset({(1, 2), (2, 3)})
        v = fv(E, {(1, 2): T_VAL}, dom=sub)
        assert v.dom == sub

    def test_cells_outside_dom_rejected(self) -> None:
        E = EntitySet.of([1, 2, 3])
        sub = frozenset({(1, 2)})
        with pytest.raises(ValueError, match="not in this fiber's dom"):
            fv(E, {(2, 3): T_VAL}, dom=sub)

    def test_dom_outside_e_squared_rejected(self) -> None:
        E = EntitySet.of([1, 2])
        bad_dom = frozenset({(1, 2), (3, 3)})
        with pytest.raises(ValueError, match="cells outside E × E"):
            fv(E, {}, dom=bad_dom)


# ---- equality includes dom ----------------------------------------------


class TestEqualityIncludesDom:
    def test_same_cells_different_doms_are_unequal(self) -> None:
        E = EntitySet.of([1, 2])
        sub_a = frozenset({(1, 1), (1, 2)})
        sub_b = frozenset({(1, 1)})
        v_a = fv(E, {(1, 1): T_VAL}, dom=sub_a)
        v_b = fv(E, {(1, 1): T_VAL}, dom=sub_b)
        assert v_a != v_b

    def test_full_dom_equals_unspecified_dom(self) -> None:
        E = EntitySet.of([1, 2])
        v_explicit = fv(E, {(1, 2): T_VAL}, dom=frozenset((s, o) for s in E for o in E))
        v_default = fv(E, {(1, 2): T_VAL})
        assert v_explicit == v_default


# ---- ops respect dom ----------------------------------------------------


class TestOpsRespectDom:
    def test_combine_different_doms_raises(self) -> None:
        E = EntitySet.of([1, 2])
        v_a = fv(E, {(1, 2): T_VAL}, dom=frozenset({(1, 2)}))
        v_b = fv(E, {(2, 1): T_VAL}, dom=frozenset({(2, 1)}))
        with pytest.raises(ValueError, match="different doms"):
            v_a.knowledge_join(v_b)

    def test_fusion_iterates_only_dom(self) -> None:
        # Fusion produces non-bot at every dom cell (bot ⊙ bot is non-bot).
        # Restrict dom to a single cell; the result should have exactly that
        # one cell, no spillage to the rest of E × E.
        E = EntitySet.of([1, 2, 3])
        sub = frozenset({(1, 2)})
        v = fv(E, {}, dom=sub)
        out = v.fusion(v)
        # bot ⊙ bot in boolean is ⟨0, 1⟩ = F.
        assert dict(out.cells) == {(1, 2): (0, 1)}
        assert out.dom == sub


# ---- pullbacks compute the right output dom -----------------------------


class TestFiberOrderComparisons:
    """Pointwise ``≤_k`` and ``≤_t`` over ``dom``."""

    def test_knowledge_leq_holds_when_pointwise(self) -> None:
        E = EntitySet.of([1, 2])
        v = fv(E, {(1, 1): T_VAL})  # T = (1, 0)
        w = fv(E, {(1, 1): TOP})  # TOP = (1, 1); T ≤_k TOP
        assert v.knowledge_leq(w)

    def test_knowledge_leq_fails_when_pointwise_fails(self) -> None:
        E = EntitySet.of([1, 2])
        v = fv(E, {(1, 1): T_VAL})  # T
        w = fv(E, {(1, 1): F_VAL})  # F is NOT ≥_k T (they're incomparable)
        assert not v.knowledge_leq(w)
        assert not w.knowledge_leq(v)

    def test_knowledge_leq_at_bottom_to_anything(self) -> None:
        E = EntitySet.of([1, 2])
        empty = fv(E)
        nonempty = fv(E, {(1, 1): T_VAL})
        # bot ≤_k anything cellwise.
        assert empty.knowledge_leq(nonempty)

    def test_knowledge_leq_requires_same_dom(self) -> None:
        E = EntitySet.of([1, 2])
        v = fv(E, {(1, 1): T_VAL}, dom=frozenset({(1, 1)}))
        w = fv(E, {(1, 1): T_VAL})  # full dom
        with pytest.raises(ValueError, match="different doms"):
            v.knowledge_leq(w)

    def test_truth_leq_holds_when_pointwise(self) -> None:
        E = EntitySet.of([1])
        # F ≤_t BOT ≤_t T in FOUR.
        v_f = fv(E, {(1, 1): F_VAL})
        v_t = fv(E, {(1, 1): T_VAL})
        assert v_f.truth_leq(v_t)


class TestPullbackOutputDoms:
    def test_specialization_output_dom_is_sub_support(self) -> None:
        E = EntitySet.of([1, 2, 3])
        sub = frozenset({(1, 2), (2, 3)})
        f = PredicateSpecialization(source="q", target="p", sub_support=sub)
        v_p = fv(E, {(1, 2): T_VAL, (2, 3): F_VAL, (1, 1): T_VAL})
        v_q = f.pullback(v_p)
        assert v_q.dom == sub
        # Off-sub cells aren't even representable in v_q now.
        assert dict(v_q.cells) == {(1, 2): T_VAL, (2, 3): F_VAL}

    def test_specialization_rejects_when_sub_not_in_input_dom(self) -> None:
        E = EntitySet.of([1, 2])
        # Input fiber has dom = {(1, 1)} only.
        small_dom = frozenset({(1, 1)})
        v_p = fv(E, {(1, 1): T_VAL}, dom=small_dom)
        # Specialization wants sub_support = {(1, 2)}, which isn't in v_p.dom.
        f = PredicateSpecialization(
            source="q", target="p", sub_support=frozenset({(1, 2)})
        )
        with pytest.raises(ValueError, match="not a subset of the input"):
            f.pullback(v_p)

    def test_converse_output_dom_is_swap(self) -> None:
        E = EntitySet.of([1, 2])
        sub = frozenset({(1, 2), (2, 1)})
        f = PredicateConverse(source="qc", target="q")
        v_q = fv(E, {(1, 2): T_VAL}, dom=sub)
        v_qc = f.pullback(v_q)
        assert v_qc.dom == frozenset({(2, 1), (1, 2)})  # swap is symmetric here

    def test_subject_projection_output_dom_drops_cells_with_invalid_diag(self) -> None:
        E = EntitySet.of([1, 2, 3])
        # Input dom only has (1, 1) as an in-dom diagonal.
        input_dom = frozenset({(1, 1), (2, 3)})  # (2,2) and (3,3) absent
        f = PredicateSubjectProjection(source="qsp", target="q")
        v = fv(E, {(1, 1): T_VAL}, dom=input_dom)
        out = f.pullback(v)
        # Only s=1 has (s, s) ∈ input_dom, so output dom = {(1, o) : o ∈ E}.
        expected_dom = frozenset({(1, 1), (1, 2), (1, 3)})
        assert out.dom == expected_dom

    def test_object_projection_output_dom_drops_cells_with_invalid_diag(self) -> None:
        E = EntitySet.of([1, 2, 3])
        input_dom = frozenset({(2, 2)})  # only o=2 has (o, o) ∈ input_dom
        f = PredicateObjectProjection(source="qop", target="q")
        v = fv(E, {(2, 2): T_VAL}, dom=input_dom)
        out = f.pullback(v)
        expected_dom = frozenset({(1, 2), (2, 2), (3, 2)})
        assert out.dom == expected_dom
