"""B1t — truth-order quantifier adjoints for all four generators.

Verifies ``∃_f^t ⊣ f^* ⊣ ∀_f^t`` for specialization, converse,
subject-projection, object-projection, and identity. Mirrors the
B1k suite with ``≤_t`` in place of ``≤_k``, ``∃_f^t`` extending by
``⊥_t = f`` (specialization, projections off-image), and ``∀_f^t``
extending by ``⊤_t = t``.

Adjunction laws (truth-order):
    ∃_f^t(α) ≤_t β  ⇔  α ≤_t f^*(β)
    f^*(β) ≤_t α    ⇔  β ≤_t ∀_f^t(α)
"""

from __future__ import annotations

from itertools import product

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
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
    if dom is None:
        return FiberValuation.full(BIL, E, BOT, cells or {})
    return FiberValuation(BIL, E, BOT, cells or {}, dom=dom)
def _all_fibers_on(dom):
    cells_list = sorted(dom, key=lambda c: (str(c[0]), str(c[1])))
    if not cells_list:
        yield fv({}, dom=dom)
        return
    for assignment in product(FOUR, repeat=len(cells_list)):
        yield fv(dict(zip(cells_list, assignment, strict=True)), dom=dom)


def _check_adjunction_t(f, source_dom, target_dom):
    for alpha in _all_fibers_on(source_dom):
        for beta in _all_fibers_on(target_dom):
            lhs_e = f.existential_t(alpha, target_dom).truth_leq(beta)
            rhs_e = alpha.truth_leq(f.pullback(beta))
            assert lhs_e == rhs_e, (
                f"∃_t-adjunction failed for f={type(f).__name__} "
                f"α={dict(alpha.cells)} β={dict(beta.cells)}"
            )
            lhs_u = f.pullback(beta).truth_leq(alpha)
            rhs_u = beta.truth_leq(f.universal_t(alpha, target_dom))
            assert lhs_u == rhs_u, (
                f"∀_t-adjunction failed for f={type(f).__name__} "
                f"α={dict(alpha.cells)} β={dict(beta.cells)}"
            )


# ---- TwistBilattice top/bottom plumbing ---------------------------------


class TestTwistBilatticeTruthEnds:
    def test_truth_top_is_t(self) -> None:
        assert BIL.truth_top() == T_VAL

    def test_truth_bottom_is_f(self) -> None:
        assert BIL.truth_bottom() == F_VAL

    def test_knowledge_top_is_top(self) -> None:
        assert BIL.knowledge_top() == TOP

    def test_knowledge_bottom_is_bot(self) -> None:
        assert BIL.knowledge_bottom() == BOT


# ---- Identity ------------------------------------------------------------


class TestB1tIdentity:
    def test_existential_and_universal_are_identity(self) -> None:
        f = PredicateIdentity(source="p", target="p")
        v = fv({(1, 1): T_VAL})
        assert f.existential_t(v, FULL) == v
        assert f.universal_t(v, FULL) == v

    def test_adjunction(self) -> None:
        f = PredicateIdentity(source="p", target="p")
        _check_adjunction_t(f, source_dom=FULL, target_dom=FULL)


# ---- Specialization ------------------------------------------------------


class TestB1tSpecialization:
    sub = frozenset({(1, 2), (2, 1)})

    def test_existential_extends_by_f(self) -> None:
        f = PredicateSpecialization(source="q", target="p", sub_support=self.sub)
        alpha = fv({(1, 2): T_VAL}, dom=self.sub)
        out = f.existential_t(alpha, FULL)
        assert out.get(1, 2) == T_VAL  # in sub_support
        assert out.get(2, 1) == BOT    # in sub_support, α didn't set
        assert out.get(1, 1) == F_VAL  # outside ⇒ extended by ⊥_t = f
        assert out.get(2, 2) == F_VAL

    def test_universal_extends_by_t(self) -> None:
        f = PredicateSpecialization(source="q", target="p", sub_support=self.sub)
        alpha = fv({(1, 2): T_VAL}, dom=self.sub)
        out = f.universal_t(alpha, FULL)
        assert out.get(1, 2) == T_VAL
        assert out.get(2, 1) == BOT
        assert out.get(1, 1) == T_VAL  # outside ⇒ extended by ⊤_t = t
        assert out.get(2, 2) == T_VAL

    def test_adjunction(self) -> None:
        f = PredicateSpecialization(source="q", target="p", sub_support=self.sub)
        _check_adjunction_t(f, source_dom=self.sub, target_dom=FULL)


# ---- Converse ------------------------------------------------------------


class TestB1tConverse:
    def test_existential_equals_universal_equals_pullback(self) -> None:
        f = PredicateConverse(source="p_c", target="p")
        alpha = fv({(1, 2): T_VAL, (2, 1): F_VAL})
        # All three are the swap of α.
        ex = f.existential_t(alpha, FULL)
        un = f.universal_t(alpha, FULL)
        # f.pullback would map A_target → A_source, opposite direction —
        # but the swap formula is the same up to labels, so both ex and
        # un should equal each other.
        assert ex == un
        assert ex.get(2, 1) == T_VAL
        assert ex.get(1, 2) == F_VAL

    def test_adjunction(self) -> None:
        f = PredicateConverse(source="p_c", target="p")
        _check_adjunction_t(f, source_dom=FULL, target_dom=FULL)


# ---- Subject-projection --------------------------------------------------


class TestB1tSubjectProjection:
    def test_existential_truth_row_join_on_diagonal(self) -> None:
        f = PredicateSubjectProjection(source="q", target="p")
        # Row of subject=1: (1,1)=T, (1,2)=F. truth_join(T, F) = T (T is t-top).
        alpha = fv({(1, 1): T_VAL, (1, 2): F_VAL})
        out = f.existential_t(alpha, FULL)
        assert out.get(1, 1) == T_VAL  # row join in ≤_t
        # Row of subject=2: (2,1)=BOT, (2,2)=BOT. truth_join(BOT, BOT) = BOT.
        # BOT is NOT ⊥_t = f; so row-2's diagonal at (2,2) gets BOT.
        assert out.get(2, 2) == BOT
        assert out.get(1, 2) == F_VAL  # off-diagonal ⇒ ⊥_t = f
        assert out.get(2, 1) == F_VAL

    def test_universal_truth_row_meet_on_diagonal(self) -> None:
        f = PredicateSubjectProjection(source="q", target="p")
        alpha = fv({(1, 1): T_VAL})
        out = f.universal_t(alpha, FULL)
        # Row 1: (1,1)=T, (1,2)=BOT. truth_meet(T, BOT) = ?
        # T = (1, 0), BOT = (0, 0). truth_meet: (min(1,0), max(0,0)) = (0, 0) = BOT.
        assert out.get(1, 1) == BOT
        # Row 2: (2,1)=BOT, (2,2)=BOT. truth_meet = BOT.
        assert out.get(2, 2) == BOT
        # Off-diagonal: empty meet = ⊤_t = t.
        assert out.get(1, 2) == T_VAL
        assert out.get(2, 1) == T_VAL

    def test_adjunction(self) -> None:
        f = PredicateSubjectProjection(source="q", target="p")
        _check_adjunction_t(f, source_dom=FULL, target_dom=FULL)


# ---- Object-projection ---------------------------------------------------


class TestB1tObjectProjection:
    def test_existential_truth_column_join_on_diagonal(self) -> None:
        f = PredicateObjectProjection(source="q", target="p")
        # Column o=1: (1,1)=T, (2,1)=F. truth_join(T, F) = T.
        alpha = fv({(1, 1): T_VAL, (2, 1): F_VAL})
        out = f.existential_t(alpha, FULL)
        assert out.get(1, 1) == T_VAL
        # Column o=2: BOT, BOT. truth_join = BOT.
        assert out.get(2, 2) == BOT
        assert out.get(1, 2) == F_VAL  # off-diagonal ⇒ ⊥_t = f
        assert out.get(2, 1) == F_VAL

    def test_universal_truth_column_meet_on_diagonal(self) -> None:
        f = PredicateObjectProjection(source="q", target="p")
        alpha = fv({(1, 1): T_VAL})
        out = f.universal_t(alpha, FULL)
        # Column 1: T, BOT. truth_meet = BOT.
        assert out.get(1, 1) == BOT
        # Column 2: BOT, BOT. truth_meet = BOT.
        assert out.get(2, 2) == BOT
        assert out.get(1, 2) == T_VAL  # off-diagonal ⇒ ⊤_t = t
        assert out.get(2, 1) == T_VAL

    def test_adjunction(self) -> None:
        f = PredicateObjectProjection(source="q", target="p")
        _check_adjunction_t(f, source_dom=FULL, target_dom=FULL)
