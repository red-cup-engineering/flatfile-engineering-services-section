"""B1k — knowledge-order quantifier adjoints for specialization.

Verifies the adjunction laws ∃_f^k ⊣ f^* ⊣ ∀_f^k for ``f`` a
:class:`PredicateSpecialization`. Specialization is the simplest case:
``∃`` extends by ⊥_k, ``∀`` extends by ⊤_k, and the adjunction reduces
to the order on the sub-support.
"""

from __future__ import annotations

from itertools import product

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.predicate_category import PredicateSpecialization

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()
FOUR = (T_VAL, F_VAL, BOT, TOP)


def fv(entities, cells=None, dom=None):
    if dom is None:
        return FiberValuation.full(BIL, entities, BOT, cells or {})
    return FiberValuation(BIL, entities, BOT, cells or {}, dom=dom)
# ---- Setup -------------------------------------------------------------
#
# Small carrier so the exhaustive adjunction enumeration is fast
# (|FOUR|^4 × |FOUR|^2 = 4096 iterations).

E = EntitySet.of([1, 2])
TARGET_DOM = frozenset((s, o) for s in E for o in E)  # |TARGET_DOM| = 4
SUB = frozenset({(1, 2), (2, 1)})  # dom(q), |SUB| = 2
F = PredicateSpecialization(source="q", target="p", sub_support=SUB)


def _all_fibers_on(dom):
    """Enumerate every fiber on the given dom over FOUR (small bases only)."""
    if not dom:
        yield fv(E, {}, dom=dom)
        return
    cells_list = sorted(dom, key=lambda c: (str(c[0]), str(c[1])))
    for assignment in product(FOUR, repeat=len(cells_list)):
        cells = dict(zip(cells_list, assignment, strict=True))
        yield fv(E, cells, dom=dom)


# ---- ∃_f^k specifics ----------------------------------------------------


class TestExistentialKSpec:
    def test_extends_by_bottom_outside_sub_support(self) -> None:
        alpha = fv(E, {(1, 2): T_VAL}, dom=SUB)
        out = F.existential_k(alpha, TARGET_DOM)
        # In sub_support: α's value. Outside sub_support: bot (default).
        assert out.get(1, 2) == T_VAL
        assert out.get(2, 1) == BOT  # in sub_support but α didn't set it ⇒ default = bot
        assert out.get(1, 1) == BOT  # outside sub_support ⇒ extended by bot
        assert out.get(2, 2) == BOT
        assert out.dom == TARGET_DOM

    def test_rejects_input_off_sub_support(self) -> None:
        # Input fiber on the full E × E (not on sub_support).
        alpha = fv(E, {(1, 2): T_VAL})
        try:
            F.existential_k(alpha, TARGET_DOM)
        except ValueError as e:
            assert "sub_support" in str(e)
        else:
            raise AssertionError("expected ValueError")


# ---- ∀_f^k specifics ----------------------------------------------------


class TestUniversalKSpec:
    def test_extends_by_top_outside_sub_support(self) -> None:
        alpha = fv(E, {(1, 2): T_VAL}, dom=SUB)
        out = F.universal_k(alpha, TARGET_DOM)
        assert out.get(1, 2) == T_VAL  # in sub_support, kept
        assert out.get(2, 1) == BOT    # in sub_support; α didn't set it ⇒ bot
        assert out.get(1, 1) == TOP    # outside sub_support ⇒ extended by top_k
        assert out.get(2, 2) == TOP
        assert out.dom == TARGET_DOM


# ---- B1k adjunction (∃_f^k ⊣ f^*) ---------------------------------------


class TestB1kExistentialAdjunction:
    """Law: ∃_f^k(α) ≤_k β  iff  α ≤_k f^*(β)."""

    def test_adjunction_holds_pointwise(self) -> None:
        for alpha in _all_fibers_on(SUB):
            for beta in _all_fibers_on(TARGET_DOM):
                lhs = F.existential_k(alpha, TARGET_DOM).knowledge_leq(beta)
                rhs = alpha.knowledge_leq(F.pullback(beta))
                assert lhs == rhs, f"adjunction failed for α={dict(alpha.cells)} β={dict(beta.cells)}"


class TestB1kUniversalAdjunction:
    """Law: f^*(β) ≤_k α  iff  β ≤_k ∀_f^k(α)."""

    def test_adjunction_holds_pointwise(self) -> None:
        for alpha in _all_fibers_on(SUB):
            for beta in _all_fibers_on(TARGET_DOM):
                lhs = F.pullback(beta).knowledge_leq(alpha)
                rhs = beta.knowledge_leq(F.universal_k(alpha, TARGET_DOM))
                assert lhs == rhs, f"adjunction failed for α={dict(alpha.cells)} β={dict(beta.cells)}"
